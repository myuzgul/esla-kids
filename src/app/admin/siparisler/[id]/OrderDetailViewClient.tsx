'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  formatPrice, formatDate, ORDER_STATUS_MAP, formatVariationLabel, formatPaymentMethod 
} from '@/lib/utils';
import { TURKEY_CITIES, formatPhoneInput } from '@/lib/provinces';
import { 
  ArrowLeft, Printer, User, MapPin, CreditCard, Truck, 
  CheckCircle, Save, AlertCircle, Trash2, AlertTriangle, 
  Loader2, Zap, RefreshCw, PackageCheck, Landmark, Edit, 
  Phone, Mail, Minus, Plus, X, Check, RefreshCcw, Banknote,
  MessageCircle, Package, ExternalLink
} from 'lucide-react';

interface Props {
  initialOrder: any;
}

export function OrderDetailViewClient({ initialOrder }: Props) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);

  // Status & Carrier State
  const [status, setStatus] = useState(order.status || 'CONFIRMED');
  const [carrier, setCarrier] = useState(order.trackingCompany || 'Yurtiçi Kargo');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'PENDING');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  // Notes & Print State
  const rawNote = (order.internalNote || '').trim();
  const isStocadoLog = rawNote.startsWith('[Stocado');
  const userNoteInitial = isStocadoLog ? '' : rawNote;
  const [internalNote, setInternalNote] = useState(userNoteInitial);

  const [isPrinted, setIsPrinted] = useState(Boolean(order.isPrinted));
  const [printedAt, setPrintedAt] = useState(order.printedAt);
  const [isUpdatingPrint, setIsUpdatingPrint] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Navlungo Kargo State
  const [selectedCarrierId, setSelectedCarrierId] = useState<number>(13); // 13: Aras Kargo, 14: PTT Kargo
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [isTrackingStocado, setIsTrackingStocado] = useState(false);
  const [stocadoMsg, setStocadoMsg] = useState('');

  // 1. ADRES DÜZENLEME MODALI STATE
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  
  // Parse initial address
  let initialParsedAddr: any = {};
  try {
    initialParsedAddr = typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress)
      : (order.shippingAddress || {});
  } catch (e) {
    initialParsedAddr = {};
  }

  const [addressForm, setAddressForm] = useState({
    guestName: order.guestName || '',
    guestPhone: order.guestPhone || '',
    guestEmail: order.guestEmail || '',
    fullName: initialParsedAddr.fullName || order.guestName || '',
    phone: initialParsedAddr.phone || order.guestPhone || '',
    city: initialParsedAddr.city || 'Bursa',
    district: initialParsedAddr.district || '',
    address: initialParsedAddr.address || '',
    postalCode: initialParsedAddr.postalCode || '',
  });

  // 2. ÜRÜN İPTAL / ÇIKARMA MODALI STATE
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState(true);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // 3. ÜRÜN ADEDİ DEĞİŞTİRME STATE
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const isHavale = order.paymentMethod?.toUpperCase().includes('HAVALE') || 
                   order.paymentMethod?.toUpperCase().includes('EFT') || 
                   order.paymentMethod === 'BANK_TRANSFER';

  const isCod = (order.paymentMethod || '').toUpperCase().includes('COD') ||
                (order.paymentMethod || '').toUpperCase().includes('KAPIDA');

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 5000);
  };

  // Parsed current shipping address
  let currentShippingAddr: any = {};
  try {
    currentShippingAddr = typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress)
      : (order.shippingAddress || {});
  } catch (e) {
    currentShippingAddr = {};
  }

  // 4. WHATSAPP İLETİŞİM STATE & ŞABLONLAR
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [selectedWhatsappTemplate, setSelectedWhatsappTemplate] = useState<string>('CONFIRMATION');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  const customerName = currentShippingAddr.fullName || order.guestName || order.customer?.name || 'Değerli Müşterimiz';
  const customerPhone = currentShippingAddr.phone || order.guestPhone || order.customer?.phone || '';
  const orderNumber = order.orderNumber || '';
  const orderTotal = formatPrice(order.total);
  const activeCarrier = carrier || order.trackingCompany || 'Yurtiçi Kargo';
  const activeTracking = trackingNumber || order.trackingNumber || '';

  const getWhatsappTemplateText = (templateKey: string) => {
    switch (templateKey) {
      case 'CONFIRMATION':
        return `Merhaba Sayın ${customerName},\n\nEsla Kids'ten vermiş olduğunuz #${orderNumber} numaralı siparişiniz onaylandı ve özenle hazırlanıyor. Sipariş tutarınız: ${orderTotal}.\n\nBizi tercih ettiğiniz için teşekkür ederiz!`;
      case 'SHIPPED':
        return `Merhaba Sayın ${customerName},\n\nEsla Kids'ten #${orderNumber} numaralı siparişiniz ${activeCarrier} ile kargoya verilmiştir.${activeTracking ? `\nKargo Takip No: ${activeTracking}` : ''}\n\nSiparişinizi buradan takip edebilirsiniz:\nhttps://eslakids.com/siparis-takip?orderNumber=${orderNumber}\n\nGüzel ve mutlu günlerde kullanmanızı dileriz!`;
      case 'HAVALE':
        return `Merhaba Sayın ${customerName},\n\nEsla Kids'ten vermiş olduğunuz #${orderNumber} numaralı siparişinizin işleme alınabilmesi için ${orderTotal} tutarındaki havale/EFT ödemenizi beklemekteyiz.\n\nÖdemenizi tamamladıktan sonra siparişiniz aynı gün kargoya hazırlanacaktır. Banka hesap bilgilerimize sitemizden ulaşabilirsiniz.`;
      case 'DELIVERED':
        return `Merhaba Sayın ${customerName},\n\nEsla Kids'ten #${orderNumber} numaralı siparişinizin teslim edildiğini görüyoruz. Ürünlerimizden memnun kaldınız mı? Güzel ve mutlu günlerde kullanmanızı dileriz!`;
      case 'CUSTOM':
      default:
        return `Merhaba Sayın ${customerName},\n\nEsla Kids'ten #${orderNumber} numaralı siparişiniz hakkında bilgilendirme: `;
    }
  };

  const handleOpenWhatsappModal = (defaultTemplate = 'CONFIRMATION') => {
    const tpl = isHavale && defaultTemplate === 'CONFIRMATION' ? 'HAVALE' : defaultTemplate;
    setSelectedWhatsappTemplate(tpl);
    setWhatsappMessage(getWhatsappTemplateText(tpl));
    setShowWhatsappModal(true);
  };

  const selectWhatsappTemplate = (templateKey: string) => {
    setSelectedWhatsappTemplate(templateKey);
    setWhatsappMessage(getWhatsappTemplateText(templateKey));
  };

  const handleSendWhatsapp = () => {
    const rawPhone = customerPhone;
    let clean = rawPhone.replace(/\D/g, '');
    if (clean.startsWith('90')) {
      // zaten 90 ile başlıyor
    } else if (clean.startsWith('0')) {
      clean = '9' + clean;
    } else if (clean.length === 10) {
      clean = '90' + clean;
    }

    if (!clean) {
      alert('Müşteriye ait geçerli bir telefon numarası bulunamadı.');
      return;
    }

    const url = `https://wa.me/${clean}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
    setShowWhatsappModal(false);
  };

  // --- ADRES GÜNCELLEME İŞLEMİ ---
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);

    try {
      const res = await fetch('/api/admin/orders/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          guestName: addressForm.guestName,
          guestPhone: addressForm.guestPhone,
          guestEmail: addressForm.guestEmail,
          shippingAddress: {
            fullName: addressForm.fullName || addressForm.guestName,
            phone: addressForm.phone || addressForm.guestPhone,
            city: addressForm.city,
            district: addressForm.district,
            address: addressForm.address,
            postalCode: addressForm.postalCode,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Adres güncellenemedi.');
      }

      setOrder((prev: any) => ({
        ...prev,
        guestName: data.order.guestName,
        guestPhone: data.order.guestPhone,
        guestEmail: data.order.guestEmail,
        shippingAddress: data.order.shippingAddress,
      }));

      setShowAddressModal(false);
      showToast('✓ Teslimat adresi ve müşteri bilgileri güncellendi!');
      router.refresh();
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  // --- ÜRÜN İPTAL / SİPARİŞTEN ÇIKARMA İŞLEMİ ---
  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeletingItem(true);

    try {
      const res = await fetch('/api/admin/orders/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_item',
          orderId: order.id,
          itemId: itemToDelete.id,
          restoreStock: restoreStockOnDelete,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ürün iptal edilemedi.');
      }

      setOrder((prev: any) => ({
        ...prev,
        items: data.order.items,
        subtotal: data.order.subtotal,
        totalAmount: data.order.totalAmount,
      }));

      setItemToDelete(null);
      showToast(data.message || 'Ürün siparişten çıkarıldı ve toplam tutar güncellendi.');
      router.refresh();
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setIsDeletingItem(false);
    }
  };

  // --- ÜRÜN ADEDİ GÜNCELLEME İŞLEMİ ---
  const handleUpdateItemQuantity = async (item: any, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      // 0'a düşüyorsa iptal onay penceresini aç
      setItemToDelete(item);
      return;
    }

    setUpdatingItemId(item.id);
    try {
      const res = await fetch('/api/admin/orders/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_quantity',
          orderId: order.id,
          itemId: item.id,
          quantity: newQty,
          restoreStock: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ürün adedi güncellenemedi.');
      }

      setOrder((prev: any) => ({
        ...prev,
        items: data.order.items,
        subtotal: data.order.subtotal,
        totalAmount: data.order.totalAmount,
      }));

      showToast(`"${item.title}" adedi ${newQty} olarak güncellendi.`);
      router.refresh();
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setUpdatingItemId(null);
    }
  };

  // --- SİPARİŞ DURUMU & NOTLARI KAYDETME ---
  const handleSave = async (overrideStatus?: string, overridePrinted?: boolean) => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const targetStatus = overrideStatus || status;
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          status: targetStatus,
          paymentStatus,
          trackingCompany: carrier,
          trackingNumber: trackingNumber || undefined,
          internalNote,
          ...(overridePrinted !== undefined ? { isPrinted: overridePrinted } : {}),
        }),
      });

      if (!res.ok) throw new Error('Güncelleme başarısız');
      if (overrideStatus) setStatus(overrideStatus);
      if (overridePrinted !== undefined) {
        setIsPrinted(overridePrinted);
        setPrintedAt(overridePrinted ? new Date().toISOString() : null);
      }
      setSaveSuccess(true);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      console.error(e);
      alert('Sipariş güncellenirken hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- HAVALE GELDI TOGGLE ---
  const handleTogglePaymentStatus = async (targetPaymentStatus?: string) => {
    const nextPayment = targetPaymentStatus || (paymentStatus === 'PAID' ? 'PENDING' : 'PAID');
    setIsUpdatingPayment(true);
    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          paymentStatus: nextPayment,
          ...(nextPayment === 'PAID' && (status === 'NEW' || status === 'PENDING_PAYMENT') ? { status: 'CONFIRMED' } : {}),
        }),
      });
      if (res.ok) {
        setPaymentStatus(nextPayment);
        if (nextPayment === 'PAID' && (status === 'NEW' || status === 'PENDING_PAYMENT')) {
          setStatus('CONFIRMED');
        }
        setOrder((prev: any) => ({
          ...prev,
          paymentStatus: nextPayment,
          status: (nextPayment === 'PAID' && (prev.status === 'NEW' || prev.status === 'PENDING_PAYMENT')) ? 'CONFIRMED' : prev.status,
        }));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert('Ödeme durumu güncellenirken hata oluştu.');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // --- YAZDIRMA DURUMU TOGGLE ---
  const handleTogglePrintStatus = async () => {
    const nextVal = !isPrinted;
    setIsUpdatingPrint(true);
    try {
      const res = await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, isPrinted: nextVal }),
      });
      if (res.ok) {
        setIsPrinted(nextVal);
        setPrintedAt(nextVal ? new Date().toISOString() : null);
        setOrder((prev: any) => ({
          ...prev,
          isPrinted: nextVal,
          printedAt: nextVal ? new Date().toISOString() : null,
        }));
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingPrint(false);
    }
  };

  // --- FİŞ YAZDIR & PAKETE SEVK ET ---
  const handlePrintAndPack = async () => {
    window.open(`/admin/siparis-cikti?ids=${order.id}`, '_blank');
    await handleSave('PACKED', true);
  };

  // --- NAVLUNGO İLE KARGO OLUŞTUR (ARAS / PTT) ---
  const handleCreateShipment = async (carrierIdToUse?: number) => {
    const finalCarrierId = carrierIdToUse || selectedCarrierId;
    setIsCreatingShipment(true);
    setStocadoMsg('');

    try {
      const res = await fetch('/api/admin/cargo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_shipment',
          orderId: order.id,
          carrierId: finalCarrierId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kargo oluşturulamadı.');
      }

      setCarrier(data.carrierName || data.trackingCompany);
      setTrackingNumber(data.trackingNumber);
      setStatus('SHIPPED');
      setOrder((prev: any) => ({
        ...prev,
        trackingCompany: data.carrierName || data.trackingCompany,
        trackingNumber: data.trackingNumber,
        barcodeUrl: data.barcodeUrl,
        status: 'SHIPPED',
      }));
      setStocadoMsg(data.message || 'Kargo başarıyla oluşturuldu ve kargolandı durumuna alındı!');
      router.refresh();
    } catch (err: any) {
      alert('Kargo Hatası: ' + err.message);
    } finally {
      setIsCreatingShipment(false);
    }
  };

  // --- NAVLUNGO DURUM SORGULA ---
  const handleTrackShipment = async () => {
    setIsTrackingStocado(true);
    setStocadoMsg('');

    try {
      const res = await fetch('/api/admin/cargo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_shipment',
          orderId: order.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sorgulama başarısız.');

      setStocadoMsg(data.message || 'Kargo durumu başarıyla sorgulandı.');
      if (data.status) {
        setStatus(data.status);
        setOrder((prev: any) => ({ ...prev, status: data.status }));
      }
      router.refresh();
    } catch (err: any) {
      alert('Sorgulama Hatası: ' + err.message);
    } finally {
      setIsTrackingStocado(false);
    }
  };

  // --- SİPARİŞİ SİL ---
  const handleDeleteOrder = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Sipariş silinemedi.');

      router.push('/admin/siparisler');
    } catch (err: any) {
      alert(err.message || 'Silme işlemi sırasında bir hata oluştu.');
      setIsDeleting(false);
    }
  };

  const hasTracking = Boolean(trackingNumber || order.trackingNumber);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Bildirimi */}
      {notificationMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5 text-sm font-semibold">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{notificationMsg}</span>
          <button 
            type="button" 
            onClick={() => setNotificationMsg('')}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/siparisler"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading font-black text-2xl text-slate-900">
                Sipariş #{order.orderNumber}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ORDER_STATUS_MAP[status]?.bg || 'bg-slate-100'} ${ORDER_STATUS_MAP[status]?.color || 'text-slate-700'}`}>
                {ORDER_STATUS_MAP[status]?.label || status}
              </span>
              
              {/* Payment Status Badge */}
              {isHavale ? (
                paymentStatus === 'PAID' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span>✓</span>
                    <span>Havale Geldi</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Havale Bekliyor</span>
                  </span>
                )
              ) : isCod ? (
                paymentStatus === 'PAID' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span>✓</span>
                    <span>Onaylandı</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <span>Kapıda Nakit Ödeme</span>
                  </span>
                )
              ) : (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {paymentStatus === 'PAID' ? '✓ Ödendi' : 'Ödeme Bekliyor'}
                </span>
              )}

              {/* Print Status Badge */}
              {isPrinted ? (
                <span
                  title={printedAt ? `Yazdırılma: ${formatDate(printedAt)}` : 'Yazdırıldı'}
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                >
                  <span>✓</span>
                  <span>Yazdırıldı</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                  <span>✕</span>
                  <span>Yazdırılmadı</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sipariş Tarihi: {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={`/admin/siparis-cikti?ids=${order.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto justify-center bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors text-center"
          >
            <Printer className="w-4 h-4" />
            <span>Fotoğraflı & QR Fiş Yazdır</span>
          </a>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SOL SÜTUN: Sipariş Kalemleri, Toplamlar, Müşteri & Teslimat Bilgileri */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Sipariş Edilen Ürünler Kartı */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                <span>Sipariş Edilen Ürünler</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
                  {order.items?.length || 0}
                </span>
              </h2>
              <span className="text-xs text-slate-400">
                Ürün iptali veya adet düzenlemesi yapabilirsiniz
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {order.items?.map((item: any) => {
                const itemImg = item.variation?.image || item.image;
                const displayVar = formatVariationLabel(item.variationName || item.variation?.attributes);
                const isItemUpdating = updatingItemId === item.id;

                return (
                  <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/50 rounded-xl p-2 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-14 h-18 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 relative">
                        {itemImg ? (
                          <img src={itemImg} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-bold">Görsel Yok</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-mono font-bold text-slate-400">
                          SKU: {item.sku || '-'}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-2">
                          {item.title}
                        </h4>
                        {displayVar && (
                          <div className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded mt-1 inline-block">
                            {displayVar}
                          </div>
                        )}
                        <div className="text-xs text-slate-500 mt-1">
                          Birim: <span className="font-bold text-slate-700">{formatPrice(item.price)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Adet Kontrolü, Tutar ve İptal Butonu */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-17 sm:pl-0">
                      {/* Adet Azalt / Artır */}
                      <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-2xs">
                        <button
                          type="button"
                          disabled={isItemUpdating}
                          onClick={() => handleUpdateItemQuantity(item, -1)}
                          title="Adet Azalt / Çıkar"
                          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-l-xl transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-black text-xs text-slate-900">
                          {isItemUpdating ? <Loader2 className="w-3 h-3 animate-spin mx-auto text-brand-600" /> : item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isItemUpdating}
                          onClick={() => handleUpdateItemQuantity(item, 1)}
                          title="Adet Artır"
                          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-r-xl transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Toplam Fiyat */}
                      <div className="text-right min-w-[70px]">
                        <div className="text-sm font-black text-slate-900">
                          {formatPrice(item.total)}
                        </div>
                      </div>

                      {/* İptal Et / Kalemi Çıkar Butonu */}
                      <button
                        type="button"
                        onClick={() => setItemToDelete(item)}
                        title="Bu Ürünü Siparişten İptal Et / Çıkar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Toplamlar Tablosu */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Ara Toplam:</span>
                  <span className="font-semibold">{formatPrice(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>İndirim:</span>
                    <span>-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Kargo Ücreti:</span>
                  <span>{order.shippingFee === 0 ? 'Ücretsiz' : formatPrice(order.shippingFee)}</span>
                </div>
                {order.codFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Kapıda Ödeme Bedeli:</span>
                    <span>+{formatPrice(order.codFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Genel Toplam:</span>
                  <span className="text-brand-600">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Müşteri & Teslimat Adresi Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Müşteri Bilgileri */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 relative">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 pb-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-500" />
                  <span>Müşteri Bilgileri</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="text-brand-600 hover:text-brand-700 flex items-center gap-1 font-bold lowercase text-xs cursor-pointer hover:underline"
                >
                  <Edit className="w-3 h-3" />
                  <span>düzenle</span>
                </button>
              </div>
              
              <div className="font-bold text-slate-900 text-sm">{order.guestName || '-'}</div>
              <div className="text-xs text-slate-600">
                Telefon:{' '}
                {customerPhone ? (
                  <div className="inline-flex items-center gap-1.5 flex-wrap">
                    <a
                      href={`tel:${customerPhone}`}
                      className="text-brand-600 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <span>{customerPhone}</span>
                      <span className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-semibold">Ara</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsappModal('CONFIRMATION')}
                      className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="WhatsApp ile Mesaj Gönder"
                    >
                      <MessageCircle className="w-3 h-3 fill-emerald-600" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                ) : (
                  '-'
                )}
              </div>
              <div className="text-xs text-slate-600">
                E-posta:{' '}
                {order.guestEmail ? (
                  <a href={`mailto:${order.guestEmail}`} className="text-brand-600 hover:underline">
                    {order.guestEmail}
                  </a>
                ) : (
                  '-'
                )}
              </div>
              {order.customerNote && (
                <div className="mt-3 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <strong>Müşteri Notu:</strong> {order.customerNote}
                </div>
              )}
            </div>

            {/* Teslimat Adresi */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 relative">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 pb-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-powder-500" />
                  <span>Teslimat Adresi</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="text-brand-600 hover:text-brand-700 flex items-center gap-1 font-bold lowercase text-xs cursor-pointer hover:underline"
                >
                  <Edit className="w-3 h-3" />
                  <span>adresi düzenle</span>
                </button>
              </div>

              <div className="text-xs text-slate-800 leading-relaxed">
                <div className="font-bold text-slate-900 mb-0.5">
                  {currentShippingAddr.fullName || order.guestName}
                </div>
                {currentShippingAddr.phone && (
                  <div className="text-slate-500 mb-1">
                    📞 {currentShippingAddr.phone}
                  </div>
                )}
                <div className="text-slate-700">
                  {currentShippingAddr.address || 'Adres detayı girilmemiş.'}
                </div>
                <div className="mt-1 font-bold text-slate-900">
                  {currentShippingAddr.district} / {currentShippingAddr.city}
                  {currentShippingAddr.postalCode ? ` (${currentShippingAddr.postalCode})` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ SÜTUN: Havale Geldi Butonu, Stocado Entegrasyonu, Durum Formu */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* 1. Havale / EFT Onay Kartı */}
          {isHavale && (
            <div className={`rounded-2xl border-2 p-4 sm:p-5 space-y-3.5 shadow-sm transition-all ${
              paymentStatus === 'PAID'
                ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border-emerald-300'
                : 'bg-gradient-to-br from-amber-50 via-white to-amber-100/50 border-amber-300 ring-2 ring-amber-300/30'
            }`}>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Landmark className={`w-5 h-5 ${paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <div>
                    <h3 className="font-heading font-black text-xs sm:text-sm text-slate-900 uppercase">
                      Havale / EFT Ödeme Durumu
                    </h3>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                }`}>
                  {paymentStatus === 'PAID' ? '✓ Ödendi' : 'Ödeme Bekliyor'}
                </span>
              </div>

              {paymentStatus === 'PAID' ? (
                <div className="space-y-2.5">
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold shadow-2xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Havale ödemesi hesaba geçti olarak onaylandı.</span>
                  </div>
                  <button
                    type="button"
                    disabled={isUpdatingPayment}
                    onClick={() => handleTogglePaymentStatus('PENDING')}
                    className="w-full py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                  >
                    {isUpdatingPayment ? 'Güncelleniyor...' : '✕ Tekrar "Bekliyor" Olarak İşaretle'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-amber-950 font-medium leading-relaxed">
                    Müşteriden banka hesabınıza havale ulaştığında aşağıdaki butona basarak ödemeyi onaylayabilirsiniz:
                  </p>
                  <button
                    type="button"
                    disabled={isUpdatingPayment}
                    onClick={() => handleTogglePaymentStatus('PAID')}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isUpdatingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>✓ Havale Geldi (Ödendi Yap)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 1.1 Kapıda Nakit Ödeme Onay Kartı */}
          {isCod && (
            <div className={`rounded-2xl border-2 p-4 sm:p-5 space-y-3.5 shadow-sm transition-all ${
              paymentStatus === 'PAID'
                ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border-emerald-300'
                : 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 border-amber-300 ring-1 ring-amber-300/40'
            }`}>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Banknote className={`w-5 h-5 ${paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-700'}`} />
                  <div>
                    <h3 className="font-heading font-black text-xs sm:text-sm text-slate-900 uppercase">
                      Kapıda Nakit Ödeme Durumu
                    </h3>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {paymentStatus === 'PAID' ? '✓ Onaylandı' : 'Kapıda Nakit Ödeme'}
                </span>
              </div>

              {paymentStatus === 'PAID' ? (
                <div className="space-y-2.5">
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold shadow-2xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Kapıda nakit ödeme onaylandı.</span>
                  </div>
                  <button
                    type="button"
                    disabled={isUpdatingPayment}
                    onClick={() => handleTogglePaymentStatus('PENDING')}
                    className="w-full py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                  >
                    {isUpdatingPayment ? 'Güncelleniyor...' : '✕ Tekrar "Kapıda Nakit Ödeme" Olarak İşaretle'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Kapıda nakit ödeme siparişini teyit ettiyseniz onaylayabilirsiniz:
                  </p>
                  <button
                    type="button"
                    disabled={isUpdatingPayment}
                    onClick={() => handleTogglePaymentStatus('PAID')}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isUpdatingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>✓ Onayla</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Kargo Entegrasyon Kartı (Navlungo Aktif Entegrasyon) */}
          {(() => {
            const effectiveTracking = trackingNumber || order.trackingNumber || '';
            const isLegacyStocadoShipment = Boolean(
              effectiveTracking && rawNote.includes('[Stocado')
            );

            return (
              <div className={`rounded-2xl border-2 shadow-sm p-5 space-y-4 ${
                isLegacyStocadoShipment
                  ? 'bg-gradient-to-br from-amber-50/70 via-white to-slate-50 border-amber-200'
                  : 'bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/80 border-indigo-200/90'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-heading font-black text-sm text-slate-900">
                      Navlungo Kargo Entegrasyonu
                    </h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    isLegacyStocadoShipment
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : hasTracking
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {isLegacyStocadoShipment ? '📦 Eski PTT Kaydı' : hasTracking ? '🚀 Aktif (Navlungo)' : 'Aras & PTT'}
                  </span>
                </div>

                {/* Bilgilendirme Rozeti (Adres & Kapıda Ödeme) */}
                <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100 text-xs space-y-1 text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Teslimat İlçesi / İli:</span>
                    <strong className="text-indigo-950">{currentShippingAddr.district || '-'} / {currentShippingAddr.city || '-'}</strong>
                  </div>
                  {isCod && (
                    <div className="flex justify-between items-center pt-1 border-t border-indigo-100/60">
                      <span className="text-amber-800 font-bold">Kapıda Tahsil Edilecek:</span>
                      <strong className="text-amber-900 font-black">{formatPrice(order.totalAmount)}</strong>
                    </div>
                  )}
                </div>

                {stocadoMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{stocadoMsg}</span>
                  </div>
                )}

                {hasTracking ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1">
                      <div className="text-[11px] text-slate-400 font-bold uppercase flex items-center justify-between">
                        <span>Kargo Bilgileri</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {isLegacyStocadoShipment ? 'Eski PTT Kaydı (Stocado)' : 'Navlungo Kaydı'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded font-black bg-indigo-50 text-indigo-700">
                          {carrier || order.trackingCompany || 'Kargo'}
                        </span>
                        <span className="font-mono text-indigo-700 font-black text-sm">
                          {effectiveTracking}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`/api/admin/cargo/barcode?orderNumber=${encodeURIComponent(order.orderNumber)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Kargo Barkodu Yazdır</span>
                      </a>

                      {isLegacyStocadoShipment ? (
                        <a
                          href={`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${encodeURIComponent(effectiveTracking)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-amber-300 text-amber-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>PTT Takip Aç</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled={isTrackingStocado}
                          onClick={handleTrackShipment}
                          className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isTrackingStocado ? 'animate-spin' : ''}`} />
                          <span>{isTrackingStocado ? 'Sorgulanıyor...' : 'Durum Sorgula'}</span>
                        </button>
                      )}
                    </div>

                    {isLegacyStocadoShipment && (
                      <div className="text-[11px] text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                        ℹ️ Bu gönderi eski PTT (Stocado) kaydı içermektedir. Dilerseniz aşağıdan <strong>Navlungo</strong> ile Aras veya PTT kargosu olarak yeniden kargo kesebilirsiniz.
                      </div>
                    )}

                    {/* Farklı kargo ile yeniden kesme */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                        {isLegacyStocadoShipment ? 'Navlungo ile Kargo Kes:' : 'Farklı Kargo ile Yeniden Kes:'}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isCreatingShipment}
                          onClick={() => handleCreateShipment(13)}
                          className="py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>📦 Aras Kargo</span>
                        </button>
                        <button
                          type="button"
                          disabled={isCreatingShipment}
                          onClick={() => handleCreateShipment(14)}
                          className="py-2 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>📮 PTT Kargo</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase mb-1.5 block">
                        Kargo Firmasını Seçin:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCarrierId(13)}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            selectedCarrierId === 13
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-sm">📦</span>
                          <span>Aras Kargo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCarrierId(14)}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            selectedCarrierId === 14
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-sm">📮</span>
                          <span>PTT Kargo</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Sipariş bilgileri Navlungo üzerinden seçtiğiniz firmaya iletilecek, kargo takip numarası ve resmi PDF barkodu anında oluşturulacaktır.
                    </p>

                    <button
                      type="button"
                      disabled={isCreatingShipment}
                      onClick={() => handleCreateShipment()}
                      className={`w-full py-3 px-4 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                        selectedCarrierId === 13
                          ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                          : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25'
                      }`}
                    >
                      {isCreatingShipment ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Kargo Kesiliyor...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>
                            {selectedCarrierId === 13 ? 'Aras Kargo' : 'PTT Kargo'} ile Kargo Kes & Fiş Al
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Hızlı Buton: Yazdır & Pakete Sevk Et */}
                <div className="pt-2 border-t border-indigo-100">
                  <button
                    type="button"
                    onClick={handlePrintAndPack}
                    className="w-full py-2.5 px-3 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <PackageCheck className="w-4 h-4 text-purple-600" />
                    <span>Fiş Yazdır & Pakete Sevk Et</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 3. Standart Sipariş Durumu Formu */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-heading font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
              Sipariş Durumu & Manuel Düzenleme
            </h3>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Sipariş başarıyla güncellendi!</span>
              </div>
            )}

            {/* Status Dropdown */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                Sipariş Durumu
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-500"
              >
                <option value="CONFIRMED">Sipariş Onaylandı</option>
                <option value="PACKED">Pakete Sevk Edildi</option>
                <option value="SHIPPED">Kargolandı</option>
                <option value="DELIVERED">Teslim Edildi</option>
                <option value="CANCELLED">İptal Edildi</option>
                <option value="REFUNDED">İade Edildi</option>
              </select>
            </div>

            {/* Payment Status Dropdown */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                Ödeme Durumu
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-500"
              >
                <option value="PAID">✓ Ödendi / Tahsil Edildi</option>
                <option value="PENDING">{isCod ? 'Kapıda Nakit Ödeme' : isHavale ? 'Havale Bekliyor' : 'Ödeme Bekliyor'}</option>
                <option value="FAILED">Ödeme Başarısız</option>
              </select>
            </div>

            {/* Yazdırma Durumu Kutusu */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Yazdırma Durumu
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {isPrinted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Yazdırıldı</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>Yazdırılmadı</span>
                    </span>
                  )}
                  {printedAt && (
                    <span className="text-[11px] text-slate-400">
                      ({new Date(printedAt).toLocaleString('tr-TR')})
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={isUpdatingPrint}
                onClick={handleTogglePrintStatus}
                className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center justify-center flex items-center gap-1.5 ${
                  isPrinted
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
                }`}
              >
                {isUpdatingPrint ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isPrinted ? (
                  '✕ Yazdırılmadı Yap'
                ) : (
                  '✓ Yazdırıldı Olarak İşaretle'
                )}
              </button>
            </div>

            {/* Carrier Info */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                  Kargo Firması
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium"
                >
                  <option value="Yurtiçi Kargo">Yurtiçi Kargo</option>
                  <option value="Aras Kargo">Aras Kargo</option>
                  <option value="MNG Kargo">MNG Kargo</option>
                  <option value="Sürat Kargo">Sürat Kargo</option>
                  <option value="PTT Kargo">PTT Kargo</option>
                  <option value="HepsiJET">HepsiJET</option>
                  <option value="Sendeo">Sendeo</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                  Kargo Takip Numarası
                </label>
                <input
                  type="text"
                  placeholder="Takip numarası..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Dahili Yönetici Notu */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
                Dahili Yönetici Notu (Müşteri Görmez)
              </label>
              <textarea
                rows={2}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Sipariş hazırlığı, paketleme veya kargo ile ilgili dahili not..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave()}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
            </button>

            {/* WhatsApp ile Mesaj Gönder */}
            <button
              type="button"
              onClick={() => handleOpenWhatsappModal('CONFIRMATION')}
              className="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>WhatsApp ile Mesaj Gönder</span>
            </button>

            {/* Sipariş Silme */}
            <div className="pt-3 border-t border-slate-100">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Bu Siparişi Kalıcı Olarak Sil</span>
                </button>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>Siparişi silmek istediğinize emin misiniz?</span>
                  </div>
                  <p className="text-[11px] text-rose-600">
                    Bu sipariş ve tüm kayıtları veritabanından kalıcı olarak silinecektir.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDeleteOrder}
                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      {isDeleting ? 'Siliniyor...' : 'Evet, Kalıcı Olarak Sil'}
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. MÜŞTERİ & TESLİMAT ADRESİ DÜZENLEME MODALI */}
      {/* ======================================================== */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-600" />
                <h3 className="font-heading font-black text-base text-slate-900">
                  Teslimat Adresi & Müşteri Bilgilerini Düzenle
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-4 sm:p-6 space-y-4">
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  Burada yapacağınız adres ve telefon değişiklikleri kaydedilir ve kargo sistemine güncel olarak aktarılır.
                </span>
              </div>

              {/* Müşteri Ad Soyad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Alıcı Adı Soyadı *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value, guestName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-brand-500"
                    placeholder="Ad Soyad"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Telefon Numarası *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    required
                    value={addressForm.phone}
                    onChange={(e) => {
                      const formatted = formatPhoneInput(e.target.value);
                      setAddressForm({ ...addressForm, phone: formatted, guestPhone: formatted });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-semibold focus:outline-none focus:border-brand-500 tracking-wider"
                    placeholder="05541981196"
                  />
                </div>
              </div>

              {/* E-posta */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  E-posta Adresi
                </label>
                <input
                  type="email"
                  value={addressForm.guestEmail}
                  onChange={(e) => setAddressForm({ ...addressForm, guestEmail: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-brand-500"
                  placeholder="musteri@ornek.com"
                />
              </div>

              {/* İl & İlçe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Teslimat İli *
                  </label>
                  <select
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:border-brand-500"
                  >
                    {TURKEY_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Teslimat İlçesi *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.district}
                    onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-brand-500"
                    placeholder="Örn: Nilüfer, Kadıköy"
                  />
                </div>
              </div>

              {/* Açık Adres */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  Açık Teslimat Adresi (Cadde, Sokak, No, Daire) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-brand-500"
                  placeholder="Mahalle, cadde, sokak, bina ve daire numarası..."
                />
              </div>

              {/* Posta Kodu */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  Posta Kodu
                </label>
                <input
                  type="text"
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-brand-500"
                  placeholder="Örn: 16140"
                />
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingAddress}
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isSavingAddress ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Adresi Kaydet & Güncelle</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ÜRÜN İPTAL / SİPARİŞTEN ÇIKARMA ONAY MODALI */}
      {/* ======================================================== */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <h3 className="font-heading font-black text-sm uppercase">
                  Ürünü Siparişten İptal Et / Çıkar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Aşağıdaki ürün bu siparişten tamamen çıkarılacaktır. Sipariş ara toplamı ve genel toplam tutarı otomatik olarak düşülecektir:
              </p>

              {/* Ürün Özeti */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-12 h-14 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                  {(itemToDelete.variation?.image || itemToDelete.image) ? (
                    <img 
                      src={itemToDelete.variation?.image || itemToDelete.image} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-slate-900 line-clamp-1">{itemToDelete.title}</div>
                  <div className="text-[11px] text-brand-700 font-semibold mt-0.5">
                    {formatVariationLabel(itemToDelete.variationName || itemToDelete.variation?.attributes)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {itemToDelete.quantity} Adet × {formatPrice(itemToDelete.price)} = <strong className="text-slate-900">{formatPrice(itemToDelete.total)}</strong>
                  </div>
                </div>
              </div>

              {/* Stoğa İade Seçeneği */}
              <label className="flex items-center gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreStockOnDelete}
                  onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-emerald-900">
                  Bu ürünün stoğunu otomatik olarak stoğa iade et (+{itemToDelete.quantity} adet eklensin)
                </span>
              </label>

              {isCod && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <strong>Kapıda Ödeme Uyarısı:</strong> Sipariş kapıda ödemeli olduğundan, ürün çıkarıldığında kargo sistemine bildirilecek tahsilat tutarı otomatik olarak <strong>{formatPrice(Math.max(0, order.totalAmount - itemToDelete.total))}</strong> değerine inecektir.
                </div>
              )}

              {/* Butonlar */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingItem}
                  onClick={handleConfirmDeleteItem}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isDeletingItem ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>İptal Ediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Evet, Ürünü İptal Et & Çıkar</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isDeletingItem}
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 4. WHATSAPP İLE MESAJ GÖNDERME MODALI */}
      {showWhatsappModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#128C7E] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-white">
                    WhatsApp ile Müşteriye Mesaj Gönder
                  </h3>
                  <div className="text-xs text-white/80 font-medium flex items-center gap-2 mt-0.5">
                    <span>{customerName}</span>
                    <span>•</span>
                    <span className="font-mono">{customerPhone || 'Telefon Bulunamadı'}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsappModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Şablon Seçiciler */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 block">
                  Hızlı Şablon Seçin
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => selectWhatsappTemplate('CONFIRMATION')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col gap-1 ${
                      selectedWhatsappTemplate === 'CONFIRMATION'
                        ? 'border-[#25D366] bg-emerald-50/70 text-emerald-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <span className="text-base">📦</span>
                    <span>Sipariş Onayı</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectWhatsappTemplate('SHIPPED')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col gap-1 ${
                      selectedWhatsappTemplate === 'SHIPPED'
                        ? 'border-[#25D366] bg-emerald-50/70 text-emerald-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <span className="text-base">🚚</span>
                    <span>Kargo Takip</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectWhatsappTemplate('HAVALE')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col gap-1 ${
                      selectedWhatsappTemplate === 'HAVALE'
                        ? 'border-[#25D366] bg-emerald-50/70 text-emerald-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <span className="text-base">💳</span>
                    <span>Havale Hatırlat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectWhatsappTemplate('CUSTOM')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col gap-1 ${
                      selectedWhatsappTemplate === 'CUSTOM'
                        ? 'border-[#25D366] bg-emerald-50/70 text-emerald-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <span className="text-base">✍️</span>
                    <span>Özel Mesaj</span>
                  </button>
                </div>
              </div>

              {/* Mesaj İçeriği */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Mesaj İçeriği (Göndermeden önce düzenleyebilirsiniz)
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {whatsappMessage.length} karakter
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="WhatsApp mesajınızı buraya yazın..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]"
                />
              </div>

              {/* Bilgilendirme Kutusu */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-[11px] text-emerald-800 flex items-start gap-2">
                <span className="text-base leading-none">💡</span>
                <p>
                  <strong>{customerPhone}</strong> numarasına mesaj gönderilecektir. Telefonunuzda doğrudan WhatsApp açılır, bilgisayarınızda ise <strong>WhatsApp Web</strong> sekmesi başlatılır. Numara rehberinizde kayıtlı olmak zorunda değildir.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowWhatsappModal(false)}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Vazgeç
              </button>

              <button
                type="button"
                disabled={!whatsappMessage.trim() || !customerPhone}
                onClick={handleSendWhatsapp}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>WhatsApp'ta Aç ve Gönder</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
