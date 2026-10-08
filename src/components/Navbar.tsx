'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  ShoppingBag, Search, Menu as MenuIcon, X, Phone, MessageCircle, 
  User, Truck, ChevronDown, Sparkles, Heart, LogOut, Package, MapPin, 
  Settings, LogIn, UserPlus, Shield
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/lib/utils';

// Fallback initial categories in case API is loading or network is slow
const DEFAULT_MENU_CATEGORIES = [
  {
    name: 'Erkek Çocuk',
    slug: 'erkek-cocuk',
    items: [
      { name: 'Erkek Çocuk Takım', slug: 'erkek-cocuk-takim' },
      { name: 'Erkek Çocuk Pijama Takımı', slug: 'erkek-cocuk-pijama-takimi' },
      { name: 'Erkek Çocuk Kışlık Takımlar', slug: 'erkek-cocuk-kislik-takimlar' },
    ],
  },
  {
    name: 'Kız Bebek',
    slug: 'kiz-bebek',
    items: [
      { name: 'Kız Bebek Kışlık Takımlar', slug: 'kiz-bebek-kislik-takimlar' },
      { name: 'Kız Bebek Takım', slug: 'kiz-bebek-takim' },
      { name: 'Kız Bebek Pijama Takım', slug: 'kiz-bebek-pijama-takim' },
      { name: 'Kız Bebek Elbise', slug: 'kiz-bebek-elbise' },
    ],
  },
  {
    name: 'Erkek Bebek',
    slug: 'erkek-bebek',
    items: [
      { name: 'Erkek Bebek Kışlık Takımlar', slug: 'erkek-bebek-kislik-takimlar' },
      { name: 'Erkek Bebek Takım', slug: 'erkek-bebek-takim' },
      { name: 'Erkek Bebek Pijama Takımı', slug: 'erkek-bebek-pijama-takimi' },
    ],
  },
  {
    name: 'Kız Çocuk',
    slug: 'kiz-cocuk',
    items: [
      { name: 'Kız Çocuk Kışlık Takımlar', slug: 'kiz-cocuk-kislik-takimlar' },
      { name: 'Kız Çocuk Takım', slug: 'kiz-cocuk-takim' },
      { name: 'Kız Çocuk Pijama Takımı', slug: 'kiz-cocuk-pijama-takimi' },
    ],
  },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems, setIsOpen } = useCart();
  const { user, isLoggedIn, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);

  // Dynamic Categories from database
  const [menuCategories, setMenuCategories] = useState<any[]>(DEFAULT_MENU_CATEGORIES);

  // User Dropdown State
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const [topBarSettings, setTopBarSettings] = useState({
    free_shipping_limit: 1500,
    phone: '0538 920 92 16',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setTopBarSettings({
            free_shipping_limit: Number(d.settings.free_shipping_limit) || 1500,
            phone: d.settings.phone || '0538 920 92 16',
          });
        }
      })
      .catch(() => {});

    // Fetch live categories from database where showInMenu == true
    fetch('/api/categories?menu=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.categories && Array.isArray(d.categories) && d.categories.length > 0) {
          const mapped = d.categories.map((c: any) => ({
            name: c.name,
            slug: c.slug,
            items: (c.children || []).map((sub: any) => ({
              name: sub.name,
              slug: sub.slug,
            })),
          }));
          setMenuCategories(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchDropdown(false);
      router.push(`/arama?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const clickedDesktop = searchRef.current && searchRef.current.contains(event.target as Node);
      const clickedMobile = mobileSearchRef.current && mobileSearchRef.current.contains(event.target as Node);
      if (!clickedDesktop && !clickedMobile) {
        setShowSearchDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-cream-200 shadow-sm">
      {/* Top Announcement Bar */}
      <div className="bg-brand-50 border-b border-brand-100 text-xs py-1.5 px-4 text-charcoal-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 font-medium text-brand-700">
              <Sparkles className="w-3.5 h-3.5" /> {topBarSettings.free_shipping_limit} TL ve Üzeri Ücretsiz Kargo
            </span>
            <span className="hidden sm:inline text-cream-400">|</span>
            <span className="hidden sm:inline text-charcoal-600">Aynı Gün Hızlı Teslimat</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <a 
              href={`tel:${topBarSettings.phone.replace(/\s+/g, '')}`}
              className="flex items-center gap-1 hover:text-brand-600 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-brand-500" />
              <span>{topBarSettings.phone}</span>
            </a>
            <Link 
              href="/siparis-takip" 
              className="hidden md:flex items-center gap-1 hover:text-brand-600 transition-colors"
            >
              <Truck className="w-3.5 h-3.5 text-powder-500" />
              <span>Sipariş Takibi</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Mobile menu trigger */}
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 text-charcoal-700 hover:text-brand-500 rounded-lg hover:bg-cream-100"
          aria-label="Menüyü Aç"
        >
          <MenuIcon className="w-6 h-6" />
        </button>

        {/* Brand Logo */}
        <Link href="/" className="flex items-center group">
          <Image
            src="/uploads/eslasiyahlogo.png"
            alt="Esla Kids"
            width={160}
            height={52}
            className="h-10 sm:h-12 w-auto object-contain group-hover:opacity-90 transition-opacity"
            priority
          />
        </Link>

        {/* Live Search Bar */}
        <div ref={searchRef} className="hidden md:flex flex-1 max-w-md mx-6 relative">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder="Ürün adı, beden, model veya kod ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
              className="w-full bg-cream-50 border border-cream-200 rounded-full py-2.5 pl-11 pr-10 text-sm text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:border-brand-400 focus:bg-white transition-all shadow-inner"
            />
            <button
              type="submit"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-brand-500 transition-colors p-1"
              title="Ara"
            >
              <Search className="w-4 h-4" />
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Autocomplete Dropdown */}
          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-cream-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-charcoal-400">Aranıyor...</div>
              ) : searchResults.length > 0 ? (
                <div>
                  <div className="divide-y divide-cream-100 max-h-96 overflow-y-auto">
                    {searchResults.map((item) => (
                      <Link
                        key={item.id}
                        href={`/urun/${item.slug}`}
                        onClick={() => setShowSearchDropdown(false)}
                        className="flex items-center gap-3 p-3 hover:bg-cream-50 transition-colors"
                      >
                        <div className="w-12 h-14 bg-cream-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.title} 
                              className="w-full h-full object-contain p-0.5" 
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-charcoal-800 truncate">{item.title}</div>
                          <div className="text-xs text-charcoal-400">Kod: {item.sku}</div>
                          <div className="text-sm font-bold text-brand-600 mt-0.5">{formatPrice(item.price)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="p-2.5 bg-cream-50 border-t border-cream-100 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSearchDropdown(false);
                        router.push(`/arama?q=${encodeURIComponent(searchQuery.trim())}`);
                      }}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
                    >
                      <span>&quot;{searchQuery}&quot; için tüm sonuçları gör</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <div className="text-xs text-charcoal-400 mb-1.5">Sonuç bulunamadı.</div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSearchDropdown(false);
                      router.push(`/arama?q=${encodeURIComponent(searchQuery.trim())}`);
                    }}
                    className="text-xs font-bold text-brand-600 hover:underline"
                  >
                    Arama sayfasına git &rarr;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://wa.me/905389209216?text=Merhaba,%20Esla%20Kids%20ürünleri%20hakkında%20bilgi%20almak%20istiyorum."
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-full transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span className="hidden xl:inline">WhatsApp Destek</span>
          </a>

          {/* User Account Button & Dropdown */}
          <div ref={userDropdownRef} className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className={`p-2 rounded-full transition-colors flex items-center gap-1.5 ${
                isLoggedIn 
                  ? 'bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 px-3 py-1.5' 
                  : 'text-charcoal-700 hover:text-brand-500 hover:bg-cream-100'
              }`}
              title={isLoggedIn ? user?.name : 'Hesap Girişi'}
            >
              {isLoggedIn ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {user?.name?.substring(0, 1).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold hidden sm:inline max-w-[100px] truncate">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-brand-600" />
                </>
              ) : (
                <>
                  <User className="w-5 h-5" />
                  <span className="text-xs font-bold hidden sm:inline">Giriş Yap</span>
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-cream-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {isLoggedIn ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 border-b border-cream-100">
                      <div className="font-bold text-xs text-charcoal-900 truncate">{user?.name}</div>
                      <div className="text-[11px] text-charcoal-500 truncate">{user?.email}</div>
                    </div>

                    <Link
                      href="/hesabim"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-700 hover:bg-cream-50 hover:text-brand-600 transition-colors"
                    >
                      <Package className="w-4 h-4 text-charcoal-400" />
                      <span>Siparişlerim</span>
                    </Link>

                    <Link
                      href="/hesabim"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-700 hover:bg-cream-50 hover:text-brand-600 transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-charcoal-400" />
                      <span>Adres Defterim</span>
                    </Link>

                    <Link
                      href="/hesabim"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-700 hover:bg-cream-50 hover:text-brand-600 transition-colors"
                    >
                      <User className="w-4 h-4 text-charcoal-400" />
                      <span>Hesap Bilgilerim</span>
                    </Link>

                    {user?.role === 'SUPER_ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                      >
                        <Shield className="w-4 h-4 text-purple-600" />
                        <span>Yönetim Paneli</span>
                      </Link>
                    )}

                    <div className="border-t border-cream-100 pt-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Çıkış Yap</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs text-charcoal-500 border-b border-cream-100">
                      Giriş yaparak siparişlerinizi takip edin ve hızlı alışveriş yapın.
                    </div>
                    <Link
                      href="/giris"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-colors justify-center shadow-xs"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Giriş Yap</span>
                    </Link>
                    <Link
                      href="/kayit"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-charcoal-700 hover:bg-cream-50 hover:text-brand-600 transition-colors justify-center"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Yeni Hesap Oluştur</span>
                    </Link>
                    <div className="border-t border-cream-100 pt-1">
                      <Link
                        href="/siparis-takip"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-charcoal-500 hover:text-brand-600"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Misafir Sipariş Takibi</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 p-2 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 rounded-full px-3.5 py-2 transition-all relative group"
            title="Sepetim"
          >
            <ShoppingBag className="w-5 h-5 text-brand-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold hidden sm:inline">Sepet</span>
            {totalItems > 0 && (
              <span className="bg-brand-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center -ml-1">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Row */}
      <div ref={mobileSearchRef} className="md:hidden px-4 pb-3 pt-0 relative">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <input
            type="text"
            placeholder="Ürün adı, beden veya kod ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
            className="w-full bg-cream-50 border border-cream-200 rounded-full py-2 pl-9 pr-9 text-xs text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:border-brand-400 focus:bg-white transition-all shadow-inner"
          />
          <button
            type="submit"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-brand-500 transition-colors"
            title="Ara"
          >
            <Search className="w-4 h-4" />
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Mobile Autocomplete Dropdown */}
        {showSearchDropdown && (
          <div className="absolute top-full left-4 right-4 mt-1 bg-white rounded-2xl shadow-xl border border-cream-200 overflow-hidden z-50">
            {isSearching ? (
              <div className="p-3 text-center text-xs text-charcoal-400">Aranıyor...</div>
            ) : searchResults.length > 0 ? (
              <div>
                <div className="divide-y divide-cream-100 max-h-64 overflow-y-auto">
                  {searchResults.map((item) => (
                    <Link
                      key={item.id}
                      href={`/urun/${item.slug}`}
                      onClick={() => setShowSearchDropdown(false)}
                      className="flex items-center gap-3 p-2.5 hover:bg-cream-50 transition-colors"
                    >
                      <div className="w-10 h-12 bg-cream-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.title} 
                            className="w-full h-full object-contain p-0.5" 
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-charcoal-800 truncate">{item.title}</div>
                        <div className="text-[10px] text-charcoal-400">Kod: {item.sku}</div>
                        <div className="text-xs font-bold text-brand-600 mt-0.5">{formatPrice(item.price)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="p-2 bg-cream-50 border-t border-cream-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSearchDropdown(false);
                      router.push(`/arama?q=${encodeURIComponent(searchQuery.trim())}`);
                    }}
                    className="text-xs font-bold text-brand-600 hover:underline"
                  >
                    &quot;{searchQuery}&quot; için tüm sonuçları gör &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center">
                <div className="text-xs text-charcoal-400 mb-1">Sonuç bulunamadı.</div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchDropdown(false);
                    router.push(`/arama?q=${encodeURIComponent(searchQuery.trim())}`);
                  }}
                  className="text-xs font-bold text-brand-600 hover:underline"
                >
                  Arama sayfasına git &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary Category Navigation Bar (Desktop) */}
      <nav className="hidden lg:block border-t border-cream-200 bg-cream-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <ul className="flex items-center space-x-1 text-sm font-medium text-charcoal-700">
            <li>
              <Link 
                href="/" 
                className={`inline-block py-2.5 px-3 rounded-lg hover:text-brand-600 transition-colors ${pathname === '/' ? 'text-brand-600 font-bold' : ''}`}
              >
                Anasayfa
              </Link>
            </li>

            {menuCategories.map((cat) => (
              <li key={cat.slug} className="relative group">
                <Link
                  href={`/kategori/${cat.slug}`}
                  className={`inline-flex items-center gap-1 py-2.5 px-3.5 rounded-lg hover:text-brand-600 transition-colors group-hover:bg-white group-hover:text-brand-600 ${pathname.includes(cat.slug) ? 'text-brand-600 font-bold' : ''}`}
                >
                  <span>{cat.name}</span>
                  {cat.items && cat.items.length > 0 && (
                    <ChevronDown className="w-3.5 h-3.5 text-charcoal-400 group-hover:rotate-180 transition-transform" />
                  )}
                </Link>

                {/* Submenu Dropdown */}
                {cat.items && cat.items.length > 0 && (
                  <div className="absolute top-full left-0 w-64 bg-white rounded-xl shadow-xl border border-cream-200 py-2 hidden group-hover:block z-50">
                    <div className="px-4 py-1.5 text-xs font-semibold text-charcoal-400 uppercase tracking-wider">
                      {cat.name} Kategorileri
                    </div>
                    {cat.items.map((sub: any) => (
                      <Link
                        key={sub.slug}
                        href={`/kategori/${sub.slug}`}
                        className="block px-4 py-2 text-sm text-charcoal-700 hover:bg-cream-50 hover:text-brand-600 transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                    <div className="border-t border-cream-100 mt-1 pt-1">
                      <Link
                        href={`/kategori/${cat.slug}`}
                        className="block px-4 py-1.5 text-xs font-bold text-brand-600 hover:underline"
                      >
                        Tümünü Gör ({cat.name}) →
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center space-x-4 text-xs font-semibold text-charcoal-600">
            <Link href="/iletisim" className="hover:text-brand-600 transition-colors">
              İletişim & Destek
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white shadow-2xl z-50 flex flex-col">
            <div className="p-4 border-b border-cream-200 flex items-center justify-between">
              <span className="font-heading font-black text-xl text-charcoal-900">Menü</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-charcoal-500 hover:text-charcoal-800 rounded-lg hover:bg-cream-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* User status in mobile */}
            <div className="p-4 bg-cream-50 border-b border-cream-200">
              {isLoggedIn ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-charcoal-900">{user?.name}</div>
                      <div className="text-xs text-charcoal-500">{user?.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Çıkış
                    </button>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link
                      href="/hesabim"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 text-center bg-white border border-cream-200 rounded-lg py-2 text-xs font-bold text-charcoal-700"
                    >
                      Hesabım
                    </Link>
                    {user?.role === 'SUPER_ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 text-center bg-purple-50 border border-purple-200 rounded-lg py-2 text-xs font-bold text-purple-700"
                      >
                        Yönetim Paneli
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/giris"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center bg-brand-500 text-white rounded-xl py-2.5 text-xs font-bold shadow-xs"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/kayit"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center bg-white border border-cream-200 text-charcoal-800 rounded-xl py-2.5 text-xs font-bold"
                  >
                    Kayıt Ol
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Drawer Quick Search */}
            <div className="p-4 pb-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    setMobileMenuOpen(false);
                    setShowSearchDropdown(false);
                    router.push(`/arama?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                className="relative"
              >
                <input
                  type="text"
                  placeholder="Ürün veya kategori ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-cream-50 border border-cream-200 rounded-xl py-2 pl-9 pr-4 text-xs text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:border-brand-400 focus:bg-white"
                />
                <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 px-3 font-medium text-charcoal-800 rounded-lg hover:bg-cream-50"
              >
                Anasayfa
              </Link>

              {menuCategories.map((cat) => (
                <div key={cat.slug} className="border-b border-cream-100 pb-1">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/kategori/${cat.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 py-2.5 px-3 font-semibold text-charcoal-800 hover:text-brand-600"
                    >
                      {cat.name}
                    </Link>
                    {cat.items && cat.items.length > 0 && (
                      <button
                        onClick={() => setExpandedMobileCategory(expandedMobileCategory === cat.slug ? null : cat.slug)}
                        className="p-2 text-charcoal-400"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedMobileCategory === cat.slug ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>

                  {expandedMobileCategory === cat.slug && cat.items && cat.items.length > 0 && (
                    <div className="pl-6 pb-2 space-y-1 bg-cream-50/50 rounded-lg py-1">
                      {cat.items.map((sub: any) => (
                        <Link
                          key={sub.slug}
                          href={`/kategori/${sub.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block py-1.5 px-3 text-sm text-charcoal-600 hover:text-brand-600"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <Link
                href="/siparis-takip"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 px-3 text-sm font-medium text-charcoal-700 hover:bg-cream-50"
              >
                Sipariş Takibi
              </Link>

              <Link
                href="/iletisim"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 px-3 text-sm font-medium text-charcoal-700 hover:bg-cream-50"
              >
                İletişim
              </Link>
            </div>

            <div className="p-4 border-t border-cream-200 bg-cream-50">
              <div className="text-xs text-charcoal-600 mb-2">Müşteri Destek Hattı:</div>
              <a href="tel:05389209216" className="font-bold text-brand-700 text-sm flex items-center gap-1.5">
                <Phone className="w-4 h-4" /> 0538 920 92 16
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
