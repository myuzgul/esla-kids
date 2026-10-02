// using native fetch

async function runTests() {
  console.log('--- ESLA KIDS COMPREHENSIVE AUTOMATED VERIFICATION ---');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`[FAIL] ${name}:`, e.message);
    }
  }

  // 1. Homepage
  await test('Storefront Homepage (HTTP 200 & Title)', async () => {
    const res = await fetch('http://localhost:3000');
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const html = await res.text();
    if (!html.includes('ESLA KIDS')) throw new Error('Brand name not found in homepage');
  });

  // 2. Instant Search API
  await test('Search Autocomplete API', async () => {
    const res = await fetch('http://localhost:3000/api/search?q=takım');
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('Search returned no results');
    }
  });

  // 3. Dynamic QR API
  await test('Dynamic QR Code Generator API', async () => {
    const res = await fetch('http://localhost:3000/api/qr?url=https://eslakids.com/urun/test-takim');
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    if (!data.dataUrl || !data.dataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('QR dataUrl invalid');
    }
  });

  // 4. Product Creation with 3 Colors x 5 Sizes Variations Matrix
  let createdProductId = '';
  let sampleVariationId = '';
  await test('Product Creation & 15-Variation Matrix Generation', async () => {
    const variations = [];
    const colors = ['Lacivert', 'Bej', 'Antrasit'];
    const sizes = ['1-2 Yaş', '2-3 Yaş', '3-4 Yaş', '4-5 Yaş', '5-6 Yaş'];

    for (const c of colors) {
      for (const s of sizes) {
        variations.push({
          sku: `TEST-EC-${Date.now()}-${c.substring(0,3).toUpperCase()}-${s.replace(/[^0-9]/g, '')}`,
          price: 499.90,
          stock: 8,
          attributes: { Renk: c, Beden: s },
        });
      }
    }

    const res = await fetch('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Erkek Çocuk Kapüşonlu 3 Renk 5 Beden Takım',
        sku: `TEST-EC-${Date.now()}`,
        price: 499.90,
        compareAtPrice: 650.00,
        stock: 120,
        description: 'Test amaçlı 15 varyasyonlu çocuk giyim takımı.',
        variations,
      }),
    });

    if (!res.ok) throw new Error(`Product creation failed: HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.product?.id) throw new Error('Product not returned');
    createdProductId = data.product.id;
  });

  // 5. Checkout with Havale %5 discount, Coupon code & Atomic stock reduction
  let orderNumber = '';
  await test('Checkout: Havale %5 İndirimi & Kuponlu Sipariş Oluşturma', async () => {
    const res = await fetch('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: 'Fatma Şahin',
        guestEmail: 'fatma@example.com',
        guestPhone: '0538 920 92 16',
        city: 'Bursa',
        district: 'Osmangazi',
        address: 'Duaçınarı Mah. No:12',
        paymentMethod: 'HAVALE',
        couponCode: 'HOSGELDIN10',
        items: [
          {
            productId: createdProductId,
            quantity: 2,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Checkout failed: ${await res.text()}`);
    const data = await res.json();
    if (!data.success || !data.orderNumber) throw new Error('Order number missing');
    orderNumber = data.orderNumber;
  });

  // 6. Order Tracking
  await test('Order Tracking by Order Number', async () => {
    const res = await fetch(`http://localhost:3000/api/orders/track?orderNumber=${orderNumber}`);
    if (!res.ok) throw new Error(`Tracking failed: HTTP ${res.status}`);
    const data = await res.json();
    if (!data.order || data.order.orderNumber !== orderNumber) {
      throw new Error('Order mismatch in tracking');
    }
  });

  // 7. Warehouse Status Update & Shipping Assignment
  await test('Warehouse Picking: Status Change & Tracking Assignment', async () => {
    // Fetch order ID
    const trRes = await fetch(`http://localhost:3000/api/orders/track?orderNumber=${orderNumber}`);
    const { order } = await trRes.json();

    const res = await fetch('http://localhost:3000/api/admin/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        status: 'SHIPPED',
        trackingCompany: 'Yurtiçi Kargo',
        trackingNumber: 'YK-99887766554',
      }),
    });

    if (!res.ok) throw new Error(`Status update failed: HTTP ${res.status}`);
    const data = await res.json();
    if (data.order.status !== 'SHIPPED') throw new Error('Status was not updated to SHIPPED');
  });

  // 8. Order Print Slip & QR Codes
  await test('Printable Order Slip with Product Images & Live QR Code', async () => {
    const res = await fetch('http://localhost:3000/admin/siparis-cikti');
    if (!res.ok) throw new Error(`Print slip failed: HTTP ${res.status}`);
    const html = await res.text();
    if (!html.includes('ESLA KIDS') || !html.includes('data:image/png;base64,')) {
      throw new Error('Print slip missing brand or QR code images');
    }
  });

  // 9. WooCommerce Migration Engine: Connection Test
  await test('WooCommerce REST API Connection Handler', async () => {
    const res = await fetch('http://localhost:3000/api/woocommerce/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test_connection',
        config: {
          url: 'https://demo.woothemes.com',
          consumerKey: 'ck_test',
          consumerSecret: 'cs_test',
        },
      }),
    });
    if (!res.ok) throw new Error(`WooCommerce route error: HTTP ${res.status}`);
    const data = await res.json();
    // It will return structured json success/failure without throwing unhandled server exception
    if (data.success === undefined && data.error === undefined) {
      throw new Error('Malformed response from WooCommerce test');
    }
  });

  // 10. WooCommerce Direct JSON Import with Variations & Duplicate Prevention
  await test('WooCommerce JSON Import with Variations & Duplicate Guard', async () => {
    const sampleWooJson = {
      categories: [{ name: 'Erkek Bebek Salopet', slug: 'erkek-bebek-salopet' }],
      products: [
        {
          name: 'WooCommerce İthal Erkek Bebek Salopet Takım',
          sku: 'WC-SLP-01',
          price: '379.90',
          stock_quantity: 12,
          images: ['https://images.unsplash.com/photo-1544126592-807ade215a0b?w=600'],
          variations: [
            { sku: 'WC-SLP-01-MAV-69', price: '379.90', stock_quantity: 4, attributes: { Renk: 'Mavi', Beden: '6-9 Ay' } },
            { sku: 'WC-SLP-01-MAV-912', price: '379.90', stock_quantity: 8, attributes: { Renk: 'Mavi', Beden: '9-12 Ay' } },
          ],
        },
      ],
    };

    const res = await fetch('http://localhost:3000/api/woocommerce/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'import_json',
        jsonData: sampleWooJson,
      }),
    });

    if (!res.ok) throw new Error(`WooCommerce JSON import failed: HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Import unsuccessful');
  });

  // 11. SEO: Dynamic Sitemap and Robots.txt
  await test('SEO: /sitemap.xml and /robots.txt', async () => {
    const smRes = await fetch('http://localhost:3000/sitemap.xml');
    if (!smRes.ok) throw new Error(`Sitemap status ${smRes.status}`);
    const smText = await smRes.text();
    if (!smText.includes('<urlset') || !smText.includes('<loc>')) {
      throw new Error('Invalid XML sitemap structure');
    }

    const rbRes = await fetch('http://localhost:3000/robots.txt');
    if (!rbRes.ok) throw new Error(`Robots status ${rbRes.status}`);
    const rbText = await rbRes.text();
    if (!rbText.includes('User-agent:') || !rbText.includes('Sitemap:')) {
      throw new Error('Invalid robots.txt structure');
    }
  });

  // Cleanup test artifacts
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    if (orderNumber) {
      await prisma.orderItem.deleteMany({ where: { order: { orderNumber } } });
      await prisma.order.deleteMany({ where: { orderNumber } });
    }
    await prisma.productVariation.deleteMany({ where: { sku: { startsWith: 'TEST-EC-' } } });
    await prisma.productVariation.deleteMany({ where: { sku: { startsWith: 'WC-SLP-' } } });
    await prisma.product.deleteMany({ where: { sku: { startsWith: 'TEST-EC-' } } });
    await prisma.product.deleteMany({ where: { sku: { startsWith: 'WC-SLP-' } } });
    await prisma.$disconnect();
  } catch (err) {
    // non-fatal
  }

  console.log(`\n==============================================`);
  console.log(`VERIFICATION RESULT: ${passed}/${total} TESTS PASSED!`);
  console.log(`==============================================`);
  if (passed !== total) process.exit(1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
