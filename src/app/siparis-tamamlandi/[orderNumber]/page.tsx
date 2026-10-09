import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDate, formatVariationLabel, formatPaymentMethod } from '@/lib/utils';
import { getSettings } from '@/lib/settings';
import { CheckCircle, Landmark, Truck, Package, ArrowRight, Phone } from 'lucide-react';

interface Props {
  params: { orderNumber: string };
}

export default async function OrderSuccessPage({ params }: Props) {
  let order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: {
      items: {
        include: { variation: true },
      },
    },
  });

  if (!order && params.orderNumber.startsWith('EK') && !params.orderNumber.includes('-')) {
    const withDash = 'EK-' + params.orderNumber.substring(2);
    order = await prisma.order.findUnique({
      where: { orderNumber: withDash },
      include: {
        items: {
          include: { variation: true },
        },
      },
    });
  }

  if (!order) {
    notFound();
  }

  const settings = await getSettings();

  let shippingAddr: any = {};
  try {
    shippingAddr = JSON.parse(order.shippingAddress);
  } catch (e) {}

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white rounded-3xl border border-cream-200 shadow-sm p-6 sm:p-10 space-y-8">
        {/* Header Alert */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-8 h-8" />
          </div>
          <span className="text-xs font-bold text-brand-600 tracking-wider uppercase">Tebrikler</span>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-charcoal-900">
            Siparişiniz Başarıyla Alındı!
          </h1>
          <p className="text-sm text-charcoal-600 max-w-md mx-auto">
            Sipariş detaylarınız ve bilgilendirme e-postası <strong>{order.guestEmail}</strong> adresinize gönderildi.
          </p>
        </div>

        {/* Order Meta Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-cream-50 border border-cream-200 text-center">
          <div>
            <div className="text-[11px] text-charcoal-500 font-semibold uppercase">Sipariş No</div>
            <div className="text-sm font-bold text-brand-700 mt-0.5">{order.orderNumber}</div>
          </div>
          <div>
            <div className="text-[11px] text-charcoal-500 font-semibold uppercase">Tarih</div>
            <div className="text-sm font-bold text-charcoal-800 mt-0.5">{formatDate(order.createdAt)}</div>
          </div>
          <div>
            <div className="text-[11px] text-charcoal-500 font-semibold uppercase">Ödeme Yöntemi</div>
            <div className="text-sm font-bold text-charcoal-800 mt-0.5">{formatPaymentMethod(order.paymentMethod)}</div>
          </div>
          <div>
            <div className="text-[11px] text-charcoal-500 font-semibold uppercase">Toplam Tutar</div>
            <div className="text-sm font-bold text-brand-600 mt-0.5">{formatPrice(order.totalAmount)}</div>
          </div>
        </div>

        {/* Havale Instructions if needed */}
        {(order.paymentMethod === 'HAVALE' || order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod?.includes('EFT')) && (
          <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Landmark className="w-5 h-5 text-emerald-700" />
              <span>Havale / EFT Ödeme Talimatları</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Siparişinizin işleme alınabilmesi için lütfen aşağıdaki banka hesabımıza <strong>{formatPrice(order.totalAmount)}</strong> tutarı gönderirken açıklama kısmına <strong>{order.orderNumber}</strong> sipariş numaranızı yazınız.
            </p>
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-emerald-200 shadow-xs space-y-2">
              <div className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                Banka ve IBAN Hesap Bilgilerimiz:
              </div>
              <div className="text-xs sm:text-sm text-charcoal-800 whitespace-pre-line font-mono font-medium leading-relaxed bg-cream-50/80 p-3.5 rounded-lg border border-cream-200 select-all">
                {settings.havale_bank_info}
              </div>
              <p className="text-[11px] text-charcoal-500 italic pt-1">
                * Havale/EFT ulaştığında siparişiniz onaylanarak kargo hazırlık sürecine alınacaktır.
              </p>
            </div>
          </div>
        )}

        {/* Ordered Items Table */}
        <div className="space-y-4">
          <h3 className="font-heading font-bold text-base text-charcoal-900 pb-2 border-b border-cream-200">
            Sipariş Edilen Ürünler ({order.items.length})
          </h3>
          <div className="divide-y divide-cream-100">
            {order.items.map((item) => {
              const itemImg = item.variation?.image || item.image;
              const displayVar = formatVariationLabel(item.variationName || item.variation?.attributes);

              return (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-16 bg-cream-100 rounded-lg overflow-hidden flex-shrink-0">
                      {itemImg && <img src={itemImg} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-charcoal-800">{item.title}</div>
                      {displayVar && <div className="text-[11px] font-semibold text-brand-700">{displayVar}</div>}
                      <div className="text-[11px] text-charcoal-400 mt-0.5">Adet: {item.quantity} x {formatPrice(item.price)}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-brand-600">
                    {formatPrice(item.total)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-cream-50/60 p-4 rounded-xl border border-cream-200 text-xs text-charcoal-700">
          <strong className="text-charcoal-900 block mb-1">Teslimat Adresi:</strong>
          <p>{shippingAddr.fullName} - {shippingAddr.phone}</p>
          <p>{shippingAddr.address}, {shippingAddr.district} / {shippingAddr.city}</p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/siparis-takip"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-charcoal-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span>Siparişimi Takip Et</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-2"
          >
            <span>Alışverişe Devam Et</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
