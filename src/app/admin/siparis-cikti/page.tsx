import React from 'react';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDate, formatPaymentMethod, formatVariationLabel } from '@/lib/utils';
import { generateQrDataUrl } from '@/lib/qr';
import { normalizePhone11Digits } from '@/lib/provinces';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { PrintButton } from '@/components/PrintButton';

interface Props {
  searchParams: { ids?: string; filter?: string };
}

export default async function OrderPrintSlipPage({ searchParams }: Props) {
  const ids = searchParams.ids ? searchParams.ids.split(',').filter(Boolean) : [];

  let orders: any[] = [];
  if (ids.length > 0) {
    // Mark as printed
    await prisma.order.updateMany({
      where: { id: { in: ids } },
      data: {
        isPrinted: true,
        printedAt: new Date(),
      },
    });

    // Automatically transition printed orders to PACKED ("Pakete Sevk Edildi")
    await prisma.order.updateMany({
      where: {
        id: { in: ids },
        status: { in: ['NEW', 'CONFIRMED', 'APPROVED'] },
      },
      data: { status: 'PACKED' },
    });

    orders = await prisma.order.findMany({
      where: { id: { in: ids } },
      include: {
        items: {
          include: {
            product: { select: { slug: true } },
            variation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    // Get unprinted orders or recent ones (desteklenen adet 100'e çıkarıldı)
    orders = await prisma.order.findMany({
      where: { isPrinted: false },
      take: 100,
      include: {
        items: {
          include: {
            product: { select: { slug: true } },
            variation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (orders.length === 0) {
      orders = await prisma.order.findMany({
        take: 10,
        include: {
          items: {
            include: {
              product: { select: { slug: true } },
              variation: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      const orderIds = orders.map((o) => o.id);
      await prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data: {
          isPrinted: true,
          printedAt: new Date(),
        },
      });
      await prisma.order.updateMany({
        where: {
          id: { in: orderIds },
          status: { in: ['NEW', 'CONFIRMED', 'APPROVED'] },
        },
        data: { status: 'PACKED' },
      });
    }
  }

  // Customer-facing printouts must point to the public domain so phone cameras open the live store
  const baseUrl = (process.env.NEXT_PUBLIC_STORE_URL || 'https://eslakids.com').replace(/\/$/, '');

  // Neon DB ve QR üretimini hızlandırmak için bellek içi önbellek
  const slugCache = new Map<string, string>();
  const qrCache = new Map<string, string>();

  const ordersWithQRs = await Promise.all(
    orders.map(async (ord) => {
      let shippingAddr: any = {};
      try {
        shippingAddr = typeof ord.shippingAddress === 'string'
          ? JSON.parse(ord.shippingAddress)
          : (ord.shippingAddress || {});
      } catch (e) {}

      const itemsWithQr = await Promise.all(
        ord.items.map(async (it: any) => {
          let productSlug = it.product?.slug;

          if (!productSlug) {
            const cacheKey = it.productId || it.sku || it.title || '';
            if (cacheKey && slugCache.has(cacheKey)) {
              productSlug = slugCache.get(cacheKey);
            } else {
              const baseTitle = it.title ? it.title.split(' - ')[0].trim() : '';
              const matched = await prisma.product.findFirst({
                where: {
                  OR: [
                    ...(it.productId ? [{ id: it.productId }] : []),
                    ...(it.sku ? [{ sku: it.sku }, { sku: it.sku.split('-VAR-')[0] }] : []),
                    ...(baseTitle ? [{ title: baseTitle }, { title: { contains: baseTitle } }] : []),
                  ],
                },
                select: { slug: true },
              });
              if (matched?.slug) {
                productSlug = matched.slug;
                if (cacheKey) slugCache.set(cacheKey, matched.slug);
              }
            }
          }

          // Clean slug of any % encoding
          const cleanSlug = (productSlug || '')
            .replace(/%25100/g, '100')
            .replace(/%100/g, '100')
            .replace(/%/g, '');

          const productUrl = cleanSlug ? `${baseUrl}/urun/${cleanSlug}` : baseUrl;
          let qrDataUrl = '';
          if (qrCache.has(productUrl)) {
            qrDataUrl = qrCache.get(productUrl)!;
          } else {
            qrDataUrl = await generateQrDataUrl(productUrl);
            qrCache.set(productUrl, qrDataUrl);
          }

          return {
            ...it,
            qrDataUrl,
            productUrl,
          };
        })
      );

      return {
        ...ord,
        shippingAddr,
        itemsWithQr,
      };
    })
  );

  return (
    <div className="print-page-wrapper bg-slate-100 min-h-screen p-4 sm:p-8 print:p-0 print:bg-white print:min-h-0">
      {/* Özel Yazdırma & Boş Sayfa Önleme CSS */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm 8mm 6mm 8mm;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            overflow-x: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .print-page-wrapper {
            background: transparent !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }

          .print-slips-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
          }

          .print-order-slip {
            box-sizing: border-box !important;
            background: #ffffff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 2mm 0mm !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          /* Her siparişten sonra sayfa sonu ekle, sonuncu hariç (böylece sonda boş sayfa kalmaz) */
          .print-order-slip:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
          }

          .print-order-slip:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          /* Kritik blokların sayfa ortasından bölünmesini önle */
          .slip-header-block,
          .slip-customer-block,
          .slip-footer-summary {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Tablo başlığının sayfa bölünmelerinde tekrar etmesi */
          .slip-items-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          .slip-items-table thead {
            display: table-header-group !important;
          }

          .slip-item-row {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Floating Action Bar (Sadece Ekranda Görünür) */}
      <div className="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link
          href="/admin/siparisler"
          className="text-xs font-bold text-slate-700 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Sipariş Listesine Dön</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>A4 Tek Sayfa Oranlama & Boş Sayfa Önleme Aktif</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Toplam <strong>{ordersWithQRs.length}</strong> Sipariş Hazırlandı
          </span>
          <PrintButton />
        </div>
      </div>

      {/* Printable Slips */}
      <div className="print-slips-container max-w-4xl mx-auto space-y-8 print:space-y-0 print:max-w-none print:m-0">
        {ordersWithQRs.map((ord) => {
          const itemCount = ord.itemsWithQr.length;
          // Ürün sayısına göre dinamik oranlama (fazla ürün olduğunda fontları ve boşlukları küçülterek tek A4 sayfaya sığdırır)
          const isCompact = itemCount >= 4 && itemCount <= 7;
          const isDense = itemCount > 7;

          return (
            <div
              key={ord.id}
              className="print-order-slip bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-300 text-slate-900 font-sans print:p-2 print:border-none print:shadow-none print:rounded-none"
            >
              {/* Header */}
              <div className="slip-header-block flex items-start justify-between pb-4 border-b-2 border-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-heading font-black text-xl flex items-center justify-center flex-shrink-0">
                    E
                  </div>
                  <div>
                    <h1 className="font-heading font-black text-xl tracking-tight text-slate-900 leading-none">
                      ESLA KIDS
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold tracking-wide uppercase mt-1">
                      Bebek & Çocuk Giyim | Sipariş Hazırlama & Sevkiyat Fişi
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      Tel: 0554 198 11 96 | info@eslakids.com
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Sipariş No</div>
                  <div className="text-xl font-mono font-black text-slate-900 leading-tight">
                    {ord.orderNumber}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    Tarih: <strong>{formatDate(ord.createdAt)}</strong>
                  </div>
                </div>
              </div>

              {/* Customer & Shipping Details */}
              <div className={`slip-customer-block grid grid-cols-2 gap-4 border-b border-slate-200 text-xs ${
                isCompact ? 'py-2 text-[11px]' : isDense ? 'py-1.5 text-[10px]' : 'py-3'
              }`}>
                <div className="space-y-0.5">
                  <span className="font-bold uppercase tracking-wider text-slate-500 block mb-0.5 text-[10px]">
                    Müşteri & İletişim Bilgileri
                  </span>
                  <div className="font-bold text-slate-900">{ord.guestName}</div>
                  <div className="text-slate-700">
                    Telefon: <strong>{normalizePhone11Digits(ord.guestPhone || ord.shippingAddr?.phone)}</strong>
                  </div>
                  {ord.guestEmail && (
                    <div className="text-slate-600 text-[11px]">E-posta: {ord.guestEmail}</div>
                  )}
                  {ord.customerNote && (
                    <div className="mt-1 bg-amber-50 p-1.5 rounded border border-amber-200 text-amber-900 text-[11px]">
                      <strong>Müşteri Notu:</strong> {ord.customerNote}
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 text-right sm:text-left">
                  <span className="font-bold uppercase tracking-wider text-slate-500 block mb-0.5 text-[10px]">
                    Teslimat & Kargo Bilgisi
                  </span>
                  <div className="text-slate-800 leading-tight">
                    {ord.shippingAddr.address || 'Adres belirtilmedi'}<br />
                    <strong>{ord.shippingAddr.district || '-'} / {ord.shippingAddr.city || '-'}</strong>
                  </div>
                  <div className="pt-1 text-slate-700">
                    <strong>Kargo:</strong> {ord.trackingCompany || 'Aras Kargo'}
                  </div>
                  <div className="text-slate-700">
                    <strong>Ödeme:</strong> {formatPaymentMethod(ord.paymentMethod)} ({ord.paymentStatus === 'PAID' ? 'ÖDENDİ' : 'TAHSİL EDİLECEK'})
                  </div>
                </div>
              </div>

              {/* Line Items Table WITH REAL PRODUCT THUMBNAILS AND SCANNABLE QR CODES */}
              <div className={isCompact ? 'py-2' : isDense ? 'py-1' : 'py-3'}>
                <table className="slip-items-table w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-800 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-1.5 w-14">Fotoğraf</th>
                      <th className="py-1.5">Ürün & Varyasyon Detayı</th>
                      <th className="py-1.5 w-20">Model / SKU</th>
                      <th className="py-1.5 text-center w-12">Adet</th>
                      <th className="py-1.5 text-right w-20">Birim</th>
                      <th className="py-1.5 text-right w-20">Toplam</th>
                      <th className="py-1.5 text-center w-20">Ürün QR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ord.itemsWithQr.map((it: any) => {
                      const itemImg = it.variation?.image || it.image;
                      const displayVar = formatVariationLabel(it.variationName || it.variation?.attributes);

                      return (
                        <tr key={it.id} className="slip-item-row align-middle">
                          <td className={isCompact ? 'py-1' : isDense ? 'py-0.5' : 'py-1.5'}>
                            <div className={`bg-slate-100 rounded border border-slate-200 overflow-hidden flex-shrink-0 ${
                              isCompact ? 'w-8 h-9' : isDense ? 'w-7 h-8' : 'w-10 h-11'
                            }`}>
                              {itemImg && (
                                <img
                                  src={itemImg}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          </td>

                          <td className={`pr-2 ${isCompact ? 'py-1 text-[11px]' : isDense ? 'py-0.5 text-[10px]' : 'py-1.5 text-xs'}`}>
                            <div className="font-bold text-slate-900 leading-tight">
                              {it.title}
                            </div>
                            {displayVar && (
                              <div className="font-semibold text-brand-700 text-[10px] mt-0.5">
                                {displayVar}
                              </div>
                            )}
                          </td>

                          <td className="font-mono text-[10px] text-slate-600 font-bold py-1">
                            {it.sku || '-'}
                          </td>

                          <td className="text-center py-1">
                            <span className="font-black text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {it.quantity}
                            </span>
                          </td>

                          <td className="text-right text-slate-700 py-1 text-[11px]">
                            {formatPrice(it.price)}
                          </td>

                          <td className="text-right font-bold text-slate-900 py-1 text-[11px]">
                            {formatPrice(it.total)}
                          </td>

                          <td className="text-center py-1">
                            <div className="flex flex-col items-center justify-center">
                              {it.qrDataUrl && (
                                <a
                                  href={it.productUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Ürünü İncele"
                                  className="group flex flex-col items-center"
                                >
                                  <img
                                    src={it.qrDataUrl}
                                    alt="QR"
                                    className={`border border-slate-300 p-0.5 rounded bg-white shadow-2xs group-hover:border-brand-500 transition-colors ${
                                      isCompact ? 'w-10 h-10' : isDense ? 'w-9 h-9' : 'w-12 h-12'
                                    }`}
                                  />
                                  <span className="text-[8px] text-slate-500 font-semibold mt-0.5 group-hover:text-brand-600 group-hover:underline">
                                    Sitede Aç
                                  </span>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals & Signatures Container (Birlikte Tutulur) */}
              <div className="slip-footer-summary">
                {/* Totals Summary */}
                <div className="flex justify-end pt-2 border-t-2 border-slate-900 text-xs">
                  <div className="w-60 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Ara Toplam:</span>
                      <span className="font-semibold">{formatPrice(ord.subtotal)}</span>
                    </div>
                    {ord.discountAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>İndirim:</span>
                        <span>-{formatPrice(ord.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Kargo Ücreti:</span>
                      <span>{ord.shippingFee === 0 ? 'Ücretsiz' : formatPrice(ord.shippingFee)}</span>
                    </div>
                    {ord.codFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Kapıda Ödeme Hizmeti:</span>
                        <span>+{formatPrice(ord.codFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-300">
                      <span>Genel Toplam:</span>
                      <span>{formatPrice(ord.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className={`grid grid-cols-3 gap-3 border-t border-slate-200 text-center text-slate-500 uppercase font-semibold ${
                  isCompact ? 'pt-3 mt-3 text-[9px]' : isDense ? 'pt-2 mt-2 text-[8px]' : 'pt-4 mt-4 text-[9px]'
                }`}>
                  <div>
                    <span>Siparişi Hazırlayan</span>
                    <div className={`border-b border-dashed border-slate-300 mt-1 ${isDense ? 'h-4' : 'h-6'}`}></div>
                  </div>
                  <div>
                    <span>Kalite Kontrol / Paketleme</span>
                    <div className={`border-b border-dashed border-slate-300 mt-1 ${isDense ? 'h-4' : 'h-6'}`}></div>
                  </div>
                  <div>
                    <span>Kargo Teslim Alan</span>
                    <div className={`border-b border-dashed border-slate-300 mt-1 ${isDense ? 'h-4' : 'h-6'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
