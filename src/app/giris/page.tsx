import React, { Suspense } from 'react';
import { GirisClient } from './GirisClient';

export const metadata = {
  title: 'Üye Girişi | Esla Kids',
  description: 'Esla Kids müşteri hesabınıza giriş yapın.',
};

export default function GirisPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-xs text-charcoal-400">Yükleniyor...</div>}>
      <GirisClient />
    </Suspense>
  );
}
