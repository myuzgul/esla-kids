'use client';

import React, { useState, useRef } from 'react';
import { Upload, Star, ArrowLeft, ArrowRight, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
}

export function ProductImageManager({ images, onChange }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Görseller yüklenemedi.');
      }

      const newUrls = data.urls || [];
      onChange([...images, ...newUrls]);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Yükleme sırasında hata oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMakeCover = (index: number) => {
    if (index === 0) return;
    const item = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    onChange([item, ...rest]);
  };

  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    const newImgs = [...images];
    const temp = newImgs[index - 1];
    newImgs[index - 1] = newImgs[index];
    newImgs[index] = temp;
    onChange(newImgs);
  };

  const handleMoveRight = (index: number) => {
    if (index === images.length - 1) return;
    const newImgs = [...images];
    const temp = newImgs[index + 1];
    newImgs[index + 1] = newImgs[index];
    newImgs[index] = temp;
    onChange(newImgs);
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label className="text-xs font-bold text-slate-800 uppercase block">
            Ürün Fotoğrafları ({images.length} Adet)
          </label>
          <span className="text-[11px] text-slate-500">
            Bilgisayarınızdan fotoğraf seçin. 1. sıradaki fotoğraf vitrinde <strong>Kapak Fotoğrafı</strong> olarak sergilenir.
          </span>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                <span>Yükleniyor...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-brand-600" />
                <span>Bilgisayardan Fotoğraf Seç</span>
              </>
            )}
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {uploadError}
        </div>
      )}

      {/* Drop / Empty Zone */}
      {images.length === 0 ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-brand-400 bg-slate-50 hover:bg-white rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="text-xs font-bold text-slate-800 mb-1">
            Fotoğraf Yüklemek İçin Tıklayın
          </div>
          <div className="text-[11px] text-slate-400">
            JPG, PNG veya WebP formatında çoklu görsel seçebilirsiniz.
          </div>
        </div>
      ) : (
        /* Image Grid with Reorder & Cover Badge */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((img, idx) => (
            <div 
              key={idx}
              className={`group relative bg-white rounded-xl border-2 overflow-hidden shadow-sm transition-all ${
                idx === 0 ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Aspect Ratio Image Container */}
              <div className="w-full aspect-[4/5] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                <img 
                  src={img.startsWith('http') || img.startsWith('/') ? img : '/' + img} 
                  alt="" 
                  className="w-full h-full object-cover block"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/uploads/eslasiyahlogo.png';
                  }}
                />

                {/* Cover Badge */}
                {idx === 0 ? (
                  <span className="absolute top-2 left-2 bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" /> Kapak
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 bg-slate-900/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    #{idx + 1}
                  </span>
                )}

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute top-2 right-2 p-1.5 bg-rose-600/90 text-white rounded-lg hover:bg-rose-700 transition-colors shadow opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Fotoğrafı Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Controls */}
              <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1">
                {idx !== 0 ? (
                  <button
                    type="button"
                    onClick={() => handleMakeCover(idx)}
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1"
                  >
                    <Star className="w-3 h-3" /> Kapak Yap
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Ana Görsel
                  </span>
                )}

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveLeft(idx)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                    title="Öne Taşı"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === images.length - 1}
                    onClick={() => handleMoveRight(idx)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                    title="Arkaya Taşı"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add more button */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-[4/5] border-2 border-dashed border-slate-200 hover:border-brand-400 bg-slate-50 hover:bg-brand-50/20 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all text-slate-400 hover:text-brand-600"
          >
            <Upload className="w-6 h-6 mb-1" />
            <span className="text-[11px] font-bold">+ Fotoğraf Ekle</span>
          </div>
        </div>
      )}
    </div>
  );
}
