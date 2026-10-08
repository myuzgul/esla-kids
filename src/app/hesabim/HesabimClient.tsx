'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, CustomerAddress } from '@/context/AuthContext';
import { formatPrice, formatDate, ORDER_STATUS_MAP, formatVariationLabel } from '@/lib/utils';
import { 
  User, Package, MapPin, KeyRound, LogOut, Plus, Trash2, 
  Edit2, Check, AlertCircle, Truck, ExternalLink, ShieldCheck, 
  ChevronRight, Phone, Mail, ShoppingBag, Loader2, Home, Building
} from 'lucide-react';

const TURKISH_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
  'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
  'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta',
  'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
  'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla',
  'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
  'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
  'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman',
  'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce'
];

export function HesabimClient() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile' | 'security'>('orders');

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMsg, setSecurityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Address state
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [addressForm, setAddressForm] = useState({
    title: 'Ev',
    fullName: '',
    phone: '',
    city: 'Bursa',
    district: '',
    addressDetail: '',
    postalCode: '',
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      const res = await fetch('/api/customer/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch (e) {}
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Profil güncellenemedi.');
      setProfileMsg({ type: 'success', text: 'Profil bilgileriniz başarıyla güncellendi.' });
      refreshUser();
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg(null);

    if (newPassword !== confirmPassword) {
      setSecurityMsg({ type: 'error', text: 'Yeni şifreleriniz birbiriyle eşleşmiyor.' });
      return;
    }

    setSavingSecurity(true);
    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Şifre değiştirilemedi.');
      setSecurityMsg({ type: 'success', text: 'Şifreniz başarıyla değiştirildi.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityMsg({ type: 'error', text: err.message });
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleOpenAddressModal = (addr?: CustomerAddress) => {
    if (addr) {
      setEditingAddress(addr);
      setAddressForm({
        title: addr.title || 'Ev',
        fullName: addr.fullName || '',
        phone: addr.phone || '',
        city: addr.city || 'Bursa',
        district: addr.district || '',
        addressDetail: addr.addressDetail || '',
        postalCode: addr.postalCode || '',
        isDefault: addr.isDefault || false,
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        title: 'Ev',
        fullName: user?.name || '',
        phone: user?.phone || '',
        city: 'Bursa',
        district: '',
        addressDetail: '',
        postalCode: '',
        isDefault: addresses.length === 0,
      });
    }
    setAddressError('');
    setAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError('');
    setSavingAddress(true);

    try {
      const method = editingAddress ? 'PUT' : 'POST';
      const bodyPayload = editingAddress ? { ...addressForm, id: editingAddress.id } : addressForm;

      const res = await fetch('/api/customer/addresses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Adres kaydedilemedi.');

      setAddressModalOpen(false);
      loadAddresses();
      refreshUser();
    } catch (err: any) {
      setAddressError(err.message);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/customer/addresses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAddresses();
        refreshUser();
      }
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  // Guest view if not logged in
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto border border-brand-200 shadow-inner">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-heading font-black text-2xl text-charcoal-900">
            Hesabınıza Giriş Yapın
          </h1>
          <p className="text-xs text-charcoal-500">
            Siparişlerinizi görüntülemek, kayıtlı adreslerinizi yönetmek ve avantajlardan yararlanmak için giriş yapın.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/giris?returnUrl=/hesabim"
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs py-3.5 rounded-xl shadow-md transition-colors"
          >
            Giriş Yap
          </Link>
          <Link
            href="/kayit?returnUrl=/hesabim"
            className="flex-1 bg-cream-100 hover:bg-cream-200 text-charcoal-800 font-bold text-xs py-3.5 rounded-xl transition-colors"
          >
            Yeni Hesap Oluştur
          </Link>
        </div>

        <div className="pt-6 border-t border-cream-200">
          <Link
            href="/siparis-takip"
            className="text-xs font-semibold text-brand-600 hover:underline flex items-center justify-center gap-1"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Üye olmadan sipariş sorgulamak için tıklayın</span>
          </Link>
        </div>
      </div>
    );
  }

  const orders = user.orders || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-charcoal-400">
        <Link href="/" className="hover:text-brand-600">Anasayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-charcoal-800 font-semibold">Hesabım</span>
      </nav>

      {/* Account Hero Bar */}
      <div className="bg-white rounded-3xl border border-cream-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-400 to-brand-300 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {user.name.substring(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-black text-xl sm:text-2xl text-charcoal-900">
                {user.name}
              </h1>
              {user.role === 'SUPER_ADMIN' && (
                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Yönetici
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-500 mt-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-charcoal-400" />
                {user.email}
              </span>
              {user.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-charcoal-400" />
                  {user.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user.role === 'SUPER_ADMIN' && (
            <Link
              href="/admin"
              className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
            >
              Yönetim Paneli
            </Link>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-4 py-2.5 rounded-xl border border-rose-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Tabs & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-cream-200 p-2 shadow-sm space-y-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-charcoal-700 hover:bg-cream-50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Package className="w-4 h-4" />
              <span>Siparişlerim</span>
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
              activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-cream-100 text-charcoal-600'
            }`}>
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'addresses'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-charcoal-700 hover:bg-cream-50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4" />
              <span>Adres Defterim</span>
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
              activeTab === 'addresses' ? 'bg-white/20 text-white' : 'bg-cream-100 text-charcoal-600'
            }`}>
              {addresses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-charcoal-700 hover:bg-cream-50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Hesap Bilgilerim</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'security'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-charcoal-700 hover:bg-cream-50'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Şifre Değiştirme</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-cream-200">
                <h2 className="font-heading font-bold text-lg text-charcoal-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-600" />
                  <span>Geçmiş Siparişlerim ({orders.length})</span>
                </h2>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-cream-200 p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-cream-50 text-charcoal-300 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-charcoal-800">Henüz bir siparişiniz bulunmuyor</h3>
                    <p className="text-xs text-charcoal-500 mt-1">Bebeğiniz ve çocuğunuz için en şık takımları keşfedin</p>
                  </div>
                  <Link
                    href="/"
                    className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors"
                  >
                    Alışverişe Başla
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord: any) => (
                    <div key={ord.id} className="bg-white rounded-2xl border border-cream-200 p-5 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cream-100 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-brand-700 text-sm">{ord.orderNumber}</span>
                          <span className="text-charcoal-400">{formatDate(ord.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            ORDER_STATUS_MAP[ord.status]?.bg || 'bg-cream-100'
                          } ${ORDER_STATUS_MAP[ord.status]?.color || 'text-charcoal-700'}`}>
                            {ORDER_STATUS_MAP[ord.status]?.label || ord.status}
                          </span>

                          {ord.trackingNumber && (
                            <Link
                              href={`/siparis-takip?orderNumber=${ord.orderNumber}&phone=${encodeURIComponent(ord.guestPhone || user.phone || '')}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-1 rounded-md border border-brand-200"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Kargo Takip</span>
                            </Link>
                          )}
                        </div>
                      </div>

                      <div className="divide-y divide-cream-100">
                        {ord.items?.map((it: any) => {
                          const itemImg = it.variation?.image || it.image;
                          const displayVar = formatVariationLabel(it.variationName || it.variation?.attributes);

                          return (
                            <div key={it.id} className="py-2.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                {itemImg && (
                                  <img src={itemImg} alt="" className="w-12 h-14 object-cover rounded-lg bg-cream-50 border border-cream-200" />
                                )}
                                <div>
                                  <div className="font-bold text-charcoal-900">{it.title}</div>
                                  {displayVar && (
                                    <div className="text-[11px] text-brand-700 font-semibold mt-0.5">{displayVar}</div>
                                  )}
                                  <div className="text-[11px] text-charcoal-400 mt-0.5">
                                    {it.quantity} Adet × {formatPrice(it.price)}
                                  </div>
                                </div>
                              </div>
                              <div className="font-bold text-brand-600 text-sm">
                                {formatPrice(it.total)}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cream-100 text-xs">
                        <span className="text-charcoal-500">
                          Ödeme Türü: <strong className="text-charcoal-800">{ord.paymentMethod}</strong>
                        </span>
                        <div className="text-right">
                          <span className="text-xs text-charcoal-500 mr-2">Genel Toplam:</span>
                          <span className="font-heading font-black text-base text-charcoal-900">
                            {formatPrice(ord.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-cream-200">
                <h2 className="font-heading font-bold text-lg text-charcoal-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-600" />
                  <span>Kayıtlı Adreslerim ({addresses.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => handleOpenAddressModal()}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Adres Ekle</span>
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-cream-200 p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-cream-50 text-charcoal-300 flex items-center justify-center mx-auto">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-charcoal-800">Henüz kayıtlı adresiniz yok</h3>
                    <p className="text-xs text-charcoal-500 mt-1">Siparişlerinizde hızlı işlem yapmak için teslimat adresi ekleyin</p>
                  </div>
                  <button
                    onClick={() => handleOpenAddressModal()}
                    className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors"
                  >
                    Yeni Adres Ekle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 relative ${
                        addr.isDefault ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-cream-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-charcoal-900 flex items-center gap-1">
                            {addr.title.toLowerCase().includes('iş') ? <Building className="w-3.5 h-3.5 text-charcoal-500" /> : <Home className="w-3.5 h-3.5 text-charcoal-500" />}
                            {addr.title}
                          </span>
                          {addr.isDefault && (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                              Varsayılan Teslimat
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenAddressModal(addr)}
                            className="p-1.5 text-charcoal-400 hover:text-brand-600 rounded-lg"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 text-charcoal-400 hover:text-rose-600 rounded-lg"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-charcoal-600">
                        <div className="font-bold text-charcoal-800">{addr.fullName}</div>
                        <div className="text-charcoal-500">{addr.phone}</div>
                        <p className="line-clamp-2 leading-relaxed text-charcoal-700">{addr.addressDetail}</p>
                        <div className="font-semibold text-charcoal-800 pt-1">
                          {addr.district} / {addr.city} {addr.postalCode ? `(${addr.postalCode})` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-cream-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="font-heading font-bold text-lg text-charcoal-900">
                  Hesap & İletişim Bilgileri
                </h2>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Ad soyad ve telefon bilgilerinizi güncelleyin
                </p>
              </div>

              {profileMsg && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}>
                  {profileMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                <div>
                  <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1.5">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-cream-50 border border-cream-200 rounded-xl px-4 py-2.5 text-xs text-charcoal-900 focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1.5">
                    E-Posta Adresi (Değiştirilemez)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1.5">
                    Telefon Numarası
                  </label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full bg-cream-50 border border-cream-200 rounded-xl px-4 py-2.5 text-xs text-charcoal-900 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Değişiklikleri Kaydet</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-2xl border border-cream-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="font-heading font-bold text-lg text-charcoal-900">
                  Güvenlik & Şifre Değiştirme
                </h2>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Hesap güvenliğiniz için şifrenizi düzenli aralıklarla güncelleyin
                </p>
              </div>

              {securityMsg && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  securityMsg.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}>
                  {securityMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  <span>{securityMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1.5">
                    Mevcut Şifreniz
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-cream-50 border border-cream-200 rounded-xl px-4 py-2.5 text-xs text-charcoal-900 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1.5">
                    Yeni Şifre (En az 6 karakter)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-cream-50 border border-cream-200 rounded-xl px-4 py-2.5 text-xs text-charcoal-900 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1.5">
                    Yeni Şifre Tekrarı
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-cream-50 border border-cream-200 rounded-xl px-4 py-2.5 text-xs text-charcoal-900 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingSecurity}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {savingSecurity && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Şifremi Güncelle</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Address Create / Edit Modal */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-cream-200 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cream-100">
              <h3 className="font-heading font-black text-lg text-charcoal-900">
                {editingAddress ? 'Adresi Düzenle' : 'Yeni Teslimat Adresi Ekle'}
              </h3>
              <button
                type="button"
                onClick={() => setAddressModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {addressError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{addressError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-charcoal-700 block mb-1">Adres Başlığı</label>
                  <input
                    type="text"
                    required
                    placeholder="Ev, İş, vb."
                    value={addressForm.title}
                    onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-charcoal-700 block mb-1">Teslim Alacak Kişi *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-charcoal-700 block mb-1">Telefon Numarası *</label>
                <input
                  type="tel"
                  required
                  placeholder="05XX XXX XX XX"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  className="w-full bg-cream-50 border border-cream-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-charcoal-700 block mb-1">İl *</label>
                  <select
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    {TURKISH_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-charcoal-700 block mb-1">İlçe *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Nilüfer, Osmangazi"
                    value={addressForm.district}
                    onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-charcoal-700 block mb-1">Açık Adres (Mahalle, Cadde, Sokak, No, Daire) *</label>
                <textarea
                  rows={3}
                  required
                  value={addressForm.addressDetail}
                  onChange={(e) => setAddressForm({ ...addressForm, addressDetail: e.target.value })}
                  className="w-full bg-cream-50 border border-cream-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-charcoal-700 block mb-1">Posta Kodu (Opsiyonel)</label>
                <input
                  type="text"
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                  className="w-full bg-cream-50 border border-cream-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="font-bold text-charcoal-800">Bu adresi varsayılan teslimat adresi yap</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-cream-100">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="px-4 py-2 font-bold text-charcoal-500 hover:text-charcoal-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {savingAddress && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAddress ? 'Güncelle' : 'Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
