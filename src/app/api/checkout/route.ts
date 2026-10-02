import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { sendOrderNotificationEmail } from '@/lib/email';
import { createPayTRToken } from '@/lib/paytr';
import { getCurrentCustomer } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId,
      guestName,
      guestEmail,
      guestPhone,
      city,
      district,
      address,
      postalCode,
      paymentMethod, // PAYTR, HAVALE, COD
      customerNote,
      couponCode,
      items, // array of { productId, variationId, quantity }
    } = body;

    // Check if customer is authenticated via session or body
    let finalCustomerId = customerId || null;
    if (!finalCustomerId) {
      try {
        const sessionCustomer = await getCurrentCustomer();
        if (sessionCustomer) finalCustomerId = sessionCustomer.id;
      } catch (e) {}
    }

    if (!guestName || !guestEmail || !guestPhone || !city || !district || !address) {
      return NextResponse.json({ error: 'Lütfen tüm zorunlu adres ve iletişim alanlarını doldurunuz.' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Sepetinizde ürün bulunmamaktadır.' }, { status: 400 });
    }

    const settings = await getSettings(true);

    if (paymentMethod === 'COD' && settings.cod_enabled === false) {
      return NextResponse.json({ error: 'Kapıda ödeme yöntemi şu anda kapalıdır.' }, { status: 400 });
    }
    if (paymentMethod === 'PAYTR' && settings.paytr_enabled === false) {
      return NextResponse.json({ error: 'Online kredi kartı ödemesi şu anda aktif değildir.' }, { status: 400 });
    }

    // Begin Prisma Interactive Transaction to ensure atomicity & avoid race condition on stock!
    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsData = [];

      for (const cartItem of items) {
        let title = '';
        let sku = '';
        let barcode = '';
        let price = 0;
        let image = '';
        let variationName = '';

        if (cartItem.variationId) {
          const variation = await tx.productVariation.findUnique({
            where: { id: cartItem.variationId },
            include: { product: true },
          });

          if (!variation || !variation.isActive) {
            throw new Error(`Seçtiğiniz ürün varyasyonu artık mevcut değil.`);
          }

          if (variation.stock < cartItem.quantity) {
            throw new Error(`"${variation.product.title}" (${variation.sku}) için yeterli stok bulunmuyor. Kalan stok: ${variation.stock}`);
          }

          // Decrement variation stock atomically
          await tx.productVariation.update({
            where: { id: variation.id },
            data: { stock: { decrement: cartItem.quantity } },
          });

          // Log stock movement
          await tx.stockMovement.create({
            data: {
              productId: variation.productId,
              variationId: variation.id,
              change: -cartItem.quantity,
              previousStock: variation.stock,
              newStock: variation.stock - cartItem.quantity,
              reason: 'ORDER_PLACED',
            },
          });

          title = variation.product.title;
          sku = variation.sku;
          barcode = variation.barcode || '';
          const varTaxRate = variation.product.taxRate || 10;
          price = Math.round(variation.price * (1 + varTaxRate / 100) * 100) / 100;
          try {
            const attrObj = JSON.parse(variation.attributes);
            variationName = Object.entries(attrObj).map(([k, v]) => `${k}: ${v}`).join(', ');
          } catch (e) {
            variationName = '';
          }

          try {
            const imgs = JSON.parse(variation.product.images);
            image = imgs[0] || '';
          } catch (e) {}

        } else {
          const product = await tx.product.findUnique({
            where: { id: cartItem.productId },
          });

          if (!product || !product.isActive) {
            throw new Error(`Seçtiğiniz ürün artık mevcut değil.`);
          }

          if (product.stock < cartItem.quantity) {
            throw new Error(`"${product.title}" için yeterli stok bulunmuyor. Kalan stok: ${product.stock}`);
          }

          // Decrement product stock atomically
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: cartItem.quantity } },
          });

          // Log stock movement
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              change: -cartItem.quantity,
              previousStock: product.stock,
              newStock: product.stock - cartItem.quantity,
              reason: 'ORDER_PLACED',
            },
          });

          title = product.title;
          sku = product.sku;
          barcode = product.barcode || '';
          const prodTaxRate = product.taxRate || 10;
          price = Math.round(product.price * (1 + prodTaxRate / 100) * 100) / 100;
          try {
            const imgs = JSON.parse(product.images);
            image = imgs[0] || '';
          } catch (e) {}
        }

        const lineTotal = price * cartItem.quantity;
        subtotal += lineTotal;

        orderItemsData.push({
          productId: cartItem.productId,
          variationId: cartItem.variationId || null,
          title,
          sku,
          barcode,
          variationName,
          price,
          quantity: cartItem.quantity,
          total: lineTotal,
          image,
        });
      }

      // Calculate Shipping
      let shippingFee = subtotal >= settings.free_shipping_limit ? 0 : settings.shipping_fee;

      // Coupon discount
      let discountAmount = 0;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: couponCode.toUpperCase().trim() } });
        if (coupon && coupon.isActive) {
          const isEligible = !coupon.minSpend || subtotal >= coupon.minSpend;
          if (isEligible) {
            if (coupon.discountType === 'PERCENT') {
              discountAmount += (subtotal * coupon.discountValue) / 100;
            } else {
              discountAmount += coupon.discountValue;
            }
            if (coupon.freeShipping) {
              shippingFee = 0;
            }
            await tx.coupon.update({
              where: { id: coupon.id },
              data: { usageCount: { increment: 1 } },
            });
          }
        }
      }

      // Payment method adjustments
      let codFee = 0;
      if (paymentMethod === 'COD') {
        codFee = settings.cod_fee;
      }

      let havaleDiscount = 0;
      if (paymentMethod === 'HAVALE') {
        havaleDiscount = ((subtotal - discountAmount) * settings.havale_discount_percent) / 100;
        discountAmount += havaleDiscount;
      }

      const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee + codFee);

      // Generate sequential order number
      const count = await tx.order.count();
      const orderNumber = `EK-${1000 + count + 1}`;

      const shippingAddressObj = {
        fullName: guestName,
        phone: guestPhone,
        city,
        district,
        address,
        postalCode: postalCode || '',
      };

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: finalCustomerId,
          guestName,
          guestEmail,
          guestPhone,
          shippingAddress: JSON.stringify(shippingAddressObj),
          billingAddress: JSON.stringify(shippingAddressObj),
          status: 'CONFIRMED',
          paymentMethod,
          paymentStatus: paymentMethod === 'PAYTR' ? 'PENDING' : 'PENDING',
          subtotal,
          shippingFee,
          discountAmount,
          codFee,
          totalAmount: Math.round(totalAmount * 100) / 100,
          customerNote: customerNote || null,
          couponCode: couponCode || null,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return order;
    });

    // Send order confirmation email asynchronously
    sendOrderNotificationEmail(result, 'CREATED').catch((e) => console.error(e));

    // Handle PayTR payment token if chosen
    let paytrToken: string | undefined = undefined;
    if (paymentMethod === 'PAYTR') {
      const basket: Array<[string, string, number]> = result.items.map((it) => [
        it.title,
        (it.price * 100).toString(),
        it.quantity,
      ]);
      const tokenRes = await createPayTRToken({
        merchantOid: result.orderNumber,
        email: result.guestEmail || '',
        paymentAmount: Math.round(result.totalAmount * 100),
        userName: result.guestName || '',
        userAddress: result.shippingAddress,
        userPhone: result.guestPhone || '',
        userBasket: basket,
        userIp: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });
      if (tokenRes.status === 'success') {
        paytrToken = tokenRes.token;
      }
    }

    return NextResponse.json({
      success: true,
      orderNumber: result.orderNumber,
      totalAmount: result.totalAmount,
      paymentMethod: result.paymentMethod,
      paytrToken,
    });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: err.message || 'Sipariş oluşturulurken bir hata meydana geldi. Lütfen tekrar deneyiniz.' },
      { status: 400 }
    );
  }
}
