'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { ChevronRight, Sparkles, Loader2, ArrowUpDown, CheckCircle2 } from 'lucide-react';

interface Props {
  initialProducts: any[];
  initialTotal: number;
}

export function AllProductsClient({ initialProducts, initialTotal }: Props) {
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialProducts.length < initialTotal);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('newest');

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  // Sıralama değiştiğinde sıfırdan ilk 20 ürünü çek
  const handleSortChange = async (newSort: string) => {
    setSort(newSort);
    setLoading(true);
    try {
      const res = await fetch(`/api/products?page=1&limit=20&sort=${newSort}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setPage(1);
        setTotal(data.pagination.total);
        setHasMore(data.pagination.hasMore);
      }
    } catch (e) {
      console.error('Sort fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Sonraki 20 ürünü yükle
  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore || loading) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/products?page=${nextPage}&limit=20&sort=${sort}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.products)) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newUnique = data.products.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...newUnique];
        });
        setPage(nextPage);
        setHasMore(data.pagination.hasMore);
        setTotal(data.pagination.total);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Load more products error:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [page, hasMore, loading, sort]);

  // Sayfa altına yaklaşıldığında otomatik yükleme (Infinite Scroll)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      {
        rootMargin: '250px', // Kullanıcı sayfanın sonuna 250px kala önceden yükle
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-charcoal-400">
        <Link href="/" className="hover:text-brand-600 transition-colors">
          Anasayfa
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-charcoal-800 font-semibold">Tüm Ürünlerimiz</span>
      </nav>

      {/* Başlık ve Sıralama Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-cream-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 tracking-wider uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5 fill-brand-500 text-brand-500" />
            <span>Koleksiyonumuz</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-charcoal-900">
            Tüm Ürünlerimiz
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
            En şık ve kaliteli bebek & çocuk takımları ({total} Model)
          </p>
        </div>

        {/* Sıralama Seçici */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-cream-50/80 p-1.5 rounded-2xl border border-cream-200">
          <ArrowUpDown className="w-4 h-4 text-charcoal-500 ml-2" />
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            disabled={loading}
            className="bg-transparent text-xs font-bold text-charcoal-700 pr-3 py-1 focus:outline-none cursor-pointer"
          >
            <option value="newest">En Yeniler</option>
            <option value="price_asc">Fiyat: Düşükten Yükseğe</option>
            <option value="price_desc">Fiyat: Yüksekten Düşüğe</option>
          </select>
        </div>
      </div>

      {/* Ürünler Grid */}
      {products.length === 0 && !loading ? (
        <div className="bg-cream-50/50 rounded-3xl p-12 text-center border border-cream-200 space-y-3">
          <Sparkles className="w-8 h-8 text-charcoal-400 mx-auto" />
          <h2 className="font-bold text-charcoal-800 text-base">Ürün Bulunamadı</h2>
          <p className="text-xs text-charcoal-500">Şu anda görüntülenecek aktif ürün bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}

      {/* Yükleniyor İskeletleri / Kartları */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pt-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-cream-50/50 rounded-2xl border border-cream-200 aspect-[4/5] animate-pulse p-4 flex flex-col justify-end space-y-2"
            >
              <div className="h-4 bg-cream-200/70 rounded-md w-3/4"></div>
              <div className="h-3 bg-cream-200/50 rounded-md w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Sentinel Elemanı (Scroll tetikleyici) */}
      <div ref={sentinelRef} className="h-10 flex items-center justify-center">
        {loading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Yeni modeller yükleniyor...</span>
          </div>
        )}
      </div>

      {/* Manuel Yükleme Butonu (Scroll'u beklemek istemeyen veya yavaş bağlantılı kullanıcılar için) */}
      {hasMore && !loading && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            className="inline-flex items-center gap-2 bg-white hover:bg-cream-50 text-charcoal-800 font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl border border-cream-300 shadow-sm hover:border-brand-400 transition-all cursor-pointer"
          >
            <span>Daha Fazla Ürün Göster</span>
            <span className="text-[11px] text-charcoal-400 bg-cream-100 px-2 py-0.5 rounded-full">
              {Math.max(0, total - products.length)} Kalan
            </span>
          </button>
        </div>
      )}

      {/* Tüm Ürünler Yüklendi Bilgilendirmesi */}
      {!hasMore && products.length > 0 && (
        <div className="text-center py-6 text-xs text-charcoal-400 flex items-center justify-center gap-1.5 border-t border-cream-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Tüm ürünlerimiz listelendi ({products.length} model)</span>
        </div>
      )}
    </div>
  );
}
