import { getSettings, SiteSettings } from './settings';
import { prisma } from './prisma';
import { getProvinceStateId, normalizePhone10Digits } from './provinces';

export interface StocadoShipmentResult {
  success: boolean;
  trackingNumber: string;
  trackingCompany: string;
  trackingUrl?: string;
  barcodeUrl?: string;
  shipmentId?: string;
  processNumber?: string;
  isTest?: boolean;
  message?: string;
  raw?: any;
}

export const STOCADO_CARRIERS: Record<string, { id: string; label: string; trackingPrefix: string }> = {
  'ptt-kargo': { id: 'ptt-kargo', label: 'PTT Kargo', trackingPrefix: 'KP' },
  'yurtici-kargo': { id: 'yurtici-kargo', label: 'Yurtiçi Kargo', trackingPrefix: 'YK' },
  'surat-kargo': { id: 'surat-kargo', label: 'Sürat Kargo', trackingPrefix: 'SK' },
  'hepsijet': { id: 'hepsijet', label: 'HepsiJET', trackingPrefix: 'HJ' },
  'ups': { id: 'ups', label: 'UPS Kargo', trackingPrefix: '1Z' },
  'kolay-gelsin': { id: 'kolay-gelsin', label: 'Kolay Gelsin', trackingPrefix: 'KG' },
};

// In-memory cache for JWT Token and location data
let cachedJwtToken: string | null = null;
let tokenExpiresAt = 0;

let cachedLocations: any[] | null = null;
let lastLocationsFetch = 0;

/**
 * Stocado API için geçerli JWT Token döndürür.
 * Eğer doğrudan token girilmişse onu kullanır, yoksa email ve şifre ile otomatik login olup token alır.
 */
export async function getStocadoToken(settings: SiteSettings): Promise<string | null> {
  // 1. Manuel girilmiş geçerli token varsa
  if (settings.stocado_api_token && settings.stocado_api_token.trim().length > 10) {
    return settings.stocado_api_token.trim();
  }

  // 2. Önbellekteki aktif oturum token'ı
  const now = Date.now();
  if (cachedJwtToken && now < tokenExpiresAt) {
    return cachedJwtToken;
  }

  // 3. Email & Şifre ile otomatik /auth/login çağrısı
  const email = settings.stocado_email?.trim() || 'info@eslakids.com';
  const password = settings.stocado_password?.trim() || 'Tpass147852*';

  if (!email || !password) return null;

  try {
    const res = await fetch('https://api.kargopaneli.com/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        cachedJwtToken = data.token;
        tokenExpiresAt = now + 1000 * 60 * 60 * 24; // 24 saat geçerli kabul et
        return cachedJwtToken;
      }
    } else {
      const err = await res.json().catch(() => ({}));
      console.warn('[Stocado Auth] Giriş başarısız:', err);
    }
  } catch (e) {
    console.error('[Stocado Auth] İstek hatası:', e);
  }

  return null;
}

/**
 * Stocado API üzerinden Türkiye il ve ilçe verilerini çeker ve önbelleğe alır.
 */
export async function getStocadoLocations(apiToken?: string): Promise<any[]> {
  if (!apiToken) return [];
  const now = Date.now();
  if (cachedLocations && now - lastLocationsFetch < 1000 * 60 * 60) {
    return cachedLocations;
  }

  try {
    const res = await fetch('https://api.kargopaneli.com/v1/locations/countries', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const tr = data.find((c: any) => c.id === 'TR');
        if (tr && Array.isArray(tr.cities)) {
          cachedLocations = tr.cities;
          lastLocationsFetch = now;
          return cachedLocations;
        }
      }
    }
  } catch (err) {
    console.warn('[Stocado] Error fetching locations:', err);
  }
  return [];
}

/**
 * İl ve ilçe ismine göre Stocado district_id eşleştirmesi yapar.
 */
async function resolveDistrictId(cityId: number, districtName?: string, apiToken?: string): Promise<number> {
  if (!districtName || !apiToken) return 1;

  try {
    const cities = await getStocadoLocations(apiToken);
    const city = cities.find((c: any) => Number(c.id) === cityId);
    if (city && Array.isArray(city.districts) && city.districts.length > 0) {
      const cleanTarget = districtName.trim().toLowerCase();
      const match = city.districts.find((d: any) =>
        d.name && d.name.toLowerCase().includes(cleanTarget)
      );
      if (match && match.id) {
        return Number(match.id);
      }
      return Number(city.districts[0].id || 1);
    }
  } catch (e) {
    console.warn('[Stocado] resolveDistrictId fallback:', e);
  }

  return 1;
}

/**
 * Sipariş için Stocado üzerinden kargo kaydı oluşturur.
 * PTT Kargo, kapıda ödeme ve termal barkod süreçlerini yönetir.
 */
