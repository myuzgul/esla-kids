'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Star, Check, X, Trash2, Eye, ExternalLink, 
  AlertTriangle, Loader2, CheckCircle, Search, 
  MessageSquareQuote, Image as ImageIcon, ShieldCheck 
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ReviewItem {
  id: string;
  productId: string;
  customerName: string;
  email: string;
  rating: number;
  comment: string;
  images: string;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
  product?: {
    id: string;
    title: string;
    slug: string;
    images: string;
    price: number;
  };
}

interface Props {
  initialReviews: ReviewItem[];
  counts: {
    total: number;
    pending: number;
    approved: number;
  };
  currentStatus: string;
  currentQuery: string;
}

export function ReviewsTableClient({ initialReviews, counts, currentStatus, currentQuery }: Props) {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null);
  const [showBatchDelete, setShowBatchDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  React.useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === reviews.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reviews.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleStatus = async (reviewId: string, nextStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/reviews/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, isApproved: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, isApproved: nextStatus } : r))
        );
        showNotification(nextStatus ? 'Yorum onaylandı ve yayına alındı.' : 'Yorum yayından kaldırıldı.');
        router.refresh();
      } else {
        alert(data.error || 'İşlem başarısız.');
      }
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  const handleBatchStatus = async (isApproved: boolean) => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/reviews/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewIds: selectedIds, isApproved }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (selectedIds.includes(r.id) ? { ...r, isApproved } : r))
        );
        showNotification(`${selectedIds.length} adet yorum ${isApproved ? 'onaylandı' : 'onayı kaldırıldı'}.`);
        setSelectedIds([]);
        router.refresh();
      } else {
        alert(data.error || 'İşlem başarısız.');
      }
    } catch (e: any) {
      alert('Hata: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!reviewToDelete) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: reviewToDelete.id }),
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewToDelete.id));
        setSelectedIds((prev) => prev.filter((id) => id !== reviewToDelete.id));
        showNotification('Yorum kalıcı olarak silindi.');
        setReviewToDelete(null);
        router.refresh();
      }
    } catch (e: any) {
      alert('Silinemedi: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewIds: selectedIds }),
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
        showNotification(`${selectedIds.length} adet yorum kalıcı olarak silindi.`);
        setSelectedIds([]);
        setShowBatchDelete(false);
        router.refresh();
      }
    } catch (e: any) {
      alert('Silinemedi: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseImages = (jsonStr?: string): string[] => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const parseProductImages = (jsonStr?: string): string => {
    if (!jsonStr) return '';
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) && parsed[0] ? parsed[0] : '';
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: 'Tüm Yorumlar', count: counts.total, activeClass: 'bg-slate-900 text-white' },
            { 
              key: 'pending', 
              label: '⏳ Onay Bekleyenler', 
              count: counts.pending, 
              activeClass: 'bg-amber-500 text-white ring-2 ring-amber-300',
              badgeClass: 'bg-amber-100 text-amber-900' 
            },
            { 
              key: 'approved', 
              label: '✓ Onaylananlar', 
              count: counts.approved, 
              activeClass: 'bg-emerald-600 text-white ring-2 ring-emerald-300',
              badgeClass: 'bg-emerald-100 text-emerald-800'
            },
          ].map((tab) => {
            const isActive = (!currentStatus && tab.key === 'all') || currentStatus === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/admin/yorumlar?status=${tab.key}${currentQuery ? `&q=${encodeURIComponent(currentQuery)}` : ''}`}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                  isActive
                    ? tab.activeClass
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${isActive ? 'bg-white/25 text-white' : tab.badgeClass || 'bg-slate-200 text-slate-700'}`}>
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Search */}
        <form method="GET" action="/admin/yorumlar" className="relative min-w-[240px]">
          {currentStatus && <input type="hidden" name="status" value={currentStatus} />}
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="q"
            defaultValue={currentQuery}
            placeholder="Müşteri, ürün veya yorum ara..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
          />
        </form>
      </div>

      {/* Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span>Yorum Seçildi</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBatchStatus(true)}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Toplu Onayla ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => handleBatchStatus(false)}
              disabled={isProcessing}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Onayı Kaldır</span>
            </button>

            <button
              onClick={() => setShowBatchDelete(true)}
              disabled={isProcessing}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
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

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={reviews.length > 0 && selectedIds.length === reviews.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="py-3.5 px-3">Ürün</th>
                <th className="py-3.5 px-3">Müşteri</th>
                <th className="py-3.5 px-3">Puan</th>
                <th className="py-3.5 px-3 min-w-[220px]">Müşteri Yorumu & Fotoğraflar</th>
                <th className="py-3.5 px-3">Tarih</th>
                <th className="py-3.5 px-3 text-center">Durum</th>
                <th className="py-3.5 px-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-slate-400 space-y-2">
                    <MessageSquareQuote className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold">Bu kriterlere uygun ürün yorumu bulunamadı.</p>
                  </td>
                </tr>
              ) : (
                reviews.map((rev) => {
                  const isSelected = selectedIds.includes(rev.id);
                  const reviewImages = parseImages(rev.images);
                  const productThumb = rev.product ? parseProductImages(rev.product.images) : '';

                  return (
                    <tr
                      key={rev.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(rev.id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-3">
                        {rev.product ? (
                          <div className="flex items-center gap-2.5 max-w-[220px]">
                            <div className="w-10 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                              {productThumb ? (
                                <img src={productThumb} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">Görsel yok</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/urun/${rev.product.slug}`}
                                target="_blank"
                                className="font-bold text-slate-900 hover:text-brand-600 truncate block text-xs"
                                title={rev.product.title}
                              >
                                {rev.product.title}
                              </Link>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ₺{rev.product.price}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Ürün silinmiş</span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{rev.customerName}</div>
                        {rev.email ? <div className="text-[11px] text-slate-400">{rev.email}</div> : null}
                        {rev.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Onaylı Alıcı</span>
                          </span>
                        )}
                      </td>

                      {/* Rating Stars */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= rev.rating ? 'fill-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                          <span className="text-xs font-bold text-slate-700 ml-1">
                            {rev.rating}.0
                          </span>
                        </div>
                      </td>

                      {/* Comment & Photos */}
                      <td className="py-3.5 px-3">
                        <div className="text-xs text-slate-800 leading-relaxed font-normal">
                          {rev.comment}
                        </div>

                        {/* Attached Photos */}
                        {reviewImages.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {reviewImages.map((imgUrl, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActivePhoto(imgUrl)}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-brand-500 hover:scale-105 transition-all flex-shrink-0 cursor-pointer relative group"
                                title="Büyütmek için tıklayın"
                              >
                                <img src={imgUrl} alt="Yorum görseli" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3 h-3 text-white" />
                                </div>
                              </button>
                            ))}
                            <span className="text-[10px] text-slate-400 font-semibold ml-1">
                              ({reviewImages.length} fotoğraf)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                        {formatDate(rev.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {rev.isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            <span>Yayında</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>Onay Bekliyor</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right space-x-1 whitespace-nowrap">
                        {rev.isApproved ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(rev.id, false)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg inline-block transition-colors cursor-pointer"
                            title="Yayından Kaldır"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(rev.id, true)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            title="Yorumu Onayla"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Onayla</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setReviewToDelete(rev)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg inline-block transition-colors cursor-pointer"
                          title="Yorumu Sil"
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

      {/* Photo Lightbox Modal */}
      {activePhoto && (
        <div 
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl p-2 overflow-hidden shadow-2xl">
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2 rounded-full cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={activePhoto} alt="Büyük boy görsel" className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto" />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-heading font-black text-lg text-slate-900">
                Yorumu Silmek İstediğinize Emin Misiniz?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong>{reviewToDelete.customerName}</strong> tarafından yapılan değerlendirme kalıcı olarak silinecektir.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setReviewToDelete(null)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDeleteSingle}
                className="w-1/2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Evet, Yorumu Sil</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-heading font-black text-lg text-slate-900">
                Toplu Yorum Silme Onayı
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seçmiş olduğunuz <strong className="text-rose-600">{selectedIds.length} adet</strong> yorum kalıcı olarak silinecektir.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowBatchDelete(false)}
                className="w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDeleteBatch}
                className="w-1/2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Evet, {selectedIds.length} Yorumu Sil</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
