import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        categories: { include: { category: true } },
        variations: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (err: any) {
    return NextResponse.json({ error: 'Ürün bilgisi alınamadı: ' + err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const {
      title,
      sku,
      price,
      compareAtPrice,
      taxRate,
      stock,
      description,
      shortDescription,
      categoryIds = [],
      images = [],
      variations = [],
      isFeatured,
    } = body;

    if (!title || price === undefined || price === null || price === '') {
      return NextResponse.json({ error: 'Ürün adı ve fiyat zorunludur.' }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({
      where: { id: params.id },
      include: { variations: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Güncellenecek ürün bulunamadı.' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Ensure Product SKU is unique (excluding self)
      let candidateProductSku = (sku && sku.trim()) 
        ? sku.trim().toUpperCase() 
        : (existing.sku || `EK-${Date.now().toString().slice(-6)}`);

      let isProductSkuUnique = false;
      let finalSku = candidateProductSku;
      while (!isProductSkuUnique) {
        const existingProd = await tx.product.findFirst({
          where: {
            sku: finalSku,
            NOT: { id: params.id },
          },
          select: { id: true },
        });
        if (existingProd) {
          finalSku = `${candidateProductSku}-${Math.floor(100 + Math.random() * 900)}`;
        } else {
          isProductSkuUnique = true;
        }
      }

      // 2. Delete old category relations
      await tx.categoriesOnProducts.deleteMany({
        where: { productId: params.id },
      });

      // 3. Delete existing variations
      await tx.productVariation.deleteMany({
        where: { productId: params.id },
      });

      // 4. Calculate total stock
      const calculatedStock = variations.length > 0 
        ? variations.reduce((acc: number, v: any) => acc + (parseInt(v.stock) || 0), 0) 
        : (parseInt(stock) || 0);

      // 5. Update Product
      const updatedProduct = await tx.product.update({
        where: { id: params.id },
        data: {
          title,
          sku: finalSku,
          barcode: null,
          price: parseFloat(price),
          compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
          taxRate: taxRate !== undefined ? (parseFloat(taxRate) || 10.0) : (existing.taxRate || 10.0),
          stock: calculatedStock,
          stockStatus: calculatedStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
          isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : existing.isFeatured,
          description: description || null,
          shortDescription: shortDescription || null,
          brandId: null,
          images: JSON.stringify(images),
          categories: {
            create: categoryIds.map((cId: string) => ({ categoryId: cId })),
          },
        },
      });

      // 6. Create new variations if provided with guaranteed unique SKUs
      const usedVariationSkusInBatch = new Set<string>();

      for (const v of variations) {
        let candidateVarSku = (v.sku && v.sku.trim()
          ? v.sku.trim()
          : `${updatedProduct.sku}-${Math.random().toString(36).substring(2, 6)}`
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
            productId: updatedProduct.id,
            sku: finalVarSku,
            barcode: null,
            price: v.price ? parseFloat(v.price) : updatedProduct.price,
            compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : updatedProduct.compareAtPrice,
            stock: parseInt(v.stock) || 0,
            attributes: typeof v.attributes === 'string' ? v.attributes : JSON.stringify(v.attributes || {}),
            image: v.image || (images[0] || null),
          },
        });
      }

      // 6. Log Activity
      await tx.activityLog.create({
        data: {
          action: 'PRODUCT_UPDATED',
          entity: 'Product',
          entityId: updatedProduct.id,
          performedBy: 'Yönetici',
          details: JSON.stringify({ title: updatedProduct.title, sku: updatedProduct.sku }),
        },
      });

      return updatedProduct;
    });

    return NextResponse.json({ success: true, product: result });
  } catch (err: any) {
    console.error('Product update error:', err);
    return NextResponse.json({ error: err.message || 'Ürün güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ürün bulunamadı.' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete variations
      await tx.productVariation.deleteMany({ where: { productId: params.id } });
      // Delete category links
      await tx.categoriesOnProducts.deleteMany({ where: { productId: params.id } });
      // Delete stock alerts
      await tx.stockAlert.deleteMany({ where: { productId: params.id } });
      // Delete reviews
      await tx.review.deleteMany({ where: { productId: params.id } });
      // Delete product
      await tx.product.delete({ where: { id: params.id } });

      await tx.activityLog.create({
        data: {
          action: 'PRODUCT_DELETED',
          entity: 'Product',
          entityId: params.id,
          performedBy: 'Yönetici',
          details: JSON.stringify({ title: existing.title, sku: existing.sku }),
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Ürün başarıyla silindi.' });
  } catch (err: any) {
    console.error('Product delete error:', err);
    return NextResponse.json({ error: err.message || 'Ürün silinemedi.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { isFeatured, isActive } = body;

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'PRODUCT_STATUS_UPDATED',
        entity: 'Product',
        entityId: params.id,
        performedBy: 'Yönetici',
        details: JSON.stringify({ isFeatured: product.isFeatured, isActive: product.isActive }),
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    console.error('Product patch error:', err);
    return NextResponse.json({ error: err.message || 'Ürün güncellenemedi.' }, { status: 500 });
  }
}
