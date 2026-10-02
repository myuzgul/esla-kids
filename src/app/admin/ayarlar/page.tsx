import React from 'react';
import { getSettings } from '@/lib/settings';
import { AdminSettingsClient } from './AdminSettingsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminSettingsPage() {
  const settings = await getSettings(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AdminSettingsClient initialSettings={settings} />
    </div>
  );
}
