import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { sendOrderNotificationEmail } from '@/lib/email';
import { createPayTRToken } from '@/lib/paytr';
import { getCurrentCustomer } from '@/lib/auth';
import { formatVariationLabel } from '@/lib/utils';

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
        let targetProductId: string | null = cartItem.productId || null;
        let targetVariationId: string | null = null;

        if (cartItem.variationId) {
          let variation = await tx.productVariation.findUnique({
            where: { id: cartItem.variationId },
            include: { product: true },
          });

          // Smart recovery if variationId was invalidated (e.g. product updated in admin)
          if ((!variation || !variation.isActive) && cartItem.productId) {
            // 1. Try finding by SKU on the same product
            if (cartItem.sku) {
              variation = await tx.productVariation.findFirst({
                where: { 
                  productId: cartItem.productId, 
                  sku: cartItem.sku,
                  isActive: true,
                },
                include: { product: true },
              });
            }

            // 2. Try finding by matching attributes from cartItem.variationName
            if (!variation && cartItem.variationName) {
              const allVars = await tx.productVariation.findMany({
                where: { productId: cartItem.productId, isActive: true },
                include: { product: true },
              });

              const parts = cartItem.variationName
                .split(/[/•-]/)
                .map((s: string) => s.trim().toLowerCase())
                .filter(Boolean);

              variation = allVars.find((v) => {
                try {
                  const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
                  const vColor = (attrs?.['Renk'] || attrs?.['Desen'] || attrs?.['Model'] || '').toLowerCase();
                  const vSize = (attrs?.['Beden'] || attrs?.['Yaş'] || attrs?.['Size'] || attrs?.['yas'] || attrs?.['yaş'] || '').toLowerCase();

                  if (parts.length >= 2) {
                    return (parts.includes(vColor) || !vColor) && (parts.includes(vSize) || !vSize);
                  } else if (parts.length === 1) {
                    return vColor === parts[0] || vSize === parts[0];
                  }
                } catch (e) {
                  return false;
                }
                return false;
              }) || null;
            }
          }

          const productTitle = variation?.product?.title || cartItem.title || 'Ürün';
          const itemVarName = variation 
            ? (formatVariationLabel(variation.attributes) || cartItem.variationName || '')
            : (cartItem.variationName || '');
          const fullItemName = itemVarName ? `"${productTitle} (${itemVarName})"` : `"${productTitle}"`;

          if (!variation || !variation.isActive) {
            throw new Error(`${fullItemName} ürünü artık mevcut değildir. Lütfen sepetinizden çıkararak devam ediniz.`);
          }

          if (variation.stock < cartItem.quantity) {
            if (variation.stock <= 0) {
              throw new Error(`${fullItemName} ürününün stoğu tükenmiştir. Lütfen sepetinizden çıkarınız.`);
            } else {
              throw new Error(`${fullItemName} için yalnızca ${variation.stock} adet stok kalmıştır. Sepetinizdeki adeti ${variation.stock} olarak güncelleyiniz.`);
            }
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

          targetVariationId = variation.id;
          targetProductId = variation.productId;
          title = variation.product.title;
          sku = variation.sku;
          barcode = variation.barcode || '';
          const varTaxRate = variation.product.taxRate || 10;
          price = Math.round(variation.price * (1 + varTaxRate / 100) * 100) / 100;
          variationName = formatVariationLabel(variation.attributes) || '';

          // Prefer variation image, then cartItem.image, then first product gallery image
          image = variation.image || cartItem.image || '';
          if (!image) {
            try {
              const imgs = JSON.parse(variation.product.images);
              image = imgs[0] || '';
            } catch (e) {}
          }

        } else {
          const product = await tx.product.findUnique({
            where: { id: cartItem.productId },
          });

          const productTitle = product?.title || cartItem.title || 'Ürün';

          if (!product || !product.isActive) {
            throw new Error(`"${productTitle}" ürünü artık mevcut değildir. Lütfen sepetinizden çıkararak devam ediniz.`);
          }

          if (product.stock < cartItem.quantity) {
            if (product.stock <= 0) {
              throw new Error(`"${productTitle}" ürününün stoğu tükenmiştir. Lütfen sepetinizden çıkarınız.`);
            } else {
              throw new Error(`"${productTitle}" için yalnızca ${product.stock} adet stok kalmıştır. Sepetinizdeki adeti ${product.stock} olarak güncelleyiniz.`);
            }
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

          targetProductId = product.id;
          targetVariationId = null;
          title = product.title;
          sku = product.sku;
          barcode = product.barcode || '';
          const prodTaxRate = product.taxRate || 10;
          price = Math.round(product.price * (1 + prodTaxRate / 100) * 100) / 100;
          image = cartItem.image || '';
          if (!image) {
            try {
              const imgs = JSON.parse(product.images);
              image = imgs[0] || '';
            } catch (e) {}
          }
        }

        const lineTotal = price * cartItem.quantity;
        subtotal += lineTotal;

        // Double check targetVariationId exists in DB before adding to OrderItem to guarantee foreign key constraint is satisfied
        if (targetVariationId) {
          const varExists = await tx.productVariation.findUnique({
            where: { id: targetVariationId },
            select: { id: true },
          });
          if (!varExists) {
            targetVariationId = null;
          }
        }

        // Double check targetProductId exists in DB
        if (targetProductId) {
          const prodExists = await tx.product.findUnique({
            where: { id: targetProductId },
            select: { id: true },
          });
          if (!prodExists) {
            targetProductId = null;
          }
        }

        orderItemsData.push({
          productId: targetProductId,
          variationId: targetVariationId,
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

      // Generate sequential order number starting above existing orders
      const lastOrders = await tx.order.findMany({
        select: { orderNumber: true },
        orderBy: { id: 'desc' },
        take: 50,
      });

      let maxNum = 13000;
      lastOrders.forEach((o) => {
        const m = o.orderNumber?.match(/\d+/);
        if (m) {
          const n = parseInt(m[0], 10);
          if (n > maxNum && n < 900000) maxNum = n;
        }
      });

      const nextNum = maxNum + 1;
      const orderNumber = `EK-${nextNum}`;

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

    // Send order confirmation email asynchronously for non-PAYTR payments (PayTR sends upon successful webhook callback)
    if (paymentMethod !== 'PAYTR') {
      sendOrderNotificationEmail(result, 'CREATED').catch((e) => console.error(e));
    }

    // Handle PayTR payment token if chosen
    let paytrToken: string | undefined = undefined;
    if (paymentMethod === 'PAYTR') {
      let streetAddress = 'Türkiye';
      try {
        const parsed = JSON.parse(result.shippingAddress);
        streetAddress = `${parsed.address || ''} ${parsed.district || ''} / ${parsed.city || ''}`.trim() || 'Türkiye';
      } catch (e) {}

      const basket: Array<[string, string, number]> = result.items.map((it) => [
        it.title,
        (it.price * 100).toString(),
        it.quantity,
      ]);

      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

      const tokenRes = await createPayTRToken({
        merchantOid: result.orderNumber,
        email: result.guestEmail || '',
        paymentAmount: Math.round(result.totalAmount * 100),
        userName: result.guestName || '',
        userAddress: streetAddress,
        userPhone: result.guestPhone || '',
        userBasket: basket,
        userIp: clientIp,
      });

      if (tokenRes.status === 'success' && tokenRes.token) {
        paytrToken = tokenRes.token;
      } else {
        console.error('PayTR Token Error:', tokenRes.reason);
        throw new Error(`PayTR Ödeme Sistemi Hatası: ${tokenRes.reason || 'Ödeme oturumu açılamadı'}`);
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
    let userMsg = err.message || 'Sipariş oluşturulurken bir hata meydana geldi. Lütfen tekrar deneyiniz.';
    if (
      userMsg.includes('prisma') ||
      userMsg.includes('Foreign key') ||
      userMsg.includes('constraint') ||
      userMsg.includes('invocation')
    ) {
      userMsg = 'Siparişiniz işlenirken geçici bir sepet uyuşmazlığı oluştu. Lütfen sepetinizi yenileyip tekrar deneyiniz.';
    }
    return NextResponse.json(
      { error: userMsg },
      { status: 400 }
    );
  }
}
