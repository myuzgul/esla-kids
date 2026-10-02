import React from 'react';
import { prisma } from '@/lib/prisma';
import { WooCommerceMigrationClient } from './WooCommerceMigrationClient';

export default async function WooCommercePage() {
  const [totalProducts, totalVariations, totalOrders, totalCategories, settings] = await Promise.all([
    prisma.product.count(),
    prisma.productVariation.count(),
    prisma.order.count(),
    prisma.category.count(),
    prisma.setting.findMany({
      where: {
        key: { in: ['wc_url', 'wc_consumer_key', 'wc_consumer_secret'] },
      },
    }),
  ]);

  const settingsMap = settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  const initialConfig = {
    url: settingsMap['wc_url'] || 'https://eslakids.com',
    consumerKey: settingsMap['wc_consumer_key'] || '',
    consumerSecret: settingsMap['wc_consumer_secret'] || '',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <WooCommerceMigrationClient
        currentStats={{
          products: totalProducts,
          variations: totalVariations,
          orders: totalOrders,
          categories: totalCategories,
        }}
        initialConfig={initialConfig}
      />
    </div>
  );
}
