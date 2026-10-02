import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Esla Kids database...');

  // Clear existing
  await prisma.activityLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.productVariation.deleteMany({});
  await prisma.categoriesOnProducts.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.stockAlert.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.homepageSection.deleteMany({});
  await prisma.menu.deleteMany({});

  // 1. Settings
  const settings = [
    { key: 'site_title', value: 'Esla Kids - Premium Bebek ve Çocuk Giyim', group: 'GENERAL' },
    { key: 'company_name', value: 'Esla Kids', group: 'GENERAL' },
    { key: 'phone', value: '0538 920 92 16', group: 'GENERAL' },
    { key: 'email', value: 'info@eslakids.com', group: 'GENERAL' },
    { key: 'whatsapp', value: '905389209216', group: 'GENERAL' },
    { key: 'address', value: 'Duaçınarı Mah. Kırkpınar Sok. No:12 Yıldırım / Bursa', group: 'GENERAL' },
    { key: 'free_shipping_limit', value: '750', group: 'SHIPPING' },
    { key: 'shipping_fee', value: '49.90', group: 'SHIPPING' },
    { key: 'shipping_company', value: 'Yurtiçi Kargo', group: 'SHIPPING' },
    { key: 'havale_discount_percent', value: '5', group: 'PAYMENT' },
    { key: 'havale_bank_info', value: 'Ziraat Bankası - Esla Kids Tekstil San. Tic. Ltd. Şti.\nIBAN: TR12 0001 0002 0003 0004 0005 06\n\nGaranti BBVA\nIBAN: TR56 0006 2000 0001 0002 0003 04', group: 'PAYMENT' },
    { key: 'cod_fee', value: '45.00', group: 'PAYMENT' },
    { key: 'cod_enabled', value: 'true', group: 'PAYMENT' },
    { key: 'paytr_enabled', value: 'true', group: 'PAYMENT' },
    { key: 'paytr_merchant_id', value: '381920', group: 'PAYMENT' },
    { key: 'paytr_merchant_key', value: 'test_secret_key_12345', group: 'PAYMENT' },
    { key: 'paytr_merchant_salt', value: 'test_salt_67890', group: 'PAYMENT' },
    { key: 'paytr_test_mode', value: 'true', group: 'PAYMENT' },
    { key: 'smtp_host', value: 'smtp.eslakids.com', group: 'SMTP' },
    { key: 'smtp_port', value: '587', group: 'SMTP' },
    { key: 'smtp_user', value: 'info@eslakids.com', group: 'SMTP' },
    { key: 'smtp_pass', value: 'password123', group: 'SMTP' },
    { key: 'smtp_from', value: 'Esla Kids <info@eslakids.com>', group: 'SMTP' },
  ];
  for (const s of settings) {
    await prisma.setting.create({ data: s });
  }

  // 2. Users / Staff
  const adminHash = await bcrypt.hash('esla1234', 10);
  const adminUser = await prisma.customer.create({
    data: {
      name: 'Esla Yönetici',
      email: 'admin@eslakids.com',
      phone: '0538 920 92 16',
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
      emailVerified: true
    }
  });

  const staffHash = await bcrypt.hash('depo1234', 10);
  await prisma.customer.create({
    data: {
      name: 'Depo Sorumlusu',
      email: 'depo@eslakids.com',
      phone: '0538 920 92 17',
      passwordHash: staffHash,
      role: 'WAREHOUSE',
      emailVerified: true
    }
  });

  // Sample Customer
  const customerUser = await prisma.customer.create({
    data: {
      name: 'Ayşe Yılmaz',
      email: 'ayse.yilmaz@example.com',
      phone: '0532 111 22 33',
      passwordHash: await bcrypt.hash('musteri123', 10),
      role: 'CUSTOMER',
      emailVerified: true,
      addresses: {
        create: [
          {
            title: 'Evim',
            fullName: 'Ayşe Yılmaz',
            phone: '0532 111 22 33',
            city: 'İstanbul',
            district: 'Kadıköy',
            addressDetail: 'Moda Cad. No:44 Daire:5',
            postalCode: '34710',
            isDefault: true
          }
        ]
      }
    }
  });

  // 3. Brands
  const brandEsla = await prisma.brand.create({
    data: {
      name: 'Esla Kids',
      slug: 'esla-kids',
      description: 'Esla Kids özel üretim yüksek kaliteli çocuk ve bebek giyimi.',
      seoTitle: 'Esla Kids Koleksiyonu'
    }
  });

  const brandMiniBella = await prisma.brand.create({
    data: {
      name: 'Mini Bella',
      slug: 'mini-bella',
      description: 'Zarif bebek elbiseleri ve aksesuarları.',
      seoTitle: 'Mini Bella Bebek Giyim'
    }
  });

  // 4. Categories (Exact screenshot structure)
  // Erkek Çocuk
  const catErkekCocuk = await prisma.category.create({
    data: {
      name: 'Erkek Çocuk',
      slug: 'erkek-cocuk',
      description: 'Erkek Çocuk spor, günlük ve kışlık takımlar',
      image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=600&auto=format&fit=crop&q=80',
      order: 1
    }
  });
  const catErkekCocukTakim = await prisma.category.create({
    data: { name: 'Erkek Çocuk Takım', slug: 'erkek-cocuk-takim', parentId: catErkekCocuk.id, order: 1 }
  });
  const catErkekCocukPijama = await prisma.category.create({
    data: { name: 'Erkek Çocuk Pijama Takımı', slug: 'erkek-cocuk-pijama-takimi', parentId: catErkekCocuk.id, order: 2 }
  });
  const catErkekCocukKislik = await prisma.category.create({
    data: { name: 'Erkek Çocuk Kışlık Takımlar', slug: 'erkek-cocuk-kislik-takimlar', parentId: catErkekCocuk.id, order: 3 }
  });

  // Kız Bebek
  const catKizBebek = await prisma.category.create({
    data: {
      name: 'Kız Bebek',
      slug: 'kiz-bebek',
      description: 'Kız bebek elbiseleri, kışlık ve pijama takımları',
      image: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600&auto=format&fit=crop&q=80',
      order: 2
    }
  });
  const catKizBebekKislik = await prisma.category.create({
    data: { name: 'Kız Bebek Kışlık Takımlar', slug: 'kiz-bebek-kislik-takimlar', parentId: catKizBebek.id, order: 1 }
  });
  const catKizBebekTakim = await prisma.category.create({
    data: { name: 'Kız Bebek Takım', slug: 'kiz-bebek-takim', parentId: catKizBebek.id, order: 2 }
  });
  const catKizBebekPijama = await prisma.category.create({
    data: { name: 'Kız Bebek Pijama Takım', slug: 'kiz-bebek-pijama-takim', parentId: catKizBebek.id, order: 3 }
  });
  const catKizBebekElbise = await prisma.category.create({
    data: { name: 'Kız Bebek Elbise', slug: 'kiz-bebek-elbise', parentId: catKizBebek.id, order: 4 }
  });

  // Erkek Bebek
  const catErkekBebek = await prisma.category.create({
    data: {
      name: 'Erkek Bebek',
      slug: 'erkek-bebek',
      description: 'Erkek bebek konforlu takımlar ve pijama modelleri',
      image: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=600&auto=format&fit=crop&q=80',
      order: 3
    }
  });
  const catErkekBebekKislik = await prisma.category.create({
    data: { name: 'Erkek Bebek Kışlık Takımlar', slug: 'erkek-bebek-kislik-takimlar', parentId: catErkekBebek.id, order: 1 }
  });
  const catErkekBebekTakim = await prisma.category.create({
    data: { name: 'Erkek Bebek Takım', slug: 'erkek-bebek-takim', parentId: catErkekBebek.id, order: 2 }
  });
  const catErkekBebekPijama = await prisma.category.create({
    data: { name: 'Erkek Bebek Pijama Takımı', slug: 'erkek-bebek-pijama-takimi', parentId: catErkekBebek.id, order: 3 }
  });

  // Kız Çocuk
  const catKizCocuk = await prisma.category.create({
    data: {
      name: 'Kız Çocuk',
      slug: 'kiz-cocuk',
      description: 'Kız Çocuk giyim, etekli ve pantolonlu takımlar',
      image: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600&auto=format&fit=crop&q=80',
      order: 4
    }
  });
  const catKizCocukKislik = await prisma.category.create({
    data: { name: 'Kız Çocuk Kışlık Takımlar', slug: 'kiz-cocuk-kislik-takimlar', parentId: catKizCocuk.id, order: 1 }
  });
  const catKizCocukTakim = await prisma.category.create({
    data: { name: 'Kız Çocuk Takım', slug: 'kiz-cocuk-takim', parentId: catKizCocuk.id, order: 2 }
  });
  const catKizCocukPijama = await prisma.category.create({
    data: { name: 'Kız Çocuk Pijama Takımı', slug: 'kiz-cocuk-pijama-takimi', parentId: catKizCocuk.id, order: 3 }
  });

  // Fırsat Ürünleri
  const catFirsat = await prisma.category.create({
    data: {
      name: 'Fırsat Ürünleri',
      slug: 'firsat-urunleri',
      description: 'Sezon sonu ve indirimli özel çocuk giyim fırsatları',
      image: 'https://images.unsplash.com/photo-1471286174890-9c112ffca564?w=600&auto=format&fit=crop&q=80',
      order: 5
    }
  });

  // 5. Products & Variations
  // Product 1: Erkek Çocuk 2 İp Takım
  const prod1 = await prisma.product.create({
    data: {
      title: 'Erkek Çocuk 2 İp Fermuarlı Sweatshirt & Eşofman Takım',
      slug: 'erkek-cocuk-2-ip-fermuarli-sweatshirt-esofman-takim',
      sku: 'EK-EC-01',
      barcode: '868000100101',
      price: 449.90,
      compareAtPrice: 599.90,
      description: 'Esla Kids kalitesiyle üretilmiş, %100 pamuklu 2 ip kompakt penye kumaştan imal edilmiş erkek çocuk takım. Yumuşacık dokusu ile terletmez, çocukların oyun sırasında rahat hareket etmesini sağlar. Yıkamaya dayanıklı renkler ve birinci sınıf dikiş işçiliği.',
      shortDescription: '%100 Pamuklu 2 İp Kumaş, Fermuarlı Üst ve Beli Lastikli Eşofman Altı.',
      stock: 45,
      isFeatured: true,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&auto=format&fit=crop&q=80'
      ]),
      brandId: brandEsla.id,
      categories: {
        create: [
          { categoryId: catErkekCocuk.id },
          { categoryId: catErkekCocukTakim.id },
          { categoryId: catErkekCocukKislik.id }
        ]
      }
    }
  });

  const colors1 = ['Lacivert', 'Bej', 'Siyah'];
  const sizes1 = ['1-2 Yaş', '2-3 Yaş', '3-4 Yaş', '4-5 Yaş', '5-6 Yaş'];
  let count1 = 1;
  for (const c of colors1) {
    for (const s of sizes1) {
      const code = s.replace(/[^0-9]/g, '');
      await prisma.productVariation.create({
        data: {
          productId: prod1.id,
          sku: 'EK-EC-01-' + c.substring(0,3).toUpperCase() + '-' + code,
          barcode: '86800010010' + count1,
          price: 449.90,
          compareAtPrice: 599.90,
          stock: count1 % 5 === 0 ? 0 : 5,
          attributes: JSON.stringify({ 'Renk': c, 'Beden': s }),
          image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800&auto=format&fit=crop&q=80'
        }
      });
      count1++;
    }
  }

  // Product 2: Kız Bebek Çiçek Desenli Elbise
  const prod2 = await prisma.product.create({
    data: {
      title: 'Kız Bebek Fırfırlı Çiçek Desenli Pamuk Elbise & Bandana',
      slug: 'kiz-bebek-firfirli-cicek-desenli-pamuk-elbise-bandana',
      sku: 'EK-KB-02',
      barcode: '868000200201',
      price: 389.90,
      compareAtPrice: 489.90,
      description: 'Zarif fırfır detaylı ve sevimli çiçek desenli kız bebek elbise takımı. Yumuşak pamuk astarı ile bebeğinizin cildini tahriş etmez. Arkadan çıtçıtlı tasarımı ile kolay giydirilir. Saç bandanası hediye olarak pakete dahildir.',
      shortDescription: 'Özel tasarım çiçek baskılı pamuklu elbise ve uyumlu saç bandı.',
      stock: 32,
      isFeatured: true,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=800&auto=format&fit=crop&q=80'
      ]),
      brandId: brandMiniBella.id,
      categories: {
        create: [
          { categoryId: catKizBebek.id },
          { categoryId: catKizBebekElbise.id }
        ]
      }
    }
  });

  const colors2 = ['Pudra Pembe', 'Ekru'];
  const sizes2 = ['3-6 Ay', '6-9 Ay', '9-12 Ay', '12-18 Ay', '18-24 Ay'];
  for (const c of colors2) {
    for (const s of sizes2) {
      const code = s.replace(/[^0-9]/g, '');
      await prisma.productVariation.create({
        data: {
          productId: prod2.id,
          sku: 'EK-KB-02-' + c.substring(0,3).toUpperCase() + '-' + code,
          price: 389.90,
          compareAtPrice: 489.90,
          stock: 6,
          attributes: JSON.stringify({ 'Renk': c, 'Beden': s }),
          image: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=800&auto=format&fit=crop&q=80'
        }
      });
    }
  }

  // Product 3: Erkek Bebek Kadife Kışlık Takım
  const prod3 = await prisma.product.create({
    data: {
      title: 'Erkek Bebek Ayıcık Nakışlı Kadife Kışlık Takım',
      slug: 'erkek-bebek-ayicik-nakisli-kadife-kislik-takim',
      sku: 'EK-EB-03',
      barcode: '868000300301',
      price: 499.90,
      compareAtPrice: 650.00,
      description: 'Soğuk kış günlerinde minik prensler için sıcacık tutan kadife kumaş takım. Ön kısmında kaliteli ayıcık nakışı bulunmaktadır. Rahat kalıbı bebeklerin bez bölgesini sıkmaz.',
      shortDescription: 'Sıcacık tutan kadife kumaş, nakış detaylı kışlık erkek bebek takımı.',
      stock: 25,
      isFeatured: true,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=800&auto=format&fit=crop&q=80'
      ]),
      brandId: brandEsla.id,
      categories: {
        create: [
          { categoryId: catErkekBebek.id },
          { categoryId: catErkekBebekKislik.id },
          { categoryId: catErkekBebekTakim.id }
        ]
      }
    }
  });

  const colors3 = ['Bebek Mavisi', 'Vizon'];
  const sizes3 = ['6-9 Ay', '9-12 Ay', '12-18 Ay', '18-24 Ay'];
  for (const c of colors3) {
    for (const s of sizes3) {
      const code = s.replace(/[^0-9]/g, '');
      await prisma.productVariation.create({
        data: {
          productId: prod3.id,
          sku: 'EK-EB-03-' + c.substring(0,3).toUpperCase() + '-' + code,
          price: 499.90,
          stock: 5,
          attributes: JSON.stringify({ 'Renk': c, 'Beden': s }),
          image: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=800&auto=format&fit=crop&q=80'
        }
      });
    }
  }

  // Product 4: Kız Çocuk Kalpli Pijama Takımı
  const prod4 = await prisma.product.create({
    data: {
      title: 'Kız Çocuk %100 Pamuklu Kalp Baskılı Pijama Takımı',
      slug: 'kiz-cocuk-100-pamuklu-kalp-baskili-pijama-takimi',
      sku: 'EK-KC-04',
      barcode: '868000400401',
      price: 329.90,
      compareAtPrice: 420.00,
      description: 'Hassas ciltler için nefes alan %100 pamuklu penye kumaştan üretilmiştir. Gece boyunca huzurlu bir uyku için esnek ve yumuşaktır. Beli lastikli olup sıkma yapmaz.',
      shortDescription: '%100 organik pamuk dokulu, canlı kalp baskılı pijama takımı.',
      stock: 40,
      isFeatured: true,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=800&auto=format&fit=crop&q=80'
      ]),
      brandId: brandEsla.id,
      categories: {
        create: [
          { categoryId: catKizCocuk.id },
          { categoryId: catKizCocukPijama.id },
          { categoryId: catFirsat.id }
        ]
      }
    }
  });

  const colors4 = ['Lila', 'Soft Pembe'];
  const sizes4 = ['2-3 Yaş', '3-4 Yaş', '4-5 Yaş', '5-6 Yaş', '7-8 Yaş'];
  for (const c of colors4) {
    for (const s of sizes4) {
      const code = s.replace(/[^0-9]/g, '');
      await prisma.productVariation.create({
        data: {
          productId: prod4.id,
          sku: 'EK-KC-04-' + c.substring(0,3).toUpperCase() + '-' + code,
          price: 329.90,
          stock: 7,
          attributes: JSON.stringify({ 'Renk': c, 'Beden': s }),
          image: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=800&auto=format&fit=crop&q=80'
        }
      });
    }
  }

  // 6. Coupons
  await prisma.coupon.create({
    data: {
      code: 'HOSGELDIN10',
      discountType: 'PERCENT',
      discountValue: 10,
      minSpend: 300,
      usageLimit: 500,
      isActive: true
    }
  });

  await prisma.coupon.create({
    data: {
      code: 'ESLA50',
      discountType: 'FIXED',
      discountValue: 50,
      minSpend: 600,
      usageLimit: 200,
      isActive: true
    }
  });

  // 7. Homepage Sections
  await prisma.homepageSection.create({
    data: {
      type: 'HERO',
      title: 'Esla Kids Yeni Sezon',
      subtitle: 'Miniklerin Konforu ve Şıklığı Bir Arada',
      content: JSON.stringify({
        slides: [
          {
            title: 'Kış Sezonu Takımlarında %25 İndirim',
            subtitle: 'Yumuşacık 2 ip pamuklu kumaşlar, cildi saran nefis dokular.',
            badge: 'Yeni Koleksiyon',
            buttonText: 'Hemen Keşfet',
            buttonLink: '/kategori/erkek-cocuk-kislik-takimlar',
            image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=1400&auto=format&fit=crop&q=80'
          },
          {
            title: 'Kız Bebek Fırfırlı & Çiçekli Elbiseler',
            subtitle: 'özel günler ve günlük şıklık için özenle tasarlandı.',
            badge: 'Öne Çıkanlar',
            buttonText: 'Elbiseleri İncele',
            buttonLink: '/kategori/kiz-bebek-elbise',
            image: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=1400&auto=format&fit=crop&q=80'
          }
        ]
      }),
      order: 1,
      isActive: true
    }
  });

  // 8. Sample Orders for Warehouse & Print Testing
  const firstVariation = await prisma.productVariation.findFirst({
    where: { productId: prod1.id }
  });

  const secondVariation = await prisma.productVariation.findFirst({
    where: { productId: prod2.id }
  });

  await prisma.order.create({
    data: {
      orderNumber: 'EK-1001',
      customerId: customerUser.id,
      guestName: 'Ayşe Yılmaz',
      guestEmail: 'ayse.yilmaz@example.com',
      guestPhone: '0532 111 22 33',
      shippingAddress: JSON.stringify({
        fullName: 'Ayşe Yılmaz',
        phone: '0532 111 22 33',
        city: 'İstanbul',
        district: 'Kadıköy',
        address: 'Moda Cad. No:44 Daire:5',
        postalCode: '34710'
      }),
      status: 'APPROVED',
      paymentMethod: 'HAVALE',
      paymentStatus: 'PAID',
      subtotal: 839.80,
      shippingFee: 0.0,
      discountAmount: 41.99,
      totalAmount: 797.81,
      customerNote: 'Lütfen hediye paketi yapİlsÖn, teşekkürler.',
      internalNote: 'Havale dekontu kontrol edildi, onaylandı.',
      items: {
        create: [
          {
            productId: prod1.id,
            variationId: firstVariation?.id,
            title: prod1.title,
            sku: firstVariation?.sku,
            variationName: 'Renk: Lacivert, Beden: 1-2 Yaş',
            price: 449.90,
            quantity: 1,
            total: 449.90,
            image: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=200&auto=format&fit=crop&q=80'
          },
          {
            productId: prod2.id,
            variationId: secondVariation?.id,
            title: prod2.title,
            sku: secondVariation?.sku,
            variationName: 'Renk: Pudra Pembe, Beden: 3-6 Ay',
            price: 389.90,
            quantity: 1,
            total: 389.90,
            image: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=200&auto=format&fit=crop&q=80'
          }
        ]
      }
    }
  });

  await prisma.order.create({
    data: {
      orderNumber: 'EK-1002',
      guestName: 'Mehmet Demir',
      guestEmail: 'mehmet.demir@example.com',
      guestPhone: '0533 444 55 66',
      shippingAddress: JSON.stringify({
        fullName: 'Mehmet Demir',
        phone: '0533 444 55 66',
        city: 'Bursa',
        district: 'Nilüfer',
        address: 'İhsaniye Mah. Barış Sok. No:8 D:2',
        postalCode: '16130'
      }),
      status: 'PREPARING',
      paymentMethod: 'PAYTR',
      paymentStatus: 'PAID',
      subtotal: 499.90,
      shippingFee: 49.90,
      totalAmount: 549.80,
      customerNote: 'Kargoya verilince SMS rica ediyorum.',
      trackingCompany: 'Yurtiçi Kargo',
      items: {
        create: [
          {
            productId: prod3.id,
            title: prod3.title,
            sku: 'EK-EB-03-BEB-69',
            variationName: 'Renk: Bebek Mavisi, Beden: 6-9 Ay',
            price: 499.90,
            quantity: 1,
            total: 499.90,
            image: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=200&auto=format&fit=crop&q=80'
          }
        ]
      }
    }
  });

  await prisma.order.create({
    data: {
      orderNumber: 'EK-1003',
      guestName: 'Zeynep Kaya',
      guestEmail: 'zeynep.kaya@example.com',
      guestPhone: '0544 777 88 99',
      shippingAddress: JSON.stringify({
        fullName: 'Zeynep Kaya',
        phone: '0544 777 88 99',
        city: 'Ankara',
        district: 'Çankaya',
        address: 'Tunali Hilmi Cad. No:102 D:4',
        postalCode: '06680'
      }),
      status: 'SHIPPED',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      subtotal: 329.90,
      shippingFee: 49.90,
      codFee: 45.00,
      totalAmount: 424.80,
      trackingCompany: 'Yurtiçi Kargo',
      trackingNumber: '19827364512',
      items: {
        create: [
          {
            productId: prod4.id,
            title: prod4.title,
            sku: 'EK-KC-04-LIL-23',
            variationName: 'Renk: Lila, Beden: 2-3 Yaş',
            price: 329.90,
            quantity: 1,
            total: 329.90,
            image: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=200&auto=format&fit=crop&q=80'
          }
        ]
      }
    }
  });

  console.log('Seed completed successfully for Esla Kids!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
