'use client';

import React, { useState } from 'react';
import { Save, AlertTriangle, Loader2, Check, RefreshCw } from 'lucide-react';

interface Props {
  categories: any[];
  onSuccess?: () => void;
}

export function BulkPriceManager({ categories, onSuccess }: Props) {
  const [targetCategory, setTargetCategory] = useState<string>('all');
  const [actionType, setActionType] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [calcType, setCalcType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState<string>('10');
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getTargetCategoryName = () => {
    if (targetCategory === 'all') return 'Tüm Kategoriler (Bütün Ürünler)';
    const found = categories.find((c) => c.id === targetCategory);
    return found ? found.name : 'Seçili Kategori';
  };

  const handleApply = async () => {
    setIsUpdating(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/products/bulk-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: targetCategory,
          action: actionType,
          calcType,
          value: parseFloat(value) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Fiyatlar güncellenemedi.');
      }

      setStatusMsg({ type: 'success', text: data.message });
      setShowConfirmModal(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Bir hata oluştu.' });
      setShowConfirmModal(false);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="font-heading font-black text-xl text-slate-900">
          Toplu Ürün Fiyatı Güncelleme
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Kategori bazlı yüzde veya sabit tutar üzerinden toplu zam / indirim uygulama (KDV hariç baz fiyatlar üzerinden hesaplanır)
        </p>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* Row 1: Hedef Kategori & İşlem Türü */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Col 1: Hedef Kategori */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Hedef Kategori
            </label>
            <select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            >
              <option value="all">Tüm Kategoriler (Bütün Ürünler)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Col 2: İşlem Türü */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              İşlem Türü
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActionType('INCREASE')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  actionType === 'INCREASE'
                    ? 'border-2 border-blue-500 bg-blue-50 text-blue-600 shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                + Fiyat Artışı (Zam)
              </button>

              <button
                type="button"
                onClick={() => setActionType('DECREASE')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  actionType === 'DECREASE'
                    ? 'border-2 border-blue-500 bg-blue-50 text-blue-600 shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                - İndirim Uygula
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Hesaplama Türü & Değer Girişi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Col 1: Hesaplama Türü */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Hesaplama Türü
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCalcType('PERCENT')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  calcType === 'PERCENT'
                    ? 'border-2 border-blue-500 bg-blue-50 text-blue-600 shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Yüzde Olarak (%)
              </button>

              <button
                type="button"
                onClick={() => setCalcType('FIXED')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  calcType === 'FIXED'
                    ? 'border-2 border-blue-500 bg-blue-50 text-blue-600 shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Sabit Tutar (TL)
              </button>
            </div>
          </div>

          {/* Col 2: Değer Girişi */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              {calcType === 'PERCENT' ? 'Yüzde Oranı (%)' : 'Sabit Tutar (TL)'}
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={calcType === 'PERCENT' ? '10' : '50'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isUpdating || !value || parseFloat(value) <= 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Toplu Fiyat Değişikliğini Uygula</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin-slow" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-heading font-black text-lg text-slate-900">
                Toplu Fiyat Güncellemesini Onaylıyor Musunuz?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hedef: <strong className="text-slate-900">{getTargetCategoryName()}</strong>
                <br />
                İşlem:{' '}
                <strong className={actionType === 'INCREASE' ? 'text-blue-600' : 'text-amber-600'}>
                  {actionType === 'INCREASE' ? 'Fiyat Artışı (Zam)' : 'İndirim Uygulama'}
                </strong>
                <br />
                Miktar:{' '}
                <strong className="text-slate-900">
                  {value} {calcType === 'PERCENT' ? '%' : 'TL'}
                </strong>
              </p>
              <p className="text-[11px] text-slate-400">
                Kapsamdaki tüm ürün ve beden/renk varyasyon fiyatları otomatik güncellenecektir.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setShowConfirmModal(false)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleApply}
                className="w-1/2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uygulanıyor...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Onayla ve Uygula</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
