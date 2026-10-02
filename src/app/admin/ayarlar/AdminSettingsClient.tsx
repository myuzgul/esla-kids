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

      {/* 4. Kargonomi Kargo Entegrasyonu */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Zap className="w-4 h-4 text-brand-600" />
            <span>4. Kargonomi Kargo Entegrasyonu</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="kargonomi_enabled"
              checked={Boolean(form.kargonomi_enabled)}
              onChange={handleChange}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
            />
            <span className="text-xs font-bold text-slate-700">Kargonomi'yi Aktif Et</span>
          </label>
        </div>

        <p className="text-xs text-slate-500">
          Kargonomi hesabınız üzerinden Yurtiçi, Aras, MNG, Sürat ve PTT kargolarına tek tıkla kargo fişi oluşturabilir, barkod yazdırabilir ve kargo durumunu anlık takip edebilirsiniz.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Kargonomi API Anahtarı (Token)
            </label>
            <input
              type="password"
              name="kargonomi_api_token"
              placeholder="Bearer Token (Kargonomi panelinizden kopyalayın)"
              value={form.kargonomi_api_token || ''}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-brand-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Kargonomi panelinizde <em>Ayarlar &gt; API Entegrasyonu</em> sayfasından Oku/Yaz yetkili Token oluşturabilirsiniz.
            </span>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>📮</span>
              <span>PTT Kargo & Kapıda Ödeme Desteği:</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Sistemimiz PTT Kargo entegrasyonuyla tam uyumludur. Kapıda ödemeli siparişlerde tahsil edilecek tutar hem PTT etiketine hem de hazırlama fişine otomatik olarak yansıtılır.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Varsayılan Kargo Şirketi
            </label>
            <select
              name="kargonomi_default_carrier"
              value={form.kargonomi_default_carrier || 'PTT Kargo'}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-brand-500"
            >
              <option value="PTT Kargo">PTT Kargo (Aktif Kullanılan)</option>
              <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
              <option value="Aras Kargo">Aras Kargo</option>
              <option value="Sürat Kargo">Sürat Kargo</option>
              <option value="MNG Kargo">MNG Kargo</option>
              <option value="HepsiJET">HepsiJET</option>
              <option value="Sendeo">Sendeo</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Kargonomi Depo ID (warehouse_id - İsteğe Bağlı)
            </label>
            <input
              type="text"
              name="kargonomi_warehouse_id"
              placeholder="Örn: 12707 (Kargonomi panelinizdeki Depo ID)"
              value={form.kargonomi_warehouse_id || ''}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Kargonomi panelinizde kayıtlı deponuz varsa ID'sini girerek gönderici adres bilgilerini doğrudan panelden çektirebilirsiniz.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Gönderici / Depo Firma Adı
            </label>
            <input
              type="text"
              name="kargonomi_sender_name"
              value={form.kargonomi_sender_name || 'Esla Kids Bebek & Çocuk'}
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
              name="kargonomi_sender_phone"
              value={form.kargonomi_sender_phone || '0538 920 92 16'}
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
                name="kargonomi_sender_city"
                value={form.kargonomi_sender_city || 'Bursa'}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
              />
              <input
                type="text"
                placeholder="İlçe (Örn: Osmangazi)"
                name="kargonomi_sender_district"
                value={form.kargonomi_sender_district || 'Osmangazi'}
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
              name="kargonomi_sender_address"
              value={form.kargonomi_sender_address || 'Osmangazi / Bursa'}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
            />
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full">
              <input
                type="checkbox"
                name="kargonomi_test_mode"
                checked={Boolean(form.kargonomi_test_mode)}
                onChange={handleChange}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Test / Simülasyon Modu</span>
                <span className="text-[10px] text-slate-400">API anahtarı girilene kadar test barkodu üretir</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
