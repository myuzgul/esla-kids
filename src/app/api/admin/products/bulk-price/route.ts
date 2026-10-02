import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { categoryId = 'all', action = 'INCREASE', calcType = 'PERCENT', value = 0 } = body;

    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) {
      return NextResponse.json({ error: 'Lütfen geçerli bir artış/indirim değeri giriniz.' }, { status: 400 });
    }

    // 1. Find target products
    let productsToUpdate: any[] = [];
    if (categoryId === 'all') {
      productsToUpdate = await prisma.product.findMany({
        include: { variations: true },
      });
    } else {
      const links = await prisma.categoriesOnProducts.findMany({
        where: { categoryId },
        include: {
          product: {
            include: { variations: true },
          },
        },
      });
      productsToUpdate = links.map((l) => l.product).filter(Boolean);
    }

    if (productsToUpdate.length === 0) {
      return NextResponse.json({ error: 'Seçili kategoride güncellenecek ürün bulunamadı.' }, { status: 400 });
    }

    let updatedProductsCount = 0;
    let updatedVariationsCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const prod of productsToUpdate) {
        // Calculate new product price
        let newProdPrice = prod.price;
        if (action === 'INCREASE') {
          if (calcType === 'PERCENT') {
            newProdPrice = prod.price * (1 + numVal / 100);
          } else {
            newProdPrice = prod.price + numVal;
          }
        } else {
          // DECREASE
          if (calcType === 'PERCENT') {
            newProdPrice = prod.price * (1 - numVal / 100);
          } else {
            newProdPrice = prod.price - numVal;
          }
        }
        newProdPrice = Math.max(0.01, Math.round(newProdPrice * 100) / 100);

        await tx.product.update({
          where: { id: prod.id },
          data: {
            price: newProdPrice,
            // If decreasing price, preserve original as compareAtPrice if not set
            compareAtPrice: action === 'DECREASE' ? (prod.compareAtPrice || prod.price) : prod.compareAtPrice,
          },
        });
        updatedProductsCount++;

        // Update variations of this product
        for (const v of prod.variations) {
          let newVarPrice = v.price;
          if (action === 'INCREASE') {
            if (calcType === 'PERCENT') {
              newVarPrice = v.price * (1 + numVal / 100);
            } else {
              newVarPrice = v.price + numVal;
            }
          } else {
            if (calcType === 'PERCENT') {
              newVarPrice = v.price * (1 - numVal / 100);
            } else {
              newVarPrice = v.price - numVal;
            }
          }
          newVarPrice = Math.max(0.01, Math.round(newVarPrice * 100) / 100);

          await tx.productVariation.update({
            where: { id: v.id },
            data: {
              price: newVarPrice,
              compareAtPrice: action === 'DECREASE' ? (v.compareAtPrice || v.price) : v.compareAtPrice,
            },
          });
          updatedVariationsCount++;
        }
      }

      // Log bulk price update
      await tx.activityLog.create({
        data: {
          action: 'BULK_PRICE_UPDATED',
          entity: 'Product',
          performedBy: 'Yönetici',
          details: JSON.stringify({
            categoryId,
            action,
            calcType,
            value: numVal,
            productsCount: updatedProductsCount,
            variationsCount: updatedVariationsCount,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `${updatedProductsCount} adet ürün ve ${updatedVariationsCount} adet varyasyon fiyatı başarıyla güncellendi!`,
      productsCount: updatedProductsCount,
      variationsCount: updatedVariationsCount,
    });
  } catch (err: any) {
    console.error('Bulk price update error:', err);
    return NextResponse.json({ error: err.message || 'Toplu fiyat güncelleme yapılamadı.' }, { status: 500 });
  }
}
