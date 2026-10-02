import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';
import { AdminProductsListClient } from './AdminProductsListClient';
import { Plus, Package, Search, BadgePercent, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        categories: { include: { category: true } },
        variations: true,
      },
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-heading font-black text-2xl text-slate-900">
            Ürün Yönetimi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            çocuk ve bebek giyim ürünlerini, beden/renk varyasyonlarını ve stokları yönetin.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/vitrin"
            className="bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>Anasayfa Vitrin</span>
          </Link>
          <Link
            href="/admin/toplu-fiyat"
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <BadgePercent className="w-4 h-4 text-blue-600" />
            <span>Toplu Fiyat Güncelle</span>
          </Link>
          <Link
            href="/admin/urunler/yeni"
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Ürün Ekle</span>
          </Link>
        </div>
      </div>

      <AdminProductsListClient initialProducts={products} categories={categories} />
    </div>
  );
}
