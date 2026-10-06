import { prisma } from './prisma';

export interface SiteSettings {
  site_title: string;
  company_name: string;
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  free_shipping_limit: number;
  shipping_fee: number;
  shipping_company: string;
  havale_discount_percent: number;
  havale_bank_info: string;
  cod_fee: number;
  cod_enabled: boolean;
  default_tax_rate?: number;
  paytr_enabled: boolean;
  paytr_merchant_id: string;
  paytr_merchant_key: string;
  paytr_merchant_salt: string;
  paytr_test_mode: boolean;
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from?: string;
  stocado_enabled?: boolean;
  stocado_api_token?: string;
  stocado_account_id?: string;
  stocado_sender_address_id?: string;
  stocado_default_carrier?: string;
  stocado_sender_name?: string;
  stocado_sender_phone?: string;
  stocado_sender_address?: string;
  stocado_sender_city?: string;
  stocado_sender_district?: string;
  stocado_test_mode?: boolean;
}

let cachedSettings: SiteSettings | null = null;
let lastFetch = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function getSettings(forceFresh = false): Promise<SiteSettings> {
  const now = Date.now();
  if (!forceFresh && cachedSettings && now - lastFetch < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    rows.forEach((r) => {
      map[r.key] = r.value;
    });

    cachedSettings = {
      site_title: map['site_title'] || 'Esla Kids - Bebek ve Çocuk Giyim',
      company_name: map['company_name'] || 'Esla Kids',
      phone: map['phone'] || '0538 920 92 16',
      email: map['email'] || 'info@eslakids.com',
      whatsapp: map['whatsapp'] || '905389209216',
      address: map['address'] || 'Osmangazi / Bursa',
      free_shipping_limit: parseFloat(map['free_shipping_limit'] || '750'),
      shipping_fee: parseFloat(map['shipping_fee'] || '49.90'),
      shipping_company: map['shipping_company'] || 'Yurtiçi Kargo',
      havale_discount_percent: parseFloat(map['havale_discount_percent'] || '5'),
      havale_bank_info: map['havale_bank_info'] || 'Ziraat Bankası\nIBAN: TR12 0001 0002 0003 0004 0005 06',
      cod_fee: parseFloat(map['cod_fee'] || '45.00'),
      cod_enabled: map['cod_enabled'] !== 'false',
      default_tax_rate: map['default_tax_rate'] ? parseFloat(map['default_tax_rate']) : 10,
      paytr_enabled: map['paytr_enabled'] !== 'false',
      paytr_merchant_id: map['paytr_merchant_id'] || '',
      paytr_merchant_key: map['paytr_merchant_key'] || '',
      paytr_merchant_salt: map['paytr_merchant_salt'] || '',
      paytr_test_mode: map['paytr_test_mode'] === 'true',
      smtp_host: map['smtp_host'],
      smtp_port: map['smtp_port'],
      smtp_user: map['smtp_user'],
      smtp_pass: map['smtp_pass'],
      smtp_from: map['smtp_from'],
      stocado_enabled: map['stocado_enabled'] === 'true',
      stocado_api_token: map['stocado_api_token'] || '',
      stocado_account_id: map['stocado_account_id'] || '',
      stocado_sender_address_id: map['stocado_sender_address_id'] || '',
      stocado_default_carrier: map['stocado_default_carrier'] || 'ptt-kargo',
      stocado_sender_name: map['stocado_sender_name'] || 'Esla Kids Bebek & Çocuk',
      stocado_sender_phone: map['stocado_sender_phone'] || '0538 920 92 16',
      stocado_sender_address: map['stocado_sender_address'] || 'Osmangazi',
      stocado_sender_city: map['stocado_sender_city'] || 'Bursa',
      stocado_sender_district: map['stocado_sender_district'] || 'Osmangazi',
      stocado_test_mode: map['stocado_test_mode'] !== 'false',
    };
    lastFetch = now;
    return cachedSettings;
  } catch (err) {
    console.error('Error fetching settings:', err);
    return {
      site_title: 'Esla Kids - Bebek ve Çocuk Giyim',
      company_name: 'Esla Kids',
      phone: '0538 920 92 16',
      email: 'info@eslakids.com',
      whatsapp: '905389209216',
      address: 'Osmangazi / Bursa',
      free_shipping_limit: 750,
      shipping_fee: 49.90,
      shipping_company: 'Yurtiçi Kargo',
      havale_discount_percent: 5,
      havale_bank_info: 'Ziraat Bankası\nIBAN: TR12 0001 0002 0003 0004 0005 06',
      cod_fee: 45.00,
      cod_enabled: true,
      paytr_enabled: true,
      paytr_merchant_id: '',
      paytr_merchant_key: '',
      paytr_merchant_salt: '',
      paytr_test_mode: true,
    };
  }
}

export function invalidateSettingsCache() {
  cachedSettings = null;
  lastFetch = 0;
}