export async function createStocadoShipment(order: any): Promise<StocadoShipmentResult> {
  const settings = await getSettings(true);

  let shippingAddr: any = {};
  try {
    shippingAddr = typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress)
      : (order.shippingAddress || {});
  } catch (e) {
    shippingAddr = {};
  }

  const carrierKey = settings.stocado_default_carrier || 'ptt-kargo';
  const carrierInfo = STOCADO_CARRIERS[carrierKey] || STOCADO_CARRIERS['ptt-kargo'];

  const accountId = settings.stocado_account_id?.trim() || '01m417ezdwz1xg2tpakyyyhkxn';
  const localId = settings.stocado_sender_address_id?.trim() || '01m49eq12zqyj302g3s8mf256x';
  const paymentMethodUpper = (order.paymentMethod || '').toUpperCase();
  const isCod = paymentMethodUpper === 'COD' || paymentMethodUpper.includes('KAPIDA') || paymentMethodUpper.includes('CASH');
  const codAmount = Number(order.totalAmount || order.total || 0);

  const apiToken = await getStocadoToken(settings);
  const isTestMode = Boolean(settings.stocado_test_mode) || !apiToken;

  // 1. CANLI STOCADO API MODU
  if (!isTestMode && apiToken && accountId && localId) {
    try {
      const buyerCityId = getProvinceStateId(shippingAddr.city);
      const buyerDistrictId = await resolveDistrictId(buyerCityId, shippingAddr.district, apiToken);
      const buyerPhone10 = normalizePhone10Digits(order.guestPhone || shippingAddr.phone);

      const recipientName = (order.guestName || shippingAddr.fullName || 'Değerli Müşterimiz').trim();
      const detailsAddress = (shippingAddr.address || 'Adres bilgisi girilmedi').trim();

      // Adım 1: Alıcı Müşteri Adresi Oluştur (POST /accounts/{accountID}/addresses - Type 1)
      const recipientAddressPayload = {
        title: recipientName,
        name: recipientName,
        email: order.guestEmail || 'musteri@eslakids.com',
        phone: buyerPhone10,
        country_id: 'TR',
        city_id: buyerCityId,
        district_id: buyerDistrictId,
        details: detailsAddress,
        postal_code: shippingAddr.postalCode || '16000',
        type: 1, // 1: Müşteri Adresi
      };

      const addrRes = await fetch(`https://api.kargopaneli.com/v1/accounts/${accountId}/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(recipientAddressPayload),
      });

      const addrData = await addrRes.json();
      const foreignId = addrData.data?.id;

      if (!addrRes.ok || !foreignId) {
        throw new Error(addrData.message || 'Müşteri teslimat adresi Stocado sistemine kaydedilemedi.');
      }

      // Adım 2: Kargo Gönderisini Oluştur (POST /cargos)
      const cargoPayload: any = {
        account_id: accountId,
        cargo_company_id: carrierInfo.id,
        local_id: localId,
        foreign_id: foreignId,
        direction: 1, // 1: Gönder
        status: 1, // 1: Aktif
        order_number: order.orderNumber,
        source: 'api',
        description: `Esla Kids Sipariş ${order.orderNumber}`,
        package: {
          desi: 1,
          weight: 0.5,
          length: 20,
          width: 15,
          height: 5,
        },
        pay_on_delivery: isCod,
        pay_on_delivery_amount: isCod ? codAmount : undefined,
        pay_on_delivery_type: isCod ? 1 : undefined, // 1: Nakit Tahsilat
      };

      const res = await fetch('https://api.kargopaneli.com/v1/cargos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(cargoPayload),
      });

      const resJson = await res.json();

      if (res.ok && resJson.data) {
        const cargoData = resJson.data;
        const finalTrackingNumber = cargoData.out_tracking_code || cargoData.process_number || `PTT-${order.orderNumber}`;
        const finalProcessNumber = cargoData.process_number || cargoData.id;
        const trackingUrl = cargoData.out_tracking_link || (
          carrierInfo.id === 'ptt-kargo'
            ? `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${finalTrackingNumber}`
            : ''
        );
        const barcodeUrl = `/api/admin/stocado/barcode?orderNumber=${encodeURIComponent(order.orderNumber)}`;

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'SHIPPED',
            trackingCompany: carrierInfo.label,
            trackingNumber: finalTrackingNumber,
          },
        });

        await prisma.activityLog.create({
          data: {
            action: 'ORDER_SHIPPED_STOCADO',
            entity: 'Order',
            entityId: order.id,
            performedBy: 'Yönetici',
            details: `Stocado ile kargo gönderisi oluşturuldu: ${finalTrackingNumber} (${carrierInfo.label})`,
          },
        });

        return {
          success: true,
          trackingNumber: finalTrackingNumber,
          trackingCompany: carrierInfo.label,
          trackingUrl,
          barcodeUrl,
          shipmentId: cargoData.id,
          processNumber: finalProcessNumber,
          message: `${carrierInfo.label} kaydı Stocado üzerinden başarıyla oluşturuldu! Takip No: ${finalTrackingNumber}`,
          raw: resJson,
        };
      } else {
        const errorMsg = resJson.message || resJson.messages?.map((m: any) => m.text).join(', ') || 'Kargo oluşturulamadı.';
        if (errorMsg.includes('Yetersiz bakiye')) {
          throw new Error('Stocado (Kargo Paneli) hesabınızda bakiye yetersiz! Lütfen api.kargopaneli.com panelinizden bakiye yükleyin veya Test Modunda çalışın.');
        }
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('[Stocado] Exception occurred:', err);
      throw new Error(err.message || 'Stocado servisine bağlanırken bir hata oluştu.');
    }
  }

  // 2. TEST / SİMÜLASYON MODU (Bakiye veya API anahtarı olmadığında süreci kesintiye uğratmaz)
  const randNum = Math.floor(1000000000 + Math.random() * 9000000000);
  const testTrackingNumber = `${carrierInfo.trackingPrefix}${randNum}TR`;
  const testProcessNumber = `STC${Date.now().toString().slice(-8)}`;
  const barcodeUrl = `/api/admin/stocado/barcode?orderNumber=${encodeURIComponent(order.orderNumber)}`;
  const trackingUrl = carrierInfo.id === 'ptt-kargo'
    ? `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${testTrackingNumber}`
    : `https://eslakids.com/siparis-takip?search=${testTrackingNumber}`;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'SHIPPED',
      trackingCompany: carrierInfo.label,
      trackingNumber: testTrackingNumber,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: 'ORDER_SHIPPED_STOCADO_TEST',
      entity: 'Order',
      entityId: order.id,
      performedBy: 'Yönetici',
      details: `Stocado simülasyonu ile kargo takip ve barkodu oluşturuldu: ${testTrackingNumber}`,
    },
  });

  return {
    success: true,
    isTest: true,
    trackingNumber: testTrackingNumber,
    trackingCompany: carrierInfo.label,
    trackingUrl,
    barcodeUrl,
    processNumber: testProcessNumber,
    message: `${carrierInfo.label} barkodu ve takip kodu (${testTrackingNumber}) oluşturuldu. (Canlı gönderim için Stocado panelinize bakiye yükleyebilirsiniz).`,
  };
}

