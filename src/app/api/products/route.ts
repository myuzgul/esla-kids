import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const sort = searchParams.get('sort') || 'newest';

    // Sıralama kuralı
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (sort === 'price_desc') {
      orderBy = { price: 'desc' };
    }

    // Stokta olan ürünler ve stoğu bitmiş ürünler koşulları (varyant stokları dahil)
    const inStockWhere: any = {
      isActive: true,
      stockStatus: { not: 'OUT_OF_STOCK' },
      OR: [
        {
          variations: {
            some: {
              stock: { gt: 0 },
              isActive: true,
            },
          },
        },
        {
          variations: { none: {} },
          stock: { gt: 0 },
        },
      ],
    };

    const outOfStockWhere: any = {
      isActive: true,
      OR: [
        { stockStatus: 'OUT_OF_STOCK' },
        {
          variations: { none: {} },
          stock: { lte: 0 },
        },
        {
          variations: {
            some: {},
            none: { stock: { gt: 0 }, isActive: true },
          },
        },
      ],
    };

    const [inStockCount, outOfStockCount] = await Promise.all([
      prisma.product.count({ where: inStockWhere }),
      prisma.product.count({ where: outOfStockWhere }),
    ]);

    const total = inStockCount + outOfStockCount;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    let products: any[] = [];

    if (skip < inStockCount) {
      // Hala stokta olan ürünlerin olduğu sayfalardayız
      const inStockTake = Math.min(limit, inStockCount - skip);
      const inStockProducts = await prisma.product.findMany({
        where: inStockWhere,
        orderBy,
        skip,
        take: inStockTake,
        include: { variations: true },
      });

      if (inStockTake < limit) {
        // Bu sayfada in-stock ürünler bitti, kalanı out-of-stock'tan tamamla
        const remainingTake = limit - inStockTake;
        const outOfStockProducts = await prisma.product.findMany({
          where: outOfStockWhere,
          orderBy,
          skip: 0,
          take: remainingTake,
          include: { variations: true },
        });
        products = [...inStockProducts, ...outOfStockProducts];
      } else {
        products = inStockProducts;
      }
    } else {
      // Artık sadece stoğu bitmiş ürünlerin olduğu sayfalardayız
      const outOfStockSkip = skip - inStockCount;
      products = await prisma.product.findMany({
        where: outOfStockWhere,
        orderBy,
        skip: outOfStockSkip,
        take: limit,
        include: { variations: true },
      });
    }

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error: any) {
    console.error('Products API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Ürünler yüklenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
