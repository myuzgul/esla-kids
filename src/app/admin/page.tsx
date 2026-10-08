import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDate, ORDER_STATUS_MAP } from '@/lib/utils';
import { 
  TrendingUp, ShoppingCart, Clock, CheckCircle2, 
  Package, AlertTriangle, ArrowRight, Printer, CheckSquare 
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Stats queries
  const [
    todayOrders,
    monthOrders,
    pendingOrdersCount,
    preparingOrdersCount,
    packedOrdersCount,
    outOfStockCount,
    recentOrders,
    topProducts,
  ] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.findMany({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.count({ where: { status: 'NEW' } }),
    prisma.order.count({ where: { status: { in: ['APPROVED', 'PREPARING'] } } }),
    prisma.order.count({ where: { status: 'PACKED' } }),
    prisma.product.count({ where: { stock: { lte: 0 } } }),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
    prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { variations: true },
    }),
  ]);

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const monthRevenue = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-black text-2xl text-slate-900">
            Esla Kids Yönetim Paneli
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Canlı sipariş akışı, depo hazırlık durumu ve ciro takibi
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/siparis-hazirlama"
            className="flex-1 sm:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Sipariş Hazırlama</span>
          </Link>
          <Link
            href="/admin/urunler/yeni"
            className="flex-1 sm:flex-none justify-center bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Package className="w-4 h-4" />
            <span>Yeni Ürün Ekle</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Bugünkü Ciro</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-heading font-black text-slate-900">
            {formatPrice(todayRevenue)}
          </div>
          <div className="text-xs text-slate-500">
            Bugün: <strong>{todayOrders.length}</strong> sipariş
          </div>
        </div>

        {/* Month Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Bu Ay Satış</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-heading font-black text-slate-900">
            {formatPrice(monthRevenue)}
          </div>
          <div className="text-xs text-slate-500">
            Bu ay toplam: <strong>{monthOrders.length}</strong> sipariş
          </div>
        </div>

        {/* Preparing Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Hazırlanacak Siparişler</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-heading font-black text-indigo-700">
            {preparingOrdersCount}
          </div>
          <div className="text-xs text-slate-500">
            Bekleyen Yeni: <strong>{pendingOrdersCount}</strong> sipariş
          </div>
        </div>

        {/* Stock Alert */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Stok Alarmı</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-heading font-black text-rose-600">
            {outOfStockCount}
          </div>
          <div className="text-xs text-slate-500">
            Tükenen veya kritik stoklu ürünler
          </div>
        </div>
      </div>

      {/* Main Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-heading font-bold text-base text-slate-900">
              Son Gelen Siparişler
            </h2>
            <Link
              href="/admin/siparisler"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>Tüm Siparişleri Gör</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-100">
                  <th className="pb-3">Sipariş No</th>
                  <th className="pb-3">Müşteri</th>
                  <th className="pb-3">Tarih</th>
                  <th className="pb-3">Ödeme</th>
                  <th className="pb-3">Tutar</th>
                  <th className="pb-3">Durum</th>
                  <th className="pb-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-mono font-bold text-brand-700">
                      <Link href={`/admin/siparisler/${ord.id}`} className="hover:underline">
                        {ord.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3">{ord.guestName || 'Müşteri'}</td>
                    <td className="py-3 text-slate-400">{formatDate(ord.createdAt)}</td>
                    <td className="py-3 font-semibold">{ord.paymentMethod}</td>
                    <td className="py-3 font-bold text-slate-900">{formatPrice(ord.totalAmount)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${ORDER_STATUS_MAP[ord.status]?.bg || 'bg-slate-100'} ${ORDER_STATUS_MAP[ord.status]?.color || 'text-slate-700'}`}>
                        {ORDER_STATUS_MAP[ord.status]?.label || ord.status}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-1">
                      <Link
                        href={`/admin/siparis-cikti?ids=${ord.id}`}
                        target="_blank"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 inline-block"
                        title="Fiş / QR Çıktısı Al"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/siparisler/${ord.id}`}
                        className="text-xs text-brand-600 hover:underline font-semibold"
                      >
                        İncele
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-heading font-bold text-base text-slate-900">
              Popüler Ürünler
            </h2>
            <Link
              href="/admin/urunler"
              className="text-xs font-bold text-brand-600 hover:underline"
            >
              Yönet
            </Link>
          </div>

          <div className="divide-y divide-slate-100 space-y-3">
            {topProducts.map((p) => {
              let imgs: string[] = [];
              try { imgs = JSON.parse(p.images); } catch (e) {}

              return (
                <div key={p.id} className="pt-3 first:pt-0 flex items-center gap-3">
                  <div className="w-12 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                    {imgs[0] && <img src={imgs[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Stok: <strong className={p.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}>{p.stock} Adet</strong>
                    </div>
                    <div className="text-xs font-bold text-brand-600 mt-0.5">
                      {formatPrice(p.price)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
