'use client';

import React, { useEffect, useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';

export function PrintButton() {
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const shouldAutoPrint = params.get('autoprint') === '1' || params.get('autoprint') === 'true';

    if (shouldAutoPrint) {
      setIsPreparing(true);

      const triggerPrint = () => {
        setIsPreparing(false);
        try {
          window.print();
        } catch (e) {
          console.error('Print trigger failed:', e);
        }
      };

      // Wait for all images (product thumbnails & QR codes) to load before opening print dialog
      const waitForImages = () => {
        const images = Array.from(document.images);
        if (images.length === 0) {
          setTimeout(triggerPrint, 300);
          return;
        }

        const imagePromises = images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        });

        // Resolve when images load or after a 1.2s timeout safety net
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
        Promise.race([Promise.all(imagePromises), timeoutPromise]).then(() => {
          setTimeout(triggerPrint, 300);
        });
      };

      if (document.readyState === 'complete') {
        waitForImages();
      } else {
        window.addEventListener('load', waitForImages, { once: true });
      }
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      disabled={isPreparing}
      className="bg-slate-900 hover:bg-slate-800 disabled:opacity-75 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer hover:shadow-lg active:scale-95"
      title="Yazdır (Ctrl + P)"
    >
      {isPreparing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
          <span>Yazdırma Penceresi Açılıyor...</span>
        </>
      ) : (
        <>
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Yazdır (Ctrl + P)</span>
        </>
      )}
    </button>
  );
}
