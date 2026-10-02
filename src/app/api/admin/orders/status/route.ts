import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOrderNotificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { orderId, status, trackingCompany, trackingNumber, internalNote, isPrinted } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID gereklidir.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    const previousStatus = order.status;
    const updateData: any = {};

    if (status) {
      updateData.status = status;
    }
    if (trackingCompany !== undefined) {
      updateData.trackingCompany = trackingCompany || order.trackingCompany;
    }
    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber || order.trackingNumber;
    }
    if (internalNote !== undefined) {
      updateData.internalNote = internalNote;
    }
    if (isPrinted !== undefined) {
      updateData.isPrinted = Boolean(isPrinted);
      updateData.printedAt = isPrinted ? (order.printedAt || new Date()) : null;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Log the status change
    await prisma.activityLog.create({
      data: {
        action: 'ORDER_STATUS_CHANGED',
        entity: 'Order',
        entityId: order.id,
        performedBy: 'Yönetici',
        details: JSON.stringify({
          orderNumber: order.orderNumber,
          from: previousStatus,
          to: status,
          trackingNumber,
        }),
      },
    });

    // Send customer notification email
    if (status === 'APPROVED') {
      sendOrderNotificationEmail(updated, 'CONFIRMED').catch(console.error);
    } else if (status === 'PREPARING') {
      sendOrderNotificationEmail(updated, 'PREPARING').catch(console.error);
    } else if (status === 'SHIPPED') {
      sendOrderNotificationEmail(updated, 'SHIPPED').catch(console.error);
    } else if (status === 'DELIVERED') {
      sendOrderNotificationEmail(updated, 'DELIVERED').catch(console.error);
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (err: any) {
    console.error('Order status update error:', err);
    return NextResponse.json({ error: err.message || 'Durum güncellenemedi.' }, { status: 500 });
  }
}
