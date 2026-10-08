import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderId, itemId, quantity, restoreStock = true } = body;

    if (!orderId || !itemId) {
      return NextResponse.json({ error: 'Sipariş ID ve Ürün ID gereklidir.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    const item = order.items.find((it) => it.id === itemId);
    if (!item) {
      return NextResponse.json({ error: 'Siparişe ait ürün kalemi bulunamadı.' }, { status: 404 });
    }

    // 1. ÜRÜN İPTAL / SİPARİŞTEN ÇIKARMA (REMOVE ITEM)
    if (action === 'remove_item') {
      if (order.items.length <= 1) {
        return NextResponse.json({
          error: 'Siparişte sadece 1 adet ürün bulunmaktadır. Son ürünü çıkarmak yerine siparişi iptal edebilirsiniz.',
        }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Stoğu iade et
        if (restoreStock) {
          if (item.variationId) {
            const currentVar = await tx.productVariation.findUnique({
              where: { id: item.variationId },
            });
            if (currentVar) {
              const prev = currentVar.stock;
              const next = prev + item.quantity;
              await tx.productVariation.update({
                where: { id: item.variationId },
                data: { stock: next },
              });
              await tx.stockMovement.create({
                data: {
                  productId: currentVar.productId,
                  variationId: item.variationId,
                  change: item.quantity,
                  previousStock: prev,
                  newStock: next,
                  reason: 'ORDER_ITEM_CANCELLED',
                  referenceId: order.orderNumber,
                },
              });
            }
          } else if (item.productId) {
            const currentProd = await tx.product.findUnique({
              where: { id: item.productId },
            });
            if (currentProd) {
              const prev = currentProd.stock;
              const next = prev + item.quantity;
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: next },
              });
              await tx.stockMovement.create({
                data: {
                  productId: currentProd.id,
                  change: item.quantity,
                  previousStock: prev,
                  newStock: next,
                  reason: 'ORDER_ITEM_CANCELLED',
                  referenceId: order.orderNumber,
                },
              });
            }
          }
        }

        // Sipariş kalemini sil
        await tx.orderItem.delete({
          where: { id: itemId },
        });

        // Kalan ürünlerle toplamları yeniden hesapla
        const remainingItems = await tx.orderItem.findMany({
          where: { orderId },
          include: {
            variation: true,
          },
        });

        const newSubtotal = remainingItems.reduce((acc, it) => acc + it.total, 0);
        const newTotalAmount = Math.max(
          0,
          newSubtotal + (order.shippingFee || 0) + (order.codFee || 0) - (order.discountAmount || 0)
        );

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            subtotal: newSubtotal,
            totalAmount: newTotalAmount,
          },
          include: {
            items: {
              include: {
                variation: true,
              },
            },
          },
        });

        await tx.activityLog.create({
          data: {
            action: 'ORDER_ITEM_CANCELLED',
            entity: 'Order',
            entityId: order.id,
            performedBy: 'Yönetici',
            details: JSON.stringify({
              orderNumber: order.orderNumber,
              cancelledItem: {
                title: item.title,
                variationName: item.variationName,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
              },
              restoredStock: restoreStock,
              previousTotal: order.totalAmount,
              newTotal: newTotalAmount,
            }),
          },
        });

        return updatedOrder;
      });

      return NextResponse.json({
        success: true,
        message: `"${item.title}" siparişten çıkarıldı ve tutar güncellendi.`,
        order: result,
      });
    }

    // 2. ÜRÜN ADEDİ GÜNCELLEME (UPDATE QUANTITY)
    if (action === 'update_quantity') {
      const newQty = parseInt(String(quantity), 10);
      if (isNaN(newQty) || newQty <= 0) {
        return NextResponse.json({ error: 'Geçersiz ürün adedi.' }, { status: 400 });
      }

      if (newQty === item.quantity) {
        return NextResponse.json({ success: true, order });
      }

      const diff = newQty - item.quantity; // diff > 0 ise adet artırılmış, diff < 0 ise adet azaltılmış

      const result = await prisma.$transaction(async (tx) => {
        if (restoreStock) {
          if (diff < 0) {
            // Adet azaltıldı -> stoğa geri iade et
            const refundQty = Math.abs(diff);
            if (item.variationId) {
              const currentVar = await tx.productVariation.findUnique({
                where: { id: item.variationId },
              });
              if (currentVar) {
                const prev = currentVar.stock;
                const next = prev + refundQty;
                await tx.productVariation.update({
                  where: { id: item.variationId },
                  data: { stock: next },
                });
                await tx.stockMovement.create({
                  data: {
                    productId: currentVar.productId,
                    variationId: item.variationId,
                    change: refundQty,
                    previousStock: prev,
                    newStock: next,
                    reason: 'ORDER_QUANTITY_DECREASED',
                    referenceId: order.orderNumber,
                  },
                });
              }
            } else if (item.productId) {
              const currentProd = await tx.product.findUnique({
                where: { id: item.productId },
              });
              if (currentProd) {
                const prev = currentProd.stock;
                const next = prev + refundQty;
                await tx.product.update({
                  where: { id: item.productId },
                  data: { stock: next },
                });
                await tx.stockMovement.create({
                  data: {
                    productId: currentProd.id,
                    change: refundQty,
                    previousStock: prev,
                    newStock: next,
                    reason: 'ORDER_QUANTITY_DECREASED',
                    referenceId: order.orderNumber,
                  },
                });
              }
            }
          } else if (diff > 0) {
            // Adet artırıldı -> stoktan düş
            const takeQty = diff;
            if (item.variationId) {
              const currentVar = await tx.productVariation.findUnique({
                where: { id: item.variationId },
              });
              if (currentVar) {
                const prev = currentVar.stock;
                const next = prev - takeQty;
                await tx.productVariation.update({
                  where: { id: item.variationId },
                  data: { stock: next },
                });
                await tx.stockMovement.create({
                  data: {
                    productId: currentVar.productId,
                    variationId: item.variationId,
                    change: -takeQty,
                    previousStock: prev,
                    newStock: next,
                    reason: 'ORDER_QUANTITY_INCREASED',
                    referenceId: order.orderNumber,
                  },
                });
              }
            } else if (item.productId) {
              const currentProd = await tx.product.findUnique({
                where: { id: item.productId },
              });
              if (currentProd) {
                const prev = currentProd.stock;
                const next = prev - takeQty;
                await tx.product.update({
                  where: { id: item.productId },
                  data: { stock: next },
                });
                await tx.stockMovement.create({
                  data: {
                    productId: currentProd.id,
                    change: -takeQty,
                    previousStock: prev,
                    newStock: next,
                    reason: 'ORDER_QUANTITY_INCREASED',
                    referenceId: order.orderNumber,
                  },
                });
              }
            }
          }
        }

        // Kalem miktarını ve tutarını güncelle
        const newItemTotal = item.price * newQty;
        await tx.orderItem.update({
          where: { id: itemId },
          data: {
            quantity: newQty,
            total: newItemTotal,
          },
        });

        // Kalan ürünlerle toplamları yeniden hesapla
        const allItems = await tx.orderItem.findMany({
          where: { orderId },
          include: {
            variation: true,
          },
        });

        const newSubtotal = allItems.reduce((acc, it) => acc + it.total, 0);
        const newTotalAmount = Math.max(
          0,
          newSubtotal + (order.shippingFee || 0) + (order.codFee || 0) - (order.discountAmount || 0)
        );

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            subtotal: newSubtotal,
            totalAmount: newTotalAmount,
          },
          include: {
            items: {
              include: {
                variation: true,
              },
            },
          },
        });

        await tx.activityLog.create({
          data: {
            action: 'ORDER_ITEM_QUANTITY_CHANGED',
            entity: 'Order',
            entityId: order.id,
            performedBy: 'Yönetici',
            details: JSON.stringify({
              orderNumber: order.orderNumber,
              itemTitle: item.title,
              oldQty: item.quantity,
              newQty,
              oldTotal: order.totalAmount,
              newTotal: newTotalAmount,
            }),
          },
        });

        return updatedOrder;
      });

      return NextResponse.json({
        success: true,
        message: `Ürün adedi ${newQty} olarak güncellendi.`,
        order: result,
      });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (err: any) {
    console.error('[Order Items API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Ürün işlemi gerçekleştirilemedi.' },
      { status: 500 }
    );
  }
}
