import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';
import { ChevronRight, Filter, SlidersHorizontal } from 'lucide-react';
import type { Metadata } from 'next';

interface Props {
  params: { slug: string };
  searchParams: {
    beden?: string;
    renk?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    inStock?: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
  });

  if (!category) return { title: 'Kategori Bulunamadı | Esla Kids' };

  return {
    title: `${category.name} Modelleri ve Fiyatları | Esla Kids`,
    description: category.description || `${category.name} en uygun fiyatlar ve kaliteli pamuk kumaş garantisi ile Esla Kids'te.`,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = params;
  const { beden, renk, minPrice, maxPrice, sort, inStock } = searchParams;

  // Find category
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: true,
      parent: true,
    },
  });

  if (!category) {
    notFound();
  }

  // Find all category IDs including children for broad category view
  const categoryIds = [category.id, ...category.children.map((c) => c.id)];

  // Build filter query
  const where: any = {
    isActive: true,
    categories: {
      some: {
        categoryId: { in: categoryIds },
      },
    },
  };

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }

  if (inStock === 'true') {
    where.stockStatus = 'IN_STOCK';
  }

  // Sort query
  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { price: 'asc' };
  else if (sort === 'price_desc') orderBy = { price: 'desc' };

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      variations: true,
    },
  });

  // Client-side filter for variations if beden or renk specified
  const filteredProducts = products.filter((p) => {
    if (!beden && !renk) return true;
    return p.variations.some((v) => {
      try {
        const attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        const vSize = attrs['Beden'] || attrs['Yaş'] || attrs['Size'] || attrs['yas'] || attrs['yaş'];
        const vColor = attrs['Renk'] || attrs['Desen'] || attrs['Model'];
        const matchBeden = !beden || vSize === beden;
        const matchRenk = !renk || vColor === renk;
        return matchBeden && matchRenk;
      } catch (e) {
        return false;
      }
    });
  });

  // Stoğu biten ürünleri en sona atma sıralaması (Stokta olanlar önce, bitenler en sonda)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aOutOfStock = a.stockStatus === 'OUT_OF_STOCK' || (a.stock !== undefined && a.stock <= 0);
    const bOutOfStock = b.stockStatus === 'OUT_OF_STOCK' || (b.stock !== undefined && b.stock <= 0);
    if (aOutOfStock && !bOutOfStock) return 1;
    if (!aOutOfStock && bOutOfStock) return -1;
    return 0;
  });

  const availableSizes = ['3-6 Ay', '6-9 Ay', '9-12 Ay', '1-2 Yaş', '2-3 Yaş', '3-4 Yaş', '4-5 Yaş', '5-6 Yaş'];
  const availableColors = ['Lacivert', 'Bej', 'Siyah', 'Pudra Pembe', 'Ekru', 'Bebek Mavisi', 'Lila'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-charcoal-400 mb-6">
        <Link href="/" className="hover:text-brand-600">Anasayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        {category.parent && (
          <>
            <Link href={`/kategori/${category.parent.slug}`} className="hover:text-brand-600">
              {category.parent.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
          </>
        )}
        <span className="text-charcoal-800 font-semibold">{category.name}</span>
      </nav>

      {/* Category Header */}
      <div className="mb-8">
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-charcoal-900">
          {category.name}
        </h1>
        {category.description && (
          <p className="text-sm text-charcoal-500 mt-1 max-w-2xl">
            {category.description}
          </p>
        )}

        {/* Subcategories pill chips */}
        {category.children.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {category.children.map((sub) => (
              <Link
                key={sub.id}
                href={`/kategori/${sub.slug}`}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-cream-100 hover:bg-brand-50 hover:text-brand-700 text-charcoal-700 border border-cream-200 transition-colors"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Layout: Sidebar Filter & Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 space-y-6 bg-cream-50/60 p-5 rounded-2xl border border-cream-200/80 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-cream-200">
            <div className="flex items-center gap-2 font-bold text-sm text-charcoal-900">
              <SlidersHorizontal className="w-4 h-4 text-brand-600" />
              <span>Filtreler</span>
            </div>
            {(beden || renk || minPrice || maxPrice || sort || inStock) && (
              <Link
                href={`/kategori/${slug}`}
                className="text-xs text-brand-600 hover:underline font-semibold"
              >
                Temizle
              </Link>
            )}
          </div>

          {/* Size Filter */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-2.5">
              Beden / Yaş
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {availableSizes.map((s) => {
                const isActive = beden === s;
                return (
                  <Link
                    key={s}
                    href={`/kategori/${slug}?${new URLSearchParams({
                      ...(beden && !isActive ? { beden: s } : isActive ? {} : { beden: s }),
                      ...(renk ? { renk } : {}),
                      ...(sort ? { sort } : {}),
                    }).toString()}`}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      isActive
                        ? 'bg-brand-500 border-brand-500 text-white font-bold'
                        : 'bg-white border-cream-200 text-charcoal-700 hover:border-brand-300'
                    }`}
                  >
                    {s}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Color Filter */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-2.5">
              Renk
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {availableColors.map((c) => {
                const isActive = renk === c;
                return (
                  <Link
                    key={c}
                    href={`/kategori/${slug}?${new URLSearchParams({
                      ...(beden ? { beden } : {}),
                      ...(renk && !isActive ? { renk: c } : isActive ? {} : { renk: c }),
                      ...(sort ? { sort } : {}),
                    }).toString()}`}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      isActive
                        ? 'bg-brand-500 border-brand-500 text-white font-bold'
                        : 'bg-white border-cream-200 text-charcoal-700 hover:border-brand-300'
                    }`}
                  >
                    {c}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Stock Only Filter */}
          <div className="pt-2 border-t border-cream-200">
            <Link
              href={`/kategori/${slug}?${new URLSearchParams({
                ...(beden ? { beden } : {}),
                ...(renk ? { renk } : {}),
                ...(inStock === 'true' ? {} : { inStock: 'true' }),
                ...(sort ? { sort } : {}),
              }).toString()}`}
              className="flex items-center gap-2 text-xs font-semibold text-charcoal-800"
            >
              <input
                type="checkbox"
                readOnly
                checked={inStock === 'true'}
                className="rounded border-cream-300 text-brand-500 focus:ring-brand-400"
              />
              <span>Sadece Stoktaki Ürünler</span>
            </Link>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-3">
          {/* Sorting and Results Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-cream-200">
            <div className="text-xs text-charcoal-500">
              Toplam <strong className="text-charcoal-900">{sortedProducts.length}</strong> ürün listeleniyor
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-charcoal-600 font-medium">Sırala:</span>
              <select
                defaultValue={sort || 'newest'}
                className="bg-white border border-cream-200 rounded-lg text-xs py-1.5 px-3 text-charcoal-800 focus:outline-none focus:border-brand-400"
              >
                <option value="newest">En Yeniler</option>
                <option value="price_asc">Fiyat: Düşükten Yükseğe</option>
                <option value="price_desc">Fiyat: Yüksekten Düşüğe</option>
              </select>
            </div>
          </div>

          {sortedProducts.length === 0 ? (
            <div className="text-center py-20 bg-cream-50/50 rounded-2xl border border-cream-200">
              <p className="text-charcoal-600 font-medium">Bu kriterlere uygun ürün bulunamadı.</p>
              <Link
                href={`/kategori/${slug}`}
                className="inline-block mt-3 text-xs font-bold text-brand-600 hover:underline"
              >
                Filtreleri Temizle
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {sortedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
