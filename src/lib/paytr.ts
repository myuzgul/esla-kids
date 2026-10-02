import crypto from 'crypto';
import { getSettings } from './settings';

export interface PayTRTokenParams {
  merchantOid: string;
  email: string;
  paymentAmount: number;
  userName: string;
  userAddress: string;
  userPhone: string;
  userBasket: Array<[string, string, number]>;
  userIp: string;
}

export async function createPayTRToken(params: PayTRTokenParams): Promise<{ status: 'success' | 'failed'; token?: string; reason?: string }> {
  const settings = await getSettings();
  if (!settings.paytr_enabled || !settings.paytr_merchant_id) {
    return { status: 'failed', reason: 'PayTR henüz aktif değil veya eksik yapılandırılmıştır.' };
  }

  const merchant_id = settings.paytr_merchant_id;
  const merchant_key = settings.paytr_merchant_key;
  const merchant_salt = settings.paytr_merchant_salt;

  const user_basket = JSON.stringify(params.userBasket);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const merchant_ok_url = siteUrl + '/siparis-tamamlandi/' + params.merchantOid;
  const merchant_fail_url = siteUrl + '/odeme?error=paytr_failed';
  const timeout_limit = '30';
  const currency = 'TL';
  const test_mode = settings.paytr_test_mode ? '1' : '0';
  const no_installment = '0';
  const max_installment = '12';

  const hashStr = `${merchant_id}${params.userIp}${params.merchantOid}${params.email}${params.paymentAmount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}${merchant_salt}`;
  const paytr_token = crypto.createHmac('sha256', merchant_key).update(hashStr).digest('base64');

  // In test mode or local simulation without real PayTR merchant credentials
  if (merchant_id === '381920' || !merchant_id) {
    return {
      status: 'success',
      token: 'mock_paytr_token_' + params.merchantOid + '_' + Date.now(),
    };
  }

  try {
    const body = new URLSearchParams({
      merchant_id,
      user_ip: params.userIp,
      merchant_oid: params.merchantOid,
      email: params.email,
      payment_amount: params.paymentAmount.toString(),
      paytr_token,
      user_basket,
      user_name: params.userName,
      user_address: params.userAddress,
      user_phone: params.userPhone,
      merchant_ok_url,
      merchant_fail_url,
      timeout_limit,
      currency,
      test_mode,
      no_installment,
      max_installment,
    });

    const res = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = await res.json();
    if (data.status === 'success') {
      return { status: 'success', token: data.token };
    }
    return { status: 'failed', reason: data.reason || 'PayTR token oluşturulamadı.' };
  } catch (err: any) {
    return { status: 'failed', reason: err.message };
  }
}

export async function verifyPayTRCallback(body: Record<string, string>): Promise<boolean> {
  const settings = await getSettings();
  const { merchant_oid, status, total_amount, hash } = body;
  const merchant_key = settings.paytr_merchant_key;
  const merchant_salt = settings.paytr_merchant_salt;

  const expectedHashStr = `${merchant_oid}${merchant_salt}${status}${total_amount}`;
  const calculatedHash = crypto.createHmac('sha256', merchant_key).update(expectedHashStr).digest('base64');

  return calculatedHash === hash;
}
