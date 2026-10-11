'use client';

import { useEffect, useRef } from 'react';
import { trackPurchase } from '@/lib/metaPixel';

interface PurchaseItem {
  id: string;
  name?: string;
  price: number;
  quantity: number;
}

interface Props {
  orderNumber: string;
  totalAmount: number;
  currency?: string;
  items: PurchaseItem[];
  customer?: {
    email?: string;
    phone?: string;
    fullName?: string;
    city?: string;
  };
}

export function MetaPurchaseTracker({
  orderNumber,
  totalAmount,
  currency = 'TRY',
  items,
  customer,
}: Props) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!orderNumber || trackedRef.current) return;

    // Prevent duplicate triggers if the customer refreshes the thank-you page
    const storageKey = `meta_purchase_tracked_${orderNumber}`;
    if (typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem(storageKey)) {
          return;
        }
      } catch (e) {}
    }

    trackedRef.current = true;
    try {
      sessionStorage.setItem(storageKey, 'true');
    } catch (e) {}

    // Deduplication key: order_<orderNumber> (used across browser and server CAPI)
    const eventId = `order_${orderNumber}`;

    trackPurchase({
      orderNumber,
      totalValue: totalAmount,
      currency,
      items,
      eventId,
      userData: customer,
    });
  }, [orderNumber, totalAmount, currency, items, customer]);

  return null;
}
