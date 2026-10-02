import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPayTRCallback } from '@/lib/paytr';
import { sendOrderNotificationEmail } from '@/lib/email';

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

    const order = await prisma.order.findUnique({
      where: { orderNumber: merchant_oid },
    });

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
