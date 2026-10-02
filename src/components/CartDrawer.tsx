'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';

export function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, subtotal } = useCart();
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(750);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.free_shipping_limit) {
          setFreeShippingThreshold(Number(d.settings.free_shipping_limit));
        }
      })
      .catch(() => {});
  }, []);

  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-cream-200 flex items-center justify-between bg-cream-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-600" />
              <h3 className="font-heading font-bold text-lg text-charcoal-900">
                Alışveriş Sepeti ({items.reduce((a, b) => a + b.quantity, 0)})
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-800 hover:bg-cream-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Tracker */}
          <div className="bg-brand-50/70 p-3.5 border-b border-brand-100">
            {remainingForFreeShipping > 0 ? (
              <div className="space-y-1.5">
                <div className="text-xs text-charcoal-700 flex items-center justify-between">
                  <span>Ücretsiz Kargo için</span>
                  <span className="font-bold text-brand-700">{formatPrice(remainingForFreeShipping)}</span>
                </div>
                <div className="w-full bg-cream-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs font-bold text-brand-700 flex items-center gap-1.5 justify-center">
                <Sparkles className="w-4 h-4 text-brand-500" />
                Tebrikler! Siparişinizde Kargo Ücretsiz!
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-cream-100 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-cream-100 text-charcoal-400 mx-auto flex items-center justify-center mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-charcoal-700 font-medium">Sepetinizde ürün bulunmuyor.</p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="mt-4 inline-block text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-full transition-colors"
                >
                  Alışverişe Başla
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="pt-4 first:pt-0 flex gap-3.5">
                  <div className="w-16 h-20 bg-cream-50 rounded-lg overflow-hidden flex-shrink-0 relative border border-cream-200">
                    <img src={item.image} alt={item.title} className="w-full h-full object-contain p-1" />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <Link
                          href={`/urun/${item.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="text-xs font-semibold text-charcoal-800 hover:text-brand-600 line-clamp-2"
                        >
                          {item.title}
                        </Link>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-charcoal-400 hover:text-rose-500 p-1"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {item.variationName && (
                        <div className="text-[11px] text-charcoal-500 mt-0.5 bg-cream-100/60 inline-block px-1.5 py-0.5 rounded">
                          {item.variationName}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-cream-200 rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-cream-100 text-charcoal-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-semibold px-2 text-charcoal-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-cream-100 text-charcoal-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-brand-600">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-medium">KDV Dahil</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-cream-200 bg-cream-50 space-y-3">
              <div className="flex items-center justify-between text-base font-bold text-charcoal-900">
                <div>
                  <span>Ara Toplam:</span>
                  <div className="text-[10px] text-emerald-700 font-normal">Fiyatlara %10 KDV dahildir</div>
                </div>
                <span className="text-lg text-brand-600">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-[11px] text-charcoal-500 text-center">
                Kargo ve indirimler Ödeme aşamasında hesaplanır.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/sepet"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-semibold border border-cream-300 rounded-xl bg-white hover:bg-cream-100 text-charcoal-800 transition-colors"
                >
                  Sepete Git
                </Link>
                <Link
                  href="/odeme"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-bold rounded-xl bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/20 transition-all"
                >
                  <span>Siparişi Tamamla</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
