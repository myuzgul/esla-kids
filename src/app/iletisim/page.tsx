import React from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, MessageCircle, ChevronRight, Clock } from 'lucide-react';

export const metadata = {
  title: 'İletişim & Mağaza Bilgileri | Esla Kids',
  description: 'Esla Kids çocuk ve bebek giyim müşteri hizmetleri, telefon, WhatsApp ve adres bilgileri.',
};

export default function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <nav className="flex items-center gap-1.5 text-xs text-charcoal-400 mb-6">
        <Link href="/" className="hover:text-brand-600">Anasayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-charcoal-800 font-semibold">İletişim</span>
      </nav>

      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">Bizimle İletişime Geçin</span>
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-charcoal-900 mt-1">
          Size Yardımcı Olmaktan Mutluluk Duyarız
        </h1>
        <p className="text-sm text-charcoal-500 mt-2">
          Siparişleriniz, beden sorularınız veya toptan satış talepleriniz için bize dilediçiniz zaman ulaşabilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Telefon & Destek Hattı</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">Hafta içi & Cumartesi: 09:00 - 18:30</p>
              <a href="tel:05389209216" className="text-base font-bold text-brand-600 hover:underline mt-1 block">
                0538 920 92 16
              </a>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">WhatsApp Hızlı Sipariş</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">7/24 mesaj günderebilirsiniz</p>
              <a
                href="https://wa.me/905389209216"
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-bold text-emerald-600 hover:underline mt-1 block"
              >
                WhatsApp'tan Yazın ?
              </a>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-powder-50 text-powder-500 flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">E-Posta</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">Resmi yazışmalar ve kurumsal talepler</p>
              <a href="mailto:info@eslakids.com" className="text-base font-bold text-charcoal-800 hover:underline mt-1 block">
                info@eslakids.com
              </a>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-charcoal-900">Merkez & Üretim</h3>
              <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
                Duaçınarı Mah. Kırkpınar Sok. No:12 Yıldırım / Bursa / Türkiye
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-cream-200 shadow-sm">
          <h2 className="font-heading font-bold text-xl text-charcoal-900 mb-6">
            Bize Mesaj Gönderin
          </h2>

          <form className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1">
                  Adınız Soyadınız *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Adınız..."
                  className="w-full bg-cream-50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1">
                  Telefon Numaranız *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="05XX..."
                  className="w-full bg-cream-50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1">
                E-Posta Adresiniz *
              </label>
              <input
                type="email"
                required
                placeholder="ornek@email.com"
                className="w-full bg-cream-50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1">
                Mesajınız *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Mesajınızı detaylı Şekilde yazınız..."
                className="w-full bg-cream-50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 px-8 rounded-xl shadow-md shadow-brand-500/25 transition-all text-sm"
            >
              Mesajı Gönder
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
