import React from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, ShieldCheck, Truck, RefreshCw, CreditCard } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-cream-100 border-t border-cream-200 pt-16 pb-8 text-charcoal-700">
      {/* Advantage Badges */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 border-b border-cream-200">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-cream-200/60 shadow-sm">
            <div className="w-11 h-11 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-charcoal-900">Hızlı Kargo</div>
              <div className="text-xs text-charcoal-500">1500 TL Üzerine Ücretsiz</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-cream-200/60 shadow-sm">
            <div className="w-11 h-11 rounded-full bg-powder-100 flex items-center justify-center text-powder-500 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-charcoal-900">%100 Pamuklu Kumaş</div>
              <div className="text-xs text-charcoal-500">Bebek cildine dost dokular</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-cream-200/60 shadow-sm">
            <div className="w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 flex-shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-charcoal-900">Kolay İade & Değişim</div>
              <div className="text-xs text-charcoal-500">14 gün koşulsuz güvence</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-cream-200/60 shadow-sm">
            <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-charcoal-900">Güvenli Ödeme</div>
              <div className="text-xs text-charcoal-500">PayTR & Havale İndirimi</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-400 flex items-center justify-center text-white font-bold text-base">
                E
              </div>
              <span className="font-heading font-extrabold text-2xl text-charcoal-900">
                ESLA KIDS
              </span>
            </div>
            <p className="text-sm text-charcoal-600 leading-relaxed pr-6">
              Esla Kids, miniklerin konforunu, sağlığını ve şıklığını ön planda tutan yüksek kaliteli bebek ve çocuk giyim tasarımları sunar. %100 doğal pamuk ipliçinden üretilen takımlarımız ile çocuklarınız gün boyu özgür ve neşeli.
            </p>
            <div className="space-y-2 pt-2 text-sm text-charcoal-700">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-brand-500" />
                <a href="tel:05389209216" className="font-semibold hover:text-brand-600">0538 920 92 16</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-brand-500" />
                <a href="mailto:info@eslakids.com" className="hover:text-brand-600">info@eslakids.com</a>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-brand-500 mt-1 flex-shrink-0" />
                <span>Duaçınarı Mah. Kırkpınar Sok. No:12 Yıldırım / Bursa</span>
              </div>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h4 className="font-bold text-sm text-charcoal-900 uppercase tracking-wider mb-4">
              Kategoriler
            </h4>
            <ul className="space-y-2.5 text-sm text-charcoal-600">
              <li><Link href="/kategori/erkek-cocuk-takim" className="hover:text-brand-600">Erkek Çocuk Takım</Link></li>
              <li><Link href="/kategori/erkek-cocuk-kislik-takimlar" className="hover:text-brand-600">Erkek Çocuk Kışlık</Link></li>
              <li><Link href="/kategori/kiz-bebek-elbise" className="hover:text-brand-600">Kız Bebek Elbise</Link></li>
              <li><Link href="/kategori/kiz-bebek-takim" className="hover:text-brand-600">Kız Bebek Takım</Link></li>
              <li><Link href="/kategori/erkek-bebek-takim" className="hover:text-brand-600">Erkek Bebek Takım</Link></li>
              <li><Link href="/kategori/kiz-cocuk-pijama-takimi" className="hover:text-brand-600">Kız Çocuk Pijama</Link></li>
              <li><Link href="/kategori/firsat-urunleri" className="text-rose-600 font-bold hover:underline">Fırsat Ürünleri</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-bold text-sm text-charcoal-900 uppercase tracking-wider mb-4">
              Müşteri Hizmetleri
            </h4>
            <ul className="space-y-2.5 text-sm text-charcoal-600">
              <li><Link href="/siparis-takip" className="hover:text-brand-600">Sipariş Takibi</Link></li>
              <li><Link href="/hesabim" className="hover:text-brand-600">Hesabım</Link></li>
              <li><Link href="/sepet" className="hover:text-brand-600">Sepetim</Link></li>
              <li><Link href="/sayfa/teslimat-ve-kargo" className="hover:text-brand-600">Teslimat & Kargo</Link></li>
              <li><Link href="/sayfa/iade-ve-degisim" className="hover:text-brand-600">İade ve Değişim</Link></li>
              <li><Link href="/sayfa/sikca-sorulan-sorular" className="hover:text-brand-600">Sıkça Sorulan Sorular</Link></li>
              <li><Link href="/iletisim" className="hover:text-brand-600">İletişim & Mağaza</Link></li>
            </ul>
          </div>

          {/* Legal / KVKK */}
          <div>
            <h4 className="font-bold text-sm text-charcoal-900 uppercase tracking-wider mb-4">
              Kurumsal & Yasal
            </h4>
            <ul className="space-y-2.5 text-sm text-charcoal-600">
              <li><Link href="/sayfa/mesafeli-satis-sozlesmesi" className="hover:text-brand-600">Mesafeli Satış Sözleşmesi</Link></li>
              <li><Link href="/sayfa/gizlilik-ve-guvenlik" className="hover:text-brand-600">Gizlilik & Güvenlik</Link></li>
              <li><Link href="/sayfa/kvkk-aydinlatma-metni" className="hover:text-brand-600">KVKK Aydınlatma Metni</Link></li>
              <li><Link href="/sayfa/cerez-politikasi" className="hover:text-brand-600">Çerez Politikası</Link></li>
              <li><Link href="/sayfa/on-bilgilendirme-formu" className="hover:text-brand-600">Ön Bilgilendirme Formu</Link></li>
              <li><Link href="/sayfa/hakkimizda" className="hover:text-brand-600">Hakkımızda</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar & Copyright */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-charcoal-500">
        <div>
          © {new Date().getFullYear()} <strong className="text-charcoal-800">Esla Kids</strong>. Tüm Hakları Saklıdır.
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-white border border-cream-200 px-2 py-1 rounded font-bold text-slate-700">PayTR</span>
          <span className="bg-white border border-cream-200 px-2 py-1 rounded font-bold text-blue-700">VISA</span>
          <span className="bg-white border border-cream-200 px-2 py-1 rounded font-bold text-red-600">MasterCard</span>
          <span className="bg-white border border-cream-200 px-2 py-1 rounded font-bold text-cyan-700">TROY</span>
          <span className="bg-white border border-cream-200 px-2 py-1 rounded font-medium text-emerald-700">Havale/EFT</span>
        </div>
      </div>
    </footer>
  );
}
