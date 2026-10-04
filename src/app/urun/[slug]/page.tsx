import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProductDetailClient } from './ProductDetailClient';
import { ProductReviewsSection } from '@/components/ProductReviewsSection';
import { ProductCard } from '@/components/ProductCard';
import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const decoded = decodeURIComponent(params.slug || '');
  const cleanSlug = decoded.replace(/%25100/g, '100').replace(/%100/g, '100').replace(/%/g, '');

  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { slug: params.slug },
        { slug: decoded },
        { slug: cleanSlug },
        { sku: decoded },
        { id: decoded },
      ],
    },
    select: { title: true, shortDescription: true, description: true, images: true },
  });

  if (!product) return { title: 'Ürün Bulunamadı | Esla Kids' };

  let images: string[] = [];
  try { images = JSON.parse(product.images); } catch (e) {}

  return {
    title: `${product.title} | Esla Kids`,
    description: product.shortDescription || product.description?.substring(0, 160),
    openGraph: {
      title: product.title,
      description: product.shortDescription || '',
      images: images[0] ? [{ url: images[0] }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = params;
  const decoded = decodeURIComponent(slug || '');
  const cleanSlug = decoded.replace(/%25100/g, '100').replace(/%100/g, '100').replace(/%/g, '');

  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { slug },
        { slug: decoded },
        { slug: cleanSlug },
        { sku: decoded },
        { id: decoded },
      ],
    },
    include: {
      brand: true,
      categories: {
        include: { category: true },
      },
      variations: true,
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // Similar products
  const categoryIds = product.categories.map((c) => c.categoryId);
  const relatedProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      id: { not: product.id },
      categories: { some: { categoryId: { in: categoryIds } } },
    },
    take: 4,
    include: { variations: true },
  });

  const primaryCategory = product.categories[0]?.category;

  // Schema.org JSON-LD
  let images: string[] = [];
  try { images = JSON.parse(product.images); } catch (e) {}

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.title,
    image: images,
    description: product.shortDescription || product.description,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand?.name || 'Esla Kids',
    },
    offers: {
      '@type': 'Offer',
      url: `https://eslakids.com/urun/${product.slug}`,
      priceCurrency: 'TRY',
      price: product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Esla Kids',
      },
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* JSON-LD for rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-charcoal-400 mb-6">
        <Link href="/" className="hover:text-brand-600">Anasayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        {primaryCategory && (
          <>
            <Link href={`/kategori/${primaryCategory.slug}`} className="hover:text-brand-600">
              {primaryCategory.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
          </>
        )}
        <span className="text-charcoal-700 font-semibold truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Product Detail Interactive Component */}
      <ProductDetailClient product={product} />

      {/* Customer Reviews & Photo Ratings Section */}
      <ProductReviewsSection
        productId={product.id}
        productTitle={product.title}
        initialReviews={product.reviews}
      />

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 pt-12 border-t border-cream-200">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">Benzer Modeller</span>
            <h2 className="font-heading font-extrabold text-2xl text-charcoal-900 mt-1">
              Bunları da Beğenebilirsiniz
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
