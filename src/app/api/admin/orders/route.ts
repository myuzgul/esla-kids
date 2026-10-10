import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildOrderSearchWhere } from '@/lib/orderSearch';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status');
  const printStatusParam = searchParams.get('printStatus');
  const q = searchParams.get('q')?.trim() || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '30', 10) || 30));
  const searchAll = searchParams.get('searchAll') === 'true';

  const where = buildOrderSearchWhere({
    q,
    status: statusParam,
    printStatus: printStatusParam,
    searchAllStatusesIfQuery: searchAll,
  });

  const skip = (page - 1) * pageSize;

  try {
    const [totalCount, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          items: true,
          customer: true,
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return NextResponse.json({ 
      orders, 
      totalCount, 
      totalPages, 
      page, 
      pageSize 
    });
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
