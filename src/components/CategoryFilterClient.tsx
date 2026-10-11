'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X, ArrowUpDown, RotateCcw } from 'lucide-react';

interface Props {
  slug: string;
  totalProducts: number;
  availableSizes: string[];
  availableColors: string[];
  initialFilters: {
    beden?: string;
    renk?: string;
    sort?: string;
    inStock?: string;
  };
}

export function DesktopSortSelect({ currentSort }: { currentSort?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSort && newSort !== 'newest') {
      params.set('sort', newSort);
    } else {
      params.delete('sort');
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`);
  };

  return (
    <div className="hidden lg:flex items-center gap-2">
      <span className="text-xs text-charcoal-600 font-medium">Sırala:</span>
      <select
        value={currentSort || 'newest'}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-white border border-cream-200 rounded-lg text-xs py-1.5 px-3 text-charcoal-800 focus:outline-none focus:border-brand-400 cursor-pointer"
      >
        <option value="newest">En Yeniler</option>
        <option value="price_asc">Fiyat: Düşükten Yükseğe</option>
        <option value="price_desc">Fiyat: Yüksekten Düşüğe</option>
      </select>
    </div>
  );
}

export function CategoryFilterClient({
  slug,
  totalProducts,
  availableSizes,
  availableColors,
  initialFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);

  const currentBeden = searchParams.get('beden') || initialFilters.beden || '';
  const currentRenk = searchParams.get('renk') || initialFilters.renk || '';
  const currentSort = searchParams.get('sort') || initialFilters.sort || 'newest';
  const currentInStock = searchParams.get('inStock') || initialFilters.inStock || '';

  const [selectedBeden, setSelectedBeden] = useState(currentBeden);
  const [selectedRenk, setSelectedRenk] = useState(currentRenk);
  const [selectedInStock, setSelectedInStock] = useState(currentInStock === 'true');

  useEffect(() => {
    setSelectedBeden(currentBeden);
    setSelectedRenk(currentRenk);
    setSelectedInStock(currentInStock === 'true');
  }, [currentBeden, currentRenk, currentInStock]);

  const activeCount =
    (currentBeden ? 1 : 0) + (currentRenk ? 1 : 0) + (currentInStock === 'true' ? 1 : 0);

  const applyFilters = (bedenVal: string, renkVal: string, inStockVal: boolean, sortVal = currentSort) => {
    const params = new URLSearchParams();
    if (bedenVal) params.set('beden', bedenVal);
    if (renkVal) params.set('renk', renkVal);
    if (inStockVal) params.set('inStock', 'true');
    if (sortVal && sortVal !== 'newest') params.set('sort', sortVal);

    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`);
  };

  const handleApplyModal = () => {
    applyFilters(selectedBeden, selectedRenk, selectedInStock, currentSort);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    setSelectedBeden('');
    setSelectedRenk('');
    setSelectedInStock(false);
    applyFilters('', '', false, currentSort);
    setIsOpen(false);
  };

  const handleSortChange = (newSort: string) => {
    applyFilters(currentBeden, currentRenk, currentInStock === 'true', newSort);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* 1. Mobile Filter & Sort Bar (Only visible on mobile/tablet < lg) */}
      <div className="lg:hidden mb-4">
        <div className="flex items-center justify-between gap-2.5 bg-white p-2 rounded-2xl border border-cream-200 shadow-xs">
          {/* Filter Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-cream-50 hover:bg-cream-100 active:scale-95 text-charcoal-800 text-xs font-bold rounded-xl border border-cream-200 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
            <span>Filtrele</span>
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="flex-1 relative">
            <select
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-full appearance-none py-2.5 pl-3 pr-7 bg-cream-50 hover:bg-cream-100 text-charcoal-800 text-xs font-bold rounded-xl border border-cream-200 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors cursor-pointer text-center"
            >
              <option value="newest">En Yeniler</option>
              <option value="price_asc">Fiyat: Düşükten Yükseğe</option>
              <option value="price_desc">Fiyat: Yüksekten Düşüğe</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-charcoal-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Active Filter Tags on Mobile */}
        {activeCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 px-0.5">
            {currentBeden && (
              <button
                type="button"
                onClick={() => applyFilters('', currentRenk, currentInStock === 'true')}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-brand-50 text-brand-800 rounded-full border border-brand-200 cursor-pointer"
              >
                <span>Beden: {currentBeden}</span>
                <X className="w-3 h-3 text-brand-600" />
              </button>
            )}
            {currentRenk && (
              <button
                type="button"
                onClick={() => applyFilters(currentBeden, '', currentInStock === 'true')}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-brand-50 text-brand-800 rounded-full border border-brand-200 cursor-pointer"
              >
                <span>Renk: {currentRenk}</span>
                <X className="w-3 h-3 text-brand-600" />
              </button>
            )}
            {currentInStock === 'true' && (
              <button
                type="button"
                onClick={() => applyFilters(currentBeden, currentRenk, false)}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-brand-50 text-brand-800 rounded-full border border-brand-200 cursor-pointer"
              >
                <span>Stokta Olanlar</span>
                <X className="w-3 h-3 text-brand-600" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-slate-400 hover:text-rose-600 underline font-semibold ml-1 cursor-pointer"
            >
              Temizle
            </button>
          </div>
        )}
      </div>

      {/* 2. Mobile Filter Bottom Sheet / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 px-5 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-600" />
                <h3 className="font-heading font-extrabold text-base text-charcoal-900">
                  Filtrele
                </h3>
                {activeCount > 0 && (
                  <span className="text-xs bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full font-bold">
                    {activeCount} seçili
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-charcoal-400 hover:text-charcoal-800 hover:bg-cream-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Filters Content */}
            <div className="overflow-y-auto p-5 space-y-6 flex-1 divide-y divide-cream-100">
              {/* Size / Age */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-800 mb-3 flex items-center justify-between">
                  <span>Beden / Yaş</span>
                  {selectedBeden && (
                    <button
                      type="button"
                      onClick={() => setSelectedBeden('')}
                      className="text-[11px] text-brand-600 font-semibold cursor-pointer lowercase"
                    >
                      temizle
                    </button>
                  )}
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {availableSizes.map((s) => {
                    const isSel = selectedBeden === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedBeden(isSel ? '' : s)}
                        className={`py-2.5 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSel
                            ? 'bg-brand-500 border-brand-500 text-white shadow-xs'
                            : 'bg-white border-cream-200 text-charcoal-700 hover:border-brand-200'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color */}
              <div className="pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-800 mb-3 flex items-center justify-between">
                  <span>Renk</span>
                  {selectedRenk && (
                    <button
                      type="button"
                      onClick={() => setSelectedRenk('')}
                      className="text-[11px] text-brand-600 font-semibold cursor-pointer lowercase"
                    >
                      temizle
                    </button>
                  )}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {availableColors.map((c) => {
                    const isSel = selectedRenk === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedRenk(isSel ? '' : c)}
                        className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition-all truncate cursor-pointer ${
                          isSel
                            ? 'bg-brand-500 border-brand-500 text-white shadow-xs'
                            : 'bg-white border-cream-200 text-charcoal-700 hover:border-brand-200'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock Toggle */}
              <div className="pt-4">
                <label className="flex items-center justify-between p-3 rounded-xl bg-cream-50 border border-cream-200 cursor-pointer select-none">
                  <span className="text-xs font-bold text-charcoal-800">
                    Sadece Stoktaki Ürünleri Göster
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedInStock}
                    onChange={(e) => setSelectedInStock(e.target.checked)}
                    className="w-4 h-4 rounded border-cream-300 text-brand-500 focus:ring-brand-400 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 px-5 bg-white border-t border-cream-200 flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-cream-300 text-charcoal-600 text-xs font-bold hover:bg-cream-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sıfırla</span>
              </button>
              <button
                type="button"
                onClick={handleApplyModal}
                className="flex-1 py-3 px-6 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all cursor-pointer"
              >
                Sonuçları Göster ({totalProducts})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Desktop Filter Sidebar (Only visible on lg:block, completely hidden on mobile) */}
      <aside className="hidden lg:block lg:col-span-1 space-y-6 bg-cream-50/60 p-5 rounded-2xl border border-cream-200/80 h-fit">
        <div className="flex items-center justify-between pb-3 border-b border-cream-200">
          <div className="flex items-center gap-2 font-bold text-sm text-charcoal-900">
            <SlidersHorizontal className="w-4 h-4 text-brand-600" />
            <span>Filtreler</span>
          </div>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-brand-600 hover:underline font-semibold cursor-pointer"
            >
              Temizle
            </button>
          )}
        </div>

        {/* Size Filter */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-2.5">
            Beden / Yaş
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {availableSizes.map((s) => {
              const isActive = currentBeden === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => applyFilters(isActive ? '' : s, currentRenk, currentInStock === 'true')}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand-500 border-brand-500 text-white font-bold'
                      : 'bg-white border-cream-200 text-charcoal-700 hover:border-brand-300'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Filter */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-2.5">
            Renk
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {availableColors.map((c) => {
              const isActive = currentRenk === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => applyFilters(currentBeden, isActive ? '' : c, currentInStock === 'true')}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand-500 border-brand-500 text-white font-bold'
                      : 'bg-white border-cream-200 text-charcoal-700 hover:border-brand-300'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stock Only Filter */}
        <div className="pt-2 border-t border-cream-200">
          <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={currentInStock === 'true'}
              onChange={(e) =>
                applyFilters(currentBeden, currentRenk, e.target.checked)
              }
              className="rounded border-cream-300 text-brand-500 focus:ring-brand-400 cursor-pointer"
            />
            <span>Sadece Stoktaki Ürünler</span>
          </label>
        </div>
      </aside>
    </>
  );
}