/**
 * Stocado API üzerinden gönderinin durumunu sorgular.
 */
export async function queryStocadoStatus(order: any): Promise<{ status: string; message: string; details?: any }> {
  const settings = await getSettings(true);
  const apiToken = await getStocadoToken(settings);
  const searchCode = order.trackingNumber || order.orderNumber;

  if (settings.stocado_test_mode || !apiToken) {
    return {
      status: order.status || 'SHIPPED',
      message: `[Simülasyon] ${order.trackingCompany || 'PTT Kargo'} ile gönderi dağıtıma hazırlanıyor. (Takip No: ${searchCode})`,
    };
  }

  try {
    const res = await fetch(`https://api.kargopaneli.com/v1/cargos/${encodeURIComponent(searchCode)}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (res.ok) {
      const cargo = await res.json();
      let updatedStatus = order.status;

      // Stocado CargoStatus: 1: Taslak, 2: Aktif, 3: Tamamlandı (Teslim), 4: İptal, 5: Başarısız
      if (cargo.status === 3) {
        updatedStatus = 'DELIVERED';
      } else if (cargo.status === 4) {
        updatedStatus = 'CANCELLED';
      } else if (cargo.status === 2) {
        updatedStatus = 'SHIPPED';
      }

      if (updatedStatus !== order.status) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: updatedStatus },
        });
      }

      const lastTx = Array.isArray(cargo.transactions) && cargo.transactions.length > 0
        ? cargo.transactions[cargo.transactions.length - 1]
        : null;

      const txDescription = lastTx ? `${lastTx.description || ''} (${lastTx.location || ''})` : '';

      return {
        status: updatedStatus,
        message: txDescription ? `Stocado: ${txDescription}` : `Kargo durumu güncellendi (${updatedStatus}).`,
        details: cargo,
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      return {
        status: order.status,
        message: errData.message || 'Kargo henüz sisteme yansımamış olabilir.',
      };
    }
  } catch (err: any) {
    console.error('[Stocado] Status query error:', err);
    return {
      status: order.status,
      message: 'Kargo durumu sorgulanırken bağlantı hatası oluştu.',
    };
  }
}
