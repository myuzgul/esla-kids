import React from 'react';
import { getSettings } from '@/lib/settings';
import { CheckoutClient } from './CheckoutClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CheckoutPage() {
  const settings = await getSettings(true);
  return <CheckoutClient settings={settings} />;
}
