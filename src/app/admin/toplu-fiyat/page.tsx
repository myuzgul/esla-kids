import React from 'react';
import { prisma } from '@/lib/prisma';
import { BulkPriceManager } from '@/components/admin/BulkPriceManager';
import { BadgePercent, Package, Layers, History, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminBulkPricePage() {
  const [categories, productCount, variationCount, recentLogs] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.product.count(),
    prisma.productVariation.count(),
    prisma.activityLog.findMany({
      where: { action: 'BULK_PRICE_UPDATED' },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BadgePercent className="w-5 h-5" />
            </div>
            <h1 className="font-heading font-black text-2xl text-slate-900">
              Toplu Ürün Fiyatı Güncelleme
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kategori bazlı yüzde veya sabit tutar üzerinden toplu zam / indirim uygulayın.
          </p>
        </div>

        <Link
          href="/admin/urunler"
          className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Package className="w-4 h-4 text-slate-400" />
          <span>Ürün Listesine Git</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>

      {/* Info Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toplam Ürün</div>
            <div className="text-lg font-black text-slate-900">{productCount} Adet</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toplam Varyasyon</div>
            <div className="text-lg font-black text-slate-900">{variationCount} Beden/Renk</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <BadgePercent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tanımlı Kategori</div>
            <div className="text-lg font-black text-slate-900">{categories.length} Kategori</div>
          </div>
        </div>
      </div>

      {/* Main Bulk Price Card */}
      <BulkPriceManager categories={categories} />

      {/* Recent Bulk Price Operations */}
      {recentLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Son Toplu Fiyat Güncellemeleri
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {recentLogs.map((log) => {
              let details: any = {};
              try { details = JSON.parse(log.details || '{}'); } catch (e) {}
              const isIncrease = details.action === 'INCREASE';
              const dateStr = new Date(log.createdAt).toLocaleString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isIncrease ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {isIncrease ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">
                        {isIncrease ? 'Fiyat Artışı (Zam)' : 'İndirim Uygulandı'}:{' '}
                        <span className={isIncrease ? 'text-blue-600' : 'text-amber-600'}>
                          {details.value} {details.calcType === 'PERCENT' ? '%' : 'TL'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {details.productsCount || 0} ürün, {details.variationsCount || 0} varyasyon güncellendi
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-slate-500 font-medium text-[11px]">{dateStr}</div>
                    <div className="text-[10px] text-slate-400">{log.performedBy}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
