import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reviewId, reviewIds, isApproved, isVerifiedPurchase } = body;

    if (reviewIds && Array.isArray(reviewIds)) {
      await prisma.review.updateMany({
        where: { id: { in: reviewIds } },
        data: {
          isApproved: Boolean(isApproved),
        },
      });

      return NextResponse.json({
        success: true,
        message: `${reviewIds.length} adet yorum güncellendi.`,
      });
    }

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId gereklidir.' }, { status: 400 });
    }

    const data: any = {};
    if (isApproved !== undefined) data.isApproved = Boolean(isApproved);
    if (isVerifiedPurchase !== undefined) data.isVerifiedPurchase = Boolean(isVerifiedPurchase);

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data,
    });

    return NextResponse.json({
      success: true,
      review: updated,
      message: updated.isApproved ? 'Yorum onaylandı ve yayına alındı.' : 'Yorum yayından kaldırıldı.',
    });
  } catch (err: any) {
    console.error('Admin review status update error:', err);
    return NextResponse.json({ error: 'Yorum durumu güncellenemedi: ' + err.message }, { status: 500 });
  }
}
