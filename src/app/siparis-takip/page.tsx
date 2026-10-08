'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatPrice, formatDate, ORDER_STATUS_MAP, formatVariationLabel } from '@/lib/utils';
import { 
  Package, Search, Truck, CheckCircle2, ChevronRight, 
  AlertCircle, ExternalLink, MapPin, Calendar, Clock, CreditCard, ShoppingBag 
} from 'lucide-react';

const STEPS = [
  { key: 'CONFIRMED', label: 'Sipariş Onaylandı' },
  { key: 'PACKED', label: 'Pakete Sevk Edildi' },
  { key: 'SHIPPED', label: 'Kargolandı' },
  { key: 'DELIVERED', label: 'Teslim Edildi' },
];

export default function OrderTrackingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    setOrder(null);

    try {
      const url = `/api/orders/track?orderNumber=${encodeURIComponent(searchQuery.trim())}&phoneOrEmail=${encodeURIComponent(phoneOrEmail.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sipariş bulunamadı.');
      setOrder(data.order);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIndex = (status: string) => {
    if (status === 'DELIVERED') return 3;
    if (status === 'SHIPPED') return 2;
    if (status === 'PACKED' || status === 'PRINTED' || status === 'PREPARING') return 1;
    return 0; // CONFIRMED, NEW, APPROVED
  };

  let shippingAddr: any = {};
  if (order?.shippingAddress) {
    try {
      shippingAddr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
    } catch (e) {}
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-charcoal-400 mb-6">
        <Link href="/" className="hover:text-brand-600">Anasayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-charcoal-800 font-semibold">Sipariş Takibi</span>
      </nav>

      {/* Hero Header */}
      <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
        <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-sm border border-brand-100">
          <Truck className="w-7 h-7" />
        </div>
        <h1 className="font-heading font-black text-2xl sm:text-3xl text-charcoal-900">
          Sipariş ve Kargo Takibi
        </h1>
        <p className="text-sm text-charcoal-500 mt-1.5">
          Sipariş numaranız (Örn: <strong>EK-1001</strong>) veya <strong>Kargo Takip Numaranız</strong> ile anlık sipariş ve kargo durumunuzu sorgulayabilirsiniz.
        </p>
      </div>

      {/* Query Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-sm max-w-xl mx-auto">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1">
              Sipariş Numarası VEYA Kargo Takip Kodu *
            </label>
            <input
              type="text"
              required
              placeholder="Örn: EK-1001 veya Kargo Takip No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-cream-50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500 font-semibold uppercase"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1">
              E-Posta veya Telefon Numarası (Opsiyonel)
            </label>
            <input
              type="text"
              placeholder="ornek@email.com veya 05XX..."
              value={phoneOrEmail}
              onChange={(e) => setPhoneOrEmail(e.target.value)}
              className="w-full bg-cream-50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-black py-3.5 rounded-xl shadow-md shadow-brand-500/25 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? <span>Sorgulanıyor...</span> : (
              <>
                <Search className="w-4 h-4" />
                <span>Siparişi ve Kargoyu Sorgula</span>
              </>
            )}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Query Result */}
      {order && (
        <div className="mt-10 bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-sm space-y-8 animate-in fade-in duration-200">
          {/* Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-cream-200 gap-4">
            <div>
              <div className="text-xs text-charcoal-400 font-bold uppercase tracking-wider">Sipariş No</div>
              <div className="text-2xl font-heading font-black text-brand-700">{order.orderNumber}</div>
              <div className="text-xs text-charcoal-500 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
                <span>{formatDate(order.createdAt)}</span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${ORDER_STATUS_MAP[order.status]?.bg || 'bg-cream-100'} ${ORDER_STATUS_MAP[order.status]?.color || 'text-charcoal-800'}`}>
                {ORDER_STATUS_MAP[order.status]?.label || order.status}
              </span>
              <div className="text-base font-black text-charcoal-900 mt-1">
                Toplam: {formatPrice(order.totalAmount)}
              </div>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="py-4">
            <div className="relative flex items-center justify-between">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-cream-200 w-full z-0" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-500 transition-all duration-500 z-0"
                style={{ width: `${(getStepIndex(order.status) / (STEPS.length - 1)) * 100}%` }}
              />

              {STEPS.map((st, idx) => {
                const isCompleted = idx <= getStepIndex(order.status);
                const isCurrent = idx === getStepIndex(order.status);

                return (
                  <div key={st.key} className="relative z-10 flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                      isCompleted ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : 'bg-white border-2 border-cream-300 text-charcoal-400'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <span className={`text-[11px] mt-2 font-medium text-center hidden sm:block ${
                      isCurrent ? 'font-bold text-brand-700' : 'text-charcoal-500'
                    }`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kargo Takip Bilgisi Kartı */}
          {order.trackingNumber ? (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-powder-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Kargo Bilgileri ({order.trackingCompany || 'PTT Kargo'})</span>
                </div>
                <div className="text-base font-bold text-charcoal-900 mt-1">
                  {order.trackingCompany || 'PTT Kargo'}: <span className="font-mono text-emerald-700 font-extrabold">{order.trackingNumber}</span>
                </div>
              </div>
              <a
                href={
                  (order.trackingCompany?.toLowerCase().includes('yurtiçi') || order.trackingCompany?.toLowerCase().includes('yurtici'))
                    ? `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${encodeURIComponent(order.trackingNumber)}`
                    : (order.trackingCompany?.toLowerCase().includes('sürat') || order.trackingCompany?.toLowerCase().includes('surat'))
                    ? `https://suratkargo.com.tr/KargoTakip/?kargotakipno=${encodeURIComponent(order.trackingNumber)}`
                    : (order.trackingCompany?.toLowerCase().includes('hepsijet'))
                    ? `https://hepsijet.com/gonderi-takibi/${encodeURIComponent(order.trackingNumber)}`
                    : `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${encodeURIComponent(order.trackingNumber)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Canlı Kargo Takibi</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 flex items-center gap-3 text-xs text-charcoal-600">
              <Clock className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span>Siparişiniz paketleme aşamasındadır; kargoya teslim edildiğinde takip numaranız burada ve SMS ile iletilecektir.</span>
            </div>
          )}

          {/* Satın Alınan Ürünler (Zengin & Detaylı Görünüm) */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-800 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-brand-600" />
              <span>Sipariş Ettiğiniz Ürünler ({order.items?.length || 0})</span>
            </h4>

            <div className="divide-y divide-cream-100 border border-cream-200 rounded-2xl overflow-hidden bg-neutral-50/40">
              {order.items.map((it: any) => {
                const itemImg = it.variation?.image || it.image;
                const displayVar = formatVariationLabel(it.variationName || it.variation?.attributes);

                return (
                  <div key={it.id} className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-cream-50/30 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Aspect-ratio safe Product Thumbnail with soft backdrop */}
                      <div className="w-14 h-16 rounded-xl bg-neutral-50 border border-cream-200 overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                        {itemImg ? (
                          <>
                            <img
                              src={itemImg}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover blur-md opacity-20 pointer-events-none"
                            />
                            <img
                              src={itemImg}
                              alt={it.title}
                              className="relative z-10 w-full h-full object-contain p-1"
                            />
                          </>
                        ) : (
                          <Package className="w-6 h-6 text-charcoal-300" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h5 className="font-bold text-xs sm:text-sm text-charcoal-900 truncate">
                          {it.title}
                        </h5>
                        {displayVar && (
                          <div className="mt-1">
                            <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200/50 inline-block">
                              {displayVar}
                            </span>
                          </div>
                        )}
                        <div className="text-[11px] text-charcoal-500 mt-1">
                          Birim Fiyat: {formatPrice(it.price)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                    <div className="text-xs text-charcoal-500 font-medium">
                      {it.quantity} Adet
                    </div>
                    <div className="text-sm font-bold text-charcoal-900 mt-0.5">
                      {formatPrice(it.total)}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            {/* Fiyat Özeti & Teslimat Adresi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Teslimat Adresi */}
              <div className="bg-cream-50/70 p-4 rounded-2xl border border-cream-200 text-xs space-y-1.5">
                <div className="font-bold text-charcoal-800 flex items-center gap-1.5 uppercase text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-powder-500" />
                  <span>Teslimat Adresi</span>
                </div>
                <div className="font-bold text-charcoal-900">{shippingAddr.fullName || order.guestName}</div>
                <div className="text-charcoal-600">{shippingAddr.address}</div>
                <div className="font-semibold text-charcoal-800">{shippingAddr.district} / {shippingAddr.city}</div>
              </div>

              {/* Tutar Dökümü */}
              <div className="bg-cream-50/70 p-4 rounded-2xl border border-cream-200 text-xs space-y-1.5">
                <div className="flex justify-between text-charcoal-600">
                  <span>Ara Toplam:</span>
                  <span className="font-semibold">{formatPrice(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>İndirim:</span>
                    <span>-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-charcoal-600">
                  <span>Kargo Ücreti:</span>
                  <span className="font-semibold">{order.shippingFee === 0 ? 'Ücretsiz' : formatPrice(order.shippingFee)}</span>
                </div>
                {order.codFee > 0 && (
                  <div className="flex justify-between text-charcoal-600">
                    <span>Kapıda Ödeme Bedeli:</span>
                    <span>+{formatPrice(order.codFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-charcoal-900 pt-1.5 border-t border-cream-200">
                  <span>Genel Toplam:</span>
                  <span className="text-brand-600">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
