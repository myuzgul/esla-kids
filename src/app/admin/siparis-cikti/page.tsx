import React from 'react';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDate, formatPaymentMethod, formatVariationLabel } from '@/lib/utils';
import { generateQrDataUrl } from '@/lib/qr';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PrintButton } from '@/components/PrintButton';

interface Props {
  searchParams: { ids?: string };
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
    // Get unprinted orders or recent ones
    orders = await prisma.order.findMany({
      where: { isPrinted: false },
      take: 20,
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
        take: 5,
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

  const ordersWithQRs = await Promise.all(
    orders.map(async (ord) => {
      let shippingAddr: any = {};
      try {
        shippingAddr = JSON.parse(ord.shippingAddress);
      } catch (e) {}

      const itemsWithQr = await Promise.all(
        ord.items.map(async (it: any) => {
          let productSlug = it.product?.slug;

          // If product relation was null, look up product dynamically
          if (!productSlug) {
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
            }
          }

          // Clean slug of any % encoding
          const cleanSlug = (productSlug || '')
            .replace(/%25100/g, '100')
            .replace(/%100/g, '100')
            .replace(/%/g, '');

          const productUrl = cleanSlug ? `${baseUrl}/urun/${cleanSlug}` : `${baseUrl}`;
          const qrDataUrl = await generateQrDataUrl(productUrl);

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
    <div className="bg-slate-100 min-h-screen p-4 sm:p-8">
      {/* Top Floating Action Bar */}
      <div className="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between no-print">
        <Link
          href="/admin/siparisler"
          className="text-xs font-bold text-slate-700 hover:text-brand-600 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Sipariş Listesine Dön</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Toplam <strong>{ordersWithQRs.length}</strong> Sipariş Hazırlandı
          </span>
          <PrintButton />
        </div>
      </div>

      {/* Printable Slips */}
      <div className="max-w-4xl mx-auto space-y-8">
        {ordersWithQRs.map((ord) => (
          <div
            key={ord.id}
            className="bg-white p-8 rounded-2xl shadow-sm border border-slate-300 page-break text-slate-900 font-sans"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-heading font-black text-2xl flex items-center justify-center">
                  E
                </div>
                <div>
                  <h1 className="font-heading font-black text-2xl tracking-tight text-slate-900">
                    ESLA KIDS
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">
                    Bebek & Çocuk Giyim | Sipariş Hazırlama & Sevkiyat Fişi
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Tel: 0538 920 92 16 | info@eslakids.com
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500 font-semibold uppercase">Sipariş No</div>
                <div className="text-2xl font-mono font-black text-slate-900">
                  {ord.orderNumber}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Tarih: <strong>{formatDate(ord.createdAt)}</strong>
                </div>
              </div>
            </div>

            {/* Customer & Shipping Details */}
            <div className="grid grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Müşteri & İletişim Bilgileri
                </span>
                <div className="font-bold text-sm text-slate-900">{ord.guestName}</div>
                <div className="text-slate-700">Telefon: {ord.guestPhone}</div>
                <div className="text-slate-700">E-posta: {ord.guestEmail}</div>
                {ord.customerNote && (
                  <div className="mt-2 bg-amber-50 p-2 rounded border border-amber-200 text-amber-900">
                    <strong>Müşteri Notu:</strong> {ord.customerNote}
                  </div>
                )}
              </div>

              <div className="space-y-1 text-right sm:text-left">
                <span className="font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Teslimat & Kargo Bilgisi
                </span>
                <div className="text-slate-800 leading-relaxed">
                  {ord.shippingAddr.address}<br />
                  <strong>{ord.shippingAddr.district} / {ord.shippingAddr.city}</strong>
                </div>
                <div className="pt-2 text-slate-700">
                  <strong>Kargo:</strong> {ord.trackingCompany || 'Yurtiçi Kargo'}
                </div>
                <div className="text-slate-700">
                  <strong>Ödeme Şekli:</strong> {formatPaymentMethod(ord.paymentMethod)} ({ord.paymentStatus === 'PAID' ? 'ÖDENDİ' : 'TAHSİL EDİLECEK'})
                </div>
              </div>
            </div>

            {/* Line Items Table WITH REAL PRODUCT THUMBNAILS AND SCANNABLE QR CODES */}
            <div className="py-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-800 font-bold uppercase tracking-wider">
                    <th className="py-2.5 w-16">Fotoğraf</th>
                    <th className="py-2.5">Ürün & Varyasyon Detayı</th>
                    <th className="py-2.5 w-24">Model / SKU</th>
                    <th className="py-2.5 text-center w-16">Adet</th>
                    <th className="py-2.5 text-right w-24">Birim Fiyat</th>
                    <th className="py-2.5 text-right w-24">Toplam</th>
                    <th className="py-2.5 text-center w-24">Ürün QR Kodu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ord.itemsWithQr.map((it: any) => {
                    const itemImg = it.variation?.image || it.image;
                    const displayVar = formatVariationLabel(it.variationName || it.variation?.attributes);

                    return (
                      <tr key={it.id} className="align-middle">
                        <td className="py-3">
                          <div className="w-12 h-14 bg-slate-100 rounded border border-slate-200 overflow-hidden flex-shrink-0">
                            {itemImg && (
                              <img
                                src={itemImg}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </td>

                        <td className="py-3 pr-2">
                          <div className="font-bold text-slate-900 text-xs">
                            {it.title}
                          </div>
                          {displayVar && (
                            <div className="text-[11px] font-semibold text-brand-700 mt-0.5">
                              {displayVar}
                            </div>
                          )}
                        </td>

                      <td className="py-3 font-mono text-[11px] text-slate-600 font-bold">
                        {it.sku || '-'}
                      </td>

                      <td className="py-3 text-center">
                        <span className="font-black text-sm text-slate-900 bg-slate-100 px-2 py-1 rounded">
                          {it.quantity}
                        </span>
                      </td>

                      <td className="py-3 text-right text-slate-700">
                        {formatPrice(it.price)}
                      </td>

                      <td className="py-3 text-right font-bold text-slate-900">
                        {formatPrice(it.total)}
                      </td>

                      <td className="py-3 text-center">
                        <div className="flex flex-col items-center">
                          {it.qrDataUrl && (
                            <a
                              href={it.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ürünü İncele (Yeni sekmede aç)"
                              className="group flex flex-col items-center"
                            >
                              <img
                                src={it.qrDataUrl}
                                alt="Ürün QR Kodu"
                                className="w-16 h-16 border border-slate-300 p-1 rounded bg-white shadow-xs group-hover:border-brand-500 transition-colors"
                              />
                              <span className="text-[9px] text-slate-600 font-semibold mt-1 group-hover:text-brand-600 group-hover:underline transition-colors flex items-center gap-0.5">
                                Sitede İncele
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

            {/* Totals Summary */}
            <div className="flex justify-end pt-4 border-t-2 border-slate-900 text-xs">
              <div className="w-64 space-y-1.5">
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
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-300">
                  <span>Genel Toplam:</span>
                  <span>{formatPrice(ord.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-10 mt-8 border-t border-slate-200 text-center text-[10px] text-slate-500 uppercase font-semibold">
              <div>
                <span>Siparişi Hazırlayan</span>
                <div className="h-10 border-b border-dashed border-slate-300 mt-2"></div>
              </div>
              <div>
                <span>Kalite Kontrol / Paketleme</span>
                <div className="h-10 border-b border-dashed border-slate-300 mt-2"></div>
              </div>
              <div>
                <span>Kargo Teslim Alan</span>
                <div className="h-10 border-b border-dashed border-slate-300 mt-2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
