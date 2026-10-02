import React from 'react';
import { prisma } from '@/lib/prisma';
import { AdminBannersClient } from './AdminBannersClient';
import { SlidersHorizontal, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminBannersPage() {
  const banners = await prisma.banner.findMany({
    orderBy: { order: 'asc' },
  });

  return (
    <div className="space-y-6">
      <AdminBannersClient initialBanners={banners} />
    </div>
  );
}
