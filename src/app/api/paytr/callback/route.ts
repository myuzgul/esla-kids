import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPayTRCallback } from '@/lib/paytr';
import { sendOrderNotificationEmail } from '@/lib/email';
import { sendMetaServerEvent } from '@/lib/metaCapiServer';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    const isValid = await verifyPayTRCallback(body);
    if (!isValid) {
      console.error('PayTR Callback invalid signature hash!');
      return new Response('PAYTR notification failed: bad hash', { status: 400 });
    }

    const { merchant_oid, status } = body;

    // Support both EK1194 and EK-1194 formats
    let order = await prisma.order.findUnique({
      where: { orderNumber: merchant_oid },
    });

    if (!order && merchant_oid.startsWith('EK') && !merchant_oid.includes('-')) {
      const withDash = 'EK-' + merchant_oid.substring(2);
      order = await prisma.order.findUnique({
        where: { orderNumber: withDash },
      });
    }

    if (!order) {
      return new Response('Order not found', { status: 404 });
    }

    if (status === 'success') {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          status: 'APPROVED',
        },
        include: {
          items: true,
        },
      });

      await prisma.activityLog.create({
        data: {
          action: 'PAYMENT_CONFIRMED',
          entity: 'Order',
          entityId: order.id,
          performedBy: 'PayTR Webhook',
          details: JSON.stringify({ body }),
        },
      });

      sendOrderNotificationEmail(updated, 'CONFIRMED').catch((e) => console.error(e));

      // Trigger Meta CAPI Purchase server-side event
      let parsedShipping: any = {};
      try { parsedShipping = JSON.parse(updated.shippingAddress); } catch (e) {}

      sendMetaServerEvent({
        eventName: 'Purchase',
        eventId: `order_${updated.orderNumber}`,
        eventSourceUrl: `https://eslakids.com/siparis-tamamlandi/${updated.orderNumber}`,
        clientIp: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
        clientUserAgent: req.headers.get('user-agent') || '',
        userData: {
          email: updated.guestEmail || '',
          phone: updated.guestPhone || parsedShipping.phone || '',
          fullName: updated.guestName || parsedShipping.fullName || '',
          city: parsedShipping.city || '',
        },
        customData: {
          value: updated.totalAmount,
          currency: 'TRY',
          order_id: updated.orderNumber,
          num_items: updated.items?.reduce((sum: number, it: any) => sum + it.quantity, 0) || 0,
          content_type: 'product',
          content_ids: updated.items?.map((it: any) => String(it.variationId || it.productId || it.id)) || [],
          contents: updated.items?.map((it: any) => ({
            id: String(it.variationId || it.productId || it.id),
            quantity: it.quantity,
            item_price: it.price,
          })) || [],
        },
      }).catch((e) => console.warn('[Meta CAPI PayTR]', e));
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
        },
      });

      await prisma.activityLog.create({
        data: {
          action: 'PAYMENT_FAILED',
          entity: 'Order',
          entityId: order.id,
          performedBy: 'PayTR Webhook',
          details: JSON.stringify({ reason: body.failed_reason_msg || 'Payment failed' }),
        },
      });
    }

    // PayTR requires strictly returning 'OK'
    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('PayTR callback error:', err);
    return new Response('Error processing callback', { status: 500 });
  }
}
