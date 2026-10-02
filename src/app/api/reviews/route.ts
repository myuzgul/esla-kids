import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, customerName, email, rating, comment, images } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Ürün bilgisi eksik.' }, { status: 400 });
    }

    if (!customerName || customerName.trim().length < 2) {
      return NextResponse.json({ error: 'Lütfen adınızı ve soyadınızı belirtiniz.' }, { status: 400 });
    }

    const customerEmail = email && typeof email === 'string' && email.includes('@') ? email.trim() : '';

    const numRating = Math.max(1, Math.min(5, parseInt(rating) || 5));

    if (!comment || comment.trim().length < 3) {
      return NextResponse.json({ error: 'Lütfen en az 3 karakterden oluşan bir yorum yazınız.' }, { status: 400 });
    }

    // Verify if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Değerlendirilen ürün bulunamadı.' }, { status: 404 });
    }

    // Check if customer purchased this product (if email provided)
    let isVerifiedPurchase = false;
    if (customerEmail) {
      try {
        const orderMatch = await prisma.order.findFirst({
          where: {
            guestEmail: { equals: customerEmail },
            items: { some: { productId } },
            status: { in: ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'] },
          },
          select: { id: true },
        });
        if (orderMatch) isVerifiedPurchase = true;
      } catch (e) {}
    }

    // Format images JSON
    const imagesJson = Array.isArray(images) ? JSON.stringify(images.filter(Boolean)) : '[]';

    // Create review with isApproved: false (PENDING APPROVAL)
    const review = await prisma.review.create({
      data: {
        productId,
        customerName: customerName.trim(),
        email: customerEmail,
        rating: numRating,
        comment: comment.trim(),
        images: imagesJson,
        isApproved: false,
        isVerifiedPurchase,
      },
    });

    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          action: 'REVIEW_SUBMITTED',
          entity: 'Review',
          entityId: review.id,
          performedBy: customerName.trim(),
          details: JSON.stringify({
            productTitle: product.title,
            rating: numRating,
            hasImages: Array.isArray(images) && images.length > 0,
          }),
        },
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Teşekkürler! Yorumunuz ve fotoğraflarınız başarıyla alındı. Yönetici onayının ardından sitemizde yayınlanacaktır.',
      reviewId: review.id,
    });
  } catch (err: any) {
    console.error('Review submit error:', err);
    return NextResponse.json({ error: 'Yorum kaydedilirken bir hata oluştu: ' + err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId gereklidir.' }, { status: 400 });
    }

    const reviews = await prisma.review.findMany({
      where: {
        productId,
        isApproved: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCount = reviews.length;
    const averageRating = totalCount > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalCount)
      : 5.0;

    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (breakdown[r.rating] !== undefined) breakdown[r.rating]++;
    });

    return NextResponse.json({
      success: true,
      reviews,
      totalCount,
      averageRating: parseFloat(averageRating.toFixed(1)),
      breakdown,
    });
  } catch (err: any) {
    console.error('Reviews GET error:', err);
    return NextResponse.json({ error: 'Yorumlar yüklenemedi.' }, { status: 500 });
  }
}
