'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { 
  Star, Search, Check, AlertCircle, ExternalLink, Package, 
  Sparkles, Eye, ArrowRight, CheckCircle2, XCircle 
} from 'lucide-react';

interface Props {
  initialProducts: any[];
}

export function AdminVitrinClient({ initialProducts }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'featured' | 'not_featured'>('featured');
  const [toastMsg, setToastMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const featuredCount = products.filter((p) => p.isFeatured).length;

  const filtered = products.filter((p) => {
    // Mode filter
    if (filterMode === 'featured' && !p.isFeatured) return false;
    if (filterMode === 'not_featured' && p.isFeatured) return false;

    // Search filter
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s) ||
      p.categories.some((c: any) => c.category.name.toLowerCase().includes(s))
    );
  });

  const handleToggleFeatured = async (id: string, newFeaturedState: boolean) => {
    setIsUpdating(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: newFeaturedState }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Durum güncellenemedi.');
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isFeatured: newFeaturedState } : p))
      );

      const targetProd = products.find((p) => p.id === id);
      setToastMsg(
        newFeaturedState
          ? `"${targetProd?.title || 'Ürün'}" anasayfa vitrinine eklendi!`
          : `"${targetProd?.title || 'Ürün'}" anasayfa vitrininden çıkarıldı.`
      );
      setTimeout(() => setToastMsg(''), 3500);
    } catch (err: any) {
      alert(err.message || 'İşlem sırasında hata oluştu.');
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <h1 className="font-heading font-black text-2xl text-slate-900">
              Anasayfa Vitrin Yönetimi
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Anasayfada öne çıkan vitrin alanında sergilenen ürünleri yönetin. Tek tıkla vitrine ürün ekleyip çıkarabilirsiniz.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/"
            target="_blank"
            className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <span>Vitrine Git</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/admin/urunler"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Package className="w-3.5 h-3.5 text-slate-400" />
            <span>Tüm Ürünler</span>
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-brand-50 to-transparent p-5 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-800">
              Vitrin Durumu & Görünürlük
            </div>
            <p className="text-xs text-slate-600 max-w-xl">
              Şu anda anasayfada sergilenmek üzere <strong>{featuredCount} adet ürün</strong> seçili. Seçtiğiniz ürünler vitrinde müşterilere en üst sırada sunulur.
            </p>
          </div>
        </div>

        <div className="bg-white px-4 py-2.5 rounded-xl border border-amber-200 shadow-2xs text-center self-start sm:self-auto flex-shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vitrindeki Ürünler</div>
          <div className="text-xl font-black text-amber-600">{featuredCount} Adet</div>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterMode('featured')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterMode === 'featured'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${filterMode === 'featured' ? 'fill-white' : 'fill-amber-500 text-amber-500'}`} />
            <span>Vitrindekiler ({featuredCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('not_featured')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterMode === 'not_featured'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Vitrinde Olmayanlar ({products.length - featuredCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tüm Katalog ({products.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Ürün adı, SKU veya kategori ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-brand-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Görsel</th>
                <th className="py-3 px-3">Ürün Bilgisi</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Fiyat</th>
                <th className="py-3 px-3">Stok Durumu</th>
                <th className="py-3 px-4 text-right">Vitrin Eylemi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Kriterlere uygun ürün bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => {
                  let imgs: string[] = [];
                  try { imgs = JSON.parse(prod.images); } catch (e) {}
                  const mainImg = imgs[0] || '/uploads/eslasiyahlogo.png';
                  const isLoad = isUpdating === prod.id;

                  return (
                    <tr 
                      key={prod.id} 
                      className={`transition-colors ${
                        prod.isFeatured ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Image */}
                      <td className="py-3 px-4">
                        <div className="w-12 h-14 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative">
                          <img src={mainImg} alt="" className="w-full h-full object-cover" />
                          {prod.isFeatured && (
                            <div className="absolute top-1 left-1 bg-amber-500 text-white rounded-full p-0.5 shadow-xs">
                              <Star className="w-2.5 h-2.5 fill-white" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Title & SKU */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{prod.title}</span>
                          {prod.isFeatured && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                              Vitrinde
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          Kod: {prod.sku}
                        </div>
                      </td>

                      {/* Categories */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {prod.categories.slice(0, 2).map((c: any) => (
                            <span key={c.categoryId} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                              {c.category.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatPrice(prod.price)}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          prod.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {prod.stock > 0 ? `${prod.stock} Adet` : 'Tükendi'}
                        </span>
                      </td>

                      {/* Vitrin Action Button */}
                      <td className="py-3 px-4 text-right">
                        {prod.isFeatured ? (
                          <button
                            type="button"
                            disabled={isLoad}
                            onClick={() => handleToggleFeatured(prod.id, false)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-rose-50 text-amber-800 hover:text-rose-700 border border-amber-300 hover:border-rose-300 transition-all cursor-pointer shadow-2xs disabled:opacity-50 group"
                            title="Bu ürünü anasayfa vitrininden kaldır"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 group-hover:hidden" />
                            <XCircle className="w-3.5 h-3.5 text-rose-600 hidden group-hover:inline" />
                            <span className="group-hover:hidden">Vitrinde</span>
                            <span className="hidden group-hover:inline">Vitrinden Çıkar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isLoad}
                            onClick={() => handleToggleFeatured(prod.id, true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-amber-500 text-slate-700 hover:text-white border border-slate-200 hover:border-amber-500 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                            title="Bu ürünü anasayfa vitrinine ekle"
                          >
                            <Star className="w-3.5 h-3.5" />
                            <span>Vitrine Ekle</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
