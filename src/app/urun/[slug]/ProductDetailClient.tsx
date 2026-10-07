'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { formatPrice, addTax, calculateTaxAmount } from '@/lib/utils';
import { 
  ShoppingBag, Zap, ShieldCheck, Truck, RefreshCw, Banknote,
  Check, AlertCircle, Heart, Bell, Maximize2, X, ChevronLeft, ChevronRight 
} from 'lucide-react';

interface Props {
  product: any;
}

// Natural sorting for kids sizes/ages (e.g. 0-3 Ay, 3-6 Ay, 1-2 Yaş, 2-3 Yaş, etc.)
function sortSizes(sizes: string[]): string[] {
  const getSortWeight = (s: string): number => {
    const trimmed = s.trim().toLowerCase();
    const monthMatch = trimmed.match(/^(\d+)(?:-(\d+))?\s*ay/);
    if (monthMatch) {
      return parseInt(monthMatch[1], 10);
    }
    const yearMatch = trimmed.match(/^(\d+)(?:-(\d+))?\s*ya/);
    if (yearMatch) {
      return 100 + parseInt(yearMatch[1], 10) * 12;
    }
    const numMatch = trimmed.match(/^(\d+)/);
    if (numMatch) {
      return 1000 + parseInt(numMatch[1], 10);
    }
    return 9999;
  };
  return [...sizes].sort((a, b) => getSortWeight(a) - getSortWeight(b));
}

