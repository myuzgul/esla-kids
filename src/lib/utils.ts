import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_TAX_RATE = 10; // %10 KDV

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || isNaN(price)) return '0,00 TL';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price).replace('TRY', 'TL');
}

// Fiyata KDV ekler (Örn: 250 TL + %10 KDV = 275 TL)
export function addTax(priceExclTax: number, taxRate: number = DEFAULT_TAX_RATE): number {
  if (isNaN(priceExclTax) || priceExclTax <= 0) return 0;
  return Math.round(priceExclTax * (1 + (taxRate || DEFAULT_TAX_RATE) / 100) * 100) / 100;
}

// KDV tutarını hesaplar (Örn: 250 TL için %10 KDV = 25 TL)
export function calculateTaxAmount(priceExclTax: number, taxRate: number = DEFAULT_TAX_RATE): number {
  if (isNaN(priceExclTax) || priceExclTax <= 0) return 0;
  return Math.round(priceExclTax * ((taxRate || DEFAULT_TAX_RATE) / 100) * 100) / 100;
}

// KDV dahil fiyattan KDV hariç tutarı bulur (Örn: 275 TL / 1.10 = 250 TL)
export function extractTax(priceInclTax: number, taxRate: number = DEFAULT_TAX_RATE): { exclTax: number; taxAmount: number } {
  if (isNaN(priceInclTax) || priceInclTax <= 0) return { exclTax: 0, taxAmount: 0 };
  const excl = Math.round((priceInclTax / (1 + (taxRate || DEFAULT_TAX_RATE) / 100)) * 100) / 100;
  const tax = Math.round((priceInclTax - excl) * 100) / 100;
  return { exclTax: excl, taxAmount: tax };
}

export function slugify(text: string): string {
  const trMap: Record<string, string> = {
    ç: 'c', Ç: 'c',
    ğ: 'g', Ğ: 'g',
    ş: 's', Ş: 's',
    ü: 'u', Ü: 'u',
    ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o',
  };

  return text
    .split('')
    .map((char) => trMap[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: 'Sipariş Onaylandı', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  CONFIRMED: { label: 'Sipariş Onaylandı', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  APPROVED: { label: 'Sipariş Onaylandı', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  PRINTED: { label: 'Pakete Sevk Edildi', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  PREPARING: { label: 'Pakete Sevk Edildi', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  PACKED: { label: 'Pakete Sevk Edildi', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  SHIPPED: { label: 'Kargolandı', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  DELIVERED: { label: 'Teslim Edildi', color: 'text-green-800', bg: 'bg-green-100 border-green-300' },
  CANCELLED: { label: 'İptal Edildi', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  REFUND_REQUESTED: { label: 'İade Talebi', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  REFUNDED: { label: 'İade Edildi', color: 'text-slate-600', bg: 'bg-slate-100 border-slate-300' },
  PENDING_PAYMENT: { label: 'Ödeme Bekleniyor', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
};

export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return 'Belirtilmedi';
  const m = method.toUpperCase();
  if (m === 'COD' || m.includes('KAPIDA') || m.includes('CASH')) {
    return 'KAPIDA NAKİT ÖDEME';
  }
  if (m === 'PAYTR' || m.includes('KREDI') || m.includes('CARD') || m.includes('CREDIT')) {
    return 'KREDİ KARTI (PAYTR)';
  }
  if (m === 'HAVALE' || m === 'BANK_TRANSFER' || m.includes('EFT') || m.includes('TRANSFER')) {
    return 'HAVALE / EFT';
  }
  return method;
}

export function formatVariationLabel(raw: any): string {
  if (!raw) return '';
  let str = typeof raw === 'object' ? JSON.stringify(raw) : String(raw).trim();
  if (!str) return '';

  let color = '';
  let size = '';

  // 1. Try parsing JSON if starts with { and ends with }
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      color = obj['Renk'] || obj['renk'] || obj['Color'] || obj['color'] || '';
      size = obj['Yaş'] || obj['yaş'] || obj['Yas'] || obj['yas'] || obj['Beden'] || obj['beden'] || obj['Size'] || obj['size'] || '';
    } catch (e) {}
  }

  // 2. If not found in JSON, search formatted string (e.g. "Renk: Lacivert, RenkKodu: #1e3a8a, Beden: 6 Yaş, Yaş: 6 Yaş")
  if (!color && !size) {
    const colorMatch = str.match(/(?:Renk|Color)\s*:\s*([^,;/]+)/i);
    if (colorMatch) color = colorMatch[1].trim();

    const ageMatch = str.match(/(?:Yaş|yaş|Yas|yas)\s*:\s*([^,;/]+)/i);
    const sizeMatch = str.match(/(?:Beden|Size|beden)\s*:\s*([^,;/]+)/i);

    if (ageMatch) {
      size = ageMatch[1].trim();
    } else if (sizeMatch) {
      size = sizeMatch[1].trim();
    }
  }

  // 3. Fallback for slash separated "Lacivert / 6 Yaş"
  if (!color && !size && str.includes('/')) {
    const parts = str.split('/').map((s) => s.trim());
    if (parts.length === 2) {
      color = parts[0];
      size = parts[1];
    }
  }

  // 4. If neither recognized, just clean RenkKodu and duplicate Beden
  if (!color && !size) {
    return str
      .replace(/,\s*RenkKodu:\s*#[a-f0-9]+/gi, '')
      .replace(/RenkKodu:\s*#[a-f0-9]+,?\s*/gi, '')
      .replace(/Beden:\s*[^,]+,\s*(?=Yaş:)/gi, '')
      .trim();
  }

  const parts: string[] = [];
  if (color) {
    parts.push(`Renk: ${color}`);
  }

  if (size) {
    const isAge = /yaş/i.test(size) || (!size.toLowerCase().includes('ay') && !['xs', 's', 'm', 'l', 'xl', 'xxl'].includes(size.toLowerCase()));
    const numSize = size.replace(/\s*yaş/i, '').trim();
    if (isAge) {
      parts.push(`Yaş: ${numSize}`);
    } else {
      parts.push(`Beden: ${size}`);
    }
  }

  return parts.join(' ');
}

