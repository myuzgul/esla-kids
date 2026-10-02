'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FolderTree, Plus, Edit2, Trash2, Eye, EyeOff, Check, 
  AlertCircle, ExternalLink, Loader2, ArrowUpDown, ChevronRight, Layers
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  order: number;
  showInMenu: boolean;
  isActive: boolean;
  parent?: any;
  children?: any[];
  products?: any[];
}

interface Props {
  initialCategories: CategoryItem[];
}

export function AdminCategoriesClient({ initialCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [search, setSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    parentId: 'none',
    order: 0,
    showInMenu: true,
    isActive: true,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {}
  };

  const handleOpenModal = (cat?: CategoryItem) => {
    if (cat) {
      setEditingCategory(cat);
      setForm({
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentId || 'none',
        order: cat.order || 0,
        showInMenu: cat.showInMenu !== false,
        isActive: cat.isActive !== false,
        description: cat.description || '',
      });
    } else {
      setEditingCategory(null);
      setForm({
        name: '',
        slug: '',
        parentId: 'none',
        order: (categories.filter((c) => !c.parentId).length + 1) * 1,
        showInMenu: true,
        isActive: true,
        description: '',
      });
    }
    setModalError('');
    setModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    try {
      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'İşlem başarısız oldu.');
      }

      setModalOpen(false);
      setStatusMsg({
        type: 'success',
        text: editingCategory ? 'Kategori başarıyla güncellendi.' : 'Yeni kategori eklendi.',
      });
      loadCategories();
      router.refresh();
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMenu = async (cat: CategoryItem) => {
    try {
      const updatedShowInMenu = !cat.showInMenu;
      // Optimistic update
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, showInMenu: updatedShowInMenu } : c))
      );

      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showInMenu: updatedShowInMenu }),
      });

      if (!res.ok) throw new Error('Menü görünürlüğü güncellenemedi.');
      setStatusMsg({
        type: 'success',
        text: `"${cat.name}" ${updatedShowInMenu ? 'menüye eklendi' : 'menüden çıkarıldı'}.`,
      });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      loadCategories();
      setStatusMsg({ type: 'error', text: e.message });
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    const productCount = cat.products?.length || 0;
    const confirmText = productCount > 0
      ? `Bu kategoride ${productCount} adet ürün bulunmaktadır. Kategoriyi silmek istediğinize emin misiniz? (Ürünler silinmez)`
      : `"${cat.name}" kategorisini silmek istediğinize emin misiniz?`;

    if (!confirm(confirmText)) return;

    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Kategori silinemedi.');

      setStatusMsg({ type: 'success', text: `"${cat.name}" başarıyla silindi.` });
      loadCategories();
      router.refresh();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message });
    }
  };

  // Build tree
  const rootCategories = categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.order - b.order);

  const getSubcategories = (parentId: string) => {
    return categories
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  };

  const filteredRoot = rootCategories.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchRoot = c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
    const subcats = getSubcategories(c.id);
    const matchSub = subcats.some((s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q));
    return matchRoot || matchSub;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-heading font-black text-2xl text-slate-900">
            Kategori & Menü Yönetimi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Üst menü görünürlüğü, sıralama, kategori adları ve hiyerarşi kontrolü
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-500/20 transition-all self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Kategori Ekle</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
          statusMsg.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-brand-50/60 border border-brand-200/80 rounded-2xl p-4 text-xs text-charcoal-700 flex items-start gap-3">
        <FolderTree className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-charcoal-900">Menü ve Kategori Kontrolü:</div>
          <p className="text-charcoal-600 mt-0.5">
            Her kategorinin yanındaki <strong>"Menüde Göster"</strong> butonuna basarak anında sitenizin üst gezinme menüsüne ekleyebilir veya çıkarabilirsiniz. Sıra numaraları menüdeki dizilim sırasını belirler.
          </p>
        </div>
      </div>

      {/* Categories Tree */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="font-bold text-xs text-slate-700 uppercase tracking-wider">
            Toplam {categories.length} Kategori ({rootCategories.length} Ana Kategori)
          </div>
          <input
            type="text"
            placeholder="Kategori ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-brand-500 w-48 sm:w-64"
          />
        </div>

        <div className="divide-y divide-slate-100">
          {filteredRoot.map((root) => {
            const subcats = getSubcategories(root.id);
            const totalProd = (root.products?.length || 0) + subcats.reduce((acc, s) => acc + (s.products?.length || 0), 0);

            return (
              <div key={root.id} className="p-4 space-y-3 hover:bg-slate-50/40 transition-colors">
                {/* Root Category Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-brand-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      {root.order}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{root.name}</span>
                        <span className="text-[11px] font-mono text-slate-400">/{root.slug}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{subcats.length} Alt Kategori</span>
                        <span>•</span>
                        <span>{totalProd} Ürün</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Toggle Menu Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleMenu(root)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors border ${
                        root.showInMenu
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={root.showInMenu ? 'Menüde Görünüyor (Tıklayarak Gizleyin)' : 'Menüde Gizli (Tıklayarak Menüye Ekleyin)'}
                    >
                      {root.showInMenu ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{root.showInMenu ? 'Menüde Aktif' : 'Menüde Gizli'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenModal(root)}
                      className="p-1.5 text-slate-500 hover:text-brand-600 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      href={`/kategori/${root.slug}`}
                      target="_blank"
                      className="p-1.5 text-slate-500 hover:text-brand-600 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
                      title="Mağazada Gör"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(root)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-rose-50 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subcategories List */}
                {subcats.length > 0 && (
                  <div className="pl-6 sm:pl-10 space-y-2">
                    {subcats.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200/60 hover:border-slate-300 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-slate-300 font-bold">↳</span>
                          <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                            {sub.order}
                          </span>
                          <span className="font-semibold text-slate-900">{sub.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">/{sub.slug}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full ml-1">
                            {sub.products?.length || 0} ürün
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleToggleMenu(sub)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border ${
                              sub.showInMenu
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {sub.showInMenu ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{sub.showInMenu ? 'Menüde' : 'Gizli'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenModal(sub)}
                            className="p-1 text-slate-400 hover:text-brand-600 rounded"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            href={`/kategori/${sub.slug}`}
                            target="_blank"
                            className="p-1 text-slate-400 hover:text-brand-600 rounded"
                            title="Mağazada Gör"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(sub)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-black text-lg text-slate-900">
                {editingCategory ? `Kategoriyi Düzenle: ${editingCategory.name}` : 'Yeni Kategori Ekle'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategori Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Erkek Çocuk, Kız Bebek Takım"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  URL / Slug (Opsiyonel - Boş bırakılırsa otomatik üretilir)
                </label>
                <input
                  type="text"
                  placeholder="orn: erkek-cocuk"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Üst Kategori</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-brand-500"
                >
                  <option value="none">-- Ana Kategori (Üst Kategori Yok) --</option>
                  {rootCategories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Ana kategori yaparsanız üst menüde ana başlık olarak yer alır.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Menü Sıralaması (Sıra)</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Küçük sayılar önce çıkar (1, 2, 3...)</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Menü Görünürlüğü</label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.showInMenu}
                      onChange={(e) => setForm({ ...form, showInMenu: e.target.checked })}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                    <span className="font-bold text-slate-800">Menüde Göster</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategori Açıklaması (Opsiyonel)</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Kategori sayfasında üstte gösterilecek kısa metin..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCategory ? 'Değişiklikleri Kaydet' : 'Kategoriyi Oluştur'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
