import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const limitParam = parseInt(searchParams.get('limit') || '10', 10);
  const limit = Math.min(Math.max(limitParam, 1), 50);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  try {
    const whereCondition: any = {
      isActive: true,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { brand: { name: { contains: q, mode: 'insensitive' } } },
        { categories: { some: { category: { name: { contains: q, mode: 'insensitive' } } } } },
        { variations: { some: { OR: [
          { sku: { contains: q, mode: 'insensitive' } },
          { attributes: { contains: q, mode: 'insensitive' } },
        ] } } },
      ],
    };

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          slug: true,
          sku: true,
          price: true,
          compareAtPrice: true,
          images: true,
          stockStatus: true,
          stock: true,
          variations: {
            select: {
              id: true,
              sku: true,
              price: true,
              compareAtPrice: true,
              stock: true,
              image: true,
              attributes: true,
            },
          },
        },
        take: limit,
      }),
      prisma.product.count({
        where: whereCondition,
      }),
    ]);

    const results = products.map((p) => {
      let image = '';
      try {
        const imgs = JSON.parse(p.images);
        if (Array.isArray(imgs) && imgs.length > 0) image = imgs[0];
      } catch (e) {}

      // If product has variation image and base image is empty
      if (!image && p.variations && p.variations.length > 0) {
        const varImg = p.variations.find((v) => v.image)?.image;
        if (varImg) image = varImg;
      }

      const inStock = p.stockStatus === 'IN_STOCK' || (p.stock !== undefined && p.stock > 0) || p.variations.some((v) => v.stock > 0);

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        image,
        inStock,
        variationCount: p.variations?.length || 0,
      };
    });

    // In-stock products first, out of stock last
    const sortedResults = results.sort((a, b) => {
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;
      return 0;
    });

    return NextResponse.json({ results: sortedResults, total: totalCount });
  } catch (err: any) {
    console.error('Search API error:', err);
    return NextResponse.json({ error: 'Arama sırasında hata oluştu' }, { status: 500 });
  }
}
