import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queryParam = searchParams.get('orderNumber')?.trim() || searchParams.get('query')?.trim();
  const phoneOrEmail = searchParams.get('phoneOrEmail')?.trim();

  if (!queryParam) {
    return NextResponse.json({ error: 'Sipariş numarası veya Kargo Takip Kodu gereklidir.' }, { status: 400 });
  }

  try {
    // Search either by exact orderNumber or exact trackingNumber, or case-insensitive contains
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: queryParam },
          { trackingNumber: queryParam },
          { orderNumber: { contains: queryParam } },
          { trackingNumber: { contains: queryParam } },
        ],
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!order) {
      return NextResponse.json({ error: 'Belirtilen numara veya takip koduna ait sipariş bulunamadı.' }, { status: 404 });
    }

    // Optional phone/email verification if provided
    if (phoneOrEmail) {
      const matchEmail = order.guestEmail && order.guestEmail.toLowerCase().includes(phoneOrEmail.toLowerCase());
      const matchPhone = order.guestPhone && order.guestPhone.replace(/[^0-9]/g, '').includes(phoneOrEmail.replace(/[^0-9]/g, ''));
      if (!matchEmail && !matchPhone) {
        return NextResponse.json({ error: 'Sipariş numarası ile e-posta / telefon bilgisi eşleşmiyor.' }, { status: 403 });
      }
    }

    return NextResponse.json({ order });
  } catch (err: any) {
    console.error('Order track error:', err);
    return NextResponse.json({ error: 'Sorgulama hatası oluştu.' }, { status: 500 });
  }
}
