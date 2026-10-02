'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Upload, Check, X, RefreshCw, Trash2, Sparkles } from 'lucide-react';

export interface ColorItem {
  name: string;
  hex?: string;
}

export interface PickerTarget {
  colorName: string;
  variationIndex?: number;
  sizeName?: string;
}

interface ColorCardsProps {
  colors: ColorItem[];
  variations: any[];
  onOpenPicker: (target: PickerTarget) => void;
  onRemoveColorImage: (colorName: string) => void;
}

export function ColorImageCards({
  colors,
  variations,
  onOpenPicker,
  onRemoveColorImage,
}: ColorCardsProps) {
  if (colors.length === 0) return null;

  const getColorAssignedImage = (colorName: string): string | null => {
    const found = variations.find((v) => v.color === colorName && v.image);
    return found?.image || null;
  };

  return (
    <div className="bg-gradient-to-r from-brand-50/50 to-cream-50/50 border border-brand-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>🎨 Renklere Göre Fotoğraf Belirleme</span>
            <span className="text-[11px] bg-brand-500 text-white font-bold px-2 py-0.5 rounded-full shadow-2xs">
              {colors.length} Renk
            </span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Aşağıdaki renklerden birine fotoğraf seçtiğinizde, o rengin <strong>tüm bedenlerine</strong> otomatik atanır veya tablodan tek tek de seçebilirsiniz.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {colors.map((c) => {
          const assignedImage = getColorAssignedImage(c.name);
          const count = variations.filter((v) => v.color === c.name).length;

          return (
            <div
              key={c.name}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                assignedImage
                  ? 'bg-white border-brand-300 shadow-sm ring-1 ring-brand-500/10'
                  : 'bg-white/80 border-dashed border-slate-300 hover:border-brand-400'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenPicker({ colorName: c.name })}
                  className="w-13 h-13 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex-shrink-0 relative cursor-pointer group flex items-center justify-center transition-transform hover:scale-105"
                  title="Fotoğrafı Değiştir / Ata"
                >
                  {assignedImage ? (
                    <>
                      <img src={assignedImage} alt={c.name} className="w-full h-full object-contain p-1" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-brand-600 transition-colors">
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-bold">+ Seç</span>
                    </div>
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: c.hex || '#1e3a8a' }}
                    />
                    <span className="font-bold text-xs text-slate-900 truncate">{c.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {count > 0 ? `${count} Beden / Varyasyon` : 'Varyasyon yok'}
                  </div>
                  {assignedImage ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 mt-0.5">
                      <Check className="w-3 h-3" /> Fotoğraf Bağlı
                    </span>
                  ) : (
                    <span className="inline-block text-[10px] font-medium text-amber-600 mt-0.5">
                      Görsel seçilmedi
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenPicker({ colorName: c.name })}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs ${
                    assignedImage
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-brand-500 hover:bg-brand-600 text-white'
                  }`}
                >
                  {assignedImage ? 'Değiştir' : 'Fotoğraf Seç'}
                </button>
                {assignedImage && (
                  <button
                    type="button"
                    onClick={() => onRemoveColorImage(c.name)}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-medium px-1 py-0.5 text-center cursor-pointer"
                  >
                    Kaldır
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ThumbnailProps {
  image?: string | null;
  color: string;
  onClick: () => void;
}

export function VariationThumbnailButton({ image, color, onClick }: ThumbnailProps) {
  if (image) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-10 h-10 rounded-xl overflow-hidden border border-brand-300 bg-white hover:ring-2 hover:ring-brand-500/40 relative cursor-pointer group mx-auto p-0.5 block transition-all shadow-2xs"
        title="Fotoğrafı Değiştir (Tıkla)"
      >
        <img src={image} alt={color} className="w-full h-full object-contain" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <RefreshCw className="w-3.5 h-3.5 text-white" />
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-10 h-10 rounded-xl border-2 border-dashed border-brand-300 hover:border-brand-500 bg-brand-50/40 hover:bg-brand-100/60 flex flex-col items-center justify-center text-brand-600 hover:text-brand-800 transition-all cursor-pointer group mx-auto shadow-2xs"
      title="Fotoğraf Ekle (Tıkla)"
    >
      <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
      <span className="text-[9px] font-extrabold -mt-0.5">+ Ekle</span>
    </button>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PickerTarget | null;
  productImages: string[];
  onSelectImage: (imageUrl: string, applyToAllSameColor: boolean) => void;
  onAddProductImage?: (newUrl: string) => void;
}

export function VariationImageModal({
  isOpen,
  onClose,
  target,
  productImages,
  onSelectImage,
  onAddProductImage,
}: ModalProps) {
  const [applyToAll, setApplyToAll] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !target) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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
        const url = data.urls[0];
        if (onAddProductImage) onAddProductImage(url);
        onSelectImage(url, applyToAll);
        onClose();
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

  const titleText = target.sizeName
    ? `${target.colorName} (${target.sizeName}) İçin Fotoğraf Seç`
    : `${target.colorName} Rengi İçin Fotoğraf Seç`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-500" />
              <span>{titleText}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aşağıdaki yüklü fotoğraflardan birine tıklayarak seçin veya doğrudan yeni bir fotoğraf yükleyin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Apply to all same color checkbox */}
        <div className="bg-brand-50/70 border border-brand-200/80 rounded-xl p-3 flex items-center gap-2.5">
          <input
            type="checkbox"
            id="applyToAllCheckbox"
            checked={applyToAll}
            onChange={(e) => setApplyToAll(e.target.checked)}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-brand-300 cursor-pointer"
          />
          <label htmlFor="applyToAllCheckbox" className="text-xs font-bold text-brand-900 cursor-pointer select-none">
            Seçtiğim fotoğrafı diğer tüm <span className="underline decoration-brand-400">"{target.colorName}"</span> varyasyonlarına da otomatik uygula
          </label>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Ürün Galerisindeki Fotoğraflar ({productImages.length})
            </span>
            {productImages.length === 0 ? (
              <div className="text-xs text-slate-400 bg-slate-50 rounded-2xl p-5 text-center border border-dashed border-slate-200">
                Henüz ürün fotoğrafı bulunmuyor. Aşağıdaki butondan doğrudan bu renk için fotoğraf yükleyebilirsiniz.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSelectImage(img, applyToAll);
                      onClose();
                    }}
                    className="relative aspect-[4/5] rounded-xl overflow-hidden border-2 border-slate-200 hover:border-brand-500 hover:ring-2 hover:ring-brand-500/20 transition-all p-1 flex items-center justify-center bg-slate-50 cursor-pointer group"
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-brand-600/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white/90 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        Seç
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload New Photo from Computer */}
          <div className="pt-2 border-t border-slate-100">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl border border-brand-300 hover:border-brand-500 bg-white hover:bg-brand-50 text-xs font-bold text-brand-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Upload className="w-4 h-4 text-brand-500" />
              {isUploading ? 'Fotoğraf Yükleniyor...' : `+ Bilgisayardan Fotoğraf Yükle (${target.colorName})`}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
