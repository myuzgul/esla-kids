import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';

const LEGAL_PAGES: Record<string, { title: string; content: string }> = {
  'mesafeli-satis-sozlesmesi': {
    title: 'Mesafeli Satış Sözleşmesi',
    content: `
      <h3>MADDE 1 - TARAFLAR</h3>
      <p><strong>SATICI:</strong><br>
      Unvan?: Esla Kids Tekstil San. Tic. Ltd. Şti.<br>
      Adres: Duaçınarı Mah. Kırkpınar Sok. No:12 Yıldırım / Bursa<br>
      Telefon: 0538 920 92 16<br>
      E-posta: info@eslakids.com</p>
      <p><strong>ALICI:</strong><br>
      Esla Kids web sitesi üzerinden sipariş veren tüketici.</p>

      <h3>MADDE 2 - KONU</h3>
      <p>İşbu sözleşmenin konusu, ALICI'nın SATICI'ya ait www.eslakids.com internet sitesinden elektronik ortamda siparişini yaptığı çocuk ve bebek giyim ürünlerinin satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.</p>

      <h3>MADDE 3 - CAYMA HAKKI</h3>
      <p>ALICI, sözleşme konusu ürünün kendisine veya gÜsterdiçi adresteki kişi/kuruluşa tesliminden itibaren 14 (on dört) gün içinde hiçbir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. İade edilecek ürünlerin yıkanmamış, etiketi sökülmemiş ve tekrar satılabilirlik özelliğini kaybetmemiş olması şarttır.</p>
    `,
  },
  'on-bilgilendirme-formu': {
    title: 'Ön Bilgilendirme Formu',
    content: `
      <p>İşbu form 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği gereğince sipariş öncesinde müşteriyi bilgilendirmek amacıyla hazırlanmıştır.</p>
      <p>Satıcı Bilgileri: Esla Kids, Duaçınarı Mah. Kırkpınar Sok. No:12 Yıldırım / Bursa, Tel: 0538 920 92 16, info@eslakids.com</p>
      <p>Ödeme Yöntemleri: Kredi Kartı (PayTR), Havale / EFT (%5 İndirimli) ve Kapıda Ödeme.</p>
      <p>Teslimat Süresi: Sipariş onayından itibaren 1-3 iş günü içerisinde kargoya teslim edilmektedir.</p>
    `,
  },
  'gizlilik-ve-guvenlik': {
    title: 'Gizlilik ve Güvenlik Politikası',
    content: `
      <p>Esla Kids, müşterilerinin kişisel verilerinin korunmasına büyük önem vermektedir. Sitemiz üzerinden gerçekleştirilen tüm ödemeler 256-bit SSL güvenlik sertifikası ve BDDK lisanslı PayTR ödeme kuruluşu altyapısı ile korunmaktadır.</p>
      <p>Kredi kartı bilgileriniz sunucularımızda kesinlikle saklanmamaktadır.</p>
    `,
  },
  'kvkk-aydinlatma-metni': {
    title: 'KVKK Aydınlatma Metni',
    content: `
      <p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, Esla Kids olarak veri sorumlusu sıfatıyla tarafımıza iletmiş olduğunuz kişisel verileriniz kanunda belirtilen amaİlar doğrultusunda işlenmektedir.</p>
      <p>Verileriniz siparişlerin hazırlanması, faturalandırma ve kargo teslimat süreçlerinin yürütülmesi haricinde üçüncü şahıslarla paylaşılmaz.</p>
    `,
  },
  'cerez-politikasi': {
    title: 'Çerez (Cookie) Politikası',
    content: `
      <p>Web sitemizde alışveriş sepetinizin hatırlanması, kullanıcı deneyiminin geliştirilmesi ve site performansının artırılması amacıyla Çerezler kullanİlmaktadır.</p>
    `,
  },
  'iade-ve-degisim': {
    title: 'İade ve Değişim Koşulları',
    content: `
      <p>Esla Kids'ten aldığınız ürünlerde beden uymaması veya beğenmeme durumunda teslim tarihinden itibaren 14 gün içerisinde anlaşmalı kargomuz ile ücretsiz iade ve değişim yapabilirsiniz.</p>
      <p>İade ve değişim için WhatsApp destek hattımız olan <strong>0538 920 92 16</strong> numarasından iade kodu talep edebilirsiniz.</p>
    `,
  },
  'teslimat-ve-kargo': {
    title: 'Teslimat ve Kargo Bilgileri',
    content: `
      <p>Esla Kids tüm Türkiye'ye Yurtiçi Kargo güvencesiyle günderim saİlamaktadır.</p>
      <p><strong>Kargo Ücreti:</strong> 750 TL ve üzeri tüm siparişlerde KARGO BEDAVA! 750 TL altındaki siparişlerde standart kargo bedeli 49.90 TL'dir.</p>
      <p>Saat 15:00'e kadar verilen siparişler aynı gün kargoya teslim edilmektedir.</p>
    `,
  },
  'hakkimizda': {
    title: 'Hakkımızda',
    content: `
      <p>Esla Kids, çocukların büyüme ve keşif serüvenine eşlik etmek, onlara en doğal, en yumuşak ve şık kıyafetleri sunmak amacıyla kurulmuştur.</p>
      <p>Bursa'daki üretim merkezimizde bebek ve çocuklar için antialerjik, nefes alan ve %100 pamuklu kumaşlardan 2 ip takımlar, elbiseler, kışlık ve pijama takımları tasarlıyoruz.</p>
    `,
  },
  'sikca-sorulan-sorular': {
    title: 'Sıkça Sorulan Sorular',
    content: `
      <p><strong>1. Kumaşlarınız pamuklu mu?</strong><br>Evet, tüm takımlarımız çocuk cildine uygun %100 kompakt pamuk ipliçinden üretilmektedir.</p>
      <p><strong>2. Kapıda Ödeme var mı?</strong><br>Evet, siparişinizi kapıda nakit veya kredi kartıyla teslim alabilirsiniz.</p>
      <p><strong>3. Havale indiriminden nasİl yararlanırım?</strong><br>Ödeme sayfasında Havale/EFT seçtiçinizde anında %5 indirim uygulanır.</p>
    `,
  },
};

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const page = LEGAL_PAGES[params.slug];
  if (!page) return { title: 'Sayfa Bulunamadı | Esla Kids' };
  return {
    title: `${page.title} | Esla Kids`,
  };
}

export default function StaticPage({ params }: Props) {
  const page = LEGAL_PAGES[params.slug];
  if (!page) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <nav className="flex items-center gap-1.5 text-xs text-charcoal-400 mb-6">
        <Link href="/" className="hover:text-brand-600">Anasayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-charcoal-800 font-semibold">{page.title}</span>
      </nav>

      <div className="bg-white rounded-3xl border border-cream-200 p-8 sm:p-12 shadow-sm space-y-6">
        <h1 className="font-heading font-black text-2xl sm:text-3xl text-charcoal-900 pb-4 border-b border-cream-200">
          {page.title}
        </h1>

        <div
          className="prose prose-sm max-w-none text-charcoal-700 leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
}
