import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        categories: { include: { category: true } },
        brand: true,
        variations: true,
      },
    });
    return NextResponse.json({ products });
  } catch (err: any) {
    return NextResponse.json({ error: 'Ürünler yüklenemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      sku,
      price,
      compareAtPrice,
      taxRate = 10,
      stock,
      description,
      shortDescription,
      categoryIds = [],
      images = [],
      variations = [],
      isFeatured = false,
    } = body;

    if (!title || price === undefined || price === null || price === '') {
      return NextResponse.json({ error: 'Ürün adı ve fiyat zorunludur.' }, { status: 400 });
    }

    const slug = slugify(title) + '-' + Math.floor(1000 + Math.random() * 9000);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Ensure Product SKU is globally unique in DB
      let candidateProductSku = (sku && sku.trim()) 
        ? sku.trim().toUpperCase() 
        : `EK-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;

      let isProductSkuUnique = false;
      let finalSku = candidateProductSku;
      while (!isProductSkuUnique) {
        const existingProd = await tx.product.findUnique({
          where: { sku: finalSku },
          select: { id: true },
        });
        if (existingProd) {
          finalSku = `${candidateProductSku}-${Math.floor(100 + Math.random() * 900)}`;
        } else {
          isProductSkuUnique = true;
        }
      }

      // Create Product
      const product = await tx.product.create({
        data: {
          title,
          slug,
          sku: finalSku,
          barcode: null,
          price: parseFloat(price),
          compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
          taxRate: parseFloat(taxRate) || 10.0,
          stock: variations.length > 0 ? variations.reduce((acc: number, v: any) => acc + (parseInt(v.stock) || 0), 0) : (parseInt(stock) || 0),
          stockStatus: (parseInt(stock) || 0) > 0 || variations.some((v: any) => (parseInt(v.stock) || 0) > 0) ? 'IN_STOCK' : 'OUT_OF_STOCK',
          isFeatured: Boolean(isFeatured),
          description: description || null,
          shortDescription: shortDescription || null,
          brandId: null,
          images: JSON.stringify(images),
          categories: {
            create: categoryIds.map((cId: string) => ({ categoryId: cId })),
          },
        },
      });

      // 2. Create Variations if any with guaranteed unique SKUs
      const usedVariationSkusInBatch = new Set<string>();

      for (const v of variations) {
        let candidateVarSku = (v.sku && v.sku.trim()
          ? v.sku.trim()
          : `${product.sku}-${Math.random().toString(36).substring(2, 7)}`
        ).toUpperCase();

        let isVarUnique = false;
        let finalVarSku = candidateVarSku;
        while (!isVarUnique) {
          if (usedVariationSkusInBatch.has(finalVarSku)) {
            finalVarSku = `${candidateVarSku}-${Math.floor(100 + Math.random() * 900)}`;
            continue;
          }

          const existingDbVar = await tx.productVariation.findUnique({
            where: { sku: finalVarSku },
            select: { id: true },
          });

          if (existingDbVar) {
            finalVarSku = `${candidateVarSku}-${Math.floor(100 + Math.random() * 900)}`;
            continue;
          }

          isVarUnique = true;
        }

        usedVariationSkusInBatch.add(finalVarSku);

        await tx.productVariation.create({
          data: {
            productId: product.id,
            sku: finalVarSku,
            barcode: null,
            price: v.price ? parseFloat(v.price) : product.price,
            compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : product.compareAtPrice,
            stock: parseInt(v.stock) || 0,
            attributes: typeof v.attributes === 'string' ? v.attributes : JSON.stringify(v.attributes || {}),
            image: v.image || (images[0] || null),
          },
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          action: 'PRODUCT_CREATED',
          entity: 'Product',
          entityId: product.id,
          performedBy: 'Yönetici',
          details: JSON.stringify({ title: product.title, sku: product.sku }),
        },
      });

      return product;
    });

    return NextResponse.json({ success: true, product: result });
  } catch (err: any) {
    console.error('Product create error:', err);
    return NextResponse.json({ error: err.message || 'Ürün oluşturulamadı.' }, { status: 500 });
  }
}
