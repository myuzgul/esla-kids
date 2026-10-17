import React from 'react';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';
import { getSettings } from '@/lib/settings';
import { BarChart3, TrendingUp, Download, CreditCard, DollarSign, Truck, Gift, Wallet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const [orders, products, siteSettings] = await Promise.all([
    prisma.order.findMany({ include: { items: true } }),
    prisma.product.findMany({ include: { variations: true } }),
    getSettings(),
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgBasket = orders.length > 0 ? totalRevenue / orders.length : 0;
  const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  // Kargo & Kapıda Ödeme Hesaplamaları (İptal/iade ve ödenmemiş kredi kartları filtrelenir)
  const isCreditCard = (method: string) => {
    const m = (method || '').toUpperCase();
    return m.includes('PAYTR') || m.includes('KREDİ') || m.includes('KREDI') || m.includes('KART') || m.includes('CARD');
  };

  const validShippingOrders = orders.filter((o) => {
    if (['CANCELLED', 'REFUNDED'].includes(o.status)) return false;
    if (isCreditCard(o.paymentMethod)) {
      return o.paymentStatus === 'PAID' || o.paymentStatus === 'COMPLETED';
    }
    return true;
  });

  // 1. Müşteriden Alınan Kargo Ücreti
  const customerPaidShippingOrders = validShippingOrders.filter((o) => (o.shippingFee || 0) > 0);
  const totalCustomerShippingFee = customerPaidShippingOrders.reduce((sum, o) => sum + (o.shippingFee || 0), 0);
  const customerShippingCount = customerPaidShippingOrders.length;

  // 2. Bizim Karşıladığımız Kargo (Ücretsiz Kargo)
  const freeShippingOrders = validShippingOrders.filter((o) => (o.shippingFee || 0) === 0);
  const freeShippingCount = freeShippingOrders.length;
  const currentShippingFeeSetting = Number(siteSettings.shipping_fee) || 130;
  const totalCoveredShippingEstimated = freeShippingCount * currentShippingFeeSetting;

  // 3. Alınan Kapıda Ödeme Ek Ücreti
  const codOrders = validShippingOrders.filter((o) => (o.codFee || 0) > 0);
  const totalCodFee = codOrders.reduce((sum, o) => sum + (o.codFee || 0), 0);
  const codCount = codOrders.length;

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

      {/* Shipping & COD Stats Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
          <div>
            <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-600" />
              <span>Kargo ve Kapıda Ödeme Analizi (Tüm Zamanlar)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              İptal / iadeler ve ödenmemiş kredi kartı siparişleri hariç tutulmuştur
            </p>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 self-start sm:self-auto">
            Toplam {validShippingOrders.length} geçerli sipariş
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
              <span>Müşteriden Alınan Kargo</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-heading font-black text-slate-900">
              {formatPrice(totalCustomerShippingFee)}
            </div>
            <div className="text-[11px] text-slate-500">
              {customerShippingCount} siparişte müşteri ödedi
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
              <span>Bizim Karşıladığımız Kargo</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-heading font-black text-emerald-700">
              {freeShippingCount} <span className="text-sm font-semibold text-slate-600">Sipariş</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Ücretsiz kargo (Tahmini bedel: ~{formatPrice(totalCoveredShippingEstimated)})
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
              <span>Alınan Kapıda Ödeme Bedeli</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-heading font-black text-amber-800">
              {formatPrice(totalCodFee)}
            </div>
            <div className="text-[11px] text-slate-500">
              {codCount} siparişte kapıda ödeme tahsil edildi
            </div>
          </div>
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
