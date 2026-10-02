import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q');

    const where: any = {};

    if (status === 'pending') {
      where.isApproved = false;
    } else if (status === 'approved') {
      where.isApproved = true;
    }

    if (q) {
      where.OR = [
        { customerName: { contains: q } },
        { email: { contains: q } },
        { comment: { contains: q } },
        { product: { title: { contains: q } } },
      ];
    }

    const [reviews, totalCount, pendingCount, approvedCount] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          product: {
            select: { id: true, title: true, slug: true, images: true, price: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count(),
      prisma.review.count({ where: { isApproved: false } }),
      prisma.review.count({ where: { isApproved: true } }),
    ]);

    return NextResponse.json({
      success: true,
      reviews,
      counts: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
      },
    });
  } catch (err: any) {
    console.error('Admin reviews GET error:', err);
    return NextResponse.json({ error: 'Yorumlar getirilemedi: ' + err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { reviewId, reviewIds } = body;

    if (reviewIds && Array.isArray(reviewIds)) {
      await prisma.review.deleteMany({
        where: { id: { in: reviewIds } },
      });
      return NextResponse.json({ success: true, count: reviewIds.length });
    }

    if (reviewId) {
      await prisma.review.delete({
        where: { id: reviewId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Silinecek yorum belirtilmedi.' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin review DELETE error:', err);
    return NextResponse.json({ error: 'Yorum silinemedi: ' + err.message }, { status: 500 });
  }
}
