'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import { 
  ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, 
  Sparkles, ShieldCheck, Truck, ChevronRight 
} from 'lucide-react';

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number; type: string } | null>(null);
  const [couponError, setCouponError] = useState('');

  const [shippingSettings, setShippingSettings] = useState({
    free_shipping_limit: 750,
    shipping_fee: 49.90,
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setShippingSettings({
            free_shipping_limit: Number(d.settings.free_shipping_limit) || 750,
            shipping_fee: Number(d.settings.shipping_fee) || 49.90,
          });
        }
      })
      .catch(() => {});
  }, []);

  const freeShippingLimit = shippingSettings.free_shipping_limit;
  const shippingFee = subtotal >= freeShippingLimit ? 0 : shippingSettings.shipping_fee;
  const remainingForFreeShipping = Math.max(0, freeShippingLimit - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingLimit) * 100));

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'HOSGELDIN10') {
      const discount = (subtotal * 10) / 100;
      setCouponApplied({ code, discount, type: '%10 İndirim' });
    } else if (code === 'ESLA50') {
      if (subtotal < 500) {
        setCouponError('Bu kupon en az 500 TL sepet tutarında geçerlidir.');
        return;
      }
      setCouponApplied({ code, discount: 50, type: '50 TL İndirim' });
    } else {
      setCouponError('Geçersiz veya süresi dolmuş kupon kodu.');
    }
  };

  const discountAmount = couponApplied ? couponApplied.discount : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-500">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="font-heading font-extrabold text-2xl text-charcoal-900 mb-2">
          Alışveriş Sepetiniz Boş
        </h1>
        <p className="text-sm text-charcoal-500 mb-6">
          Henüz sepetinize hiçbir çocuk giyim ürünü eklemediniz.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-brand-500/20"
        >
          <span>Koleksiyonu Keşfet</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-charcoal-400 mb-6">
        <Link href="/" className="hover:text-brand-600">Anasayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-charcoal-800 font-semibold">Alışveriş Sepeti</span>
      </nav>

      <h1 className="font-heading font-black text-2xl sm:text-3xl text-charcoal-900 mb-8">
        Alışveriş Sepeti ({items.reduce((a, b) => a + b.quantity, 0)} ürün)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart Items Table */}
        <div className="lg:col-span-8 space-y-6">
          {/* Free shipping bar */}
          <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
            {remainingForFreeShipping > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-charcoal-800">
                  <span>Ücretsiz Kargo için</span>
                  <span className="text-brand-700 font-bold">{formatPrice(remainingForFreeShipping)} daha ekleyin</span>
                </div>
                <div className="w-full bg-cream-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs font-bold text-brand-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <span>Tebrikler! Sepetiniz Ücretsiz Kargo limitine ulaştı.</span>
              </div>
            )}
          </div>

          {/* Items card list */}
          <div className="bg-white rounded-2xl border border-cream-200 divide-y divide-cream-100 overflow-hidden shadow-sm">
            {items.map((item) => (
              <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="w-20 h-24 bg-cream-50 rounded-xl overflow-hidden flex-shrink-0 relative border border-cream-200">
                    <img src={item.image} alt={item.title} className="w-full h-full object-contain p-1" />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-charcoal-400 uppercase">{item.sku}</div>
                    <Link
                      href={`/urun/${item.slug}`}
                      className="font-bold text-sm sm:text-base text-charcoal-800 hover:text-brand-600 transition-colors"
                    >
                      {item.title}
                    </Link>

                    {item.variationName && (
                      <div className="text-xs text-charcoal-500 mt-1 bg-cream-50 px-2 py-0.5 rounded-md inline-block border border-cream-200">
                        {item.variationName}
                      </div>
                    )}

                    <div className="sm:hidden text-sm font-bold text-brand-600 mt-2">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto">
                  {/* Quantity */}
                  <div className="flex items-center border border-cream-300 rounded-xl bg-white">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-2 hover:bg-cream-100 text-charcoal-600 font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-charcoal-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 hover:bg-cream-100 text-charcoal-600 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Total */}
                  <div className="hidden sm:block text-right min-w-[90px]">
                    <div className="text-base font-bold text-brand-600">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                    {item.quantity > 1 && (
                      <div className="text-[11px] text-charcoal-400">
                        Adet: {formatPrice(item.price)}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-charcoal-400 hover:text-rose-500 transition-colors"
                    title="Ürünü Çıkar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-xs">
            <Link href="/" className="font-semibold text-brand-600 hover:underline">
              ? Alışverişe Devam Et
            </Link>
            <button
              onClick={clearCart}
              className="text-charcoal-400 hover:text-rose-600 font-medium"
            >
              Sepeti Temizle
            </button>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-cream-50 p-6 rounded-2xl border border-cream-200/80 space-y-5">
            <h3 className="font-heading font-extrabold text-lg text-charcoal-900 pb-3 border-b border-cream-200">
              Sipariş Özeti
            </h3>

            {/* Coupon Box */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1.5 block">
                İndirim Kuponu
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Kupon kodunuz (Örn: HOSGELDIN10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 bg-white border border-cream-300 rounded-xl px-3 py-2 text-xs uppercase font-medium focus:outline-none focus:border-brand-400"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="bg-charcoal-900 hover:bg-black text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  Uygula
                </button>
              </div>

              {couponApplied && (
                <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <span>? {couponApplied.code} uygulandı ({couponApplied.type})</span>
                  <button onClick={() => setCouponApplied(null)} className="text-rose-600 underline text-[11px]">Kaldır</button>
                </div>
              )}

              {couponError && (
                <div className="mt-2 text-xs text-rose-600 font-medium">{couponError}</div>
              )}
            </div>

            {/* Line items calculation */}
            <div className="space-y-2.5 text-xs text-charcoal-600 pt-2 border-t border-cream-200">
              <div className="flex justify-between">
                <span>Ürünler Ara Toplamı:</span>
                <span className="font-bold text-charcoal-800">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between text-[11px] text-charcoal-500">
                <span>Dahil Edilen %10 KDV:</span>
                <span>{formatPrice(Math.round((subtotal - (subtotal / 1.10)) * 100) / 100)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Kupon İndirimi:</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Kargo Ücreti:</span>
                <span className="font-bold text-charcoal-800">
                  {shippingFee === 0 ? (
                    <span className="text-emerald-600">Ücretsiz</span>
                  ) : (
                    formatPrice(shippingFee)
                  )}
                </span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-3 border-t border-cream-200">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-charcoal-900">Genel Toplam:</span>
                <span className="font-heading font-black text-2xl text-brand-600">
                  {formatPrice(grandTotal)}
                </span>
              </div>
              <div className="text-[11px] text-emerald-700 text-right mt-0.5 font-medium">
                Tüm tutarlara %10 KDV dahildir
              </div>
            </div>

            <p className="text-[11px] text-charcoal-500 text-center">
              Havale/EFT ile ödemede ekstra <strong>%5 İndirim</strong> Ödeme sayfasında uygulanacaktır.
            </p>

            <Link
              href="/odeme"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 group text-sm"
            >
              <span>Alışverişi Tamamla</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Trust badges */}
          <div className="bg-white p-4 rounded-xl border border-cream-200 text-xs text-charcoal-600 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>256-Bit SSL ile Güvenli Alışveriş</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-powder-500 flex-shrink-0" />
              <span>Yurtiçi Kargo Güvencesiyle Hızlı Teslimat</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
