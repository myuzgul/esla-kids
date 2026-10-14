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

      {/* 4. Navlungo Kargo Entegrasyonu (Aras Kargo & PTT Kargo) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Zap className="w-4 h-4 text-brand-600" />
            <span>4. Navlungo Kargo Entegrasyonu (Aras & PTT Kargo)</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="navlungo_enabled"
              checked={form.navlungo_enabled !== false}
              onChange={handleChange}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
            />
            <span className="text-xs font-bold text-slate-700">Navlungo'yu Aktif Et</span>
          </label>
        </div>

        <p className="text-xs text-slate-500">
          Navlungo Domestic (domestic.navlungo.com) sistemi ile siparişlerinize <strong>Aras Kargo</strong> ve <strong>PTT Kargo</strong> için tek tıkla kargo fişi oluşturabilir, resmi PDF barkodu yazdırabilir ve anlık kargo takibi yapabilirsiniz.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Navlungo API Kullanıcı Adı
            </label>
            <input
              type="text"
              name="navlungo_username"
              placeholder="eAYkAnMtnxerITZ"
              value={form.navlungo_username || ''}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Navlungo API Şifresi
            </label>
            <input
              type="password"
              name="navlungo_password"
              placeholder="••••••••"
              value={form.navlungo_password || ''}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Gönderici / Depo Adres No
            </label>
            <input
              type="text"
              name="navlungo_sender_address_id"
              placeholder="111945"
              value={form.navlungo_sender_address_id || '111945'}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Navlungo Adres Defterinizdeki Ana Depo No: <strong>111945</strong> (Bursa Yıldırım)
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Varsayılan Kargo Taşıyıcısı
            </label>
            <select
              name="navlungo_default_carrier"
              value={form.navlungo_default_carrier || '13'}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-brand-500"
            >
              <option value="13">Aras Kargo (Önerilen)</option>
              <option value="14">PTT Kargo</option>
              <option value="18">Yurtiçi Kargo</option>
              <option value="10">HepsiJet</option>
              <option value="9">Sürat Kargo</option>
              <option value="1">Otomatik Seçim</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Sipariş sayfasında Aras ve PTT arasında serbestçe seçim yapabilirsiniz.
            </p>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-900 rounded-xl p-3 text-xs leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>✅</span>
              <span>Navlungo API Bağlantısı:</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              API kullanıcı ve şifreniz sisteme entegre edildi ve doğrulaması yapıldı. Kargo kesildiğinde takip numarası ve resmi barkod PDF anında üretilir.
            </p>
          </div>

          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full">
              <input
                type="checkbox"
                name="navlungo_test_mode"
                checked={Boolean(form.navlungo_test_mode)}
                onChange={handleChange}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Navlungo QA Test Modu</span>
                <span className="text-[10px] text-slate-400">Yalnızca QA test sunucusuna istek atılmak istendiğinde açılır</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
