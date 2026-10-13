'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, ShoppingBag, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { totalItems, setIsOpen } = useCart();

  // Admin sayfalarında mobil alt bar görünmesin
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const isHomeActive = pathname === '/';
  const isProductsActive = pathname === '/urunler' || pathname.startsWith('/urunler');
  const isTrackingActive = pathname === '/siparis-takip';

  return (
    <nav
      aria-label="Mobil Gezinme Menüsü"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-cream-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden pb-[env(safe-area-inset-bottom)] no-print"
    >
      <div className="grid grid-cols-4 h-15 items-center px-1">
        {/* 1. Anasayfa */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            isHomeActive
              ? 'text-brand-600 font-bold'
              : 'text-charcoal-500 hover:text-brand-600 font-medium'
          }`}
        >
          <div className="relative">
            <Home className={`w-5 h-5 transition-transform ${isHomeActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Anasayfa</span>
        </Link>

        {/* 2. Tüm Ürünlerimiz */}
        <Link
          href="/urunler"
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            isProductsActive
              ? 'text-brand-600 font-bold'
              : 'text-charcoal-500 hover:text-brand-600 font-medium'
          }`}
        >
          <div className="relative">
            <Sparkles className={`w-5 h-5 transition-transform ${isProductsActive ? 'scale-110 stroke-[2.4] fill-brand-100 text-brand-600' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Tüm Ürünler</span>
        </Link>

        {/* 3. Sepetim */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center justify-center py-1 text-charcoal-500 hover:text-brand-600 font-medium transition-colors cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-brand-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-50 duration-150">
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Sepetim</span>
        </button>

        {/* 4. Sipariş Takip */}
        <Link
          href="/siparis-takip"
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            isTrackingActive
              ? 'text-brand-600 font-bold'
              : 'text-charcoal-500 hover:text-brand-600 font-medium'
          }`}
        >
          <div className="relative">
            <Truck className={`w-5 h-5 transition-transform ${isTrackingActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Sipariş Takip</span>
        </Link>
      </div>
    </nav>
  );
}
