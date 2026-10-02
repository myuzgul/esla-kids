import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const SESSION_SECRET = process.env.SESSION_SECRET || 'esla-kids-secure-jwt-session-secret-2026';
export const SESSION_COOKIE_NAME = 'esla_session';

export interface SessionPayload {
  customerId: string;
  email: string;
  name: string;
  role: string;
  exp: number; // unix timestamp in ms
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  const jsonStr = JSON.stringify(fullPayload);
  const base64Data = Buffer.from(jsonStr).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(base64Data);
  const signature = hmac.digest('base64url');

  return `${base64Data}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [base64Data, signature] = parts;
    const hmac = crypto.createHmac('sha256', SESSION_SECRET);
    hmac.update(base64Data);
    const expectedSignature = hmac.digest('base64url');

    if (signature !== expectedSignature) return null;

    const jsonStr = Buffer.from(base64Data, 'base64url').toString('utf-8');
    const payload: SessionPayload = JSON.parse(jsonStr);

    if (Date.now() > payload.exp) return null; // expired

    return payload;
  } catch (e) {
    return null;
  }
}

export async function getCurrentCustomer() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifySessionToken(token);
    if (!payload || !payload.customerId) return null;

    const customer = await prisma.customer.findUnique({
      where: { id: payload.customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        addresses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return customer;
  } catch (e) {
    return null;
  }
}
