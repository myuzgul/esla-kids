import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';
import { HomeWideBanner } from '@/components/HomeWideBanner';
import { ArrowRight, Sparkles, Star, ShieldCheck, Heart, Truck, RefreshCw, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let products: any[] = [];
  let categories: any[] = [];
  let banners: any[] = [];
  let featuredProducts: any[] = [];

  try {
    const res = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        take: 12,
        orderBy: { createdAt: 'desc' },
        include: { variations: true },
      }),
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        take: 4,
        orderBy: { order: 'asc' },
      }),
      prisma.banner.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),
      prisma.product.findMany({
        where: { isActive: true, isFeatured: true },
        take: 8,
        orderBy: { updatedAt: 'desc' },
        include: { variations: true },
      }),
    ]);
    products = res[0] || [];
    categories = res[1] || [];
    banners = res[2] || [];
    featuredProducts = res[3] || [];
  } catch (err) {
    console.error('HomePage data fetch error:', err);
  }

  // In-stock first, out-of-stock last helper
  const sortByStock = (list: any[]) => {
    return [...list].sort((a, b) => {
      const aOut = a.stockStatus === 'OUT_OF_STOCK' || (a.stock !== undefined && a.stock <= 0);
      const bOut = b.stockStatus === 'OUT_OF_STOCK' || (b.stock !== undefined && b.stock <= 0);
      if (aOut && !bOut) return 1;
      if (!aOut && bOut) return -1;
      return 0;
    });
  };

  const sortedProducts = sortByStock(products);
  const sortedFeatured = sortByStock(featuredProducts);

  // Vitrin (Featured) Products - prioritize products marked as isFeatured by admin
  const vitrinProducts = sortedFeatured.length > 0
    ? (sortedFeatured.length < 4
        ? [...sortedFeatured, ...sortedProducts.filter((p) => !sortedFeatured.some((f) => f.id === p.id))].slice(0, 4)
        : sortedFeatured.slice(0, 8))
    : sortedProducts.slice(0, 4);

  // New arrivals - other products
  const newArrivals = sortedProducts.filter((p) => !vitrinProducts.some((v) => v.id === p.id)).slice(0, 4);

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* 1. Wide Homepage Banner directly under menu */}
      <HomeWideBanner banners={banners} />

      {/* 2. Homepage Fast Product Search Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-8 relative z-20">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-lg border border-cream-200/90">
          <form action="/arama" method="GET" className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-charcoal-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                name="q"
                placeholder="Ürün adı, beden, model veya renk arayın (örn. Takım, Pijama, 2 Yaş)..."
                className="w-full bg-cream-50/80 hover:bg-cream-50 focus:bg-white border border-cream-200 focus:border-brand-500 rounded-xl sm:rounded-2xl py-3 sm:py-3.5 pl-11 pr-4 text-sm text-charcoal-800 placeholder-charcoal-400 focus:outline-none transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 sm:py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl sm:rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Ürün Ara</span>
            </button>
          </form>

          {/* Popular Search Badges */}
          <div className="mt-3 pt-3 border-t border-cream-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-charcoal-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" /> Popüler:
            </span>
            {['Kız Bebek Takım', 'Erkek Çocuk', 'Pijama Takımı', 'Kışlık Takım', 'Elbise', 'Salopet'].map((tag) => (
              <Link
                key={tag}
                href={`/arama?q=${encodeURIComponent(tag)}`}
                className="px-2.5 py-1 bg-cream-100/70 hover:bg-brand-50 hover:text-brand-700 text-charcoal-600 rounded-full transition-colors text-[11px] sm:text-xs font-medium"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Advantage Badges Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 sm:p-6 bg-cream-50/80 rounded-2xl border border-cream-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-charcoal-900">Hızlı Kargo</div>
              <div className="text-[11px] text-charcoal-500">Aynı gün kargo imkanı</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-charcoal-900">Güvenli Ödeme</div>
              <div className="text-[11px] text-charcoal-500">256-Bit SSL & 3D Secure</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-charcoal-900">Kolay İade & Değişim</div>
              <div className="text-[11px] text-charcoal-500">14 gün koşulsuz güvence</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-charcoal-900">%100 Pamuklu Kumaş</div>
              <div className="text-[11px] text-charcoal-500">Antialerjik & nefes alan doku</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-brand-600 tracking-wider uppercase">Popüler Kategoriler</span>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-charcoal-900 mt-1">
            Miniklerin İhtiyacına Göre Alışveriş
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/kategori/${cat.slug}`}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-cream-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-end p-4 sm:p-6"
            >
              <img
                src={cat.image || '/uploads/takim-mevsimlik1.jpeg'}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              <div className="relative z-10 text-white">
                <h3 className="font-heading font-bold text-lg sm:text-xl group-hover:text-brand-200 transition-colors">
                  {cat.name}
                </h3>
                <span className="text-xs font-medium text-cream-200 flex items-center gap-1 mt-1">
                  Koleksiyonu İncele <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Bestsellers Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 tracking-wider uppercase mb-1">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Öne Çıkan Vitrin Ürünleri</span>
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-charcoal-900">
              Haftanın Çok Satan Takımları
            </h2>
          </div>
          <Link
            href="/kategori/erkek-cocuk-takim"
            className="text-xs sm:text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 group"
          >
            <span>Tümünü Gör</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {vitrinProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      </section>

      {/* 4. Highlight Promotional Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-r from-brand-500 to-rose-400 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-xl space-y-4">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Esla Kids özel Fırsatı
            </span>
            <h3 className="font-heading font-black text-2xl sm:text-4xl leading-tight">
              Havale ile ödemelerde Ekstra %5 Anında İndirim!
            </h3>
            <p className="text-sm sm:text-base text-cream-100">
              Sepet tutarınız ne olursa olsun Havale/EFT seçeneğini tercih ettiğinizde sepette %5 indirim anında uygulanır.
            </p>
            <div className="pt-2">
              <Link
                href="/kategori/erkek-cocuk"
                className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-cream-100 font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-sm"
              >
                <span>Hemen Alışverişe Başla</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
            <Sparkles className="w-80 h-80" />
          </div>
        </div>
      </section>

      {/* 5. New Arrivals Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-powder-500 tracking-wider uppercase">Yeni Gelenler</span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-charcoal-900 mt-1">
              Bu Hafta Eklenen Modeller
            </h2>
          </div>
          <Link
            href="/kategori/kiz-bebek"
            className="text-xs sm:text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 group"
          >
            <span>Tüm Yeni Modeller</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {newArrivals.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      </section>
    </div>
  );
}
