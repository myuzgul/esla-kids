'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  RefreshCw, Play, Square, CheckCircle2, 
  AlertCircle, ShieldCheck, Database, ShoppingBag, Package, 
  FolderTree, Save, Check, Layers
} from 'lucide-react';

interface Props {
  currentStats: {
    products: number;
    variations: number;
    orders: number;
    categories: number;
  };
  initialConfig?: {
    url: string;
    consumerKey: string;
    consumerSecret: string;
  };
}

export function WooCommerceMigrationClient({ currentStats, initialConfig }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'api' | 'json'>('api');

  // API Config
  const [wcUrl, setWcUrl] = useState(initialConfig?.url || 'https://eslakids.com');
  const [consumerKey, setConsumerKey] = useState(initialConfig?.consumerKey || '');
  const [consumerSecret, setConsumerSecret] = useState(initialConfig?.consumerSecret || '');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  // Connection test
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; storeName?: string } | null>(null);

  // Migration Process
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progressText, setProgressText] = useState('Hazır.');
  const [progressPercent, setProgressPercent] = useState(0);
  const [stats, setStats] = useState({
    categories: 0,
    products: 0,
    variations: 0,
    orders: 0,
  });
  const [logs, setLogs] = useState<string[]>([
    'Esla Kids WooCommerce aktarım motoru hazır.',
    'Sayfalandırma (Pagination) ve status=any desteği aktif.',
  ]);

  const isRunningRef = useRef(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString('tr-TR')}] ${msg}`, ...prev.slice(0, 70)]);
  };

  const handleSaveConfig = async () => {
    if (!wcUrl || !consumerKey || !consumerSecret) {
      alert('Lütfen tüm API bilgilerini doldurunuz.');
      return;
    }
    setIsSavingConfig(true);
    setConfigSaveSuccess(false);
    try {
      const res = await fetch('/api/woocommerce/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          config: { url: wcUrl, consumerKey, consumerSecret },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigSaveSuccess(true);
        addLog('WooCommerce bağlantı bilgileri veritabanına kaydedildi.');
        setTimeout(() => setConfigSaveSuccess(false), 3000);
      } else {
        alert(data.error || 'Kayıt başarısız.');
      }
    } catch (e: any) {
      alert('Kayıt hatası: ' + e.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    if (!wcUrl || !consumerKey || !consumerSecret) {
      alert('Lütfen önce WooCommerce URL, Consumer Key ve Consumer Secret bilgilerini giriniz.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/woocommerce/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          config: { url: wcUrl, consumerKey, consumerSecret },
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        addLog(`Bağlantı başarılı: ${data.storeName || 'WooCommerce Mağazası'}`);
      } else {
        addLog(`Bağlantı hatası: ${data.message}`);
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
      addLog(`Hata: ${e.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Helper for Categories Loop
  const runCategories = async (): Promise<number> => {
    addLog('Kategoriler aktarılıyor...');
    let page = 1;
    let hasMore = true;
    let totalCat = 0;

    while (hasMore && isRunningRef.current) {
      setProgressText(`Kategoriler aktarılıyor (Sayfa ${page})...`);
      const res = await fetch('/api/woocommerce/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_categories',
          config: { url: wcUrl, consumerKey, consumerSecret },
          page,
          perPage: 100,
        }),
      });
      if (!res.ok) throw new Error('Kategori isteği başarısız oldu.');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Kategori aktarılamadı.');

      totalCat += data.count || 0;
      setStats((prev) => ({ ...prev, categories: totalCat }));
      addLog(`✓ Sayfa ${page}: ${data.count} kategori içe aktarıldı (Toplam: ${totalCat}${data.totalCount ? ' / ' + data.totalCount : ''}).`);
      
      hasMore = Boolean(data.hasMore);
      page++;
    }
    return totalCat;
  };

  // Helper for Products Loop
  const runProducts = async (): Promise<{ prods: number; vars: number }> => {
    addLog('Ürünler ve varyasyonlar aktarılıyor...');
    let page = 1;
    let hasMore = true;
    let totalP = 0;
    let totalV = 0;

    while (hasMore && isRunningRef.current) {
      setProgressText(`Ürünler aktarılıyor (Sayfa ${page})...`);
      const res = await fetch('/api/woocommerce/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_products',
          config: { url: wcUrl, consumerKey, consumerSecret },
          page,
          perPage: 100,
        }),
      });
      if (!res.ok) throw new Error('Ürün isteği başarısız oldu.');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ürün aktarılamadı.');

      totalP += data.count || 0;
      totalV += data.variationsCount || 0;
      setStats((prev) => ({ ...prev, products: totalP, variations: totalV }));
      addLog(`✓ Sayfa ${page}: ${data.count} ürün ve ${data.variationsCount} varyasyon aktarıldı (Toplam Ürün: ${totalP}${data.totalCount ? ' / ' + data.totalCount : ''}).`);
      
      hasMore = Boolean(data.hasMore);
      page++;
    }
    return { prods: totalP, vars: totalV };
  };

  // Helper for Orders Loop
  const runOrders = async (): Promise<number> => {
    addLog('Siparişler aktarılıyor...');
    let page = 1;
    let hasMore = true;
    let totalO = 0;

    while (hasMore && isRunningRef.current) {
      setProgressText(`Siparişler aktarılıyor (Sayfa ${page})...`);
      const res = await fetch('/api/woocommerce/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_orders',
          config: { url: wcUrl, consumerKey, consumerSecret },
          page,
          perPage: 100,
        }),
      });
      if (!res.ok) throw new Error('Sipariş isteği başarısız oldu.');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Sipariş aktarılamadı.');

      totalO += data.count || 0;
      setStats((prev) => ({ ...prev, orders: totalO }));
      addLog(`✓ Sayfa ${page}: ${data.count} sipariş aktarıldı (Toplam: ${totalO}${data.totalCount ? ' / ' + data.totalCount : ''}).`);
      
      hasMore = Boolean(data.hasMore);
      page++;
    }
    return totalO;
  };

  // Run Full Migration (Categories + Products + Orders)
  const startFullMigration = async () => {
    if (!wcUrl || !consumerKey || !consumerSecret) {
      alert('Lütfen önce API bağlantı bilgilerinizi eksiksiz giriniz.');
      return;
    }
    setIsRunning(true);
    isRunningRef.current = true;
    setCurrentStep('full');
    setProgressPercent(5);
    addLog('Tüm WooCommerce verilerinin (Kategori + Ürün + Sipariş) eksiksiz aktarımı başlatıldı...');

    try {
      // Step 1: Categories
      setProgressPercent(15);
      await runCategories();

      if (!isRunningRef.current) return;

      // Step 2: Products
      setProgressPercent(45);
      await runProducts();

      if (!isRunningRef.current) return;

      // Step 3: Orders
      setProgressPercent(80);
      await runOrders();

      setProgressPercent(100);
      setProgressText('Tüm aktarım başarıyla tamamlandı!');
      addLog('🎉 Tebrikler! Tüm kategoriler, ürünler ve siparişler eksiksiz aktarıldı.');
      router.refresh();
    } catch (err: any) {
      addLog(`[HATA] Aktarım sırasında hata oluştu: ${err.message}`);
    } finally {
      setIsRunning(false);
      isRunningRef.current = false;
      setCurrentStep('');
    }
  };

  // Run Only Products
  const startProductsOnly = async () => {
    if (!wcUrl || !consumerKey || !consumerSecret) {
      alert('Lütfen önce API bağlantı bilgilerinizi eksiksiz giriniz.');
      return;
    }
    setIsRunning(true);
    isRunningRef.current = true;
    setCurrentStep('products');
    setProgressPercent(10);
    addLog('Yalnızca Ürünler & Varyasyonlar aktarımı başlatıldı...');

    try {
      await runProducts();
      setProgressPercent(100);
      setProgressText('Ürün aktarımı başarıyla tamamlandı!');
      addLog('🎉 Tüm WooCommerce ürünleri ve varyasyonları güncellendi.');
      router.refresh();
    } catch (err: any) {
      addLog(`[HATA] Ürün aktarımı sırasında hata: ${err.message}`);
    } finally {
      setIsRunning(false);
      isRunningRef.current = false;
      setCurrentStep('');
    }
  };

  // Run Only Orders
  const startOrdersOnly = async () => {
    if (!wcUrl || !consumerKey || !consumerSecret) {
      alert('Lütfen önce API bağlantı bilgilerinizi eksiksiz giriniz.');
      return;
    }
    setIsRunning(true);
    isRunningRef.current = true;
    setCurrentStep('orders');
    setProgressPercent(10);
    addLog('Yalnızca Siparişler aktarımı başlatıldı...');

    try {
      await runOrders();
      setProgressPercent(100);
      setProgressText('Sipariş aktarımı başarıyla tamamlandı!');
      addLog('🎉 Tüm WooCommerce siparişleri eksiksiz aktarıldı.');
      router.refresh();
    } catch (err: any) {
      addLog(`[HATA] Sipariş aktarımı sırasında hata: ${err.message}`);
    } finally {
      setIsRunning(false);
      isRunningRef.current = false;
      setCurrentStep('');
    }
  };

  // Run Only Categories
  const startCategoriesOnly = async () => {
    if (!wcUrl || !consumerKey || !consumerSecret) {
      alert('Lütfen önce API bağlantı bilgilerinizi eksiksiz giriniz.');
      return;
    }
    setIsRunning(true);
    isRunningRef.current = true;
    setCurrentStep('categories');
    setProgressPercent(10);
    addLog('Yalnızca Kategoriler aktarımı başlatıldı...');

    try {
      await runCategories();
      setProgressPercent(100);
      setProgressText('Kategori aktarımı tamamlandı!');
      addLog('🎉 Tüm kategoriler başarıyla aktarıldı.');
      router.refresh();
    } catch (err: any) {
      addLog(`[HATA] Kategori aktarımı sırasında hata: ${err.message}`);
    } finally {
      setIsRunning(false);
      isRunningRef.current = false;
      setCurrentStep('');
    }
  };

  // Run Only Variations Sync & Attributes Repair
  const startVariationsSync = async () => {
    if (!wcUrl || !consumerKey || !consumerSecret) {
      alert('Lütfen önce API bağlantı bilgilerinizi eksiksiz giriniz.');
      return;
    }
    setIsRunning(true);
    isRunningRef.current = true;
    setCurrentStep('variations');
    setProgressPercent(20);
    setProgressText('Varyasyonlar ve Beden/Yaş özellikleri senkronize ediliyor...');
    addLog('Varyasyon senkronizasyonu ve beden/yaş eşleştirme başlatıldı...');

    try {
      const res = await fetch('/api/woocommerce/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_variations',
          config: { url: wcUrl, consumerKey, consumerSecret },
        }),
      });
      if (!res.ok) throw new Error('Varyasyon isteği başarısız oldu.');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Varyasyonlar senkronize edilemedi.');

      setProgressPercent(100);
      setProgressText('Varyasyonlar başarıyla senkronize edildi ve onarıldı!');
      addLog(`✓ ${data.totalProducts} ürün için ${data.syncedCount} varyasyon güncellendi.`);
      addLog(`✓ Yerel veritabanındaki ${data.fixedLocalCount} varyasyonun Beden/Yaş/Desen özellikleri onarıldı.`);
      router.refresh();
    } catch (err: any) {
      addLog(`[HATA] Varyasyon senkronizasyonu sırasında hata: ${err.message}`);
    } finally {
      setIsRunning(false);
      isRunningRef.current = false;
      setCurrentStep('');
    }
  };

  const stopMigration = () => {
    isRunningRef.current = false;
    setIsRunning(false);
    setCurrentStep('');
    addLog('Aktarım kullanıcı tarafından durduruldu.');
  };

  // Direct JSON import handler
  const [jsonInput, setJsonInput] = useState('');
  const [isJsonImporting, setIsJsonImporting] = useState(false);

  const handleJsonImport = async () => {
    if (!jsonInput.trim()) return;
    setIsJsonImporting(true);
    try {
      const parsed = JSON.parse(jsonInput);
      const res = await fetch('/api/woocommerce/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_json',
          jsonData: parsed,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addLog(`✓ JSON Veri Aktarımı Başarılı: ${data.message}`);
        alert('JSON verisi başarıyla içe aktarıldı!');
        router.refresh();
      } else {
        alert(data.error || 'İçe aktarma hatası');
      }
    } catch (e: any) {
      alert('Geçersiz JSON formatı: ' + e.message);
    } finally {
      setIsJsonImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-md">
            Veri Göçü (Migration)
          </span>
          <h1 className="font-heading font-black text-2xl text-slate-900">
            WooCommerce Kesintisiz Veri & Sipariş Aktarımı
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Mevcut WooCommerce sitenizdeki tüm siparişleri, ürünleri ve varyasyonları sayfalandırarak (100'erli paketlerle) eksiksiz şekilde aktarın.
        </p>
      </div>

      {/* Database Current Live Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-semibold">Aktif Ürünler</div>
          <div className="text-2xl font-black text-brand-600 mt-0.5">{currentStats.products}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-semibold">Aktif Varyasyonlar</div>
          <div className="text-2xl font-black text-indigo-600 mt-0.5">{currentStats.variations}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-semibold">Kategoriler</div>
          <div className="text-2xl font-black text-slate-800 mt-0.5">{currentStats.categories}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
          <div className="text-xs text-slate-500 uppercase font-semibold">Kayıtlı Siparişler</div>
          <div className="text-2xl font-black text-emerald-600 mt-0.5">{currentStats.orders}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'api'
              ? 'bg-brand-500 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          WooCommerce REST API ile Canlı Aktarım
        </button>
        <button
          onClick={() => setActiveTab('json')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'json'
              ? 'bg-brand-500 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          JSON / Dosya İçe Aktarma
        </button>
      </div>

      {activeTab === 'api' ? (
        <div className="space-y-6">
          {/* API Credentials */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="font-heading font-bold text-base text-slate-900">
                1. WooCommerce API Bağlantı Ayarları
              </h2>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {configSaveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{configSaveSuccess ? 'Kaydedildi' : 'Bilgileri Kaydet'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
                  WooCommerce Mağaza URL
                </label>
                <input
                  type="url"
                  placeholder="https://eslakids.com"
                  value={wcUrl}
                  onChange={(e) => setWcUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
                  Consumer Key
                </label>
                <input
                  type="text"
                  placeholder="ck_..."
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
                  Consumer Secret
                </label>
                <input
                  type="password"
                  placeholder="cs_..."
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Bağlanıyor...' : 'Bağlantıyı Test Et'}</span>
              </button>

              {testResult && (
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  <span>{testResult.message}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Triggers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="font-heading font-bold text-base text-slate-900 pb-2 border-b border-slate-100">
              2. Aktarım Seçenekleri
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Full Migration */}
              <button
                type="button"
                onClick={startFullMigration}
                disabled={isRunning}
                className="p-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl shadow-md transition-all flex flex-col justify-between gap-3 text-left disabled:opacity-50 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <Database className="w-6 h-6 text-white" />
                  <Play className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <div className="font-bold text-sm">Tümünü Sırayla Aktar</div>
                  <div className="text-[11px] text-white/80 mt-0.5">Kategori, Ürün ve Siparişlerin tüm sayfalarını çeker.</div>
                </div>
              </button>

              {/* Orders Only */}
              <button
                type="button"
                onClick={startOrdersOnly}
                disabled={isRunning}
                className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md transition-all flex flex-col justify-between gap-3 text-left disabled:opacity-50 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <ShoppingBag className="w-6 h-6 text-white" />
                  <Play className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <div className="font-bold text-sm">Yalnızca Siparişleri Aktar</div>
                  <div className="text-[11px] text-white/80 mt-0.5">Tüm geçmiş siparişleri sayfalandırarak eksiksiz alır.</div>
                </div>
              </button>

              {/* Products Only */}
              <button
                type="button"
                onClick={startProductsOnly}
                disabled={isRunning}
                className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md transition-all flex flex-col justify-between gap-3 text-left disabled:opacity-50 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <Package className="w-6 h-6 text-white" />
                  <Play className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <div className="font-bold text-sm">Yalnızca Ürünleri Aktar</div>
                  <div className="text-[11px] text-white/80 mt-0.5">Tüm ürünler ve varyasyonları günceller/aktarır.</div>
                </div>
              </button>

              {/* Categories Only */}
              <button
                type="button"
                onClick={startCategoriesOnly}
                disabled={isRunning}
                className="p-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl shadow-md transition-all flex flex-col justify-between gap-3 text-left disabled:opacity-50 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <FolderTree className="w-6 h-6 text-white" />
                  <Play className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <div className="font-bold text-sm">Yalnızca Kategorileri Aktar</div>
                  <div className="text-[11px] text-white/80 mt-0.5">Kategori ağacını ve hiyerarşiyi günceller.</div>
                </div>
              </button>

              {/* Variations Sync & Repair */}
              <button
                type="button"
                onClick={startVariationsSync}
                disabled={isRunning}
                className="p-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl shadow-md transition-all flex flex-col justify-between gap-3 text-left disabled:opacity-50 cursor-pointer group sm:col-span-2 lg:col-span-4 xl:col-span-1"
              >
                <div className="flex items-center justify-between">
                  <Layers className="w-6 h-6 text-white" />
                  <Play className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <div className="font-bold text-sm">Varyasyonları Eşle & Onar</div>
                  <div className="text-[11px] text-white/80 mt-0.5">Beden, Yaş, Desen ve Renk eşleştirmelerini eksiksiz tamamlar.</div>
                </div>
              </button>
            </div>

            {/* Stop Button */}
            {isRunning && (
              <div className="pt-2 flex items-center justify-between bg-rose-50 border border-rose-200 p-3 rounded-xl">
                <span className="text-xs font-semibold text-rose-800 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                  <span>Aktarım işlemi devam ediyor...</span>
                </span>
                <button
                  type="button"
                  onClick={stopMigration}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Aktarımı Durdur</span>
                </button>
              </div>
            )}
          </div>

          {/* Progress and Live Logs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>{progressText}</span>
              <span>%{progressPercent}</span>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Live Terminal Log */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">
                Canlı İşlem Kayıtları
              </label>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs h-64 overflow-y-auto space-y-1 scrollbar-thin">
                {logs.map((log, idx) => (
                  <div key={idx} className={log.includes('[HATA]') ? 'text-rose-400' : log.includes('✓') || log.includes('🎉') ? 'text-emerald-400' : 'text-slate-300'}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-heading font-bold text-base text-slate-900">
            JSON / Dosya İçe Aktarma
          </h2>
          <p className="text-xs text-slate-500">
            WooCommerce sitenizden aldığınız JSON yedeğini yapıştırarak doğrudan sisteme yükleyebilirsiniz.
          </p>
          <textarea
            rows={10}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{
  "categories": [...],
  "products": [...],
  "orders": [...]
}'
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs focus:outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={handleJsonImport}
            disabled={isJsonImporting}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            <span>{isJsonImporting ? 'İçe Aktarılıyor...' : 'JSON Verisini İçe Aktar'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
