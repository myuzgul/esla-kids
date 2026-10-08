import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, guestName, guestPhone, guestEmail, shippingAddress } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Sipariş ID gereklidir.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    // Format and validate shipping address
    let formattedShippingAddress = '';
    if (typeof shippingAddress === 'string') {
      formattedShippingAddress = shippingAddress;
    } else if (shippingAddress && typeof shippingAddress === 'object') {
      formattedShippingAddress = JSON.stringify({
        fullName: (shippingAddress.fullName || guestName || '').trim(),
        phone: (shippingAddress.phone || guestPhone || '').trim(),
        address: (shippingAddress.address || '').trim(),
        city: (shippingAddress.city || '').trim(),
        district: (shippingAddress.district || '').trim(),
        postalCode: (shippingAddress.postalCode || '').trim(),
      });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(guestName !== undefined ? { guestName: guestName.trim() } : {}),
        ...(guestPhone !== undefined ? { guestPhone: guestPhone.trim() } : {}),
        ...(guestEmail !== undefined ? { guestEmail: guestEmail.trim() } : {}),
        ...(formattedShippingAddress ? { shippingAddress: formattedShippingAddress } : {}),
      },
      include: {
        items: {
          include: {
            variation: true,
          },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'ORDER_ADDRESS_UPDATED',
        entity: 'Order',
        entityId: order.id,
        performedBy: 'Yönetici',
        details: JSON.stringify({
          orderNumber: order.orderNumber,
          guestName: updated.guestName,
          guestPhone: updated.guestPhone,
          guestEmail: updated.guestEmail,
          shippingAddress: formattedShippingAddress,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Müşteri ve teslimat adresi bilgileri başarıyla güncellendi.',
      order: updated,
    });
  } catch (err: any) {
    console.error('[Order Address Update API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Adres bilgileri güncellenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
