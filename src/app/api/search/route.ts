import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: q } },
          { sku: { contains: q } },
          { barcode: { contains: q } },
          { description: { contains: q } },
          { brand: { name: { contains: q } } },
          { categories: { some: { category: { name: { contains: q } } } } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        sku: true,
        price: true,
        compareAtPrice: true,
        images: true,
        stockStatus: true,
      },
      take: 8,
    });

    const results = products.map((p) => {
      let image = '';
      try {
        const imgs = JSON.parse(p.images);
        if (Array.isArray(imgs) && imgs.length > 0) image = imgs[0];
      } catch (e) {}

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        image,
        inStock: p.stockStatus === 'IN_STOCK',
      };
    });

    // In-stock products first, out of stock last
    const sortedResults = results.sort((a, b) => {
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;
      return 0;
    });

    return NextResponse.json({ results: sortedResults });
  } catch (err: any) {
    console.error('Search API error:', err);
    return NextResponse.json({ error: 'Arama sırasında hata oluştu' }, { status: 500 });
  }
}
