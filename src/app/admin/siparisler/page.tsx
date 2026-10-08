import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDate, ORDER_STATUS_MAP } from '@/lib/utils';
import { OrdersTableClient } from './OrdersTableClient';
import { Printer, CheckSquare, Search, Filter } from 'lucide-react';

interface Props {
  searchParams: { status?: string; q?: string; printStatus?: string };
}

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status, q, printStatus } = searchParams;

  const baseWhere: any = {};
  if (status && status !== 'ALL') {
    if (status === 'CONFIRMED') {
      baseWhere.status = { in: ['CONFIRMED', 'NEW', 'APPROVED'] };
    } else if (status === 'PACKED') {
      baseWhere.status = { in: ['PACKED', 'PRINTED', 'PREPARING'] };
    } else {
      baseWhere.status = status;
    }
  }
  if (q) {
    baseWhere.OR = [
      { orderNumber: { contains: q } },
      { guestName: { contains: q } },
      { guestPhone: { contains: q } },
      { guestEmail: { contains: q } },
      { trackingNumber: { contains: q } },
    ];
  }

  // Count unprinted and printed in current filter scope
  const [totalInView, unprintedInView, printedInView] = await Promise.all([
    prisma.order.count({ where: baseWhere }),
    prisma.order.count({ where: { ...baseWhere, isPrinted: false } }),
    prisma.order.count({ where: { ...baseWhere, isPrinted: true } }),
  ]);

  const where: any = { ...baseWhere };
  if (printStatus === 'unprinted') {
    where.isPrinted = false;
  } else if (printStatus === 'printed') {
    where.isPrinted = true;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
    },
  });

  const buildUrl = (newStatus?: string, newPrintStatus?: string) => {
    const params = new URLSearchParams();
    const s = newStatus !== undefined ? newStatus : (status || 'ALL');
    const ps = newPrintStatus !== undefined ? newPrintStatus : (printStatus || 'ALL');
    if (s && s !== 'ALL') params.set('status', s);
    if (ps && ps !== 'ALL') params.set('printStatus', ps);
    if (q) params.set('q', q);
    const qs = params.toString();
    return `/admin/siparisler${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-heading font-black text-2xl text-slate-900">
            Sipariş Yönetimi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gelen siparişleri filtreleyin, hazırlayın, yazdırın veya kargoya verin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unprintedInView > 0 && (
            <Link
              href={`/admin/siparis-cikti?ids=${orders.filter(o => !o.isPrinted).map(o => o.id).join(',')}`}
              target="_blank"
              className="flex-1 sm:flex-none justify-center bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors text-center"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdırılmayanlar ({unprintedInView})</span>
            </Link>
          )}

          <Link
            href="/admin/siparis-cikti"
            target="_blank"
            className="flex-1 sm:flex-none justify-center bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors text-center"
          >
            <Printer className="w-4 h-4" />
            <span>Tümünü Yazdır</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Container */}
      <div className="space-y-3.5 bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search Bar */}
        <form method="GET" action="/admin/siparisler" className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {printStatus && <input type="hidden" name="printStatus" value={printStatus} />}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Sipariş no, müşteri adı, telefon veya takip no ara..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl text-xs text-slate-800 font-medium placeholder-slate-400 transition-colors focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-xs cursor-pointer flex-shrink-0"
          >
            Ara
          </button>
          {q && (
            <Link
              href={buildUrl(undefined, undefined).replace(/([?&])q=[^&]*(&|$)/, '$1').replace(/[?&]$/, '')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors cursor-pointer flex-shrink-0"
              title="Aramayı Temizle"
            >
              Temizle
            </Link>
          )}
        </form>

        {/* Status Filter Tabs */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Sipariş Durumu
          </div>
          <div className="flex overflow-x-auto pb-1 no-scrollbar gap-1.5 sm:gap-2 sm:flex-wrap">
            {[
              { key: 'ALL', label: 'Tüm Siparişler' },
              { key: 'CONFIRMED', label: 'Onaylandı' },
              { key: 'PACKED', label: 'Pakete Sevk Edildi' },
              { key: 'SHIPPED', label: 'Kargolandı' },
              { key: 'DELIVERED', label: 'Teslim Edildi' },
              { key: 'CANCELLED', label: 'İptal / İade' },
            ].map((tab) => {
              const isActive = (!status && tab.key === 'ALL') || status === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={buildUrl(tab.key, undefined)}
                  className={`text-xs px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Yazdırma Durumu Sekmesi */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-brand-600" />
            <span>Yazdırma Durumu:</span>
          </div>
          <div className="flex overflow-x-auto pb-1 no-scrollbar gap-1.5 sm:gap-2 sm:flex-wrap">
            {[
              {
                key: 'ALL',
                label: 'Tümü',
                count: totalInView,
                activeClass: 'bg-brand-500 text-white shadow-sm',
                badgeClass: 'bg-white/20 text-white',
              },
              {
                key: 'unprinted',
                label: '✕ Yazdırılmadı',
                count: unprintedInView,
                activeClass: 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300',
                badgeClass: 'bg-amber-100 text-amber-800',
              },
              {
                key: 'printed',
                label: '✓ Yazdırıldı',
                count: printedInView,
                activeClass: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300',
                badgeClass: 'bg-emerald-100 text-emerald-800',
              },
            ].map((tab) => {
              const isActive = (!printStatus && tab.key === 'ALL') || printStatus === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={buildUrl(undefined, tab.key)}
                  className={`text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                    isActive
                      ? tab.activeClass
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isActive ? 'bg-white/25 text-white' : tab.badgeClass
                    }`}
                  >
                    {tab.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Orders Table Client Component */}
      <OrdersTableClient initialOrders={orders} />
    </div>
  );
}
