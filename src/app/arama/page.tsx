import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';
import { Search, ChevronRight, Sparkles, SlidersHorizontal, PackageX, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

interface Props {
  searchParams: {
    q?: string;
    sort?: string;
  };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = searchParams.q?.trim() || '';
  if (!q) {
    return { title: 'Ürün Arama | Esla Kids Bebek ve Çocuk Giyim' };
  }
  return {
    title: `"${q}" Arama Sonuçları | Esla Kids`,
    description: `"${q}" için en kaliteli bebek ve çocuk giyim modelleri uygun fiyatlarla Esla Kids'te.`,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q?.trim() || '';
  const sort = searchParams.sort || 'newest';

  let products: any[] = [];
  let suggestedProducts: any[] = [];

  if (query.length >= 2) {
    try {
      const whereCondition: any = {
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { brand: { name: { contains: query, mode: 'insensitive' } } },
          { categories: { some: { category: { name: { contains: query, mode: 'insensitive' } } } } },
          { variations: { some: { OR: [
            { sku: { contains: query, mode: 'insensitive' } },
            { attributes: { contains: query, mode: 'insensitive' } },
          ] } } },
        ],
      };

      let orderBy: any = { createdAt: 'desc' };
      if (sort === 'price_asc') orderBy = { price: 'asc' };
      if (sort === 'price_desc') orderBy = { price: 'desc' };

      products = await prisma.product.findMany({
        where: whereCondition,
        include: {
          variations: true,
          categories: { include: { category: true } },
        },
        orderBy,
        take: 40,
      });
    } catch (e) {
      console.error('Search error:', e);
    }
  }

  // If no products found or query is short, fetch some popular products as suggestion
  if (products.length === 0) {
    try {
      suggestedProducts = await prisma.product.findMany({
        where: { isActive: true },
        include: { variations: true },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      });
    } catch (e) {}
  }

  // Helper to prioritize in-stock products
  const sortedProducts = [...products].sort((a, b) => {
    const aIn = a.stockStatus === 'IN_STOCK' || a.stock > 0 || (a.variations && a.variations.some((v: any) => v.stock > 0));
    const bIn = b.stockStatus === 'IN_STOCK' || b.stock > 0 || (b.variations && b.variations.some((v: any) => v.stock > 0));
    if (aIn && !bIn) return -1;
    if (!aIn && bIn) return 1;
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-charcoal-400">
        <Link href="/" className="hover:text-brand-600">Anasayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-charcoal-800 font-semibold">Ürün Arama</span>
        {query && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-brand-700 font-bold truncate max-w-[200px]">"{query}"</span>
          </>
        )}
      </nav>

      {/* Search Header & Interactive Search Box */}
      <div className="bg-gradient-to-br from-cream-50 via-white to-brand-50/50 p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-charcoal-900">
              {query ? `"${query}" İçin Arama Sonuçları` : 'Ürün Arama'}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
              {query 
                ? (products.length > 0 ? `${products.length} adet ürün bulundu` : 'Eşleşen ürün bulunamadı')
                : 'Aramak istediğiniz ürünün adı, modeli veya kategorisini yazınız.'}
            </p>
          </div>

          {/* Quick Categories */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Link 
              href="/arama?q=erkek%20%C3%A7ocuk"
              className="px-3 py-1.5 rounded-full bg-white hover:bg-brand-50 hover:text-brand-700 text-charcoal-700 border border-cream-200 transition-colors font-medium"
            >
              Erkek Çocuk
            </Link>
            <Link 
              href="/arama?q=k%C4%B1z%20bebek"
              className="px-3 py-1.5 rounded-full bg-white hover:bg-brand-50 hover:text-brand-700 text-charcoal-700 border border-cream-200 transition-colors font-medium"
            >
              Kız Bebek
            </Link>
            <Link 
              href="/arama?q=tak%C4%B1m"
              className="px-3 py-1.5 rounded-full bg-white hover:bg-brand-50 hover:text-brand-700 text-charcoal-700 border border-cream-200 transition-colors font-medium"
            >
              Takımlar
            </Link>
            <Link 
              href="/arama?q=pijama"
              className="px-3 py-1.5 rounded-full bg-white hover:bg-brand-50 hover:text-brand-700 text-charcoal-700 border border-cream-200 transition-colors font-medium"
            >
              Pijama
            </Link>
          </div>
        </div>

        {/* Search Input Form */}
        <form action="/arama" method="GET" className="relative flex items-center max-w-2xl">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Ürün adı, takım, renk veya model kodu ara..."
            className="w-full bg-white border-2 border-cream-300 focus:border-brand-500 rounded-2xl py-3.5 pl-12 pr-28 text-base text-charcoal-800 placeholder-charcoal-400 focus:outline-none shadow-sm transition-all"
          />
          <Search className="w-5 h-5 text-charcoal-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Ara
          </button>
        </form>
      </div>

      {/* Sort options bar if products exist */}
      {sortedProducts.length > 0 && (
        <div className="flex items-center justify-between pb-3 border-b border-cream-200 text-xs">
          <span className="font-semibold text-charcoal-600">
            Toplam <strong className="text-charcoal-900">{sortedProducts.length}</strong> ürün listeleniyor
          </span>

          <div className="flex items-center gap-2">
            <span className="text-charcoal-400 hidden sm:inline">Sıralama:</span>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/arama?q=${encodeURIComponent(query)}&sort=newest`}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  sort === 'newest' ? 'bg-brand-500 text-white' : 'bg-cream-100 hover:bg-cream-200 text-charcoal-700'
                }`}
              >
                En Yeniler
              </Link>
              <Link
                href={`/arama?q=${encodeURIComponent(query)}&sort=price_asc`}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  sort === 'price_asc' ? 'bg-brand-500 text-white' : 'bg-cream-100 hover:bg-cream-200 text-charcoal-700'
                }`}
              >
                Fiyat Artan
              </Link>
              <Link
                href={`/arama?q=${encodeURIComponent(query)}&sort=price_desc`}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  sort === 'price_desc' ? 'bg-brand-500 text-white' : 'bg-cream-100 hover:bg-cream-200 text-charcoal-700'
                }`}
              >
                Fiyat Azalan
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Results Products Grid */}
      {sortedProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {sortedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="space-y-12">
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-cream-200 text-center max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-cream-100 text-charcoal-400 flex items-center justify-center mx-auto">
              <PackageX className="w-8 h-8" />
            </div>
            <h2 className="font-heading font-black text-xl text-charcoal-900">
              {query ? `"${query}" ile eşleşen ürün bulunamadı` : 'Arama yapmak için bir kelime giriniz'}
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
              Aradığınız kelimenin yazımını kontrol edebilir veya popüler kategorilerimize göz atabilirsiniz.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/kategori/erkek-cocuk"
                className="bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Erkek Çocuk Koleksiyonu
              </Link>
              <Link
                href="/kategori/kiz-bebek"
                className="bg-powder-50 hover:bg-powder-100 text-powder-800 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Kız Bebek Koleksiyonu
              </Link>
            </div>
          </div>

          {/* Suggested Popular Products */}
          {suggestedProducts.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-cream-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-black text-xl text-charcoal-900">
                    İlginizi Çekebilecek Popüler Ürünler
                  </h3>
                  <p className="text-xs text-charcoal-500">En çok tercih edilen modellerimiz</p>
                </div>
                <Link
                  href="/"
                  className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
                >
                  <span>Tümünü Gör</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {suggestedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
