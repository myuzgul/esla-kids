import { NextRequest, NextResponse } from 'next/server';
import { WooCommerceImporter } from '@/lib/woocommerce';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, config, page = 1, perPage = 100, jsonData } = body;

    // Save WooCommerce API Configuration
    if (action === 'save_config' && config) {
      const { url, consumerKey, consumerSecret } = config;
      const settingsToUpsert = [
        { key: 'wc_url', value: url || '' },
        { key: 'wc_consumer_key', value: consumerKey || '' },
        { key: 'wc_consumer_secret', value: consumerSecret || '' },
      ];

      for (const s of settingsToUpsert) {
        await prisma.setting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value, group: 'WOOCOMMERCE' },
        });
      }

      return NextResponse.json({ success: true, message: 'WooCommerce API bilgileri başarıyla kaydedildi.' });
    }

    // Direct JSON file import mode
    if (action === 'import_json' && jsonData) {
      const { products = [], orders = [], categories = [] } = jsonData;
      let pCount = 0;
      let vCount = 0;
      let oCount = 0;

      // 1. Categories
      for (const c of categories) {
        if (!c.name) continue;
        await prisma.category.upsert({
          where: { slug: c.slug || c.name.toLowerCase() },
          update: { name: c.name, description: c.description || null },
          create: { name: c.name, slug: c.slug || c.name.toLowerCase(), description: c.description || null },
        });
      }

      // 2. Products & Variations
      for (const p of products) {
        if (!p.name) continue;
        const sku = p.sku || `JSON-PRD-${Date.now()}-${pCount}`;
        const prod = await prisma.product.upsert({
          where: { sku },
          update: {
            title: p.name,
            price: parseFloat(p.price || p.regular_price || '0'),
            compareAtPrice: p.regular_price ? parseFloat(p.regular_price) : null,
            stock: p.stock_quantity ? parseInt(p.stock_quantity) : 10,
            images: JSON.stringify(p.images || []),
          },
          create: {
            title: p.name,
            slug: p.slug || sku.toLowerCase(),
            sku,
            price: parseFloat(p.price || p.regular_price || '0'),
            compareAtPrice: p.regular_price ? parseFloat(p.regular_price) : null,
            stock: p.stock_quantity ? parseInt(p.stock_quantity) : 10,
            images: JSON.stringify(p.images || []),
          },
        });
        pCount++;

        if (Array.isArray(p.variations)) {
          for (const v of p.variations) {
            const vSku = v.sku || `${sku}-VAR-${vCount}`;
            await prisma.productVariation.upsert({
              where: { sku: vSku },
              update: {
                price: parseFloat(v.price || prod.price.toString()),
                stock: v.stock_quantity ? parseInt(v.stock_quantity) : 5,
                attributes: JSON.stringify(v.attributes || {}),
              },
              create: {
                productId: prod.id,
                sku: vSku,
                price: parseFloat(v.price || prod.price.toString()),
                stock: v.stock_quantity ? parseInt(v.stock_quantity) : 5,
                attributes: JSON.stringify(v.attributes || {}),
              },
            });
            vCount++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'JSON verileri başarıyla içe aktarıldı.',
        stats: { products: pCount, variations: vCount, orders: oCount },
      });
    }

    if (!config || !config.url || !config.consumerKey || !config.consumerSecret) {
      return NextResponse.json({ error: 'WooCommerce API bağlantı bilgileri eksik.' }, { status: 400 });
    }

    const importer = new WooCommerceImporter(config);

    if (action === 'test_connection') {
      const result = await importer.testConnection();
      return NextResponse.json(result);
    }

    if (action === 'import_categories') {
      const result = await importer.importCategories(page, perPage);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'import_products') {
      const result = await importer.importProducts(page, perPage);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'import_orders') {
      const result = await importer.importOrders(page, perPage);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'sync_variations') {
      const result = await importer.syncVariations();
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (err: any) {
    console.error('WooCommerce API route error:', err);
    return NextResponse.json({ error: err.message || 'WooCommerce aktarımında hata oluştu.' }, { status: 500 });
  }
}
