'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  formatPrice, formatDate, ORDER_STATUS_MAP, formatPaymentMethod, isCodMethod, isHavaleMethod 
} from '@/lib/utils';
import { 
  Printer, CheckSquare, Search, Eye, MoreHorizontal, 
  CheckCircle2, Truck, XCircle, ArrowRight, Trash2,
  AlertTriangle, Loader2, Check, FileText, StickyNote,
  X, RefreshCw, ChevronLeft, ChevronRight, Globe
} from 'lucide-react';

interface Props {
  initialOrders: any[];
  initialTotalCount: number;
  initialPage: number;
  pageSize: number;
  currentStatus: string;
  currentPrintStatus: string;
  initialQuery: string;
  unprintedCount: number;
  printedCount: number;
}

export function OrdersTableClient({ 
  initialOrders,
  initialTotalCount,
  initialPage,
  pageSize = 30,
  currentStatus = 'ALL',
  currentPrintStatus = 'ALL',
  initialQuery = '',
  unprintedCount = 0,
  printedCount = 0,
}: Props) {
  const router = useRouter();

  // Orders & Pagination State
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [page, setPage] = useState<number>(initialPage);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>(currentStatus || 'ALL');
  const [printFilter, setPrintFilter] = useState<string>(currentPrintStatus || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery || '');
  const [searchAllStatuses, setSearchAllStatuses] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Selection & Actions State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orderToDelete, setOrderToDelete] = useState<{ id: string; orderNumber: string } | null>(null);
  const [showBatchDelete, setShowBatchDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tableTopRef = useRef<HTMLDivElement | null>(null);

  // Sync if initial props change
  useEffect(() => {
    setOrders(initialOrders);
    setTotalCount(initialTotalCount);
    setPage(initialPage);
    setStatusFilter(currentStatus || 'ALL');
    setPrintFilter(currentPrintStatus || 'ALL');
    setSearchQuery(initialQuery || '');
  }, [initialOrders, initialTotalCount, initialPage, currentStatus, currentPrintStatus, initialQuery]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Fetch orders from API with current params
  const fetchOrders = async (
    q: string, 
    status: string, 
    printStatus: string, 
    targetPage: number, 
    searchAll: boolean
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      const trimmed = q.trim();
      if (trimmed) params.set('q', trimmed);
      if (status && status !== 'ALL') params.set('status', status);
      if (printStatus && printStatus !== 'ALL') params.set('printStatus', printStatus);
      params.set('page', String(targetPage));
      params.set('pageSize', String(pageSize));
      if (trimmed && searchAll) params.set('searchAll', 'true');

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setTotalCount(data.totalCount || 0);
        setPage(data.page || 1);

        // Update URL query in browser without page reload
        const urlParams = new URLSearchParams();
        if (status && status !== 'ALL') urlParams.set('status', status);
        if (printStatus && printStatus !== 'ALL') urlParams.set('printStatus', printStatus);
        if (trimmed) urlParams.set('q', trimmed);
        if (targetPage > 1) urlParams.set('page', String(targetPage));
        const newUrl = `/admin/siparisler${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
        window.history.replaceState(null, '', newUrl);
      }
    } catch (e) {
      console.error('Orders fetch error:', e);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  // Live Instant Search (Debounced 250ms)
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setIsSearching(true);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchOrders(val, statusFilter, printFilter, 1, searchAllStatuses);
    }, 250);
  };

  // Clear Search
  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    fetchOrders('', statusFilter, printFilter, 1, searchAllStatuses);
  };

  // Switch Status Tab
  const handleStatusTab = (newStatus: string) => {
    setStatusFilter(newStatus);
    fetchOrders(searchQuery, newStatus, printFilter, 1, false);
  };

  // Switch Print Status Tab
  const handlePrintTab = (newPrintStatus: string) => {
    setPrintFilter(newPrintStatus);
    fetchOrders(searchQuery, statusFilter, newPrintStatus, 1, searchAllStatuses);
  };

  // Toggle Search Across All
  const handleToggleSearchAll = () => {
    const nextVal = !searchAllStatuses;
    setSearchAllStatuses(nextVal);
    if (searchQuery.trim()) {
      fetchOrders(searchQuery, statusFilter, printFilter, 1, nextVal);
    }
  };

  // Pagination Change
  const handlePageChange = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || targetPage === page) return;
    fetchOrders(searchQuery, statusFilter, printFilter, targetPage, searchAllStatuses);
    if (tableTopRef.current) {
      tableTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Selection Logic
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

  // Batch Operations
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

  // Toggle Printed
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

  // Toggle Payment (Havale / Kapıda Ödeme / Kart)
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
            ? 'Ödeme durumu "Ödendi / Tahsil Edildi" olarak güncellendi.'
            : 'Ödeme durumu güncellendi.'
        );
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Single Delete
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
      setTotalCount((c) => Math.max(0, c - 1));
      showNotification(`#${orderToDelete.orderNumber} numaralı sipariş başarıyla silindi.`);
      setOrderToDelete(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Silme işlemi sırasında hata oluştu.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch Delete
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
      setTotalCount((c) => Math.max(0, c - selectedIds.length));
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

  // Helper for pagination page range
  const getPaginationPages = (currentPage: number, total: number): (number | 'dots')[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | 'dots')[] = [];
    pages.push(1);
    if (currentPage > 3) {
      pages.push('dots');
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(total - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < total - 2) {
      pages.push('dots');
    }
    pages.push(total);
    return pages;
  };

  const paginationPages = getPaginationPages(page, totalPages);

  return (
    <div className="space-y-4" ref={tableTopRef}>
      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* SEARCH & FILTERS BOX */}
      <div className="space-y-3.5 bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Live Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Yazmaya başlayın: Sipariş no (#1024), müşteri adı, telefon, ürün adı veya adres ara..."
              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 focus:bg-white rounded-xl text-xs text-slate-800 font-medium placeholder-slate-400 transition-colors focus:outline-none"
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-brand-500 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                title="Aramayı Temizle"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* Quick Scope Toggle */}
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={handleToggleSearchAll}
              className={`text-xs px-3 py-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                searchAllStatuses
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs'
                  : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              title="Arama tüm sipariş durumlarında yapılsın mı?"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>{searchAllStatuses ? 'Tüm Durumlarda Aranıyor' : 'Sadece Bu Durumda'}</span>
            </button>
          )}

          {searchQuery.trim() && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer flex-shrink-0"
            >
              Temizle
            </button>
          )}
        </div>

        {/* Search Results Alert */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900">
            <div className="flex items-center gap-2">
              <span className="font-bold">🔎 Arama:</span>
              <span>"{searchQuery.trim()}" için toplam <strong>{totalCount}</strong> sipariş bulundu.</span>
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
            >
              ✕ Aramayı Sıfırla
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Sipariş Durumu
          </div>
          <div className="flex overflow-x-auto pb-1 no-scrollbar gap-1.5 sm:gap-2 sm:flex-wrap">
            {[
              { key: 'ALL', label: 'Tüm Siparişler' },
              { key: 'CONFIRMED', label: 'Onaylandı' },
              { key: 'PACKED', label: 'Pakete Sevk Edildi' },
              { key: 'SHIPPED', label: 'Kargolandı' },
              { key: 'DELIVERED', label: 'Teslim Edildi' },
              { key: 'CANCELLED', label: 'İptal / İade' },
            ].map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleStatusTab(tab.key)}
                  className={`text-xs px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Yazdırma Durumu Sekmesi */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-brand-600" />
            <span>Yazdırma Durumu:</span>
          </div>
          <div className="flex overflow-x-auto pb-1 no-scrollbar gap-1.5 sm:gap-2 sm:flex-wrap">
            {[
              {
                key: 'ALL',
                label: 'Tümü',
                count: totalCount,
                activeClass: 'bg-brand-500 text-white shadow-sm',
                badgeClass: 'bg-white/20 text-white',
              },
              {
                key: 'unprinted',
                label: '✕ Yazdırılmadı',
                count: unprintedCount,
                activeClass: 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300',
                badgeClass: 'bg-amber-100 text-amber-800',
              },
              {
                key: 'printed',
                label: '✓ Yazdırıldı',
                count: printedCount,
                activeClass: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300',
                badgeClass: 'bg-emerald-100 text-emerald-800',
              },
            ].map((tab) => {
              const isActive = printFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handlePrintTab(tab.key)}
                  className={`text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? tab.activeClass
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isActive ? 'bg-white/25 text-white' : tab.badgeClass
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Toplu Yazdır ({selectedIds.length} Fiş)</span>
            </button>

            <button
              onClick={() => handleBatchStatus('CONFIRMED')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Toplu Onayla
            </button>

            <button
              onClick={() => handleBatchStatus('PACKED')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Pakete Sevk Et
            </button>

            <button
              onClick={() => handleBatchStatus('SHIPPED')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Kargolandı Yap
            </button>

            <button
              onClick={() => handleBatchStatus(undefined, true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
              title="Seçili siparişleri yazdırıldı olarak işaretle"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Yazdırıldı İşaretle</span>
            </button>

            <button
              onClick={() => handleBatchStatus(undefined, false)}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
              title="Seçili siparişleri yazdırılmadı olarak işaretle"
            >
              <span>Yazdırılmadı İşaretle</span>
            </button>

            <button
              onClick={() => setShowBatchDelete(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Toplu Sil ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white text-xs underline px-2 cursor-pointer"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay State for table updates */}
      <div className={`relative transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-2xs rounded-2xl">
            <div className="bg-white px-4 py-2.5 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-800">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span>Yükleniyor...</span>
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
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              {searchQuery ? `"${searchQuery}" ile eşleşen sipariş bulunamadı.` : 'Kriterlere uygun sipariş bulunamadı.'}
            </div>
          ) : (
            orders.map((ord) => {
              const isSelected = selectedIds.includes(ord.id);
              return (
                <div
                  key={ord.id}
                  className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 transition-colors ${
                    isSelected ? 'border-brand-500 bg-brand-50/10' : 'border-slate-200'
                  }`}
                >
                  {/* Top Bar: Checkbox + Order Number + Status */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(ord.id)}
                        className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <Link
                        href={`/admin/siparisler/${ord.id}`}
                        className="font-mono font-bold text-sm text-brand-700 hover:underline"
                      >
                        {ord.orderNumber}
                      </Link>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ORDER_STATUS_MAP[ord.status]?.bg || 'bg-slate-100'
                    } ${ORDER_STATUS_MAP[ord.status]?.color || 'text-slate-700'}`}>
                      {ORDER_STATUS_MAP[ord.status]?.label || ord.status}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{ord.guestName || ord.customer?.name || 'Misafir'}</div>
                      <div className="text-[11px] text-slate-400">{ord.guestPhone || ord.customer?.phone || ''}</div>
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
                        ) : isCodMethod(ord.paymentMethod) ? (
                          ord.paymentStatus === 'PAID' ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                <span>Tahsil Edildi</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTogglePayment(ord.id, ord.paymentStatus)}
                                title="Geri al"
                                className="text-[10px] text-slate-400 hover:text-amber-700 hover:bg-amber-50 px-1 py-0.5 rounded font-bold transition-colors cursor-pointer"
                              >
                                ↺
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                Kapıda Nakit Ödeme
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTogglePayment(ord.id, ord.paymentStatus)}
                                title="Tahsil Edildi olarak işaretle"
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
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <div>
                      {ord.isPrinted ? (
                        <div className="inline-flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            <span>Yazdırıldı</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePrinted(ord.id, ord.isPrinted)}
                            title="Yazdırılmadı yap"
                            className="text-[10px] text-slate-400 hover:text-slate-600 px-1 py-0.5"
                          >
                            ↺
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Yazdırılmadı</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePrinted(ord.id, ord.isPrinted)}
                            title="Yazdırıldı yap"
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 px-1 py-0.5 font-bold"
                          >
                            ✓
                          </button>
                        </div>
                      )}
                    </div>

                    {ord.internalNote && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 truncate max-w-[140px]">
                        {ord.internalNote}
                      </div>
                    )}
                  </div>

                  {/* Actions Buttons */}
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
                      className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
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
                      {searchQuery ? `"${searchQuery}" ile eşleşen sipariş bulunamadı.` : 'Kriterlere uygun sipariş bulunamadı.'}
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
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-brand-700">
                          <Link href={`/admin/siparisler/${ord.id}`} className="hover:underline">
                            {ord.orderNumber}
                          </Link>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-900">{ord.guestName || ord.customer?.name || 'Misafir'}</div>
                          <div className="text-[11px] text-slate-400">{ord.guestPhone || ord.customer?.phone || ''}</div>
                        </td>

                        <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
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
                            ) : isCodMethod(ord.paymentMethod) ? (
                              ord.paymentStatus === 'PAID' ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                    <span>Tahsil Edildi</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePayment(ord.id, ord.paymentStatus)}
                                    title="Geri al"
                                    className="text-[10px] text-slate-400 hover:text-amber-700 hover:bg-amber-50 px-1 py-0.5 rounded font-bold transition-colors cursor-pointer"
                                  >
                                    ↺
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                    Kapıda Nakit Ödeme
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePayment(ord.id, ord.paymentStatus)}
                                    title="Tahsil Edildi olarak işaretle"
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

                        <td className="py-3.5 px-3 font-bold text-slate-900 whitespace-nowrap">
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
                                onClick={() => handleTogglePrinted(ord.id, ord.isPrinted)}
                                title="Yazdırılmadı olarak işaretle"
                                className="text-[10px] text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded font-bold cursor-pointer"
                              >
                                ↺
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                <span>Yazdırılmadı</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTogglePrinted(ord.id, ord.isPrinted)}
                                title="Yazdırıldı olarak işaretle"
                                className="text-[10px] text-emerald-600 hover:text-emerald-700 px-1.5 py-0.5 rounded font-bold cursor-pointer hover:bg-emerald-50"
                              >
                                ✓
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 max-w-[160px]">
                          {(() => {
                            const note = ord.internalNote || ord.customerNote;
                            if (!note) return <span className="text-slate-300">-</span>;
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
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg inline-block transition-colors cursor-pointer"
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
      </div>

      {/* PAGINATION BAR */}
      {totalPages > 1 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium text-center sm:text-left">
            Toplam <strong className="text-slate-900">{totalCount}</strong> siparişten{' '}
            <strong className="text-slate-900">{totalCount === 0 ? 0 : (page - 1) * pageSize + 1}</strong> -{' '}
            <strong className="text-slate-900">{Math.min(page * pageSize, totalCount)}</strong> arası gösteriliyor{' '}
            <span className="text-slate-400">• Sayfa {page} / {totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => handlePageChange(page - 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Önceki</span>
            </button>

            {paginationPages.map((p, idx) => {
              if (p === 'dots') {
                return (
                  <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 select-none">
                    ...
                  </span>
                );
              }
              const isCurrent = p === page;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handlePageChange(Number(p))}
                  className={`min-w-[34px] px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-brand-500 text-white shadow-xs'
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => handlePageChange(page + 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Sonraki</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Single Order Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-heading font-black text-lg text-slate-900">
                Siparişi Silmek İstiyor musunuz?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-800">#{orderToDelete.orderNumber}</strong> numaralı sipariş kalıcı olarak silinecektir. Bu işlem geri alınamaz.
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
                    <span>Evet, Sil</span>
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
