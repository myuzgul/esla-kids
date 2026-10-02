'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Sparkles, Layers, Check, ExternalLink, Loader2, Star } from 'lucide-react';
import { ProductImageManager } from '@/components/admin/ProductImageManager';
import { ColorSwatchPicker, ColorOption, PRESET_BABY_COLORS } from '@/components/admin/ColorSwatchPicker';
import { formatPrice, addTax } from '@/lib/utils';
import {
  ColorImageCards,
  VariationThumbnailButton,
  VariationImageModal,
  ColorItem,
  PickerTarget,
} from '@/components/admin/VariationImageManager';

interface Props {
  product: any;
  categories: any[];
}

export function ProductEditClient({ product, categories }: Props) {
  const router = useRouter();

  // Basic Form
  const [title, setTitle] = useState(product.title || '');
  const [sku, setSku] = useState(product.sku || '');
  const [price, setPrice] = useState(product.price ? product.price.toString() : '');
  const [compareAtPrice, setCompareAtPrice] = useState(product.compareAtPrice ? product.compareAtPrice.toString() : '');
  const [taxRate, setTaxRate] = useState<number>(product.taxRate || 10);
  const [stock, setStock] = useState(product.stock ? product.stock.toString() : '0');
  const [isFeatured, setIsFeatured] = useState<boolean>(Boolean(product.isFeatured));
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>(
    product.categories?.map((c: any) => c.categoryId) || []
  );
  const [description, setDescription] = useState(product.description || '');
  const [shortDescription, setShortDescription] = useState(product.shortDescription || '');

  // Images
  let initialImages: string[] = [];
  try {
    initialImages = JSON.parse(product.images || '[]');
  } catch (e) {
    if (product.images) initialImages = [product.images];
  }
  const [images, setImages] = useState<string[]>(initialImages);

  // Variations
  const initialVariations = (product.variations || []).map((v: any) => {
    let attrs: any = {};
    try {
      attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
    } catch (e) {}
    return {
      id: v.id,
      sku: v.sku,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stock: v.stock,
      attributes: attrs,
      color: attrs['Renk'] || attrs['Desen'] || attrs['Model'] || 'Standart',
      colorHex: attrs['RenkKodu'] || '#1e3a8a',
      size: attrs['Beden'] || attrs['Yaş'] || attrs['Size'] || attrs['yas'] || attrs['yaş'] || 'Standart',
      image: v.image || '',
    };
  });

  const [enableVariations, setEnableVariations] = useState(initialVariations.length > 0);
  const [variations, setVariations] = useState<any[]>(initialVariations);

  // Color & Size Generator State
  const [selectedColors, setSelectedColors] = useState<ColorOption[]>(() => {
    const existingColorNames = Array.from(new Set(initialVariations.map((v: any) => v.color)));
    return existingColorNames.map((name: any) => {
      const found = PRESET_BABY_COLORS.find((p) => p.name.toLowerCase() === name.toLowerCase());
      const firstVar = initialVariations.find((v: any) => v.color === name);
      return {
        name,
        hex: firstVar?.colorHex || found?.hex || '#1e3a8a',
      };
    });
  });

  const PRESET_SIZES = ['0-3 Ay', '3-6 Ay', '6-9 Ay', '9-12 Ay', '12-18 Ay', '1-2 Yaş', '2-3 Yaş', '3-4 Yaş', '4-5 Yaş', '5-6 Yaş', '6-7 Yaş', '7-8 Yaş'];
  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => {
    const existingSizeNames = Array.from(new Set(initialVariations.map((v: any) => v.size)));
    return existingSizeNames.length > 0 ? (existingSizeNames as string[]) : ['1-2 Yaş', '2-3 Yaş', '3-4 Yaş'];
  });
  const [customSize, setCustomSize] = useState('');

  const [bulkStockVal, setBulkStockVal] = useState('5');
  const [bulkPriceVal, setBulkPriceVal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const toggleSize = (s: string) => {
    setSelectedSizes((prev) => prev.includes(s) ? prev.filter((i) => i !== s) : [...prev, s]);
  };

  const addCustomSize = () => {
    if (customSize.trim() && !selectedSizes.includes(customSize.trim())) {
      setSelectedSizes([...selectedSizes, customSize.trim()]);
      setCustomSize('');
    }
  };

  // Generate Matrix
  const generateVariations = () => {
    if (selectedColors.length === 0 || selectedSizes.length === 0) {
      alert('Lütfen en az 1 renk ve 1 beden seçiniz.');
      return;
    }

    const baseSku = (sku && sku.trim()) ? sku.trim() : 'EK';
    const basePrice = price ? parseFloat(price) : product.price || 0;
    const baseCompare = compareAtPrice ? parseFloat(compareAtPrice) : null;
    const list = [];

    for (const c of selectedColors) {
      for (const s of selectedSizes) {
        const cleanSize = s.replace(/[^0-9]/g, '') || s.substring(0, 3);
        const cleanColor = c.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
        const vSku = `${baseSku}-${cleanColor}-${cleanSize}`;
        const existingImg = variations.find((v) => v.color === c.name && v.image)?.image || '';
        list.push({
          sku: vSku,
          price: basePrice,
          compareAtPrice: baseCompare,
          stock: 5,
          color: c.name,
          colorHex: c.hex,
          size: s,
          image: existingImg,
          attributes: { 'Renk': c.name, 'RenkKodu': c.hex, 'Beden': s, 'Yaş': s },
        });
      }
    }
    setVariations(list);
  };

  const applyBulkStock = () => {
    const val = parseInt(bulkStockVal) || 0;
    setVariations((prev) => prev.map((v) => ({ ...v, stock: val })));
  };

  const applyBulkPrice = () => {
    const val = parseFloat(bulkPriceVal);
    if (!isNaN(val)) {
      setVariations((prev) => prev.map((v) => ({ ...v, price: val })));
    }
  };

  const distinctColors: ColorItem[] = useMemo(() => {
    const map = new Map<string, string>();
    selectedColors.forEach((c) => map.set(c.name, c.hex));
    variations.forEach((v) => {
      if (v.color && !map.has(v.color)) {
        map.set(v.color, v.colorHex || '#1e3a8a');
      }
    });
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  }, [selectedColors, variations]);

  const handleSetColorImage = (colorName: string, imageUrl: string) => {
    setVariations((prev) =>
      prev.map((v) => (v.color === colorName ? { ...v, image: imageUrl } : v))
    );
  };

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  const handleSelectVariationImage = (imageUrl: string, applyToAllSameColor: boolean) => {
    if (!pickerTarget) return;
    setVariations((prev) =>
      prev.map((v, idx) => {
        if (applyToAllSameColor && v.color === pickerTarget.colorName) {
          return { ...v, image: imageUrl };
        }
        if (pickerTarget.variationIndex !== undefined && idx === pickerTarget.variationIndex) {
          return { ...v, image: imageUrl };
        }
        return v;
      })
    );
  };

  const handleRemoveColorImage = (colorName: string) => {
    setVariations((prev) =>
      prev.map((v) => (v.color === colorName ? { ...v, image: '' } : v))
    );
  };

  const removeVariation = (idx: number) => {
    setVariations((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (!title.trim() || !price) {
        throw new Error('Lütfen ürün başlığı ve fiyat alanlarını doldurunuz.');
      }

      const payload = {
        title: title.trim(),
        sku: sku.trim(), // Optional: backend handles generating if empty
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        taxRate: parseFloat(String(taxRate)) || 10,
        stock: enableVariations ? variations.reduce((a, b) => a + (parseInt(b.stock) || 0), 0) : (parseInt(stock) || 0),
        categoryIds: selectedCatIds,
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        images,
        isFeatured,
        variations: enableVariations
          ? variations.map((v) => ({
              sku: v.sku,
              price: parseFloat(v.price) || parseFloat(price),
              compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
              stock: parseInt(v.stock) || 0,
              attributes: { 'Renk': v.color, 'RenkKodu': v.colorHex || '#1e3a8a', 'Beden': v.size, 'Yaş': v.size },
              image: v.image || images[0] || null,
            }))
          : [],
      };

      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ürün güncellenemedi.');

      setSuccessMsg('Ürün başarıyla güncellendi!');
      setTimeout(() => {
        router.push('/admin/urunler');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ürün kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/urunler"
            className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            title="Ürün Listesine Dön"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-heading font-black text-2xl text-slate-900">
              Ürün Düzenle
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ürün bilgileri, fotoğrafları ve varyasyon matrisini güncelleyin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/urun/${product.slug}`}
            target="_blank"
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Mağazada Gör</span>
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Değişiklikleri Kaydet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Temel Ürün Bilgileri */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
          <Layers className="w-4 h-4 text-brand-600" /> 1. Temel Ürün Bilgileri
        </h2>

        {/* Vitrin Switch Card */}
        <div className="flex items-center justify-between p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2.5">
            <Star className={`w-4 h-4 ${isFeatured ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
            <div>
              <label htmlFor="isFeaturedEdit" className="text-xs font-bold text-amber-950 cursor-pointer block">
                Anasayfa Vitrininde Göster (Öne Çıkarılan Ürün)
              </label>
              <p className="text-[11px] text-amber-700">
                Bu ürün anasayfadaki vitrin alanında en üst sıralarda sergilenir.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            id="isFeaturedEdit"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Ürün Başlığı *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Model Kodu (SKU) <span className="text-slate-400 font-normal lowercase">(opsiyonel)</span>
            </label>
            <input
              type="text"
              placeholder="Boş bırakırsanız sistem otomatik üretir"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Örnek: EK-101, SLP-202</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Satış Fiyatı (KDV Hariç) *
                </label>
              </div>
              <input
                type="number"
                step="0.01"
                required
                placeholder="250.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-bold"
              />
              {price && (
                <div className="text-[11px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                  <span>KDV Dahil:</span>
                  <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {formatPrice(addTax(parseFloat(price) || 0, taxRate))}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  İndirim Öncesi (KDV Hariç)
                </label>
              </div>
              <input
                type="number"
                step="0.01"
                placeholder="350.00"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
              />
              {compareAtPrice && (
                <div className="text-[11px] text-slate-500 mt-1">
                  KDV Dahil: {formatPrice(addTax(parseFloat(compareAtPrice) || 0, taxRate))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
                KDV Oranı (%)
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 10)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-bold"
              >
                <option value={10}>%10 (Giyim & Tekstil Standart)</option>
                <option value={20}>%20 (Genel KDV)</option>
                <option value={1}>%1 (Özel KDV)</option>
                <option value={0}>%0 (KDV Muaf)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Müşteriye ve sepete bu oran eklenir</span>
            </div>
          </div>
        </div>

        {/* Kategoriler */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">Kategoriler</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
            {categories.map((cat) => {
              const checked = selectedCatIds.includes(cat.id);
              return (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 hover:text-brand-600">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        setSelectedCatIds(selectedCatIds.filter((id) => id !== cat.id));
                      } else {
                        setSelectedCatIds([...selectedCatIds, cat.id]);
                      }
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                  />
                  <span className={checked ? 'font-bold text-brand-700' : ''}>{cat.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Açıklamalar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Kısa Açıklama (Özet)</label>
            <textarea
              rows={3}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Detaylı Açıklama & Kumaş Özellikleri</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* 2. Fotoğraf Yöneticisi */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <ProductImageManager 
          images={images} 
          onChange={setImages} 
        />
      </div>

      {/* 3. Beden & Renk Varyasyon Matrisi */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" /> 3. Beden & Renk Varyasyon Matrisi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Çocuk giyimine özel renk paleti ve beden kombinasyonlarını yönetin.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors">
            <input
              type="checkbox"
              checked={enableVariations}
              onChange={(e) => setEnableVariations(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
            />
            <span className="text-xs font-bold text-slate-800">Varyasyonlu Ürün</span>
          </label>
        </div>

        {enableVariations ? (
          <div className="space-y-5">
            {/* Color Swatch Picker */}
            <ColorSwatchPicker 
              selectedColors={selectedColors} 
              onChange={setSelectedColors} 
            />

            {/* Size Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase block">
                Beden / Yaş Seçimi ({selectedSizes.length} Beden Seçili)
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_SIZES.map((size) => {
                  const active = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        active
                          ? 'bg-brand-50 text-brand-800 border-brand-300 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {/* Custom Size */}
              <div className="flex items-center gap-2 max-w-sm pt-1">
                <input
                  type="text"
                  placeholder="Özel Beden (Örn: 9-10 Yaş)"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-brand-500 flex-1"
                />
                <button
                  type="button"
                  onClick={addCustomSize}
                  className="bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                >
                  Beden Ekle
                </button>
              </div>
            </div>

            {/* Generator Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={generateVariations}
                className="bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>Kombinasyonları Yeniden Üret ({selectedColors.length * selectedSizes.length} Varyasyon)</span>
              </button>
            </div>

            {/* Variations Table */}
            {variations.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200">
                {/* Renklere Göre Fotoğraf Belirleme */}
                <ColorImageCards
                  colors={distinctColors}
                  variations={variations}
                  onOpenPicker={setPickerTarget}
                  onRemoveColorImage={handleRemoveColorImage}
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-800">
                    Mevcut Varyasyonlar ({variations.length} Adet)
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500">Tüm Stok:</span>
                      <input
                        type="number"
                        value={bulkStockVal}
                        onChange={(e) => setBulkStockVal(e.target.value)}
                        className="w-14 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={applyBulkStock}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]"
                      >
                        Uygula
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500">Tüm Fiyat:</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="TL"
                        value={bulkPriceVal}
                        onChange={(e) => setBulkPriceVal(e.target.value)}
                        className="w-16 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={applyBulkPrice}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]"
                      >
                        Uygula
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-2.5 w-12 text-center">Görsel</th>
                        <th className="p-2.5">Renk & Palet</th>
                        <th className="p-2.5">Beden</th>
                        <th className="p-2.5">Model Kodu (SKU)</th>
                        <th className="p-2.5">Fiyat (KDV Hariç)</th>
                        <th className="p-2.5">Stok</th>
                        <th className="p-2.5 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {variations.map((v, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-2 text-center">
                            <VariationThumbnailButton
                              image={v.image}
                              color={v.color}
                              onClick={() =>
                                setPickerTarget({
                                   colorName: v.color,
                                  variationIndex: idx,
                                  sizeName: v.size,
                                })
                              }
                            />
                          </td>
                          <td className="p-2.5">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-inner"
                                style={{ backgroundColor: v.colorHex || '#1e3a8a' }}
                              />
                              <span className="font-semibold text-slate-800">{v.color}</span>
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                              {v.size}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => {
                                const val = e.target.value;
                                setVariations((prev) => prev.map((item, i) => i === idx ? { ...item, sku: val } : item));
                              }}
                              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono w-40"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              step="0.01"
                              value={v.price}
                              onChange={(e) => {
                                const val = e.target.value;
                                setVariations((prev) => prev.map((item, i) => i === idx ? { ...item, price: val } : item));
                              }}
                              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold w-24"
                            />
                            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                              {formatPrice(addTax(parseFloat(v.price) || 0, taxRate))}
                            </div>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={v.stock}
                              onChange={(e) => {
                                const val = e.target.value;
                                setVariations((prev) => prev.map((item, i) => i === idx ? { ...item, stock: val } : item));
                              }}
                              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold w-16"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => removeVariation(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Tekil Ürün Stok Adedi</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-36 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold"
            />
          </div>
        )}
      </div>

      {/* Bottom Save Action */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Link
          href="/admin/urunler"
          className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2.5"
        >
          İptal
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Değişiklikleri Kaydet</span>
            </>
          )}
        </button>
      </div>
      {/* Variation Image Picker Modal */}
      <VariationImageModal
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        target={pickerTarget}
        productImages={images}
        onSelectImage={handleSelectVariationImage}
        onAddProductImage={(url) => setImages((prev) => [...prev, url])}
      />
    </form>
  );
}
