import React from 'react';
import { prisma } from '@/lib/prisma';
import { AdminCategoriesClient } from './AdminCategoriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: {
      parent: true,
      children: {
        orderBy: { order: 'asc' },
        include: {
          products: true,
        },
      },
      products: true,
    },
  });

  return <AdminCategoriesClient initialCategories={categories as any} />;
}
