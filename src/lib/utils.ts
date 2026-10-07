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
