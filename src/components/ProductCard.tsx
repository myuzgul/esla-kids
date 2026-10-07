'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatPrice, addTax } from '@/lib/utils';
import { Eye, ShoppingBag } from 'lucide-react';

export interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    sku: string;
    price: number;
    compareAtPrice?: number | null;
    taxRate?: number;
    images: string;
    stockStatus?: string;
    stock?: number;
    variations?: any[];
  };
}

export function ProductCard({ product }: ProductCardProps) {
  let images: string[] = [];
  try {
    images = JSON.parse(product.images);
  } catch (e) {
    images = [];
  }
  const mainImage = images[0] || 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=600&auto=format&fit=crop&q=80';

  // Extract distinct colors from variations with hex and image
  const variantColors = useMemo(() => {
    if (!product.variations || product.variations.length === 0) return [];
    const map = new Map<string, { name: string; hex: string; image?: string }>();
    product.variations.forEach((v: any) => {
      try {
        const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        const color = attrs?.['Renk'] || attrs?.['Desen'] || attrs?.['Model'];
        if (color && !map.has(color)) {
          map.set(color, {
            name: color,
            hex: attrs?.['RenkKodu'] || '#1e3a8a',
            image: v.image || undefined,
          });
        }
      } catch (e) {}
    });
    return Array.from(map.values());
  }, [product.variations]);

  const [hoverColorImage, setHoverColorImage] = useState<string | null>(null);
  const displayImage = hoverColorImage || mainImage;

  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;

  const isOutOfStock = product.stockStatus === 'OUT_OF_STOCK' || (product.stock !== undefined && product.stock <= 0);

  return (
    <div className="group relative bg-white rounded-2xl border border-cream-200/80 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col">
      {/* Image Container */}
      <Link href={`/urun/${product.slug}`} className="relative aspect-[4/5] bg-neutral-50/80 overflow-hidden flex items-center justify-center block">
        {/* Ambient blurred backdrop so any aspect ratio fills seamlessly without empty cutoffs */}
        <img
          src={displayImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-15 scale-110 pointer-events-none"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Crisp foreground image */}
        <img
          src={displayImage}
          alt={product.title}
          className="relative z-10 w-full h-full object-contain object-center p-1.5 sm:p-2 group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=600&auto=format&fit=crop&q=80';
          }}
        />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-20">
          {discountPercent > 0 && (
            <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              %{discountPercent} İNDİRİM
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-charcoal-800 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
              Tükendi
            </span>
          )}
        </div>

        {/* Quick hover action bar */}
        <div className="absolute inset-x-2 bottom-2 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          <span className="bg-white/95 backdrop-blur-sm text-charcoal-800 text-xs font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5 hover:bg-white hover:text-brand-600 transition-colors">
            <Eye className="w-3.5 h-3.5" /> İncele & Beden Seç
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] font-medium text-charcoal-400 uppercase tracking-wider">
              {product.sku}
            </div>

            {/* Color swatches preview on card */}
            {variantColors.length > 1 && (
              <div className="flex items-center gap-1">
                {variantColors.slice(0, 4).map((vc) => (
                  <span
                    key={vc.name}
                    onMouseEnter={() => vc.image && setHoverColorImage(vc.image)}
                    onMouseLeave={() => setHoverColorImage(null)}
                    title={`${vc.name}${vc.image ? ' (Fotoğrafı Önizle)' : ''}`}
                    className="w-3 h-3 rounded-full border border-black/15 shadow-2xs cursor-pointer hover:scale-125 transition-transform"
                    style={{ backgroundColor: vc.hex }}
                  />
                ))}
                {variantColors.length > 4 && (
                  <span className="text-[10px] text-charcoal-400 font-bold">
                    +{variantColors.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          <Link
            href={`/urun/${product.slug}`}
            className="text-sm font-semibold text-charcoal-800 hover:text-brand-600 line-clamp-2 transition-colors leading-snug"
          >
            {product.title}
          </Link>
        </div>

        {/* Price & Action */}
        <div className="mt-3 pt-2.5 border-t border-cream-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold text-brand-600">
                {formatPrice(product.price)}
              </span>
              <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-tight">
                + KDV
              </span>
            </div>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <div className="text-xs text-charcoal-400 line-through">
                {formatPrice(product.compareAtPrice)} <span className="text-[9px]">+ KDV</span>
              </div>
            )}
            <div className="text-[10px] text-emerald-700 font-medium">
              {formatPrice(addTax(product.price, product.taxRate || 10))} KDV Dahil
            </div>
          </div>

          <Link
            href={`/urun/${product.slug}`}
            className="p-2 rounded-full bg-cream-100 hover:bg-brand-500 hover:text-white text-charcoal-700 transition-colors"
            title="Seçenekleri Gör"
          >
            <ShoppingBag className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
