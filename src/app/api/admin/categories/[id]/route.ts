import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { name, slug, parentId, order, showInMenu, isActive, description } = body;

    const existing = await prisma.category.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Kategori bulunamadı.' }, { status: 404 });
    }

    let finalSlug = existing.slug;
    if (slug && slug.trim() && slug.trim() !== existing.slug) {
      finalSlug = slugify(slug.trim());
      const slugCollision = await prisma.category.findFirst({
        where: { slug: finalSlug, id: { not: params.id } },
      });
      if (slugCollision) {
        finalSlug = `${finalSlug}-${Math.floor(100 + Math.random() * 900)}`;
      }
    } else if (name && name.trim() && !slug) {
      finalSlug = slugify(name.trim());
    }

    const updated = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        slug: finalSlug,
        parentId: parentId !== undefined ? (parentId && parentId !== 'none' && parentId !== params.id ? parentId : null) : existing.parentId,
        order: order !== undefined ? parseInt(order) : existing.order,
        showInMenu: showInMenu !== undefined ? Boolean(showInMenu) : existing.showInMenu,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    console.error('Error in admin category PUT:', error);
    return NextResponse.json({ error: error.message || 'Kategori güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: { children: true, products: true },
    });

    if (!category) {
      return NextResponse.json({ error: 'Kategori bulunamadı.' }, { status: 404 });
    }

    // Re-link children to grandparent or null
    if (category.children.length > 0) {
      await prisma.category.updateMany({
        where: { parentId: params.id },
        data: { parentId: category.parentId || null },
      });
    }

    await prisma.category.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Kategori başarıyla silindi.' });
  } catch (error: any) {
    console.error('Error in admin category DELETE:', error);
    return NextResponse.json({ error: error.message || 'Kategori silinemedi.' }, { status: 500 });
  }
}
