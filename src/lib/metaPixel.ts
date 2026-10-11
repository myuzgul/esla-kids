/**
 * Meta (Facebook) Pixel & Conversions API (CAPI) Client Helper
 * Provides type-safe event tracking with automated deduplication (event_id).
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

/**
 * Generate a unique event_id for Meta deduplication.
 * When both browser Pixel and server CAPI receive the same event_id within 48h,
 * Meta deduplicates them into a single event.
 */
export function generateEventId(prefix = 'evt'): string {
  const ts = Date.now();
  const rnd = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${ts}_${rnd}`;
}

/**
 * Safely trigger client-side fbq event
 */
export function fbqSafe(
  action: 'track' | 'trackCustom',
  eventName: string,
  params?: Record<string, any>,
  options?: { eventID?: string }
) {
  if (typeof window === 'undefined') return;

  if (typeof window.fbq === 'function') {
    if (options?.eventID) {
      window.fbq(action, eventName, params || {}, { eventID: options.eventID });
    } else {
      window.fbq(action, eventName, params || {});
    }
  }
}

/**
 * Send event to our server-side Conversions API (/api/meta/capi)
 */
export async function sendServerEvent(payload: {
  eventName: string;
  eventId: string;
  customData?: Record<string, any>;
  userData?: {
    email?: string;
    phone?: string;
    fullName?: string;
    city?: string;
  };
}) {
  try {
    const eventSourceUrl = typeof window !== 'undefined' ? window.location.href : undefined;
    await fetch('/api/meta/capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        eventSourceUrl,
      }),
      // Keep request alive even if page unloads (e.g. during checkout redirects)
      keepalive: true,
    });
  } catch (err) {
    console.warn('[Meta CAPI] Client dispatch error:', err);
  }
}

/**
 * Track standard PageView
 */
export function pageview() {
  fbqSafe('track', 'PageView');
}

/**
 * Track ViewContent (Product detail page)
 */
export function trackViewContent(options: {
  id: string;
  name: string;
  price: number;
  currency?: string;
  category?: string;
  eventId?: string;
}) {
  const eventId = options.eventId || generateEventId('vc');
  const currency = options.currency || 'TRY';

  const params: Record<string, any> = {
    content_ids: [String(options.id)],
    content_name: options.name,
    content_type: 'product',
    value: Number(options.price),
    currency,
  };

  if (options.category) {
    params.content_category = options.category;
  }

  // 1. Browser Pixel
  fbqSafe('track', 'ViewContent', params, { eventID: eventId });

  // 2. Server CAPI (in background)
  sendServerEvent({
    eventName: 'ViewContent',
    eventId,
    customData: params,
  });

  return eventId;
}

/**
 * Track AddToCart
 */
export function trackAddToCart(options: {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  currency?: string;
  category?: string;
  eventId?: string;
}) {
  const eventId = options.eventId || generateEventId('atc');
  const currency = options.currency || 'TRY';
  const qty = options.quantity || 1;
  const totalValue = Math.round(Number(options.price) * qty * 100) / 100;

  const params: Record<string, any> = {
    content_ids: [String(options.id)],
    content_name: options.name,
    content_type: 'product',
    contents: [
      {
        id: String(options.id),
        quantity: qty,
        item_price: Number(options.price),
      },
    ],
    value: totalValue,
    currency,
  };

  if (options.category) {
    params.content_category = options.category;
  }

  // 1. Browser Pixel
  fbqSafe('track', 'AddToCart', params, { eventID: eventId });

  // 2. Server CAPI
  sendServerEvent({
    eventName: 'AddToCart',
    eventId,
    customData: params,
  });

  return eventId;
}

/**
 * Track InitiateCheckout
 */
export function trackInitiateCheckout(options: {
  items: Array<{ id: string; name?: string; price: number; quantity: number }>;
  totalValue: number;
  currency?: string;
  numItems?: number;
  eventId?: string;
  userData?: { email?: string; phone?: string; fullName?: string };
}) {
  const eventId = options.eventId || generateEventId('ic');
  const currency = options.currency || 'TRY';

  const contentIds = options.items.map((it) => String(it.id));
  const contents = options.items.map((it) => ({
    id: String(it.id),
    quantity: it.quantity,
    item_price: Number(it.price),
  }));

  const params: Record<string, any> = {
    content_ids: contentIds,
    contents,
    content_type: 'product',
    num_items: options.numItems || options.items.reduce((acc, i) => acc + i.quantity, 0),
    value: Math.round(Number(options.totalValue) * 100) / 100,
    currency,
  };

  // 1. Browser Pixel
  fbqSafe('track', 'InitiateCheckout', params, { eventID: eventId });

  // 2. Server CAPI
  sendServerEvent({
    eventName: 'InitiateCheckout',
    eventId,
    customData: params,
    userData: options.userData,
  });

  return eventId;
}

/**
 * Track Purchase (Thank you / Order Success page)
 */
export function trackPurchase(options: {
  orderNumber: string;
  totalValue: number;
  currency?: string;
  items: Array<{ id: string; name?: string; price: number; quantity: number }>;
  userData?: {
    email?: string;
    phone?: string;
    fullName?: string;
    city?: string;
  };
  eventId?: string;
}) {
  // Use orderNumber directly as eventId for perfect deduplication
  const eventId = options.eventId || `order_${options.orderNumber}`;
  const currency = options.currency || 'TRY';

  const contentIds = options.items.map((it) => String(it.id));
  const contents = options.items.map((it) => ({
    id: String(it.id),
    quantity: it.quantity,
    item_price: Number(it.price),
  }));

  const params: Record<string, any> = {
    content_ids: contentIds,
    contents,
    content_type: 'product',
    num_items: options.items.reduce((acc, i) => acc + i.quantity, 0),
    value: Math.round(Number(options.totalValue) * 100) / 100,
    currency,
    order_id: options.orderNumber,
  };

  // 1. Browser Pixel
  fbqSafe('track', 'Purchase', params, { eventID: eventId });

  // 2. Server CAPI
  sendServerEvent({
    eventName: 'Purchase',
    eventId,
    customData: params,
    userData: options.userData,
  });

  return eventId;
}
