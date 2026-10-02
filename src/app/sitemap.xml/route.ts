import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eslakids.com';

  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);

  const staticRoutes = [
    '',
    '/iletisim',
    '/siparis-takip',
    '/sayfa/hakkimizda',
    '/sayfa/mesafeli-satis-sozlesmesi',
    '/sayfa/gizlilik-ve-guvenlik',
    '/sayfa/kvkk-aydinlatma-metni',
    '/sayfa/teslimat-ve-kargo',
    '/sayfa/iade-ve-degisim',
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Static
  for (const route of staticRoutes) {
    xml += `
  <url>
    <loc>${baseUrl}${route}</loc>
    <changefreq>daily</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>`;
  }

  // Categories
  for (const cat of categories) {
    xml += `
  <url>
    <loc>${baseUrl}/kategori/${cat.slug}</loc>
    <lastmod>${cat.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
  }

  // Products
  for (const p of products) {
    xml += `
  <url>
    <loc>${baseUrl}/urun/${p.slug}</loc>
    <lastmod>${p.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
  }

  xml += `
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
