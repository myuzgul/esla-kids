'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice, addTax } from '@/lib/utils';
import { Search, Copy, Trash2, ExternalLink, Package, Check, AlertCircle, Edit, Tag, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { BulkPriceManager } from '@/components/admin/BulkPriceManager';

interface Props {
  initialProducts: any[];
  categories?: any[];
}

export function AdminProductsListClient({ initialProducts, categories = [] }: Props) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  const featuredCount = products.filter((p) => p.isFeatured).length;

  const filtered = products.filter((p) => {
    if (onlyFeatured && !p.isFeatured) return false;
    const s = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s) ||
      p.categories.some((c: any) => c.category.name.toLowerCase().includes(s))
    );
  });

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentFeatured }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isFeatured: !currentFeatured } : p))
        );
        const prod = products.find((p) => p.id === id);
        setCopyMsg(
          !currentFeatured
            ? `"${prod?.title || 'Ürün'}" vitrine eklendi!`
            : `"${prod?.title || 'Ürün'}" vitrinden çıkarıldı.`
        );
        setTimeout(() => setCopyMsg(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicate = async (product: any) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${product.title} (Kopya)`,
          sku: `${product.sku}-KOPYA-${Math.floor(100 + Math.random() * 900)}`,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          stock: product.stock,
          description: product.description,
          shortDescription: product.shortDescription,
          categoryIds: product.categories.map((c: any) => c.categoryId),
          images: JSON.parse(product.images || '[]'),
          variations: product.variations.map((v: any) => ({
            sku: `${v.sku}-KOPYA-${Math.floor(10 + Math.random() * 90)}`,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stock: v.stock,
            attributes: JSON.parse(v.attributes || '{}'),
            image: v.image,
          })),
        }),
      });

      if (res.ok) {
        setCopyMsg(`"${product.title}" başarıyla kopyalandı!`);
        setTimeout(() => setCopyMsg(''), 3000);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, productTitle: string) => {
    if (!window.confirm(`"${productTitle}" adlı ürünü silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setCopyMsg(`"${productTitle}" başarıyla silindi.`);
        setTimeout(() => setCopyMsg(''), 3000);
        router.refresh();
      } else {
        alert(data.error || 'Ürün silinemedi.');
      }
    } catch (e: any) {
      console.error(e);
      alert('Silme işlemi sırasında hata oluştu.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setOnlyFeatured(false)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !onlyFeatured ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tüm Ürünler ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setOnlyFeatured(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              onlyFeatured ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFeatured ? 'fill-white' : 'fill-amber-500 text-amber-500'}`} />
            <span>Vitrindekiler ({featuredCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
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

          <div className="text-xs text-slate-500 font-medium whitespace-nowrap hidden md:block">
            Toplam <strong>{filtered.length}</strong> ürün
          </div>
        </div>
      </div>

      {copyMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{copyMsg}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Görsel</th>
                <th className="py-3 px-3">Ürün Adı</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Fiyat</th>
                <th className="py-3 px-3">Varyasyon</th>
                <th className="py-3 px-3">Stok</th>
                <th className="py-3 px-3 text-center">Vitrin</th>
                <th className="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.map((prod) => {
                let imgs: string[] = [];
                try { imgs = JSON.parse(prod.images); } catch (e) {}
                const mainImg = imgs[0] || 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=200&auto=format&fit=crop&q=80';

                return (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="w-12 h-14 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative">
                        <img src={mainImg} alt="" className="w-full h-full object-cover" />
                        {prod.isFeatured && (
                          <div className="absolute top-1 left-1 bg-amber-500 text-white rounded-full p-0.5 shadow-2xs">
                            <Star className="w-2.5 h-2.5 fill-white" />
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <Link
                        href={`/admin/urunler/${prod.id}`}
                        className="font-bold text-slate-900 hover:text-brand-600 transition-colors block"
                      >
                        {prod.title}
                      </Link>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-600">
                      {prod.sku}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {prod.categories.slice(0, 2).map((c: any) => (
                          <span key={c.categoryId} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                            {c.category.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 whitespace-nowrap">
                        {formatPrice(prod.price)} <span className="text-[10px] text-slate-400 font-normal">+ KDV</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold whitespace-nowrap">
                        {formatPrice(addTax(prod.price, prod.taxRate || 10))} Dahil
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {prod.variations.length > 0 ? (
                        <span className="text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded-full text-[11px]">
                          {prod.variations.length} Varyasyon
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Tek Ürün</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        prod.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {prod.stock > 0 ? `${prod.stock} Adet` : 'Tükendi'}
                      </span>
                    </td>

                    {/* Vitrin Action Button */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(prod.id, Boolean(prod.isFeatured))}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                          prod.isFeatured
                            ? 'bg-amber-100 hover:bg-rose-100 text-amber-900 hover:text-rose-800 border border-amber-300 hover:border-rose-300 group'
                            : 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200'
                        }`}
                        title={prod.isFeatured ? 'Vitrinden Çıkar' : 'Vitrine Ekle'}
                      >
                        <Star className={`w-3.5 h-3.5 ${prod.isFeatured ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                        <span className={prod.isFeatured ? 'group-hover:hidden' : ''}>
                          {prod.isFeatured ? 'Vitrinde' : 'Vitrine Ekle'}
                        </span>
                        {prod.isFeatured && <span className="hidden group-hover:inline">Çıkar</span>}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/admin/urunler/${prod.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                        title="Ürünü Düzenle"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Düzenle</span>
                      </Link>

                      <button
                        onClick={() => handleDuplicate(prod)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg inline-block transition-colors"
                        title="Ürünü Çoğalt (Kopyala)"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <Link
                        href={`/urun/${prod.slug}`}
                        target="_blank"
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg inline-block transition-colors"
                        title="Mağazada Gör"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleDelete(prod.id, prod.title)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg inline-block transition-colors"
                        title="Ürünü Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
