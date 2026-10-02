import React from 'react';
import { prisma } from '@/lib/prisma';
import { AdminVitrinClient } from './AdminVitrinClient';

export const dynamic = 'force-dynamic';

export default async function AdminVitrinPage() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      categories: { include: { category: true } },
      variations: true,
    },
  });

  return (
    <div className="space-y-6">
      <AdminVitrinClient initialProducts={products} />
    </div>
  );
}
