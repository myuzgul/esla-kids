'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Edit, Trash2, Eye, EyeOff, Sparkles, Upload, 
  Image as ImageIcon, Check, AlertCircle, Loader2, ArrowUp, ArrowDown, ExternalLink 
} from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
  image: string;
  order: number;
  isActive: boolean;
}

interface Props {
  initialBanners: Banner[];
}

export function AdminBannersClient({ initialBanners }: Props) {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badge, setBadge] = useState('');
  const [buttonText, setButtonText] = useState('Koleksiyonu Keşfet');
  const [buttonLink, setButtonLink] = useState('/kategori/erkek-cocuk-takim');
  const [image, setImage] = useState('');
  const [order, setOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setBadge('');
    setButtonText('Koleksiyonu Keşfet');
    setButtonLink('/kategori/erkek-cocuk-takim');
    setImage('');
    setOrder(String(banners.length));
    setIsActive(true);
    setEditingBanner(null);
    setErrorMsg('');
  };

  const handleOpenNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Banner) => {
    setEditingBanner(b);
    setTitle(b.title);
    setSubtitle(b.subtitle || '');
    setBadge(b.badge || '');
    setButtonText(b.buttonText || 'Koleksiyonu Keşfet');
    setButtonLink(b.buttonLink || '/kategori/erkek-cocuk-takim');
    setImage(b.image);
    setOrder(String(b.order));
    setIsActive(b.isActive);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Görsel yüklenemedi.');
      }

      setImage(data.url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Görsel yüklenirken bir hata oluştu.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !image.trim()) {
      setErrorMsg('Lütfen başlık ve banner görselini eksiksiz girin.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      if (editingBanner) {
        // UPDATE
        const res = await fetch(`/api/admin/banners/${editingBanner.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            subtitle,
            badge,
            buttonText,
            buttonLink,
            image,
            order: parseInt(order) || 0,
            isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Banner güncellenemedi.');

        setBanners((prev) =>
          prev.map((b) => (b.id === editingBanner.id ? data.banner : b))
        );
        setSuccessMsg('Banner başarıyla güncellendi!');
      } else {
        // CREATE
        const res = await fetch('/api/admin/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            subtitle,
            badge,
            buttonText,
            buttonLink,
            image,
            order: parseInt(order) || 0,
            isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Banner eklenemedi.');

        setBanners((prev) => [...prev, data.banner]);
        setSuccessMsg('Yeni banner başarıyla eklendi!');
      }

      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'İşlem sırasında hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (b: Banner) => {
    if (!confirm(`"${b.title}" başlıklı bannerı silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/banners/${b.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setBanners((prev) => prev.filter((item) => item.id !== b.id));
        setSuccessMsg('Banner başarıyla silindi.');
        setTimeout(() => setSuccessMsg(''), 3000);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Silinemedi.');
      }
    } catch (e: any) {
      alert('Silme işlemi sırasında hata oluştu.');
    }
  };

  const handleToggleActive = async (b: Banner) => {
    try {
      const res = await fetch(`/api/admin/banners/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      if (res.ok) {
        const data = await res.json();
        setBanners((prev) =>
          prev.map((item) => (item.id === b.id ? data.banner : item))
        );
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-heading font-black text-2xl text-slate-900">
            Banner Yönetimi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Anasayfada menü altında gösterilen geniş vitrin bannerlarını ve slaytları yönetin.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Banner Ekle</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Banners List */}
      <div className="grid grid-cols-1 gap-4">
        {banners.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Henüz Tanımlı Banner Yok</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Anasayfa menü altına göz alıcı geniş bir banner eklemek için yukarıdaki butona tıklayın.
            </p>
          </div>
        ) : (
          banners.map((b, idx) => (
            <div
              key={b.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row gap-5 items-start md:items-center justify-between transition-all ${
                b.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              {/* Image & Main Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                {/* Thumbnail Preview */}
                <div className="w-full sm:w-48 h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 relative group">
                  <img
                    src={b.image}
                    alt={b.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a
                      href={b.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-white/90 rounded-lg text-slate-700 hover:text-brand-600"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {b.badge && (
                      <span className="text-[10px] bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded-full border border-brand-200">
                        {b.badge}
                      </span>
                    )}
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                      Sıra: {b.order}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {b.isActive ? 'Yayında (Aktif)' : 'Pasif'}
                    </span>
                  </div>

                  <h3 className="font-heading font-black text-sm sm:text-base text-slate-900 truncate">
                    {b.title}
                  </h3>

                  {b.subtitle && (
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                      {b.subtitle}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span>Buton: <strong className="text-slate-700 font-medium">{b.buttonText || 'Yok'}</strong></span>
                    <span>•</span>
                    <span>Hedef: <strong className="text-slate-700 font-medium truncate max-w-xs">{b.buttonLink || '-'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => handleToggleActive(b)}
                  title={b.isActive ? 'Pasife Al' : 'Aktif Et'}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    b.isActive
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                  }`}
                >
                  {b.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(b)}
                  className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                  title="Düzenle"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(b)}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-black text-lg text-slate-900">
                {editingBanner ? 'Bannerı Düzenle' : 'Yeni Vitrin Bannerı Ekle'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Görsel Yükleme & Önizleme */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Banner Görseli <span className="text-rose-500">*</span>
                </label>

                {image ? (
                  <div className="relative aspect-[21/9] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mb-2">
                    <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="absolute top-2 right-2 bg-rose-600 text-white rounded-lg p-1.5 text-xs shadow-md hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      Görseli Kaldır
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 hover:border-brand-500 rounded-xl p-6 text-center space-y-2 bg-slate-50/50 transition-colors">
                    <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="text-xs text-slate-600 font-medium">
                      Bilgisayarınızdan yüksek çözünürlüklü banner görseli seçin
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Önerilen boyut: 1920x600 veya 16:6 en/boy oranı
                    </p>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Yükleniyor...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Bilgisayardan Fotoğraf Seç</span>
                          </>
                        )}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                )}

                {/* Direct URL alternative */}
                <div className="mt-2">
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="VEYA doğrudan görsel URL'si yapıştırın (https://...)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Başlık */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Banner Başlığı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="örn: 2026 İlkbahar / Yaz Koleksiyonu"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Alt Başlık / Açıklama */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Alt Açıklama Metni
                </label>
                <textarea
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="örn: %100 saf pamuklu, nefes alan ve çocukların hareket özgürlüğünü kısıtlamayan özel dikim takımlar."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* 2 Kolon: Rozet & Sıralama */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Rozet / Etiket (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="örn: YENİ SEZON, %25 İNDİRİM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Görüntülenme Sırası
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* 2 Kolon: Buton Metni & Buton Linki */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Buton Yazısı
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="örn: Koleksiyonu Keşfet"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Buton Hedef Linki
                  </label>
                  <input
                    type="text"
                    value={buttonLink}
                    onChange={(e) => setButtonLink(e.target.value)}
                    placeholder="örn: /kategori/erkek-cocuk-takim"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Aktiflik Durumu */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Bu banner anasayfada yayında olsun (Aktif)
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingBanner ? 'Değişiklikleri Kaydet' : 'Bannerı Yayınla'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
