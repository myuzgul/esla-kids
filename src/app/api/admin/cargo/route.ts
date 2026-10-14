import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNavlungoShipment, queryNavlungoStatus } from '@/lib/navlungo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderId, carrierId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Sipariş ID gereklidir.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    if (action === 'create_shipment') {
      const result = await createNavlungoShipment(order, carrierId ? Number(carrierId) : undefined);
      return NextResponse.json(result);
    }

    if (action === 'track_shipment') {
      const result = await queryNavlungoStatus(order);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (err: any) {
    console.error('[Cargo Route] API error:', err);
    return NextResponse.json(
      { error: err.message || 'Kargo işlemi gerçekleştirilemedi.' },
      { status: 500 }
    );
  }
}
