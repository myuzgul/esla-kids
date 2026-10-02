import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyMenu = searchParams.get('menu') === 'true';

    const whereCondition: any = {
      isActive: true,
      parentId: null,
    };

    if (onlyMenu) {
      whereCondition.showInMenu = true;
    }

    const categories = await prisma.category.findMany({
      where: whereCondition,
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: onlyMenu ? { isActive: true, showInMenu: true } : { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            children: {
              where: onlyMenu ? { isActive: true, showInMenu: true } : { isActive: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Kategoriler yüklenemedi' }, { status: 500 });
  }
}
