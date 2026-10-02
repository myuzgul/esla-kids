import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET all banners
export async function GET() {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json({ banners });
  } catch (error: any) {
    console.error('Error fetching banners:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create banner
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, subtitle, badge, buttonText, buttonLink, image, mobileImage, order = 0, isActive = true } = body;

    if (!title || !image) {
      return NextResponse.json({ error: 'Başlık ve görsel zorunludur.' }, { status: 400 });
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle: subtitle || null,
        badge: badge || null,
        buttonText: buttonText || 'Hemen Keşfet',
        buttonLink: buttonLink || '/kategori/erkek-cocuk-takim',
        image,
        mobileImage: mobileImage || null,
        order: Number(order) || 0,
        isActive: Boolean(isActive),
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'BANNER_CREATED',
        entity: 'Banner',
        entityId: banner.id,
        performedBy: 'Yönetici',
        details: JSON.stringify({ title: banner.title }),
      },
    });

    return NextResponse.json({ success: true, banner });
  } catch (error: any) {
    console.error('Error creating banner:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
