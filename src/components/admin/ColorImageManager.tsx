'use client';

import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, Check, X, Camera, RefreshCw } from 'lucide-react';

export interface ColorItem {
  name: string;
  hex?: string;
}

interface Props {
  colors: ColorItem[];
  productImages: string[];
  variations: any[];
  onSetColorImage: (colorName: string, imageUrl: string) => void;
  onAddProductImage?: (newUrl: string) => void;
}

export function ColorImageManager({
  colors,
  productImages,
  variations,
  onSetColorImage,
  onAddProductImage,
}: Props) {
  const [activeColorForModal, setActiveColorForModal] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (colors.length === 0) return null;

  // Find assigned image for each color from variations
  const getColorAssignedImage = (colorName: string): string | null => {
    const found = variations.find((v) => v.color === colorName && v.image);
    return found?.image || null;
  };

  const handleUploadNew = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeColorForModal) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', files[0]);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.urls?.[0]) {
        const uploadedUrl = data.urls[0];
        if (onAddProductImage) onAddProductImage(uploadedUrl);
        onSetColorImage(activeColorForModal, uploadedUrl);
        setActiveColorForModal(null);
      } else {
        alert(data.error || 'Fotoğraf yüklenemedi.');
      }
    } catch (err: any) {
      alert('Yükleme hatası: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>🎨 Renklere Özel Fotoğraf Belirleme</span>
            <span className="text-[11px] bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full">
              {colors.length} Renk
            </span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Müşterileriniz ürün detayında bir rengi (örneğin <strong>Pembe</strong> veya <strong>Lila</strong>) seçtiğinde doğrudan o renge ait fotoğraf sergilenir.
          </p>
        </div>
      </div>

      {/* Color Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {colors.map((c) => {
          const assignedImage = getColorAssignedImage(c.name);
          const relatedVarsCount = variations.filter((v) => v.color === c.name).length;

          return (
            <div
              key={c.name}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                assignedImage
                  ? 'bg-white border-brand-200 shadow-sm'
                  : 'bg-white/60 border-dashed border-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Image preview / placeholder */}
                <div
                  onClick={() => setActiveColorForModal(c.name)}
                  className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 relative cursor-pointer group flex items-center justify-center"
                  title="Fotoğrafı Değiştir / Ata"
                >
                  {assignedImage ? (
                    <>
                      <img
                        src={assignedImage}
                        alt={c.name}
                        className="w-full h-full object-contain p-1"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-brand-600 transition-colors">
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-bold">Ata</span>
                    </div>
                  )}
                </div>

                {/* Color details */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: c.hex || '#1e3a8a' }}
                    />
                    <span className="font-bold text-xs text-slate-800 truncate">{c.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {relatedVarsCount > 0 ? `${relatedVarsCount} Beden / Varyasyon` : 'Varyasyon yok'}
                  </div>
                  {assignedImage ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 mt-0.5">
                      <Check className="w-3 h-3" /> Fotoğraf Bağlandı
                    </span>
                  ) : (
                    <span className="inline-block text-[10px] font-medium text-amber-600 mt-0.5">
                      Fotoğraf seçilmedi
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveColorForModal(c.name)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                    assignedImage
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm'
                  }`}
                >
                  {assignedImage ? 'Değiştir' : 'Fotoğraf Seç'}
                </button>
                {assignedImage && (
                  <button
                    type="button"
                    onClick={() => onSetColorImage(c.name, '')}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-medium px-1 py-0.5 text-center"
                  >
                    Kaldır
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Picker Modal */}
      {activeColorForModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>🎨 Renk İçin Fotoğraf Seçimi:</span>
                  <span className="text-brand-600 font-extrabold">{activeColorForModal}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aşağıdaki galeriden bu renge ait fotoğrafı seçin veya yeni bir fotoğraf yükleyin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveColorForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gallery Options */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Ürünün Mevcut Fotoğrafları ({productImages.length})
                </span>
                {productImages.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-slate-50 rounded-xl p-4 text-center border border-dashed border-slate-200">
                    Henüz ürün fotoğrafı yüklenmemiş. Lütfen önce yukarıdan fotoğraf yükleyin veya aşağıdaki butondan doğrudan yükleyin.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {productImages.map((img, idx) => {
                      const isCurrent = getColorAssignedImage(activeColorForModal) === img;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            onSetColorImage(activeColorForModal, img);
                            setActiveColorForModal(null);
                          }}
                          className={`relative aspect-[4/5] rounded-xl overflow-hidden border-2 transition-all p-1 flex items-center justify-center bg-slate-50 cursor-pointer group ${
                            isCurrent
                              ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/30'
                              : 'border-slate-200 hover:border-brand-300'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-contain" />
                          {isCurrent && (
                            <div className="absolute top-1 right-1 bg-brand-500 text-white rounded-full p-0.5 shadow-sm">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-brand-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Direct Upload for this Color */}
              <div className="pt-2 border-t border-slate-100">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleUploadNew}
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-brand-400 hover:bg-brand-50/50 text-xs font-bold text-slate-700 hover:text-brand-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-brand-500" />
                  {isUploading ? 'Fotoğraf Yükleniyor...' : `+ Bu Renk (${activeColorForModal}) İçin Bilgisayardan Fotoğraf Yükle`}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveColorForModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
