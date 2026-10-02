import React, { Suspense } from 'react';
import { KayitClient } from './KayitClient';

export const metadata = {
  title: 'Kayıt Ol | Esla Kids',
  description: 'Esla Kids üyeliğinizi hemen başlatın.',
};

export default function KayitPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-xs text-charcoal-400">Yükleniyor...</div>}>
      <KayitClient />
    </Suspense>
  );
}
