import React from 'react';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';
import { BarChart3, TrendingUp, Download, CreditCard, DollarSign } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const [orders, products] = await Promise.all([
    prisma.order.findMany({ include: { items: true } }),
    prisma.product.findMany({ include: { variations: true } }),
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgBasket = orders.length > 0 ? totalRevenue / orders.length : 0;
  const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  // Payment breakdown
  const paymentStats: Record<string, { count: number; total: number }> = {};
  orders.forEach((o) => {
    if (!paymentStats[o.paymentMethod]) paymentStats[o.paymentMethod] = { count: 0, total: 0 };
    paymentStats[o.paymentMethod].count++;
    paymentStats[o.paymentMethod].total += o.totalAmount;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-heading font-black text-2xl text-slate-900">
            Satış & Stok Raporları
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ciro analizleri, sepet ortalamaları ve Ödeme yöntemi dağılımı
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-400 font-semibold uppercase">Toplam Ciro</div>
          <div className="text-2xl font-black text-slate-900">{formatPrice(totalRevenue)}</div>
          <div className="text-[11px] text-slate-500">Toplam {orders.length} sipariş</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-400 font-semibold uppercase">Ortalama Sepet Tutarı</div>
          <div className="text-2xl font-black text-brand-600">{formatPrice(avgBasket)}</div>
          <div className="text-[11px] text-slate-500">Sipariş başına ortalama</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-400 font-semibold uppercase">Toplam Depo Stok Değeri</div>
          <div className="text-2xl font-black text-indigo-700">{formatPrice(totalStockValue)}</div>
          <div className="text-[11px] text-slate-500">{products.length} farklı modelde</div>
        </div>
      </div>

      {/* Payment methods breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="font-heading font-bold text-base text-slate-900 pb-2 border-b border-slate-100">
          Ödeme Yöntemlerine Göre Dağılım
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(paymentStats).map(([method, data]) => (
            <div key={method} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>{method}</span>
                <span className="text-brand-600 font-bold">{data.count} Sipariş</span>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatPrice(data.total)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