export function ProductDetailClient({ product }: Props) {
  const router = useRouter();
  const { addItem } = useCart();

  // Extract all images from product and variations
  const images: string[] = useMemo(() => {
    let list: string[] = [];
    try {
      list = JSON.parse(product.images);
    } catch (e) {
      if (typeof product.images === 'string' && product.images) list = [product.images];
    }
    (product.variations || []).forEach((v: any) => {
      if (v.image && !list.includes(v.image)) {
        list.push(v.image);
      }
    });
    if (list.length === 0) {
      list = ['https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800&auto=format&fit=crop&q=80'];
    }
    return list;
  }, [product.images, product.variations]);

  // Extract all attribute keys and unique values from variations
  const { availableColors, availableSizes, colorHexMap, colorImageMap } = useMemo(() => {
    const colors = new Set<string>();
    const sizes = new Set<string>();
    const hexMap: Record<string, string> = {};
    const imgMap: Record<string, string> = {};

    (product.variations || []).forEach((v: any) => {
      try {
        const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        const colorName = attrs?.['Renk'] || attrs?.['Desen'] || attrs?.['Model'];
        if (colorName) {
          colors.add(colorName);
          if (attrs['RenkKodu']) {
            hexMap[colorName] = attrs['RenkKodu'];
          }
          if (v.image && !imgMap[colorName]) {
            imgMap[colorName] = v.image;
          }
        }
        const sizeName = attrs?.['Beden'] || attrs?.['Yaş'] || attrs?.['Size'] || attrs?.['yas'] || attrs?.['yaş'];
        if (sizeName) sizes.add(sizeName);
      } catch (e) {}
    });

    return {
      availableColors: Array.from(colors),
      availableSizes: sortSizes(Array.from(sizes)),
      colorHexMap: hexMap,
      colorImageMap: imgMap,
    };
  }, [product.variations]);

  const [selectedColor, setSelectedColor] = useState<string>(availableColors[0] || '');
  const [selectedSize, setSelectedSize] = useState<string>(availableSizes[0] || '');

  // Default to the first color's image if available, else first gallery image
  const initialMainImage = (availableColors[0] && colorImageMap[availableColors[0]]) || images[0];
  const [selectedImage, setSelectedImage] = useState(initialMainImage);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'size' | 'shipping'>('desc');
  const [stockAlertEmail, setStockAlertEmail] = useState('');
  const [stockAlertSent, setStockAlertSent] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Close lightbox on Escape key and prevent background scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    if (isLightboxOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  // Switch image when color is selected
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    if (colorImageMap[color]) {
      setSelectedImage(colorImageMap[color]);
    }
  };

  // Switch color when gallery thumbnail is clicked if that thumbnail matches a color
  const handleThumbnailClick = (img: string) => {
    setSelectedImage(img);
    const matchedColor = Object.entries(colorImageMap).find(([_, cImg]) => cImg === img)?.[0];
    if (matchedColor) {
      setSelectedColor(matchedColor);
    }
  };

  // Find exact matching variation
  const currentVariation = useMemo(() => {
    if (!product.variations || product.variations.length === 0) return null;
    return product.variations.find((v: any) => {
      try {
        const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        const vColor = attrs?.['Renk'] || attrs?.['Desen'] || attrs?.['Model'];
        const vSize = attrs?.['Beden'] || attrs?.['Yaş'] || attrs?.['Size'] || attrs?.['yas'] || attrs?.['yaş'];

        const matchColor = !selectedColor || vColor === selectedColor;
        const matchSize = !selectedSize || vSize === selectedSize;
        return matchColor && matchSize;
      } catch (e) {
        return false;
      }
    });
  }, [product.variations, selectedColor, selectedSize]);

  // Current price and stock calculations (KDV Dahil)
  const rawPrice = currentVariation ? currentVariation.price : product.price;
  const rawCompare = currentVariation?.compareAtPrice || product.compareAtPrice;
  const taxRate = product.taxRate || 10;
  const price = addTax(rawPrice, taxRate);
  const compareAtPrice = rawCompare ? addTax(rawCompare, taxRate) : null;
  const taxAmount = calculateTaxAmount(rawPrice, taxRate);
  const currentSku = currentVariation ? currentVariation.sku : product.sku;
  const currentStock = currentVariation ? currentVariation.stock : product.stock;
  const isOutOfStock = currentStock <= 0;

  const discountPercent =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const handleAddToCart = (fastBuy = false) => {
    if (isOutOfStock) return;

    let variationName = '';
    if (selectedColor && selectedSize) variationName = `${selectedColor} / ${selectedSize}`;
    else if (selectedSize) variationName = `${selectedSize}`;
    else if (selectedColor) variationName = `${selectedColor}`;

    addItem({
      productId: product.id,
      variationId: currentVariation?.id,
      title: product.title,
      variationName,
      price,
      quantity,
      image: currentVariation?.image || colorImageMap[selectedColor] || selectedImage,
      sku: currentSku,
      slug: product.slug,
    });

    if (fastBuy) {
      router.push('/odeme');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
      {/* 1. Left Gallery */}
      <div className="lg:col-span-6 space-y-4">
        <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-neutral-50/80 border border-cream-200 shadow-sm relative flex items-center justify-center group">
          {/* Ambient blurred glow for non-standard image ratios */}
          <img
            src={selectedImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-15 scale-110 pointer-events-none"
          />

          {/* High-res foreground image, 100% visible, no cropped heads or feet */}
          <img
            src={selectedImage}
            alt={product.title}
            onClick={() => setIsLightboxOpen(true)}
            className="relative z-10 w-full h-full object-contain object-center p-2 sm:p-4 transition-transform duration-300 hover:scale-105 cursor-zoom-in"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=600&auto=format&fit=crop&q=80';
            }}
          />

          {discountPercent > 0 && (
            <div className="absolute top-4 left-4 z-20 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
              %{discountPercent} İNDİRİM
            </div>
          )}

          {/* Bottom-right Zoom / Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 bg-white/95 hover:bg-white text-charcoal-700 hover:text-brand-600 p-2.5 sm:p-3 rounded-2xl shadow-lg border border-cream-200/90 backdrop-blur-md transition-all hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer group"
            title="Fotoğrafı Büyüt"
            aria-label="Fotoğrafı Büyüt"
          >
            <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110 text-charcoal-700 group-hover:text-brand-600" />
          </button>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => handleThumbnailClick(img)}
                className={`w-20 aspect-[4/5] rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all bg-neutral-50 p-1 flex items-center justify-center cursor-pointer ${
                  selectedImage === img ? 'border-brand-500 shadow-sm ring-2 ring-brand-500/20' : 'border-cream-200 opacity-70 hover:opacity-100'
                }`}
              >
                <img 
                  src={img} 
                  alt="" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=600&auto=format&fit=crop&q=80';
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Right Product Options & Purchase */}
      <div className="lg:col-span-6 space-y-6">
        <div>
          {currentSku && (
            <div className="text-xs font-bold text-charcoal-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
              <span>MODEL: {currentSku}</span>
            </div>
          )}

          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-charcoal-900 leading-snug">
            {product.title}
          </h1>

          {/* Price Box */}
          <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-cream-50/90 border border-cream-200/90 shadow-2xs space-y-2.5">
            {/* Top Row: Price + Badges + Stock */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
                <span className="font-heading font-black text-2xl sm:text-3xl text-brand-600 tracking-tight">
                  {formatPrice(price)}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                  KDV Dahil
                </span>
                {compareAtPrice && compareAtPrice > price && (
                  <span className="text-sm sm:text-base text-charcoal-400 line-through">
                    {formatPrice(compareAtPrice)}
                  </span>
                )}
              </div>

              {/* Stock Status Pill */}
              <div>
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Stokta Yok
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50/90 px-2.5 py-1 rounded-full border border-emerald-200 whitespace-nowrap">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Stokta Var</span>
                    <span className="text-emerald-600/75 font-semibold">({currentStock} Adet)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Row: KDV Breakdown */}
            <div className="pt-2 border-t border-cream-200/60 flex items-center flex-wrap gap-1.5 text-[11px] text-charcoal-500 font-medium">
              <span>KDV Hariç: <strong className="text-charcoal-800 font-semibold">{formatPrice(rawPrice)}</strong></span>
              <span className="text-charcoal-300">•</span>
              <span>%{taxRate} KDV: <strong className="text-charcoal-800 font-semibold">{formatPrice(taxAmount)}</strong></span>
            </div>
          </div>
        </div>

        {/* Variations Selector: Color with Image Preview */}
        {availableColors.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 block">
                Renk Seçimi: <span className="text-brand-600 font-extrabold normal-case">{selectedColor}</span>
              </label>
              {colorImageMap[selectedColor] && (
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Fotoğraf Ekranda
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {availableColors.map((color) => {
                const isSelected = selectedColor === color;
                const hex = colorHexMap[color];
                const colorImg = colorImageMap[color];
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/80 text-brand-900 shadow-sm ring-2 ring-brand-500/20'
                        : 'border-cream-300 bg-white text-charcoal-700 hover:border-brand-300 hover:bg-cream-50/60'
                    }`}
                  >
                    {colorImg ? (
                      <img
                        src={colorImg}
                        alt={color}
                        className="w-6 h-6 rounded-lg object-contain bg-neutral-100 border border-black/10 flex-shrink-0"
                      />
                    ) : hex ? (
                      <span
                        className="w-4 h-4 rounded-full border border-black/15 shadow-inner flex-shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                    ) : null}
                    <span>{color}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Variations Selector: Size */}
        {availableSizes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 block">
                Beden / Yaş Seçimi: <span className="text-brand-600 normal-case">{selectedSize}</span>
              </label>
              <button
                onClick={() => setActiveTab('size')}
                className="text-xs text-brand-600 hover:underline font-semibold"
              >
                Beden Tablosu
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-14 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/20'
                        : 'border-cream-300 bg-white text-charcoal-800 hover:border-brand-300'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity and Actions */}
        {!isOutOfStock ? (
          <div className="space-y-3 pt-2">
            <div className="flex gap-3">
              {/* Quantity */}
              <div className="flex items-center border border-cream-300 rounded-xl bg-white px-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-2 py-3 text-charcoal-600 hover:text-brand-600 font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-bold text-charcoal-800">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                  className="px-2 py-3 text-charcoal-600 hover:text-brand-600 font-bold"
                >
                  +
                </button>
              </div>

              {/* Add to Cart */}
              <button
                onClick={() => handleAddToCart(false)}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 group"
              >
                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Sepete Ekle</span>
              </button>
            </div>

            {/* Fast Checkout */}
            <button
              onClick={() => handleAddToCart(true)}
              className="w-full bg-charcoal-900 hover:bg-black text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Hemen Satın Al</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Bu varyasyon Şu an stoklarımızda tükenmiştir.</span>
            </div>
            <p className="text-xs text-amber-700">
              ürün tekrar stoğa girdiğinde anında haberdar olmak için e-posta adresinizi bırakabilirsiniz.
            </p>
            {stockAlertSent ? (
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                ✓ Teşekkürler! ürün stoğa girdiğinde bilgilendirileceksiniz.
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="E-posta adresiniz..."
                  value={stockAlertEmail}
                  onChange={(e) => setStockAlertEmail(e.target.value)}
                  className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-charcoal-800 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (stockAlertEmail) setStockAlertSent(true);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Haber Ver</span>
                </button>
              </div>
            )}
          </div>
        )}


        {/* Assurance Icons */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-cream-200 text-center">
          <div className="p-2.5 rounded-xl bg-cream-50">
            <Truck className="w-4 h-4 mx-auto text-brand-500 mb-1" />
            <div className="text-[11px] font-bold text-charcoal-800">Hızlı Gönderim</div>
            <div className="text-[10px] text-charcoal-500">Aynı gün kargo</div>
          </div>
          <div className="p-2.5 rounded-xl bg-cream-50">
            <ShieldCheck className="w-4 h-4 mx-auto text-powder-500 mb-1" />
            <div className="text-[11px] font-bold text-charcoal-800">%100 Pamuk</div>
            <div className="text-[10px] text-charcoal-500">Antialerjik doku</div>
          </div>
          <div className="p-2.5 rounded-xl bg-cream-50">
            <Banknote className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
            <div className="text-[11px] font-bold text-charcoal-800">Kapıda Ödeme İmkanı</div>
            <div className="text-[10px] text-charcoal-500">150 TL Fark ile</div>
          </div>
        </div>

        {/* Detail Tabs */}
        <div className="pt-4 border-t border-cream-200">
          <div className="flex border-b border-cream-200">
            <button
              onClick={() => setActiveTab('desc')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'desc'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              Ürün Açıklaması
            </button>
            <button
              onClick={() => setActiveTab('size')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'size'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              Beden Rehberi
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'shipping'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              Teslimat ve Kargo
            </button>
          </div>

          <div className="py-4 text-sm text-charcoal-600 leading-relaxed">
            {activeTab === 'desc' && (
              <div className="space-y-3">
                <p>{product.description || product.shortDescription}</p>
                <div className="bg-cream-50 p-3.5 rounded-xl text-xs space-y-1.5 border border-cream-200">
                  <div className="font-bold text-charcoal-800">Yıkama & Bakım Talimat?:</div>
                  <ul className="list-disc list-inside space-y-1 text-charcoal-600">
                    <li>30 derecede benzer renklerle tersten yıkayınız.</li>
                    <li>Ağartıcı ve optik deterjan kullanmayınız.</li>
                    <li>Düşük ısıda ütüleyiniz, baskı üzerine direkt ütü basmayınız.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'size' && (
              <div className="space-y-3 text-xs">
                <p>çocukların hızlı büyüme süreçleri göz önüne alınarak bedenlerimiz rahat kalıp üretilmiştir.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-cream-200">
                    <thead>
                      <tr className="bg-cream-100 text-charcoal-800 font-bold">
                        <th className="p-2 border border-cream-200">Beden</th>
                        <th className="p-2 border border-cream-200">Boy (cm)</th>
                        <th className="p-2 border border-cream-200">Kilo (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-100 text-charcoal-700">
                      <tr><td className="p-2 border border-cream-200">1-2 Yaş</td><td className="p-2 border border-cream-200">86 - 92 cm</td><td className="p-2 border border-cream-200">11 - 13 kg</td></tr>
                      <tr><td className="p-2 border border-cream-200">2-3 Yaş</td><td className="p-2 border border-cream-200">92 - 98 cm</td><td className="p-2 border border-cream-200">13 - 15 kg</td></tr>
                      <tr><td className="p-2 border border-cream-200">3-4 Yaş</td><td className="p-2 border border-cream-200">98 - 104 cm</td><td className="p-2 border border-cream-200">15 - 17 kg</td></tr>
                      <tr><td className="p-2 border border-cream-200">4-5 Yaş</td><td className="p-2 border border-cream-200">104 - 110 cm</td><td className="p-2 border border-cream-200">17 - 19 kg</td></tr>
                      <tr><td className="p-2 border border-cream-200">5-6 Yaş</td><td className="p-2 border border-cream-200">110 - 116 cm</td><td className="p-2 border border-cream-200">19 - 22 kg</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-2 text-xs text-charcoal-600">
                <p><strong>Kargo Süreci:</strong> Siparişleriniz 1-4 iş günü içerisinde PTT Kargo'ya verilmektedir.</p>
                <p><strong>Ücretsiz Kargo:</strong> 1500 TL üzeri verilen siparişlerde kargo ücretsizdir.</p>
                <p><strong>Kapıda Ödeme:</strong> Kapıda ödeme siparişlerde ekstra 150 TL fark olmaktadır. Kargo Firmasının ekstra ücret almasından kaynaklıdır.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Büyütülmüş Fotoğraf Modalı */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[92vh] w-full bg-white rounded-3xl p-3 sm:p-5 overflow-hidden shadow-2xl flex flex-col items-center cursor-default animate-in zoom-in-95 duration-200"
          >
            {/* Sağ Üst Köşedeki Çarpı (Kapat) Butonu */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-3.5 right-3.5 z-30 bg-charcoal-900/80 hover:bg-rose-600 text-white p-2 sm:p-2.5 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-lg group"
              title="Kapat"
              aria-label="Kapat"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:rotate-90 duration-200" />
            </button>

            {/* Büyütülmüş Fotoğraf */}
            <div className="relative w-full h-[65vh] sm:h-[75vh] flex items-center justify-center bg-neutral-50/60 rounded-2xl overflow-hidden">
              <img
                src={selectedImage}
                alt={product.title}
                className="w-full h-full object-contain p-2 sm:p-4 select-none"
              />

              {/* Önceki / Sonraki Navigasyon Butonları (Eğer birden fazla görsel varsa) */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIndex = images.indexOf(selectedImage);
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
                      setSelectedImage(images[prevIndex]);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-charcoal-900/70 hover:bg-charcoal-900 text-white p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md"
                    title="Önceki Fotoğraf"
                    aria-label="Önceki Fotoğraf"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIndex = images.indexOf(selectedImage);
                      const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
                      setSelectedImage(images[nextIndex]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-charcoal-900/70 hover:bg-charcoal-900 text-white p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md"
                    title="Sonraki Fotoğraf"
                    aria-label="Sonraki Fotoğraf"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Küçük Görseller Şeridi (Birden fazla fotoğraf varsa) */}
            {images.length > 1 && (
              <div className="flex gap-2.5 mt-3 overflow-x-auto max-w-full pb-1 pt-1 scrollbar-thin">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-14 h-16 sm:w-16 sm:h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all bg-neutral-50 p-1 flex items-center justify-center cursor-pointer ${
                      selectedImage === img
                        ? 'border-brand-500 scale-105 shadow-md ring-2 ring-brand-500/20'
                        : 'border-cream-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
