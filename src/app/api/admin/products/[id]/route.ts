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

      // 3. Load existing variations to preserve their IDs across updates
      const existingVariations = await tx.productVariation.findMany({
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

      // 6. Upsert variations: preserve IDs if existing variation matches
      const usedVariationSkusInBatch = new Set<string>();
      const processedVariationIds = new Set<string>();

      for (const v of variations) {
        const incomingAttrsStr = typeof v.attributes === 'string' ? v.attributes : JSON.stringify(v.attributes || {});
        
        let matchingExisting = existingVariations.find((ev) => {
          if (v.id && ev.id === v.id) return true;
          if (v.sku && ev.sku.toUpperCase() === v.sku.trim().toUpperCase()) return true;
          // Match by identical attributes
          try {
            const evAttrs = typeof ev.attributes === 'string' ? JSON.parse(ev.attributes) : ev.attributes;
            const inAttrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
            const evColor = (evAttrs?.['Renk'] || evAttrs?.['Desen'] || '').toLowerCase();
            const evSize = (evAttrs?.['Beden'] || evAttrs?.['Yaş'] || evAttrs?.['Size'] || '').toLowerCase();
            const inColor = (inAttrs?.['Renk'] || inAttrs?.['Desen'] || '').toLowerCase();
            const inSize = (inAttrs?.['Beden'] || inAttrs?.['Yaş'] || inAttrs?.['Size'] || '').toLowerCase();
            return evColor === inColor && evSize === inSize;
          } catch (e) {
            return false;
          }
        });

        let finalVarSku = (matchingExisting?.sku || (v.sku && v.sku.trim() ? v.sku.trim() : `${updatedProduct.sku}-${Math.random().toString(36).substring(2, 6)}`)).toUpperCase();

        // Ensure SKU uniqueness if newly generated
        if (!matchingExisting || matchingExisting.sku !== finalVarSku) {
          let isVarUnique = false;
          let candidate = finalVarSku;
          while (!isVarUnique) {
            if (usedVariationSkusInBatch.has(candidate)) {
              candidate = `${finalVarSku}-${Math.floor(100 + Math.random() * 900)}`;
              continue;
            }
            const existingDbVar = await tx.productVariation.findUnique({
              where: { sku: candidate },
              select: { id: true },
            });
            if (existingDbVar && (!matchingExisting || existingDbVar.id !== matchingExisting.id)) {
              candidate = `${finalVarSku}-${Math.floor(100 + Math.random() * 900)}`;
              continue;
            }
            isVarUnique = true;
            finalVarSku = candidate;
          }
        }

        usedVariationSkusInBatch.add(finalVarSku);

        if (matchingExisting) {
          // UPDATE existing variation -> PRESERVES variation ID!
          processedVariationIds.add(matchingExisting.id);
          await tx.productVariation.update({
            where: { id: matchingExisting.id },
            data: {
              sku: finalVarSku,
              barcode: null,
              price: v.price ? parseFloat(v.price) : updatedProduct.price,
              compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : updatedProduct.compareAtPrice,
              stock: parseInt(v.stock) || 0,
              attributes: incomingAttrsStr,
              image: v.image || (images[0] || null),
              isActive: true,
            },
          });
        } else {
          // CREATE brand new variation
          const created = await tx.productVariation.create({
            data: {
              productId: updatedProduct.id,
              sku: finalVarSku,
              barcode: null,
              price: v.price ? parseFloat(v.price) : updatedProduct.price,
              compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : updatedProduct.compareAtPrice,
              stock: parseInt(v.stock) || 0,
              attributes: incomingAttrsStr,
              image: v.image || (images[0] || null),
              isActive: true,
            },
          });
          processedVariationIds.add(created.id);
        }
      }

      // Delete only the old variations that are no longer part of the updated list
      const removedVariationIds = existingVariations
        .filter((ev) => !processedVariationIds.has(ev.id))
        .map((ev) => ev.id);

      if (removedVariationIds.length > 0) {
        await tx.productVariation.deleteMany({
          where: { id: { in: removedVariationIds } },
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
