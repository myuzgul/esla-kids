'use client';

import React, { useState } from 'react';
import { 
  Star, Camera, Upload, CheckCircle2, ShieldCheck, 
  X, MessageSquare, ThumbsUp, AlertCircle, Loader2, 
  ChevronRight, Sparkles 
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ReviewItem {
  id: string;
  customerName: string;
  email: string;
  rating: number;
  comment: string;
  images: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface Props {
  productId: string;
  productTitle: string;
  initialReviews: any[];
}

export function ProductReviewsSection({ productId, productTitle, initialReviews }: Props) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [activePhotoFilter, setActivePhotoFilter] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Form State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [comment, setComment] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Rating breakdown
  const totalCount = reviews.length;
  const avgRating = totalCount > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalCount).toFixed(1)
    : '5.0';

  const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    if (breakdown[r.rating] !== undefined) breakdown[r.rating]++;
  });

  const parseImages = (jsonStr?: string): string[] => {
    if (!jsonStr) return [];
    try {
      const p = JSON.parse(jsonStr);
      return Array.isArray(p) ? p : [];
    } catch (e) {
      return [];
    }
  };

  // Collect all photos from all approved reviews
  const allCustomerPhotos: string[] = [];
  reviews.forEach((r) => {
    const imgs = parseImages(r.images);
    allCustomerPhotos.push(...imgs);
  });

  // Filter reviews
  const displayedReviews = activePhotoFilter
    ? reviews.filter((r) => parseImages(r.images).length > 0)
    : reviews;

  // Handle Photo Upload
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > 5) {
      alert('En fazla 5 fotoğraf yükleyebilirsiniz.');
      return;
    }

    setIsUploadingPhoto(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await fetch('/api/reviews/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Fotoğraf yüklenemedi.');
      }

      setUploadedImages((prev) => [...prev, ...(data.urls || [data.url])]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Fotoğraf yüklenirken bir hata oluştu.');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const removePhoto = (idx: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Review Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !comment.trim()) {
      setErrorMessage('Lütfen adınızı ve yorumunuzu doldurunuz.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          customerName,
          rating,
          comment,
          images: uploadedImages,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Yorum iletilemedi.');
      }

      setSubmitSuccess(true);
      setComment('');
      setUploadedImages([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Yorum iletilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingDescriptions: Record<number, string> = {
    1: 'Çok Kötü',
    2: 'İdare Eder',
    3: 'İyi',
    4: 'Çok İyi',
    5: 'Mükemmel!',
  };

  return (
    <section className="mt-16 pt-12 border-t border-cream-200">
      <div className="space-y-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Gerçek Müşteri Deneyimleri</span>
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-charcoal-900 mt-1">
              Müşteri Değerlendirmeleri
            </h2>
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <Camera className="w-4 h-4" />
              <span>Değerlendir & Fotoğraflı Yorum Yap</span>
            </button>
          )}
        </div>

        {/* Ratings Overview Card */}
        <div className="bg-cream-50/80 rounded-3xl p-6 sm:p-8 border border-cream-200 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Big Score Box */}
          <div className="md:col-span-4 text-center md:text-left md:border-r md:border-cream-200 md:pr-8 space-y-2">
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="font-heading font-black text-5xl sm:text-6xl text-charcoal-900">
                {avgRating}
              </span>
              <span className="text-sm font-bold text-charcoal-400">/ 5.0</span>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(Number(avgRating))
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>

            <p className="text-xs text-charcoal-500 font-medium">
              Toplam <strong>{totalCount}</strong> onaylı müşteri değerlendirmesi
            </p>
          </div>

          {/* Star Breakdown Bars */}
          <div className="md:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = breakdown[star] || 0;
              const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-14 font-bold text-charcoal-700">
                    <span>{star}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 h-2.5 bg-cream-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-[11px] font-bold text-charcoal-400">
                    %{Math.round(percentage)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Photos Gallery Strip (if any photos exist) */}
        {allCustomerPhotos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-charcoal-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand-600" />
                <span>Müşterilerimizden Gelen Fotoğraflar ({allCustomerPhotos.length})</span>
              </h3>
              <span className="text-[11px] text-charcoal-400">Büyütmek için tıklayın</span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {allCustomerPhotos.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxPhoto(url)}
                  className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden border border-cream-200 hover:border-brand-500 hover:scale-105 transition-all flex-shrink-0 cursor-pointer shadow-xs group relative"
                >
                  <img src={url} alt="Müşteri fotoğrafı" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Review Submission Form Drawer / Card */}
        {showForm && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-brand-200 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-cream-200">
              <div>
                <h3 className="font-heading font-black text-xl text-charcoal-900">
                  {productTitle} Ürününü Değerlendirin
                </h3>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Deneyiminizi ve fotoğraflarınızı paylaşarak diğer annelere ve babalara rehberlik edin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSubmitSuccess(false);
                }}
                className="p-2 rounded-xl text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="p-8 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="font-heading font-black text-lg text-emerald-900">
                  Değerlendirmeniz Başarıyla Alındı!
                </h4>
                <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                  Fotoğraflı yorumunuz için çok teşekkür ederiz. Değerlendirmeniz yönetici onayından geçtikten sonra ürün sayfasında gururla yayınlanacaktır.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSubmitSuccess(false);
                  }}
                  className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Tamam
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMessage && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Rating Stars Selector */}
                <div>
                  <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider block mb-2">
                    Ürüne Verdiğiniz Puan *
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                        >
                          <Star
                            className={`w-7 h-7 ${
                              star <= (hoverRating || rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-charcoal-900 bg-amber-50 text-amber-800 px-3 py-1 rounded-xl border border-amber-200">
                      {ratingDescriptions[hoverRating || rating]}
                    </span>
                  </div>
                </div>

                {/* Name input */}
                <div>
                  <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider block mb-1.5">
                    Adınız ve Soyadınız *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Ayşe Yılmaz"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-cream-50/60 border border-cream-300 rounded-xl p-3 text-xs text-charcoal-900 focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>

                {/* Comment Textarea */}
                <div>
                  <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider block mb-1.5">
                    Yorumunuz ve Değerlendirmeniz *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Kumaş kalitesi, kalıbı, rengi ve bebeğiniz üzerindeki duruşu hakkında deneyimlerinizi paylaşın..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-cream-50/60 border border-cream-300 rounded-xl p-3 text-xs text-charcoal-900 focus:outline-none focus:border-brand-500 focus:bg-white leading-relaxed"
                  />
                </div>

                {/* Photo Upload Area */}
                <div>
                  <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider block mb-1.5">
                    Ürün Fotoğrafları Ekle <span className="text-[10px] text-charcoal-400 font-normal">(İsteğe bağlı, en fazla 5 fotoğraf)</span>
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Uploaded thumbnails */}
                    {uploadedImages.map((url, idx) => (
                      <div key={idx} className="relative w-20 h-24 rounded-2xl overflow-hidden border border-cream-300 group shadow-xs">
                        <img src={url} alt="Yüklenen" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-full cursor-pointer transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* Add Photo Button */}
                    {uploadedImages.length < 5 && (
                      <label className="w-20 h-24 rounded-2xl border-2 border-dashed border-cream-300 hover:border-brand-500 hover:bg-cream-50 transition-colors flex flex-col items-center justify-center cursor-pointer p-2 text-center text-charcoal-500">
                        {isUploadingPhoto ? (
                          <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                        ) : (
                          <>
                            <Camera className="w-5 h-5 text-brand-600 mb-1" />
                            <span className="text-[10px] font-bold leading-tight">Fotoğraf Ekle</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={isUploadingPhoto}
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-cream-200">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 py-3 rounded-xl text-xs font-bold text-charcoal-600 hover:bg-cream-100 transition-colors cursor-pointer"
                  >
                    Vazgeç
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || isUploadingPhoto}
                    className="px-7 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Yorum İletiliyor...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Yorumu Gönder</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActivePhotoFilter(false)}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              !activePhotoFilter
                ? 'bg-charcoal-900 text-white shadow-xs'
                : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
            }`}
          >
            Tüm Yorumlar ({totalCount})
          </button>

          {allCustomerPhotos.length > 0 && (
            <button
              type="button"
              onClick={() => setActivePhotoFilter(true)}
              className={`text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activePhotoFilter
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Fotoğraflı Yorumlar ({reviews.filter((r) => parseImages(r.images).length > 0).length})</span>
            </button>
          )}
        </div>

        {/* Reviews List */}
        <div className="divide-y divide-cream-200">
          {displayedReviews.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <MessageSquare className="w-12 h-12 text-cream-300 mx-auto" />
              <p className="text-sm font-bold text-charcoal-700">
                {activePhotoFilter
                  ? 'Bu ürün için henüz fotoğraflı değerlendirme bulunmuyor.'
                  : 'Bu ürün için henüz değerlendirme yapılmamış.'}
              </p>
              <p className="text-xs text-charcoal-500">
                İlk yorumu siz yapın, diğer annelere ve babalara fikir verin!
              </p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  İlk Yorumu Siz Yazın
                </button>
              )}
            </div>
          ) : (
            displayedReviews.map((rev) => {
              const reviewImages = parseImages(rev.images);
              const initials = rev.customerName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);

              return (
                <div key={rev.id} className="py-6 space-y-3">
                  {/* Top user bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-black text-xs flex items-center justify-center">
                        {initials}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-charcoal-900 flex items-center gap-1.5">
                          <span>{rev.customerName}</span>
                          {rev.isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Onaylı Alıcı</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= rev.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-charcoal-400">
                            {formatDate(rev.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comment Text */}
                  <p className="text-xs sm:text-sm text-charcoal-800 leading-relaxed font-normal">
                    {rev.comment}
                  </p>

                  {/* Attached Customer Photos */}
                  {reviewImages.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {reviewImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLightboxPhoto(imgUrl)}
                          className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden border border-cream-200 hover:border-brand-500 hover:scale-105 transition-all cursor-pointer relative group"
                        >
                          <img src={imgUrl} alt="Müşteri görseli" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-2 overflow-hidden shadow-2xl">
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white p-2 rounded-full cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxPhoto}
              alt="Müşteri fotoğrafı tam boy"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl mx-auto"
            />
          </div>
        </div>
      )}
    </section>
  );
}
