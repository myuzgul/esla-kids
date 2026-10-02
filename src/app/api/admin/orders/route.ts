import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status');
  const q = searchParams.get('q')?.trim();

  const where: any = {};

  if (statusParam) {
    const statuses = statusParam.split(',').filter(Boolean);
    where.status = { in: statuses };
  }

  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { guestName: { contains: q } },
      { guestPhone: { contains: q } },
      { guestEmail: { contains: q } },
      { trackingNumber: { contains: q } },
    ];
  }

  try {
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ orders });
  } catch (err: any) {
    console.error('Admin orders API error:', err);
    return NextResponse.json({ error: 'Siparişler getirilemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, orderIds } = body;

    const idsToDelete: string[] = [];
    if (orderId && typeof orderId === 'string') {
      idsToDelete.push(orderId);
    } else if (Array.isArray(orderIds)) {
      idsToDelete.push(...orderIds.filter(Boolean));
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Silinecek sipariş ID belirtilmedi.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { id: { in: idsToDelete } },
        select: { id: true, orderNumber: true },
      });

      await tx.orderItem.deleteMany({
        where: { orderId: { in: idsToDelete } },
      });

      await tx.order.deleteMany({
        where: { id: { in: idsToDelete } },
      });

      for (const ord of orders) {
        await tx.activityLog.create({
          data: {
            action: 'ORDER_DELETED',
            entity: 'Order',
            entityId: ord.id,
            performedBy: 'Yönetici',
            details: JSON.stringify({ orderNumber: ord.orderNumber }),
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `${idsToDelete.length} adet sipariş başarıyla silindi.`,
    });
  } catch (err: any) {
    console.error('Delete order error:', err);
    return NextResponse.json({ error: err.message || 'Sipariş silinemedi.' }, { status: 500 });
  }
}
