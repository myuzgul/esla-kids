'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Check, ShieldCheck, Truck, CreditCard, Mail, Store, Zap, Package } from 'lucide-react';

interface Props {
  initialSettings: any;
}

export function AdminSettingsClient({ initialSettings }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (initialSettings) {
      setForm(initialSettings);
    }
  }, [initialSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev: any) => ({ ...prev, [e.target.name]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMsg('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Kaydedilemedi');

      if (data.settings) {
        setForm(data.settings);
      }
      setMsg('Ayarlar başarıyla güncellendi!');
      router.refresh();
      setTimeout(() => setMsg(''), 4000);
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-heading font-black text-2xl text-slate-900">
            Sistem & Mağaza Ayarları
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            İletişim, PayTR entegrasyonu, havale indirimi ve kargo parametreleri
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-500/20 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Kaydediliyor...' : 'Tüm Ayarları Kaydet'}</span>
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      {/* 1. General & Contact Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Store className="w-4 h-4 text-brand-600" />
          <span>1. Mağaza & İletişim Bilgileri</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Firma Adı</label>
            <input
              type="text"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Müşteri Destek Telefonu</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Destek E-Posta</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">WhatsApp Destek Numarası (İlke kodu ile)</label>
            <input
              type="text"
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Fiziksel Mağaza / Merkez Adresi</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Varsayılan KDV Oranı (%)</label>
            <input
              type="number"
              name="default_tax_rate"
              value={form.default_tax_rate ?? 10}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-brand-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Yeni eklenecek ürünlerde otomatik seçilen KDV oranı (Standart: %10)</span>
          </div>
        </div>
      </div>

      {/* 2. Payment Gateway Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>2. Ödeme Yöntemleri & PayTR Parametreleri</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">PayTR Merchant ID</label>
            <input
              type="text"
              name="paytr_merchant_id"
              value={form.paytr_merchant_id}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">PayTR Merchant Key</label>
            <input
              type="password"
              name="paytr_merchant_key"
              value={form.paytr_merchant_key}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">PayTR Merchant Salt</label>
            <input
              type="password"
              name="paytr_merchant_salt"
              value={form.paytr_merchant_salt}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Havale İndirimi Oranı (%)</label>
            <input
              type="number"
              name="havale_discount_percent"
              value={form.havale_discount_percent}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-emerald-600"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Kapıda Ödeme Ek Ücreti (TL)</label>
            <input
              type="number"
              step="0.01"
              name="cod_fee"
              value={form.cod_fee}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Havale/EFT Banka ve IBAN Hesapları</label>
            <textarea
              rows={3}
              name="havale_bank_info"
              value={form.havale_bank_info}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. Shipping Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Truck className="w-4 h-4 text-powder-500" />
          <span>3. Kargo & Teslimat Ayarları</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Ücretsiz Kargo Sepet Limiti (TL)</label>
            <input
              type="number"
              name="free_shipping_limit"
              value={form.free_shipping_limit}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-brand-600"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Standart Kargo Ücreti (TL)</label>
            <input
              type="number"
              step="0.01"
              name="shipping_fee"
              value={form.shipping_fee}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Varsayİlan Kargo Firması</label>
            <input
              type="text"
              name="shipping_company"
              value={form.shipping_company}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
            />
          </div>
        </div>
      </div>

      {/* 4. Stocado Kargo Paneli Entegrasyonu */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Zap className="w-4 h-4 text-brand-600" />
            <span>4. Stocado (Kargo Paneli) Entegrasyonu</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="stocado_enabled"
              checked={Boolean(form.stocado_enabled)}
              onChange={handleChange}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
            />
            <span className="text-xs font-bold text-slate-700">Stocado'yu Aktif Et</span>
          </label>
        </div>

        <p className="text-xs text-slate-500">
          Stocado (api.kargopaneli.com) hesabınız üzerinden PTT Kargo, Yurtiçi, Sürat ve HepsiJET kargolarına tek tıkla kargo fişi oluşturabilir, barkod yazdırabilir ve kargo durumunu anlık takip edebilirsiniz.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Stocado Giriş E-Posta
            </label>
            <input
              type="email"
              name="stocado_email"
              placeholder="info@eslakids.com"
              value={form.stocado_email || ''}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Stocado Giriş Şifresi
            </label>
            <input
              type="password"
              name="stocado_password"
              placeholder="••••••••"
              value={form.stocado_password || ''}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>📮</span>
              <span>Otomatik API Girişi:</span>
            </div>
            <p className="text-[11px] text-amber-800">
              E-posta ve şifreniz girildiğinde sistem Stocado API'sine otomatik oturum açar (JWT Bearer Token üretir).
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Stocado Hesap ID (Account ID - ULID)
            </label>
            <input
              type="text"
              name="stocado_account_id"
              placeholder="Örn: 01JTKX1J501BSD8DAG1A6ZPBPM"
              value={form.stocado_account_id || ''}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Stocado profil veya hesap ayarlarınızda görünen hesap kimliğiniz.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Gönderici / Depo Adres ID (Local ID - ULID)
            </label>
            <input
              type="text"
              name="stocado_sender_address_id"
              placeholder="Örn: 01JTKX24X2GCVNHST3HJGJC8JP"
              value={form.stocado_sender_address_id || ''}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Stocado adres defterinizde kayıtlı depo veya çıkış adresinizin ULID tanımlayıcısı.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Varsayılan Kargo Taşıyıcısı
            </label>
            <select
              name="stocado_default_carrier"
              value={form.stocado_default_carrier || 'ptt-kargo'}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-brand-500"
            >
              <option value="ptt-kargo">PTT Kargo (Aktif / Önerilen)</option>
              <option value="yurtici-kargo">Yurtiçi Kargo</option>
              <option value="surat-kargo">Sürat Kargo</option>
              <option value="hepsijet">HepsiJET</option>
              <option value="ups">UPS Kargo</option>
              <option value="kolay-gelsin">Kolay Gelsin</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Gönderici / Mağaza Adı
            </label>
            <input
              type="text"
              name="stocado_sender_name"
              value={form.stocado_sender_name || 'Esla Kids Bebek & Çocuk'}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Gönderici Telefonu
            </label>
            <input
              type="text"
              name="stocado_sender_phone"
              value={form.stocado_sender_phone || '0538 920 92 16'}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Gönderici Şehir / İlçe
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="İl (Örn: Bursa)"
                name="stocado_sender_city"
                value={form.stocado_sender_city || 'Bursa'}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
              />
              <input
                type="text"
                placeholder="İlçe (Örn: Osmangazi)"
                name="stocado_sender_district"
                value={form.stocado_sender_district || 'Osmangazi'}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Depo / Çıkış Adresi
            </label>
            <input
              type="text"
              name="stocado_sender_address"
              value={form.stocado_sender_address || 'Osmangazi / Bursa'}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
            />
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full">
              <input
                type="checkbox"
                name="stocado_test_mode"
                checked={Boolean(form.stocado_test_mode)}
                onChange={handleChange}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Test / Simülasyon Modu</span>
                <span className="text-[10px] text-slate-400">Canlı API anahtarı girilene kadar test kargo barkodu üretir</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
