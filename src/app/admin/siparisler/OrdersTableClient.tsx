'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice, formatDate, ORDER_STATUS_MAP, formatPaymentMethod } from '@/lib/utils';
import { 
  Printer, CheckSquare, Search, Eye, MoreHorizontal, 
  CheckCircle2, Truck, XCircle, ArrowRight, Trash2,
  AlertTriangle, Loader2, Check, FileText, StickyNote
} from 'lucide-react';

interface Props {
  initialOrders: any[];
}

export function OrdersTableClient({ initialOrders }: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orderToDelete, setOrderToDelete] = useState<{ id: string; orderNumber: string } | null>(null);
  const [showBatchDelete, setShowBatchDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchPrint = async () => {
    if (selectedIds.length === 0) return;
    window.open(`/admin/siparis-cikti?ids=${selectedIds.join(',')}`, '_blank');
    await handleBatchStatus('PACKED', true);
  };

  const handleBatchStatus = async (status?: string, isPrinted?: boolean) => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          ...(status ? { status } : {}),
          ...(isPrinted !== undefined ? { isPrinted } : {}),
        }),
      });
    }
    setOrders((prev) =>
      prev.map((ord) => {
        if (selectedIds.includes(ord.id)) {
          return {
            ...ord,
            status: status || ord.status,
            isPrinted: isPrinted !== undefined ? isPrinted : ord.isPrinted,
            printedAt: isPrinted ? new Date() : (isPrinted === false ? null : ord.printedAt),
          };
        }
        return ord;
      })
    );
    showNotification(`${selectedIds.length} adet sipariş güncellendi.`);
    setSelectedIds([]);
    router.refresh();
  };

  const handleTogglePrinted = async (orderId: string, currentPrinted: boolean) => {
    const nextPrinted = !currentPrinted;
    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, isPrinted: nextPrinted }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, isPrinted: nextPrinted, printedAt: nextPrinted ? new Date() : null }
              : o
          )
        );
        showNotification(nextPrinted ? 'Sipariş "Yazdırıldı" olarak güncellendi.' : 'Sipariş "Yazdırılmadı" olarak güncellendi.');
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isHavaleMethod = (method: string) => {
    const m = (method || '').toUpperCase();
    return m.includes('HAVALE') || m.includes('EFT') || m === 'BANK_TRANSFER';
  };

  const handleTogglePayment = async (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID';
    const targetOrder = orders.find((o) => o.id === orderId);
    const shouldConfirmOrder = nextStatus === 'PAID' && (targetOrder?.status === 'NEW' || targetOrder?.status === 'PENDING_PAYMENT');

    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          paymentStatus: nextStatus,
          ...(shouldConfirmOrder ? { status: 'CONFIRMED' } : {})
        }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { 
                  ...o, 
                  paymentStatus: nextStatus,
                  status: shouldConfirmOrder ? 'CONFIRMED' : o.status 
                }
              : o
          )
        );
        showNotification(
          nextStatus === 'PAID'
            ? 'Ödeme "Havale Geldi / Ödendi" olarak güncellendi.'
            : 'Ödeme "Bekliyor" olarak güncellendi.'
        );
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSingle = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderToDelete.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Sipariş silinemedi.');

      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
      setSelectedIds((prev) => prev.filter((id) => id !== orderToDelete.id));
      showNotification(`#${orderToDelete.orderNumber} numaralı sipariş başarıyla silindi.`);
      setOrderToDelete(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Silme işlemi sırasında hata oluştu.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Siparişler silinemedi.');

      setOrders((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
      showNotification(`${selectedIds.length} adet sipariş başarıyla silindi.`);
      setSelectedIds([]);
      setShowBatchDelete(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Toplu silme işlemi sırasında hata oluştu.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Batch Actions Bar (Shows when 1 or more orders are selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span>Sipariş Seçildi</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBatchPrint}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Toplu Yazdır ({selectedIds.length} Fiş)</span>
            </button>

            <button
              onClick={() => handleBatchStatus('CONFIRMED')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors"
            >
              Toplu Onayla
            </button>

            <button
              onClick={() => handleBatchStatus('PACKED')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors"
            >
              Pakete Sevk Et
            </button>

            <button
              onClick={() => handleBatchStatus('SHIPPED')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors"
            >
              Kargolandı Yap
            </button>

            <button
              onClick={() => handleBatchStatus(undefined, true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 transition-colors shadow-sm"
              title="Seçili siparişleri yazdırıldı olarak işaretle"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Yazdırıldı İşaretle</span>
            </button>

            <button
              onClick={() => handleBatchStatus(undefined, false)}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors"
              title="Seçili siparişleri yazdırılmadı olarak işaretle"
            >
              <span>Yazdırılmadı İşaretle</span>
            </button>

            <button
              onClick={() => setShowBatchDelete(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Toplu Sil ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white text-xs underline px-2"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* Mobile Card List View (Visible on Mobile / Tablet, hidden on lg screens) */}
      <div className="block lg:hidden space-y-3">
        {/* Mobile Select All Header */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={orders.length > 0 && selectedIds.length === orders.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
            <span>Tümünü Seç ({orders.length} Sipariş)</span>
          </label>
          <span className="text-slate-400 text-[11px]">
            {selectedIds.length > 0 ? `${selectedIds.length} seçildi` : ''}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs font-medium">
            Kriterlere uygun sipariş bulunamadı.
          </div>
        ) : (
          orders.map((ord) => {
            const isSelected = selectedIds.includes(ord.id);
            const note = ord.internalNote?.trim();
            const isAutoLog = note?.startsWith('[Stocado');

            return (
              <div
                key={ord.id}
                className={`bg-white rounded-2xl border transition-all p-3.5 space-y-3 shadow-xs ${
                  isSelected ? 'border-brand-500 ring-2 ring-brand-500/20 bg-indigo-50/20' : 'border-slate-200'
                }`}
              >
                {/* Card Top: Select checkbox, Order Number, Status badge */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(ord.id)}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <Link
                      href={`/admin/siparisler/${ord.id}`}
                      className="font-mono font-black text-sm text-brand-700 hover:underline"
                    >
                      #{ord.orderNumber}
                    </Link>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    ORDER_STATUS_MAP[ord.status]?.bg || 'bg-slate-100'
                  } ${ORDER_STATUS_MAP[ord.status]?.color || 'text-slate-700'}`}>
                    {ORDER_STATUS_MAP[ord.status]?.label || ord.status}
                  </span>
                </div>

                {/* Customer & Date Info */}
                <div className="flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{ord.guestName}</div>
                    {ord.guestPhone && (
                      <a
                        href={`tel:${ord.guestPhone}`}
                        className="text-xs text-brand-600 font-semibold hover:underline mt-0.5 inline-block"
                      >
                        📞 {ord.guestPhone}
                      </a>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 text-right">
                    {formatDate(ord.createdAt)}
                  </div>
                </div>

                {/* Payment & Total Amount */}
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{formatPaymentMethod(ord.paymentMethod)}</span>
                    <div className="mt-1">
                      {isHavaleMethod(ord.paymentMethod) ? (
                        ord.paymentStatus === 'PAID' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                              <span>Havale Geldi</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleTogglePayment(ord.id, ord.paymentStatus)}
                              title="Bekliyor olarak geri al"
                              className="text-[10px] text-slate-400 hover:text-amber-700 hover:bg-amber-50 px-1 py-0.5 rounded font-bold transition-colors cursor-pointer"
                            >
                              ↺
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              <span>Havale Bekliyor</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleTogglePayment(ord.id, ord.paymentStatus)}
                              className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-md shadow-xs transition-colors cursor-pointer"
                            >
                              ✓ Onayla
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="text-[10px] font-semibold uppercase">
                          {ord.paymentStatus === 'PAID' ? (
                            <span className="text-emerald-700">✓ Ödendi</span>
                          ) : (
                            <span className="text-slate-400">Bekliyor</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Tutar</span>
                    <div className="font-black text-slate-900 text-sm">
                      {formatPrice(ord.totalAmount)}
                    </div>
                  </div>
                </div>

                {/* Print Status & Admin Note */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* Print Status */}
                  <div>
                    {ord.isPrinted ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          <span>Yazdırıldı</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTogglePrinted(ord.id, true)}
                          className="text-[10px] text-slate-400 hover:text-rose-600 px-1 py-0.5 rounded font-bold"
                          title="Yazdırılmadı yap"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>Yazdırılmadı</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTogglePrinted(ord.id, false)}
                          className="text-[10px] text-emerald-700 hover:text-emerald-900 px-1 py-0.5 rounded font-bold"
                          title="Yazdırıldı yap"
                        >
                          ✓ İşaretle
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Admin Note Pill */}
                  {note && !isAutoLog && (
                    <div
                      title={note}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] bg-amber-50 text-amber-900 border border-amber-200/80 font-medium max-w-[180px] truncate"
                    >
                      <StickyNote className="w-3 h-3 text-amber-600 flex-shrink-0" />
                      <span className="truncate">{note}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <Link
                    href={`/admin/siparisler/${ord.id}`}
                    className="py-2.5 px-3 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detay</span>
                  </Link>

                  <a
                    href={`/admin/siparis-cikti?ids=${ord.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Yazdır</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setOrderToDelete({ id: ord.id, orderNumber: ord.orderNumber })}
                    className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sil</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main Table Card (Desktop / Laptop View) */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedIds.length === orders.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="py-3.5 px-3">Sipariş No</th>
                <th className="py-3.5 px-3">Müşteri</th>
                <th className="py-3.5 px-3">Tarih</th>
                <th className="py-3.5 px-3">Ödeme</th>
                <th className="py-3.5 px-3">Tutar</th>
                <th className="py-3.5 px-3">Sipariş Durumu</th>
                <th className="py-3.5 px-3">Yazdırma Durumu</th>
                <th className="py-3.5 px-3">Yönetici Notu</th>
                <th className="py-3.5 px-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    Kriterlere uygun sipariş bulunamadı.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const isSelected = selectedIds.includes(ord.id);
                  return (
                    <tr
                      key={ord.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(ord.id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-brand-700">
                        <Link href={`/admin/siparisler/${ord.id}`} className="hover:underline">
                          {ord.orderNumber}
                        </Link>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{ord.guestName}</div>
                        <div className="text-[11px] text-slate-400">{ord.guestPhone}</div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500">
                        {formatDate(ord.createdAt)}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-800">{formatPaymentMethod(ord.paymentMethod)}</span>
                        <div className="mt-1">
                          {isHavaleMethod(ord.paymentMethod) ? (
                            ord.paymentStatus === 'PAID' ? (
                              <div className="inline-flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  <span>Havale Geldi</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePayment(ord.id, ord.paymentStatus)}
                                  title="Bekliyor olarak geri al"
                                  className="text-[10px] text-slate-400 hover:text-amber-700 hover:bg-amber-50 px-1 py-0.5 rounded font-bold transition-colors cursor-pointer"
                                >
                                  ↺
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                  <span>Havale Bekliyor</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePayment(ord.id, ord.paymentStatus)}
                                  title="Havale Geldi olarak işaretle"
                                  className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-md shadow-xs transition-colors cursor-pointer"
                                >
                                  ✓ Onayla
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="text-[10px] font-semibold uppercase">
                              {ord.paymentStatus === 'PAID' ? (
                                <span className="text-emerald-700">✓ Ödendi</span>
                              ) : (
                                <span className="text-slate-400">Bekliyor</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {formatPrice(ord.totalAmount)}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          ORDER_STATUS_MAP[ord.status]?.bg || 'bg-slate-100'
                        } ${ORDER_STATUS_MAP[ord.status]?.color || 'text-slate-700'}`}>
                          {ORDER_STATUS_MAP[ord.status]?.label || ord.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {ord.isPrinted ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              title={ord.printedAt ? `Yazdırılma: ${formatDate(ord.printedAt)}` : 'Yazdırıldı'}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"
                            >
                              <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                              <span>Yazdırıldı</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleTogglePrinted(ord.id, true)}
                              title="Yazdırılmadı olarak işaretle"
                              className="text-[10px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              <span>Yazdırılmadı</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleTogglePrinted(ord.id, false)}
                              title="Yazdırıldı olarak işaretle"
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer"
                            >
                              ✓
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 max-w-[220px]">
                        {(() => {
                          const note = ord.internalNote?.trim();
                          const isAutoLog = note?.startsWith('[Stocado');
                          if (!note || isAutoLog) {
                            return <span className="text-slate-300 text-xs italic">-</span>;
                          }
                          return (
                            <div 
                              title={note}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-amber-50 text-amber-900 border border-amber-200/80 font-medium max-w-full truncate shadow-xs"
                            >
                              <StickyNote className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                              <span className="truncate">{note}</span>
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-3.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <a
                          href={`/admin/siparis-cikti?ids=${ord.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg inline-block transition-colors"
                          title="Sipariş & QR Fişi Yazdır"
                        >
                          <Printer className="w-4 h-4" />
                        </a>
                        <Link
                          href={`/admin/siparisler/${ord.id}`}
                          className="p-1.5 text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded-lg inline-block transition-colors font-bold"
                          title="Detayları İncele"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setOrderToDelete({ id: ord.id, orderNumber: ord.orderNumber })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg inline-block transition-colors"
                          title="Siparişi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-heading font-black text-lg text-slate-900">
                Siparişi Silmek İstediğinize Emin Misiniz?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-800">#{orderToDelete.orderNumber}</strong> numaralı sipariş ve siparişe ait ürün detayları kalıcı olarak sistemden silinecektir. Bu işlem geri alınamaz.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSingle}
                className="w-1/2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Siliniyor...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Evet, Siparişi Sil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-heading font-black text-lg text-slate-900">
                Toplu Sipariş Silme Onayı
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seçmiş olduğunuz <strong className="text-rose-600">{selectedIds.length} adet</strong> sipariş kalıcı olarak silinecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowBatchDelete(false)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteBatch}
                className="w-1/2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Siliniyor...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Evet, {selectedIds.length} Siparişi Sil</span>
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
