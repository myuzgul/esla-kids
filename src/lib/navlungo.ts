import { prisma } from './prisma';
import { getSettings, SiteSettings } from './settings';

export interface NavlungoShipmentResult {
  success: boolean;
  trackingNumber: string;
  trackingUrl?: string;
  barcodeUrl?: string;
  carrierName: string;
  message: string;
}

export const NAVLUNGO_CARRIERS: Record<number, { id: number; name: string; shortName: string; color: string; badgeBg: string }> = {
  13: { id: 13, name: 'Aras Kargo', shortName: 'araskargo', color: '#0d47a1', badgeBg: '#e3f2fd' },
  14: { id: 14, name: 'PTT Kargo', shortName: 'pttkargo', color: '#f57f17', badgeBg: '#fffde7' },
  18: { id: 18, name: 'Yurtiçi Kargo', shortName: 'yurticikargo', color: '#b71c1c', badgeBg: '#ffebee' },
  10: { id: 10, name: 'HepsiJet', shortName: 'hepsijet', color: '#e65100', badgeBg: '#fff3e0' },
  9: { id: 9, name: 'Sürat Kargo', shortName: 'suratkargo', color: '#bf360c', badgeBg: '#fbe9e7' },
  11: { id: 11, name: 'Kolay Gelsin', shortName: 'kolaygelsin', color: '#1b5e20', badgeBg: '#e8f5e9' },
  1: { id: 1, name: 'Otomatik Taşıyıcı', shortName: 'auto', color: '#455a64', badgeBg: '#eceff1' },
};

// Bellek içi token önbelleği
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Telefon numarasını Navlungo'nun beklediği formata (+90 5XX XXX XX XX) dönüştürür.
 */
export function formatNavlungoPhone(rawPhone?: string): string {
  if (!rawPhone) return '+90 555 000 00 00';
  const digits = rawPhone.replace(/\D/g, '');
  let localDigits = digits;
  if (localDigits.startsWith('90')) {
    localDigits = localDigits.substring(2);
  }
  if (localDigits.startsWith('0')) {
    localDigits = localDigits.substring(1);
  }
  if (localDigits.length === 10) {
    return `+90 ${localDigits.substring(0, 3)} ${localDigits.substring(3, 6)} ${localDigits.substring(6, 8)} ${localDigits.substring(8, 10)}`;
  }
  return `+90 ${localDigits}`;
}

/**
 * Navlungo API için geçerli JWT Token döndürür (8 saat geçerli).
 */
