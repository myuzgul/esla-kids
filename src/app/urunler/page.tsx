import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { AllProductsClient } from '@/components/AllProductsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tüm Ürünlerimiz | Esla Kids Bebek ve Çocuk Giyim',
  description: 'Esla Kids tüm bebek ve çocuk takımları, elbiseler, pijama modelleri ve yeni sezon ürünleri en uygun fiyatlarla.',
  openGraph: {
    title: 'Tüm Ürünlerimiz | Esla Kids',
    description: 'En kaliteli pamuklu bebek ve çocuk giyim modelleri.',
    url: 'https://eslakids.com/urunler',
  },
};

export default async function AllProductsPage() {
  const inStockWhere: any = {
    isActive: true,
    stockStatus: { not: 'OUT_OF_STOCK' },
    stock: { gt: 0 },
  };

  const outOfStockWhere: any = {
    isActive: true,
    OR: [
      { stockStatus: 'OUT_OF_STOCK' },
      { stock: { lte: 0 } },
    ],
  };

  let initialProducts: any[] = [];
  let total = 0;

  try {
    const [inStockCount, outOfStockCount] = await Promise.all([
      prisma.product.count({ where: inStockWhere }),
      prisma.product.count({ where: outOfStockWhere }),
    ]);

    total = inStockCount + outOfStockCount;

    // İlk 20 ürünü çek (önce stokta olanlar)
    const inStockTake = Math.min(20, inStockCount);
    const inStockProducts = await prisma.product.findMany({
      where: inStockWhere,
      orderBy: { createdAt: 'desc' },
      take: inStockTake,
      include: { variations: true },
    });

    if (inStockTake < 20 && outOfStockCount > 0) {
      const remainingTake = 20 - inStockTake;
      const outOfStockProducts = await prisma.product.findMany({
        where: outOfStockWhere,
        orderBy: { createdAt: 'desc' },
        take: remainingTake,
        include: { variations: true },
      });
      initialProducts = [...inStockProducts, ...outOfStockProducts];
    } else {
      initialProducts = inStockProducts;
    }
  } catch (error) {
    console.error('AllProductsPage SSR fetch error:', error);
  }

  return (
    <AllProductsClient
      initialProducts={initialProducts}
      initialTotal={total}
    />
  );
}
