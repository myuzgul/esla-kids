'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-colors"
    >
      <Printer className="w-4 h-4" />
      <span>Yazdır (A4 / Termal)</span>
    </button>
  );
}
