import React from 'react';
import { prisma } from '@/lib/prisma';
import { ProductCreateClient } from './ProductCreateClient';

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <ProductCreateClient categories={categories} />
    </div>
  );
}
