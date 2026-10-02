import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PUT update banner
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { title, subtitle, badge, buttonText, buttonLink, image, mobileImage, order, isActive } = body;

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(subtitle !== undefined && { subtitle }),
        ...(badge !== undefined && { badge }),
        ...(buttonText !== undefined && { buttonText }),
        ...(buttonLink !== undefined && { buttonLink }),
        ...(image !== undefined && { image }),
        ...(mobileImage !== undefined && { mobileImage }),
        ...(order !== undefined && { order: Number(order) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'BANNER_UPDATED',
        entity: 'Banner',
        entityId: id,
        performedBy: 'Yönetici',
        details: JSON.stringify({ title: banner.title }),
      },
    });

    return NextResponse.json({ success: true, banner });
  } catch (error: any) {
    console.error('Error updating banner:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE banner
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const banner = await prisma.banner.delete({
      where: { id },
    });

    await prisma.activityLog.create({
      data: {
        action: 'BANNER_DELETED',
        entity: 'Banner',
        entityId: id,
        performedBy: 'Yönetici',
        details: JSON.stringify({ title: banner.title }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting banner:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