export async function getNavlungoToken(settings?: SiteSettings): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const s = settings || (await getSettings());
  const username = s.navlungo_username?.trim() || 'eAYkAnMtnxerITZ';
  const password = s.navlungo_password?.trim() || 'yETzPX[B0K?bL*s.3Wp.';
  const baseUrl = s.navlungo_test_mode
    ? 'https://domestic-api-qa.navlungo.com/v2.1'
    : 'https://domestic-api.navlungo.com/v2.1';

  const res = await fetch(`${baseUrl}/auth/api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Navlungo API girişi başarısız oldu.');
  }

  const data = await res.json();
  if (!data.status || !data.data?.access_token) {
    throw new Error(data.message || 'Navlungo token alınamadı.');
  }

  cachedToken = data.data.access_token;
  // 8 saat (28800 saniye) geçerli, 7 saat sonra yenilenmesini sağla
  tokenExpiresAt = now + 7 * 60 * 60 * 1000;
  return cachedToken;
}

/**
 * Sipariş için Navlungo üzerinden kargo gönderisi oluşturur.
 * @param order Prisma order kaydı
 * @param selectedCarrierId Kullanıcının seçtiği kargo: 13 (Aras), 14 (PTT) veya 18 (Yurtiçi)
 */
export async function createNavlungoShipment(
  order: any,
  selectedCarrierId?: number
): Promise<NavlungoShipmentResult> {
  const settings = await getSettings();

  const carrierId = Number(selectedCarrierId || settings.navlungo_default_carrier || 13);
  const carrierInfo = NAVLUNGO_CARRIERS[carrierId] || NAVLUNGO_CARRIERS[13];
  const senderAddressId = Number(settings.navlungo_sender_address_id || 111945);

  const baseUrl = settings.navlungo_test_mode
    ? 'https://domestic-api-qa.navlungo.com/v2.1'
    : 'https://domestic-api.navlungo.com/v2.1';

  // 1. Alıcı adres bilgilerini ayrıştır
  let shippingAddr: any = {};
  try {
    shippingAddr = typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress)
      : (order.shippingAddress || {});
  } catch (e) {
    shippingAddr = {};
  }

  const recipientName = (
    shippingAddr.fullName ||
    `${shippingAddr.firstName || ''} ${shippingAddr.lastName || ''}`.trim() ||
    order.customerName ||
    'Değerli Müşteri'
  ).trim();

  const recipientPhone = formatNavlungoPhone(
    shippingAddr.phone || shippingAddr.phoneNumber || order.customerPhone
  );

  const recipientAddress = (
    shippingAddr.address1 ||
    shippingAddr.address ||
    shippingAddr.fullAddress ||
    'Adres Belirtilmemiş'
  ).trim();

  const recipientCity = (
    shippingAddr.city ||
    shippingAddr.province ||
    'İstanbul'
  ).trim();

  const recipientDistrict = (
    shippingAddr.district ||
    shippingAddr.state ||
    shippingAddr.town ||
    'Merkez'
  ).trim();

  const recipientEmail = (
    shippingAddr.email ||
    order.customerEmail ||
    'musteri@eslakids.com'
  ).trim();

  const postalCode = (shippingAddr.postalCode || shippingAddr.zip || '').trim();

  // 2. Kapıda Ödeme kontrolü
  const paymentMethodUpper = (order.paymentMethod || '').toUpperCase();
  const isCod =
    paymentMethodUpper === 'COD' ||
    paymentMethodUpper.includes('KAPIDA') ||
    paymentMethodUpper.includes('CASH');

  const codAmount = Number((order as any).totalAmount || (order as any).total || 0);

  // 3. Desi hesabı
  let totalDesi = 1.5;
  if (Array.isArray(order.items) && order.items.length > 0) {
    const calculated = order.items.reduce((sum: number, it: any) => sum + (it.quantity || 1) * 0.4, 0);
    totalDesi = Math.max(1.0, Math.min(30.0, Number(calculated.toFixed(1))));
  }

  // 4. API Token al
  const token = await getNavlungoToken(settings);

  // 5. Gönderi payload'ı hazırla
  const payload = {
    platform: 'EslaKids',
    posts: [
      {
        reference_id: order.orderNumber,
        carrier_id: carrierId,
        post_type: 2, // Standart Teslimat
        cod_payment_type: isCod ? 1 : '', // 1: Kapıda Nakit
        sender: {
          addressId: senderAddressId,
        },
        recipient: {
          name: recipientName,
          phone: recipientPhone,
          email: recipientEmail,
          address: recipientAddress,
          country: 'tr',
          city: recipientCity,
          district: recipientDistrict,
          post_code: postalCode,
        },
        post: {
          desi: totalDesi,
          package_count: 1,
          price: isCod ? codAmount : '',
          note: `Sipariş #${order.orderNumber} (${carrierInfo.name})`,
        },
        barcode_format: 'pdf-A5',
      },
    ],
  };

  const res = await fetch(`${baseUrl}/post/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-localization': 'tr',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.status === false) {
    let errMsg = data.message || data.error || 'Navlungo gönderi oluştururken hata verdi.';
    if (typeof data.error === 'object') {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(data.error)) {
        if (Array.isArray(v)) parts.push(`${k}: ${v.join(', ')}`);
        else parts.push(`${k}: ${v}`);
      }
      if (parts.length > 0) errMsg = parts.join(' | ');
    }
    throw new Error(errMsg);
  }

  // Başarılı yanıt
  const postNumber = data.post_number || data.reference_id || order.orderNumber;
  const trackingUrl = data.tracking_url || `https://domestic-track.navlungo.com/check/${postNumber}`;
  const barcodeUrl = data.barcode_url || `https://domestic-barcode.navlungo.com/${postNumber}.pdf`;

  // Veritabanında siparişi güncelle
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'SHIPPED',
      trackingNumber: postNumber,
      trackingCompany: carrierInfo.name,
      internalNote: order.internalNote
        ? `${order.internalNote}\n[Navlungo] ${carrierInfo.name} takip no: ${postNumber}`
        : `[Navlungo] ${carrierInfo.name} takip no: ${postNumber}`,
    },
  });

  // Sipariş işlem günlüğü oluştur
  try {
    await prisma.activityLog.create({
      data: {
        action: 'ORDER_SHIPPED_NAVLUNGO',
        entity: 'Order',
        entityId: order.id,
        performedBy: 'Yönetici',
        details: `Navlungo ile kargo gönderisi oluşturuldu: ${postNumber} (${carrierInfo.name})`,
      },
    });
  } catch (e) {
    console.warn('[Navlungo] ActivityLog error:', e);
  }

  return {
    success: true,
    trackingNumber: postNumber,
    trackingUrl,
    barcodeUrl,
    carrierName: carrierInfo.name,
    message: `${carrierInfo.name} kaydı Navlungo üzerinden başarıyla oluşturuldu! Takip No: ${postNumber}`,
  };
}

/**
 * Siparişin kargo durumunu Navlungo üzerinden sorgular.
 */
export async function queryNavlungoStatus(
  order: any
): Promise<{ status: string; message: string; details?: any }> {
  const settings = await getSettings();
  const token = await getNavlungoToken(settings);
  const baseUrl = settings.navlungo_test_mode
    ? 'https://domestic-api-qa.navlungo.com/v2.1'
    : 'https://domestic-api.navlungo.com/v2.1';

  const lookupKey = order.trackingNumber || order.orderNumber;
  if (!lookupKey) {
    return { status: order.status, message: 'Takip numarası veya sipariş no bulunamadı.' };
  }

  const res = await fetch(`${baseUrl}/post/check/${encodeURIComponent(lookupKey)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-localization': 'tr',
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === false) {
    return {
      status: order.status,
      message: data.error || 'Navlungo gönderi durumu sorgulanamadı.',
    };
  }

  const postData = data.data || {};
  const statusCode = postData.status?.status_code;
  const statusName = postData.status?.status_name || '';

  // Navlungo Statü Kodları:
  // 1: Teslim Alınacak, 16: Teslim Alındı, 17: Transfer Aşamasında, 4: Dağıtıma Çıktı,
  // 2: Teslim Edildi, 10: İptal, 7: İade Edilecek, 9: İade Edildi
  let newOrderStatus = order.status;
  if (statusCode === 2) {
    newOrderStatus = 'DELIVERED';
  } else if (statusCode === 10) {
    newOrderStatus = 'CANCELLED';
  } else if ([1, 4, 16, 17, 18].includes(statusCode)) {
    newOrderStatus = 'SHIPPED';
  }

  if (newOrderStatus !== order.status) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: newOrderStatus },
    });
  }

  return {
    status: newOrderStatus,
    message: `Navlungo Durumu: ${statusName || 'Kayıtlı'} (Statü Kodu: ${statusCode})`,
    details: postData,
  };
}
