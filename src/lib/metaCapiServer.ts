import crypto from 'crypto';

/**
 * SHA-256 Hasher for Meta user_data normalization
 */
export function sha256(val?: string | null): string | null {
  if (!val) return null;
  const clean = val.trim().toLowerCase();
  if (!clean) return null;
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Turkish and international phone normalization for Meta
 * Meta expects digits only with country code (e.g. 905321234567)
 */
export function normalizePhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  let digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;

  // 0532XXXXXXX -> 90532XXXXXXX
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '90' + digits.substring(1);
  } else if (digits.length === 10 && digits.startsWith('5')) {
    // 532XXXXXXX -> 90532XXXXXXX
    digits = '90' + digits;
  }
  return digits;
}

export interface MetaServerEventParams {
  eventName: string;
  eventId?: string;
  eventTime?: number;
  eventSourceUrl?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
  customData?: Record<string, any>;
  userData?: {
    email?: string;
    phone?: string;
    fullName?: string;
    city?: string;
  };
  testEventCode?: string;
}

/**
 * Direct Server-to-Meta Graph API (CAPI v19.0+) dispatch
 */
export async function sendMetaServerEvent(params: MetaServerEventParams) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return { skipped: true, reason: 'META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not set' };
  }

  const {
    eventName,
    eventId,
    eventTime = Math.floor(Date.now() / 1000),
    eventSourceUrl = 'https://eslakids.com',
    clientIp,
    clientUserAgent,
    fbp,
    fbc,
    customData = {},
    userData = {},
    testEventCode = process.env.META_TEST_EVENT_CODE,
  } = params;

  // Build formatted user_data with SHA-256
  const formattedUserData: Record<string, any> = {};

  if (clientIp) formattedUserData.client_ip_address = clientIp;
  if (clientUserAgent) formattedUserData.client_user_agent = clientUserAgent;
  if (fbp) formattedUserData.fbp = fbp;
  if (fbc) formattedUserData.fbc = fbc;

  if (userData.email) {
    const hashed = sha256(userData.email);
    if (hashed) formattedUserData.em = [hashed];
  }

  if (userData.phone) {
    const norm = normalizePhone(userData.phone);
    const hashed = sha256(norm);
    if (hashed) formattedUserData.ph = [hashed];
  }

  if (userData.fullName) {
    const parts = userData.fullName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    const hashedFn = sha256(firstName);
    if (hashedFn) formattedUserData.fn = [hashedFn];

    if (lastName) {
      const hashedLn = sha256(lastName);
      if (hashedLn) formattedUserData.ln = [hashedLn];
    }
  }

  if (userData.city) {
    const hashedCt = sha256(userData.city);
    if (hashedCt) formattedUserData.ct = [hashedCt];
  }

  const serverEventPayload: Record<string, any> = {
    event_name: eventName,
    event_time: eventTime,
    event_source_url: eventSourceUrl,
    action_source: 'website',
    user_data: formattedUserData,
    custom_data: customData,
  };

  if (eventId) {
    serverEventPayload.event_id = String(eventId);
  }

  const payload: Record<string, any> = {
    data: [serverEventPayload],
  };

  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

  const metaGraphUrl = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
  const response = await fetch(metaGraphUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const resData = await response.json();

  if (!response.ok) {
    console.error('[Meta CAPI Server Dispatch Error]:', resData);
    return { success: false, error: resData };
  }

  return {
    success: true,
    events_received: resData.events_received,
    fbtrace_id: resData.fbtrace_id,
    eventId: eventId || null,
  };
}
