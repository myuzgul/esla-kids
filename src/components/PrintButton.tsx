'use client';

import React, { useEffect } from 'react';
import { Printer } from 'lucide-react';

export function PrintButton() {
  useEffect(() => {
    // If autoprint=1 or autoprint=true, open print dialog automatically
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autoprint') === '1' || params.get('autoprint') === 'true') {
        setTimeout(() => {
          window.print();
        }, 500);
      }
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer hover:shadow-lg active:scale-95"
      title="Yazdır (Ctrl + P)"
    >
      <Printer className="w-4 h-4 text-emerald-400" />
      <span>Yazdır (Ctrl + P)</span>
    </button>
  );
}
