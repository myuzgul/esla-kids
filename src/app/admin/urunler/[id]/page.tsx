import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProductEditClient } from './ProductEditClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function ProductEditPage({ params }: Props) {
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        categories: { include: { category: true } },
        variations: true,
      },
    }),
    prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
    }),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <ProductEditClient 
      product={product} 
      categories={categories} 
    />
  );
}
