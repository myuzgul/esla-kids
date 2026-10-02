import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDate, ORDER_STATUS_MAP } from '@/lib/utils';
import { OrderDetailAdminClient } from './OrderDetailAdminClient';
import { ArrowLeft, Printer, User, MapPin, CreditCard, Truck } from 'lucide-react';

interface Props {
  params: { id: string };
}

export default async function OrderDetailPage({ params }: Props) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      customer: true,
    },
  });

  if (!order) notFound();

  let shippingAddr: any = {};
  try {
    shippingAddr = JSON.parse(order.shippingAddress);
  } catch (e) {}

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/siparisler"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading font-black text-2xl text-slate-900">
                Sipariş #{order.orderNumber}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ORDER_STATUS_MAP[order.status]?.bg} ${ORDER_STATUS_MAP[order.status]?.color}`}>
                {ORDER_STATUS_MAP[order.status]?.label || order.status}
              </span>
              {order.isPrinted ? (
                <span
                  title={order.printedAt ? `Yazdırılma: ${formatDate(order.printedAt)}` : 'Yazdırıldı'}
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                >
                  <span>✓</span>
                  <span>Yazdırıldı</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                  <span>✕</span>
                  <span>Yazdırılmadı</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sipariş Tarihi: {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={`/admin/siparis-cikti?ids=${order.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Fotoğraflı & QR Fiş Yazdır</span>
          </a>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Line Items & Totals */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-heading font-bold text-base text-slate-900 pb-3 border-b border-slate-100">
              Sipariş Edilen Ürünler ({order.items.length})
            </h2>

            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-18 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200">
                      {item.image && (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-500">
                        SKU: {item.sku || '-'}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        {item.title}
                      </h4>
                      {item.variationName && (
                        <div className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded mt-1 inline-block">
                          {item.variationName}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1">
                        Birim: {formatPrice(item.price)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Adet: <strong className="text-slate-800 text-sm">{item.quantity}</strong></div>
                    <div className="text-base font-bold text-slate-900 mt-1">
                      {formatPrice(item.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Ara Toplam:</span>
                  <span className="font-semibold">{formatPrice(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>İndirim:</span>
                    <span>-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Kargo Ücreti:</span>
                  <span>{order.shippingFee === 0 ? 'Ücretsiz' : formatPrice(order.shippingFee)}</span>
                </div>
                {order.codFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Kapıda Ödeme Bedeli:</span>
                    <span>+{formatPrice(order.codFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Genel Toplam:</span>
                  <span className="text-brand-600">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Address Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                <User className="w-4 h-4 text-brand-500" />
                <span>Müşteri Bilgileri</span>
              </div>
              <div className="font-bold text-slate-900 text-sm">{order.guestName}</div>
              <div className="text-xs text-slate-600">Telefon: {order.guestPhone}</div>
              <div className="text-xs text-slate-600">E-posta: {order.guestEmail}</div>
              {order.customerNote && (
                <div className="mt-3 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <strong>Müşteri Notu:</strong> {order.customerNote}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                <MapPin className="w-4 h-4 text-powder-500" />
                <span>Teslimat Adresi</span>
              </div>
              <div className="text-xs text-slate-800 leading-relaxed">
                {shippingAddr.fullName}<br />
                {shippingAddr.address}<br />
                <strong>{shippingAddr.district} / {shippingAddr.city}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right: State Machine Status & Shipment Actions */}
        <div className="lg:col-span-4 space-y-4">
          <OrderDetailAdminClient order={order} />
        </div>
      </div>
    </div>
  );
}
