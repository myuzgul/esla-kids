# Esla Kids - E-Ticaret Platformu

Esla Kids için geliştirilmiş, yüksek performanslı ve modern Next.js 14 tabanlı bebek & çocuk giyim e-ticaret platformu.

## 🚀 Özellikler

- **Modern Teknoloji:** Next.js 14 (App Router), React 18, Tailwind CSS, Prisma ORM, SQLite.
- **Kapsamlı Ürün & Varyasyon:** Çocuk giyim bedenleri (0-3 Ay - 7-8 Yaş), renk swatches, varyasyona özel görseller.
- **Akıllı KDV Sistemi:** %10 giyim KDV standardı, KDV hariç giriş, anasayfa/kategoride KDV hariç (+ KDV) gösterim, sepette ve ürün detayında KDV dahil gösterim.
- **Müşteri Üyelik & Hesap Paneli:** Güvenli oturum, üye girişi, kayıt ol, sipariş takibi, çoklu teslimat adresi defteri, profil güncelleme.
- **Kategori & Menü Yönetimi:** Admin panelinden tek tıkla üst menüye kategori ekleme/çıkarma, ad ve sıra değiştirme.
- **Ödeme Yöntemleri:** PayTR Kredi Kartı (3D Secure), Havale/EFT (%5 indirimli), Kapıda Nakit/Kredi Kartı Ödeme (150 TL hizmet bedeli ile).
- **Kargo Entegrasyonu:** Kargonomi & PTT Kargo barkod oluşturma, otomatik takip sorgulama.
- **WooCommerce Senkronizasyonu:** Tek tıkla ürün, kategori ve varyasyon aktarımı ve onarımı.

## 🛠️ Kurulum & Çalıştırma

```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. Ortam değişkenlerini hazırlayın
cp .env.example .env

# 3. Prisma veritabanı şemasını ve client'ı üretin
npx prisma generate
npx prisma db push

# 4. Geliştirme sunucusunu başlatın
npm run dev

# veya Üretim derlemesi alıp çalıştırın:
npm run build
npm start
```

Tarayıcınızda açın:
- **Mağaza:** [http://localhost:3000](http://localhost:3000)
- **Yönetici Paneli:** [http://localhost:3000/admin](http://localhost:3000/admin)
