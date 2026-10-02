import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        parent: true,
        children: {
          orderBy: { order: 'asc' },
          include: {
            products: true,
          },
        },
        products: true,
      },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Error in admin categories GET:', error);
    return NextResponse.json({ error: 'Kategoriler yüklenemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, parentId, order, showInMenu, isActive, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Kategori adı zorunludur.' }, { status: 400 });
    }

    let finalSlug = slug && slug.trim() ? slugify(slug.trim()) : slugify(name.trim());
    
    const existing = await prisma.category.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const newCategory = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        parentId: parentId && parentId !== 'none' ? parentId : null,
        order: parseInt(order) || 0,
        showInMenu: showInMenu !== undefined ? Boolean(showInMenu) : true,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, category: newCategory });
  } catch (error: any) {
    console.error('Error in admin categories POST:', error);
    return NextResponse.json({ error: error.message || 'Kategori eklenemedi.' }, { status: 500 });
  }
}
