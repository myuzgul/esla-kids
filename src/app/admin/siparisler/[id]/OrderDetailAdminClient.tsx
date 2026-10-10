'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, CheckCircle, Save, AlertCircle, Trash2, 
  AlertTriangle, Loader2, Printer, Zap, RefreshCw, ExternalLink, PackageCheck,
  Landmark, CreditCard
} from 'lucide-react';

interface Props {
  order: any;
}

export function OrderDetailAdminClient({ order }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status || 'CONFIRMED');
  const [carrier, setCarrier] = useState(order.trackingCompany || 'Yurtiçi Kargo');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'PENDING');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const rawNote = (order.internalNote || '').trim();
  const isStocadoLog = rawNote.startsWith('[Stocado');
  const userNoteInitial = isStocadoLog ? '' : rawNote;

  const [internalNote, setInternalNote] = useState(userNoteInitial);
  const [isPrinted, setIsPrinted] = useState(Boolean(order.isPrinted));
  const [printedAt, setPrintedAt] = useState(order.printedAt);
  const [isUpdatingPrint, setIsUpdatingPrint] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stocado State
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [isTrackingStocado, setIsTrackingStocado] = useState(false);
  const [stocadoMsg, setStocadoMsg] = useState('');

  const isHavale = order.paymentMethod?.toUpperCase().includes('HAVALE') || 
                   order.paymentMethod?.toUpperCase().includes('EFT') || 
                   order.paymentMethod === 'BANK_TRANSFER';
  const isCod = order.paymentMethod?.toUpperCase() === 'COD' ||
                order.paymentMethod?.toUpperCase().includes('KAPIDA');

  // 1. Manuel Durum Kaydet
  const handleSave = async (overrideStatus?: string, overridePrinted?: boolean) => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const targetStatus = overrideStatus || status;
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          status: targetStatus,
          paymentStatus,
          trackingCompany: carrier,
          trackingNumber: trackingNumber || undefined,
          internalNote,
          ...(overridePrinted !== undefined ? { isPrinted: overridePrinted } : {}),
        }),
      });

      if (!res.ok) throw new Error('Güncelleme başarısız');
      if (overrideStatus) setStatus(overrideStatus);
      if (overridePrinted !== undefined) {
        setIsPrinted(overridePrinted);
        setPrintedAt(overridePrinted ? new Date().toISOString() : null);
      }
      setSaveSuccess(true);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      console.error(e);
      alert('Sipariş güncellenirken hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePaymentStatus = async (targetPaymentStatus?: string) => {
    const nextPayment = targetPaymentStatus || (paymentStatus === 'PAID' ? 'PENDING' : 'PAID');
    setIsUpdatingPayment(true);
    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          paymentStatus: nextPayment,
          ...(nextPayment === 'PAID' && (status === 'NEW' || status === 'PENDING_PAYMENT') ? { status: 'CONFIRMED' } : {}),
        }),
      });
      if (res.ok) {
        setPaymentStatus(nextPayment);
        if (nextPayment === 'PAID' && (status === 'NEW' || status === 'PENDING_PAYMENT')) {
          setStatus('CONFIRMED');
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert('Ödeme durumu güncellenirken hata oluştu.');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleTogglePrintStatus = async () => {
    const nextVal = !isPrinted;
    setIsUpdatingPrint(true);
    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, isPrinted: nextVal }),
      });
      if (res.ok) {
        setIsPrinted(nextVal);
        setPrintedAt(nextVal ? new Date().toISOString() : null);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingPrint(false);
    }
  };

  // 2. Yazdır & Pakete Sevk Et
  const handlePrintAndPack = async () => {
    // Open print window
    window.open(`/admin/siparis-cikti?ids=${order.id}`, '_blank');
    // Transition status to PACKED and mark as printed
    await handleSave('PACKED', true);
  };

  // 3. Stocado'ya Kargo Bildir / Barkod Al
  const handleCreateStocadoShipment = async () => {
    setIsCreatingShipment(true);
    setStocadoMsg('');

    try {
      const res = await fetch('/api/admin/stocado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_shipment',
          orderId: order.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kargo oluşturulamadı.');
      }

      setCarrier(data.trackingCompany);
      setTrackingNumber(data.trackingNumber);
      setStatus('SHIPPED');
      setStocadoMsg(data.message || 'Kargo başarıyla oluşturuldu ve kargolandı durumuna alındı!');
      router.refresh();
    } catch (err: any) {
      alert('Stocado Hatası: ' + err.message);
    } finally {
      setIsCreatingShipment(false);
    }
  };

  // 4. Stocado'dan Durum Sorgula
  const handleTrackStocado = async () => {
    setIsTrackingStocado(true);
    setStocadoMsg('');

    try {
      const res = await fetch('/api/admin/stocado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_shipment',
          orderId: order.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Durum sorgulanamadı.');
      }

      if (data.status) {
        setStatus(data.status);
      }
      setStocadoMsg(data.message || 'Stocado kargo durumu güncellendi.');
      router.refresh();
    } catch (err: any) {
      alert('Sorgulama hatası: ' + err.message);
    } finally {
      setIsTrackingStocado(false);
    }
  };

  // 5. Sipariş Sil
  const handleDeleteOrder = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Sipariş silinemedi.');

      router.push('/admin/siparisler');
    } catch (err: any) {
      alert(err.message || 'Silme işlemi sırasında bir hata oluştu.');
      setIsDeleting(false);
    }
  };

  const isShipped = status === 'SHIPPED';
  const hasTracking = Boolean(trackingNumber || order.trackingNumber);

  return (
    <div className="space-y-4">
      {/* 0. Havale / EFT Ödeme Onay Kartı */}
      {isHavale && (
        <div className={`rounded-2xl border-2 p-4 sm:p-5 space-y-3.5 shadow-sm transition-all ${
          paymentStatus === 'PAID'
            ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border-emerald-300'
            : 'bg-gradient-to-br from-amber-50 via-white to-amber-100/50 border-amber-300 ring-2 ring-amber-300/30'
        }`}>
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <Landmark className={`w-5 h-5 ${paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div>
                <h3 className="font-heading font-black text-xs sm:text-sm text-slate-900 uppercase">
                  Havale / EFT Ödeme Durumu
                </h3>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              paymentStatus === 'PAID'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
            }`}>
              {paymentStatus === 'PAID' ? '✓ Ödendi' : 'Ödeme Bekliyor'}
            </span>
          </div>

          {paymentStatus === 'PAID' ? (
            <div className="space-y-2.5">
              <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold shadow-2xs">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Havale ödemesi hesaba geçti olarak onaylandı.</span>
              </div>
              <button
                type="button"
                disabled={isUpdatingPayment}
                onClick={() => handleTogglePaymentStatus('PENDING')}
                className="w-full py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
              >
                {isUpdatingPayment ? 'Güncelleniyor...' : '✕ Tekrar "Bekliyor" Olarak İşaretle'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-amber-950 font-medium leading-relaxed">
                Müşteriden banka hesabınıza havale veya EFT ulaştığında aşağıdaki butona basarak onaylayabilirsiniz:
              </p>
              <button
                type="button"
                disabled={isUpdatingPayment}
                onClick={() => handleTogglePaymentStatus('PAID')}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isUpdatingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>✓ Havale Geldi (Ödendi Yap)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stocado Entegrasyon Kartı */}
      <div className="bg-gradient-to-br from-indigo-50/80 via-white to-brand-50/80 rounded-2xl border-2 border-indigo-200/90 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <h3 className="font-heading font-black text-sm text-slate-900">
              Stocado (Kargo Paneli)
            </h3>
          </div>
          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
            Otomatik Kargo
          </span>
        </div>

        {stocadoMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{stocadoMsg}</span>
          </div>
        )}

        {hasTracking ? (
          <div className="space-y-3">
            <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Kargo Bilgileri</div>
              <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>{carrier || order.trackingCompany || 'PTT Kargo'}</span>
                <span className="font-mono text-indigo-700 font-black">{trackingNumber || order.trackingNumber}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`/api/admin/stocado/barcode?orderNumber=${encodeURIComponent(order.orderNumber)}&autoprint=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Barkod Yazdır</span>
              </a>

              <button
                type="button"
                disabled={isTrackingStocado}
                onClick={handleTrackStocado}
                className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTrackingStocado ? 'animate-spin' : ''}`} />
                <span>{isTrackingStocado ? 'Sorgulanıyor...' : 'Durum Sorgula'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              Müşteri adresi ve kapıda ödeme tutarı Stocado üzerinden PTT Kargo'ya aktarılır ve kargo barkodu oluşturulur.
            </p>
            <button
              type="button"
              disabled={isCreatingShipment}
              onClick={handleCreateStocadoShipment}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
            >
              {isCreatingShipment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kargo Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Stocado'ya Gönder & Kargo Oluştur</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Hızlı Buton: Yazdır & Pakete Sevk Et */}
        <div className="pt-2 border-t border-indigo-100">
          <button
            type="button"
            onClick={handlePrintAndPack}
            className="w-full py-2.5 px-3 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <PackageCheck className="w-4 h-4 text-purple-600" />
            <span>Fiş Yazdır & Pakete Sevk Et</span>
          </button>
        </div>
      </div>

      {/* Standart Sipariş Durumu Formu */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-heading font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
          Sipariş Durumu & Manuel Düzenleme
        </h3>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Sipariş başarıyla güncellendi!</span>
          </div>
        )}

        {/* Status Dropdown */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
            Sipariş Durumu
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-500"
          >
            <option value="CONFIRMED">Sipariş Onaylandı</option>
            <option value="PACKED">Pakete Sevk Edildi</option>
            <option value="SHIPPED">Kargolandı</option>
            <option value="DELIVERED">Teslim Edildi</option>
            <option value="CANCELLED">İptal Edildi</option>
            <option value="REFUNDED">İade Edildi</option>
          </select>
        </div>

        {/* Payment Status Dropdown */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
            Ödeme Durumu
          </label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-500"
          >
            <option value="PAID">✓ Ödendi / Tahsil Edildi</option>
            <option value="PENDING">{isCod ? 'Kapıda Nakit Ödeme' : isHavale ? 'Havale Bekliyor' : 'Ödeme Bekliyor'}</option>
            <option value="FAILED">Ödeme Başarısız</option>
          </select>
        </div>

        {/* Yazdırma Durumu Kutusu */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Yazdırma Durumu
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {isPrinted ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Yazdırıldı</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>Yazdırılmadı</span>
                </span>
              )}
              {printedAt && (
                <span className="text-[11px] text-slate-400">
                  ({new Date(printedAt).toLocaleString('tr-TR')})
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isUpdatingPrint}
            onClick={handleTogglePrintStatus}
            className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center justify-center flex items-center gap-1.5 ${
              isPrinted
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
            }`}
          >
            {isUpdatingPrint ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isPrinted ? (
              '✕ Yazdırılmadı Yap'
            ) : (
              '✓ Yazdırıldı Olarak İşaretle'
            )}
          </button>
        </div>

        {/* Carrier Info */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
              Kargo Firması
            </label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
            >
              <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
              <option value="Aras Kargo">Aras Kargo</option>
              <option value="MNG Kargo">MNG Kargo</option>
              <option value="Sürat Kargo">Sürat Kargo</option>
              <option value="PTT Kargo">PTT Kargo</option>
              <option value="HepsiJET">HepsiJET</option>
              <option value="Sendeo">Sendeo</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
              Kargo Takip Numarası
            </label>
            <input
              type="text"
              placeholder="Takip numarası..."
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold"
            />
          </div>
        </div>

        {/* Internal Admin Note */}
        <div className="pt-2 border-t border-slate-100">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
            Dahili Yönetici Notu (Müşteri Görmez)
          </label>
          <textarea
            rows={2}
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="Sipariş hazırlığı, paketleme veya kargo ile ilgili dahili not..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-brand-500"
          />
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => handleSave()}
          className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
        </button>

        {/* Sipariş Silme */}
        <div className="pt-3 border-t border-slate-100">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Bu Siparişi Kalıcı Olarak Sil</span>
            </button>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>Siparişi silmek istediğinize emin misiniz?</span>
              </div>
              <p className="text-[11px] text-rose-600">
                Bu sipariş ve tüm kayıtları veritabanından kalıcı olarak silinecektir.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteOrder}
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {isDeleting ? 'Siliniyor...' : 'Evet, Kalıcı Olarak Sil'}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
