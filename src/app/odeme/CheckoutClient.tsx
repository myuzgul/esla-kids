'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/lib/utils';
import { SiteSettings } from '@/lib/settings';
import { 
  CreditCard, Landmark, Truck, ShieldCheck, CheckCircle2, 
  AlertCircle, ChevronRight, Lock, Sparkles, X 
} from 'lucide-react';

const TURKISH_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
  'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
  'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta',
  'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
  'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla',
  'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
  'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
  'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman',
  'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce'
];

interface Props {
  settings: SiteSettings;
}

export function CheckoutClient({ settings }: Props) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user, isLoggedIn } = useAuth();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    city: 'Bursa',
    district: '',
    address: '',
    postalCode: '',
    customerNote: '',
  });

  // Auto-fill customer info if logged in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        guestName: prev.guestName || user.name || '',
        guestEmail: prev.guestEmail || user.email || '',
        guestPhone: prev.guestPhone || user.phone || '',
      }));

      if (user.addresses && user.addresses.length > 0) {
        const defaultAddr = user.addresses.find((a: any) => a.isDefault) || user.addresses[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setFormData((prev) => ({
            ...prev,
            guestName: defaultAddr.fullName || user.name || prev.guestName,
            guestPhone: defaultAddr.phone || user.phone || prev.guestPhone,
            city: defaultAddr.city || prev.city,
            district: defaultAddr.district || prev.district,
            address: defaultAddr.addressDetail || prev.address,
            postalCode: defaultAddr.postalCode || prev.postalCode,
          }));
        }
      }
    }
  }, [user]);

  const handleSelectSavedAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setFormData((prev) => ({
      ...prev,
      guestName: addr.fullName,
      guestPhone: addr.phone,
      city: addr.city,
      district: addr.district,
      address: addr.addressDetail,
      postalCode: addr.postalCode || '',
    }));
  };

  // Pick default available payment method
  const initialMethod = settings.paytr_enabled !== false 
    ? 'PAYTR' 
    : (settings.havale_discount_percent !== undefined ? 'HAVALE' : 'COD');

  const [paymentMethod, setPaymentMethod] = useState<'PAYTR' | 'HAVALE' | 'COD'>(initialMethod);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);

  // Dynamic Calculations using real database settings
  const freeShippingThreshold = Number(settings.free_shipping_limit) || 750;
  const shippingFee = subtotal >= freeShippingThreshold ? 0 : (Number(settings.shipping_fee) || 0);
  const havaleDiscountPercent = Number(settings.havale_discount_percent) || 0;
  const havaleDiscountRate = havaleDiscountPercent / 100;
  const havaleDiscountAmount = paymentMethod === 'HAVALE' ? (subtotal * havaleDiscountRate) : 0;
  const codFee = paymentMethod === 'COD' ? (Number(settings.cod_fee) || 0) : 0;

  const grandTotal = Math.max(0, subtotal - havaleDiscountAmount + shippingFee + codFee);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!agreeTerms) {
      setErrorMsg('Lütfen Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formunu onaylayınız.');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('Sepetinizde ürün bulunmamaktadır.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customerId: user?.id || null,
          paymentMethod,
          items: items.map((it) => ({
            productId: it.productId,
            variationId: it.variationId,
            quantity: it.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sipariş oluşturulamadı.');
      }

      // If payment method is PayTR and a token is returned, show PayTR iframe
      if (paymentMethod === 'PAYTR' && data.paytrToken) {
        clearCart();
        setCreatedOrderNumber(data.orderNumber);
        setPaytrToken(data.paytrToken);
        setIsSubmitting(false);
        return;
      }

      // For HAVALE or COD, complete order directly!
      clearCart();
      router.push(`/siparis-tamamlandi/${data.orderNumber}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  };

  if (paytrToken) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-4 sm:space-y-6">
        <Script
          src="https://www.paytr.com/js/iframeResizer.min.js"
          strategy="lazyOnload"
          onLoad={() => {
            if (typeof (window as any).iFrameResize === 'function') {
              (window as any).iFrameResize({}, '#paytriframe');
            }
          }}
        />

        <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl border border-cream-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-heading font-black text-base sm:text-lg text-charcoal-900">
                Güvenli Kredi Kartı Ödemesi
              </h1>
              <p className="text-xs text-charcoal-500">
                Sipariş No: <strong className="text-brand-600">{createdOrderNumber}</strong> — Lütfen kart bilgilerinizi giriniz.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('Ödeme adımından çıkıp bilgilerinizi düzenlemek istiyor musunuz?')) {
                setPaytrToken(null);
              }
            }}
            className="text-xs text-charcoal-600 hover:text-charcoal-900 bg-cream-100 hover:bg-cream-200 px-3 py-1.5 rounded-xl transition-colors font-semibold flex items-center gap-1 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Bilgileri Düzenle</span>
          </button>
        </div>

        <div className="bg-white p-2 sm:p-5 rounded-3xl border border-cream-200 shadow-sm">
          <div className="w-full bg-cream-50 rounded-2xl overflow-hidden min-h-[750px] sm:min-h-[700px] border border-cream-200">
            <iframe
              src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`}
              id="paytriframe"
              frameBorder="0"
              scrolling="no"
              className="w-full min-h-[750px] sm:min-h-[700px] rounded-2xl"
              style={{ width: '100%', minHeight: '750px' }}
            />
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-charcoal-500 text-center px-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>256-Bit SSL Sertifikası ile tüm ödemeleriniz PayTR ve banka güvencesindedir.</span>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-charcoal-900 mb-2">Sepetiniz Boş</h2>
        <p className="text-sm text-charcoal-500 mb-6">Ödeme yapmak için lütfen sepetinize ürün ekleyiniz.</p>
        <Link href="/" className="bg-brand-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm">
          Alışverişe Başla
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-charcoal-400 mb-6">
        <Link href="/" className="hover:text-brand-600">Anasayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/sepet" className="hover:text-brand-600">Sepet</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-charcoal-800 font-semibold">Güvenli Ödeme</span>
      </nav>

      <div className="flex items-center gap-2 mb-8">
        <Lock className="w-6 h-6 text-brand-600" />
        <h1 className="font-heading font-black text-2xl sm:text-3xl text-charcoal-900">
          Güvenli Ödeme & Sipariş Onayı
        </h1>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!isLoggedIn && (
        <div className="mb-6 bg-brand-50/80 border border-brand-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-charcoal-700">
            <Sparkles className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span>Zaten bir hesabınız var mı? Kayıtlı adreslerinizle hızlıca sipariş vermek için giriş yapın.</span>
          </div>
          <Link
            href={`/giris?returnUrl=/odeme`}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-4 py-2 rounded-xl whitespace-nowrap text-center shadow-xs"
          >
            Giriş Yap
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Columns: Address & Payment Selection */}
        <div className="lg:col-span-8 space-y-8">
          {/* 1. Contact & Delivery Address */}
          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <h2 className="font-heading font-bold text-base sm:text-lg text-charcoal-900">
                1. Teslimat ve İletişim Bilgileri
              </h2>
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                {isLoggedIn ? `Üye: ${user?.name}` : 'Üye Olmadan Hızlı Alışveriş'}
              </span>
            </div>

            {/* Saved Addresses Picker for Logged In Customer */}
            {isLoggedIn && user?.addresses && user.addresses.length > 0 && (
              <div className="space-y-2 pb-2 border-b border-cream-100">
                <label className="text-xs font-bold text-charcoal-700 uppercase block">
                  Kayıtlı Adreslerinizden Seçin
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {user.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => handleSelectSavedAddress(addr)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 font-medium'
                          : 'border-cream-200 bg-white hover:border-cream-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-charcoal-800">
                        <span>{addr.title} ({addr.fullName})</span>
                        {selectedAddressId === addr.id && (
                          <span className="text-[10px] text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded font-bold">
                            Seçili
                          </span>
                        )}
                      </div>
                      <div className="text-charcoal-600 text-[11px] truncate mt-0.5">{addr.addressDetail}</div>
                      <div className="text-charcoal-500 text-[10px] mt-0.5">{addr.district} / {addr.city}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-charcoal-700 uppercase mb-1 block">
                  Adınız ve Soyadınız *
                </label>
                <input
                  type="text"
                  name="guestName"
                  required
                  placeholder="Örn: Ayşe Yılmaz"
                  value={formData.guestName}
                  onChange={handleChange}
                  className="w-full bg-cream-50/50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-charcoal-700 uppercase mb-1 block">
                  Telefon Numaranız *
                </label>
                <input
                  type="tel"
                  name="guestPhone"
                  required
                  placeholder="05XX XXX XX XX"
                  value={formData.guestPhone}
                  onChange={handleChange}
                  className="w-full bg-cream-50/50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-charcoal-700 uppercase mb-1 block">
                  E-Posta Adresiniz (Sipariş Takibi İçin) *
                </label>
                <input
                  type="email"
                  name="guestEmail"
                  required
                  placeholder="ornek@email.com"
                  value={formData.guestEmail}
                  onChange={handleChange}
                  className="w-full bg-cream-50/50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-charcoal-700 uppercase mb-1 block">
                  İl *
                </label>
                <select
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full bg-cream-50/50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
                >
                  {TURKISH_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-charcoal-700 uppercase mb-1 block">
                  İlçe *
                </label>
                <input
                  type="text"
                  name="district"
                  required
                  placeholder="Örn: Nilüfer / Kadıköy"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full bg-cream-50/50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-charcoal-700 uppercase mb-1 block">
                  Açık Teslimat Adresi *
                </label>
                <textarea
                  name="address"
                  required
                  rows={2}
                  placeholder="Mahalle, cadde, sokak, bina no, daire no..."
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full bg-cream-50/50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-charcoal-700 uppercase mb-1 block">
                  Sipariş Notu (Opsiyonel)
                </label>
                <input
                  type="text"
                  name="customerNote"
                  placeholder="Örn: Zile basmayın lütfen, bebek uyuyor."
                  value={formData.customerNote}
                  onChange={handleChange}
                  className="w-full bg-cream-50/50 border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Payment Method Options */}
          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-4">
            <h2 className="font-heading font-bold text-base sm:text-lg text-charcoal-900 pb-3 border-b border-cream-200">
              2. Ödeme Yöntemi Seçimi
            </h2>

            <div className="space-y-3">
              {/* PayTR Option */}
              {settings.paytr_enabled !== false && (
                <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'PAYTR'
                    ? 'border-brand-500 bg-brand-50/40 shadow-sm'
                    : 'border-cream-200 hover:border-cream-300 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="PAYTR"
                        checked={paymentMethod === 'PAYTR'}
                        onChange={() => setPaymentMethod('PAYTR')}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <div className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
                          <span>PayTR ile Güvenli Kredi / Banka Kartı</span>
                          <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                            Taksit İmkanı
                          </span>
                        </div>
                        <div className="text-xs text-charcoal-500 mt-0.5">
                          Tüm kredi kartlarına peşin fiyatına veya taksitli güvenli ödeme. Kart bilgileriniz saklanmaz.
                        </div>
                      </div>
                    </div>
                    <CreditCard className="w-5 h-5 text-brand-500 hidden sm:block" />
                  </div>
                </label>
              )}

              {/* Havale / EFT Option */}
              <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'HAVALE'
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                  : 'border-cream-200 hover:border-cream-300 bg-white'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="HAVALE"
                      checked={paymentMethod === 'HAVALE'}
                      onChange={() => setPaymentMethod('HAVALE')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
                        <span>Havale / EFT ile Ödeme</span>
                        {havaleDiscountPercent > 0 && (
                          <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> %{havaleDiscountPercent} ANINDA İNDİRİM
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-charcoal-500 mt-0.5">
                        {havaleDiscountPercent > 0 ? `Sipariş tutarından %${havaleDiscountPercent} anında düşer. ` : ''}
                        Banka hesaplarımıza güvenle ödeme yapabilirsiniz.
                      </div>
                    </div>
                  </div>
                  <Landmark className="w-5 h-5 text-emerald-600 hidden sm:block" />
                </div>

                {paymentMethod === 'HAVALE' && settings.havale_bank_info && (
                  <div className="mt-4 pt-3 border-t border-emerald-200 text-xs text-charcoal-700 space-y-2 bg-white/80 p-3 rounded-lg">
                    <p className="font-bold text-emerald-900">Banka Hesap Bilgilerimiz:</p>
                    <div className="whitespace-pre-line text-xs font-mono text-slate-800 leading-relaxed">
                      {settings.havale_bank_info}
                    </div>
                    <p className="text-[11px] text-charcoal-500 italic">
                      * Sipariş sonrasında sipariş numaranızı havale açıklama kısmına yazınız.
                    </p>
                  </div>
                )}
              </label>

              {/* Kapıda Ödeme Option */}
              {settings.cod_enabled !== false && (
                <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-indigo-500 bg-indigo-50/40 shadow-sm'
                    : 'border-cream-200 hover:border-cream-300 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="COD"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
                          <span>Kapıda Ödeme (Nakit veya Kredi Kartı)</span>
                          {Number(settings.cod_fee) > 0 && (
                            <span className="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
                              +{formatPrice(Number(settings.cod_fee))} Hizmet Bedeli
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-charcoal-500 mt-0.5">
                          Kargo kapınıza geldiğinde nakit veya kartınızla ödeme yapabilirsiniz. ({settings.shipping_company || 'Yurtiçi Kargo'})
                        </div>
                      </div>
                    </div>
                    <Truck className="w-5 h-5 text-indigo-600 hidden sm:block" />
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Confirm */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-cream-50 p-6 rounded-2xl border border-cream-200/80 space-y-4">
            <h3 className="font-heading font-extrabold text-lg text-charcoal-900 pb-3 border-b border-cream-200">
              Sipariş Özeti ({items.length} Kalem)
            </h3>

            {/* Items mini list */}
            <div className="divide-y divide-cream-100 max-h-56 overflow-y-auto pr-1 space-y-2">
              {items.map((it) => (
                <div key={it.id} className="pt-2 first:pt-0 flex gap-3 text-xs">
                  <img src={it.image} alt="" className="w-12 h-14 object-contain rounded-lg bg-white border border-cream-200 p-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-charcoal-800 truncate">{it.title}</div>
                    {it.variationName && (
                      <div className="text-[11px] text-charcoal-500">{it.variationName}</div>
                    )}
                    <div className="text-charcoal-400 mt-0.5">
                      {it.quantity} adet × {formatPrice(it.price)}
                    </div>
                  </div>
                  <div className="font-bold text-charcoal-900">
                    {formatPrice(it.price * it.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations breakdown */}
            <div className="space-y-2 text-xs text-charcoal-600 pt-3 border-t border-cream-200">
              <div className="flex justify-between">
                <span>Ürünler Ara Toplamı:</span>
                <span className="font-bold text-charcoal-800">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between text-[11px] text-charcoal-500">
                <span>Dahil Edilen %10 KDV:</span>
                <span>{formatPrice(Math.round((subtotal - (subtotal / 1.10)) * 100) / 100)}</span>
              </div>

              {havaleDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold bg-emerald-50/80 p-1.5 rounded">
                  <span>%{havaleDiscountPercent} Havale İndirimi:</span>
                  <span>-{formatPrice(havaleDiscountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Kargo:</span>
                <span className="font-bold text-charcoal-800">
                  {shippingFee === 0 ? <span className="text-emerald-600">Ücretsiz</span> : formatPrice(shippingFee)}
                </span>
              </div>

              {codFee > 0 && (
                <div className="flex justify-between text-charcoal-700">
                  <span>Kapıda Ödeme Bedeli:</span>
                  <span className="font-bold">+{formatPrice(codFee)}</span>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="pt-3 border-t border-cream-200">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-charcoal-900">Ödenecek Tutar:</span>
                <span className="font-heading font-black text-2xl text-brand-600">
                  {formatPrice(grandTotal)}
                </span>
              </div>
              <div className="text-[11px] text-emerald-700 text-right mt-0.5 font-medium">
                Tüm tutarlara %10 KDV dahildir
              </div>
            </div>

            {/* Agreement Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2 text-[11px] text-charcoal-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-cream-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <Link href="/sayfa/mesafeli-satis-sozlesmesi" target="_blank" className="underline font-semibold text-charcoal-800">
                    Mesafeli Satış Sözleşmesi
                  </Link>
                  'ni ve{' '}
                  <Link href="/sayfa/on-bilgilendirme-formu" target="_blank" className="underline font-semibold text-charcoal-800">
                    Ön Bilgilendirme Formu
                  </Link>
                  'nu okudum, onaylıyorum.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-brand-500/25 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Siparişiniz İşleniyor...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Siparişi Onayla ve Tamamla</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-white p-4 rounded-xl border border-cream-200 text-center text-xs text-charcoal-500 space-y-1">
            <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto" />
            <div className="font-semibold text-charcoal-800">256-Bit SSL Sertifikalı Alışveriş</div>
            <p className="text-[11px]">Ödeme güvenliği PayTR ve banka güvencesiyle korunmaktadır.</p>
          </div>
        </div>
      </form>
    </div>
  );
}
