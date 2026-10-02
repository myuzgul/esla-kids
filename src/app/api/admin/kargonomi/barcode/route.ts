import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderNumber = searchParams.get('orderNumber');

  if (!orderNumber) {
    return new NextResponse('Sipariş numarası eksik', { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });

  if (!order) {
    return new NextResponse('Sipariş bulunamadı', { status: 404 });
  }

  let shippingAddr: any = {};
  try {
    shippingAddr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
  } catch (e) {}

  const trackingNum = order.trackingNumber || `24${Math.floor(10000000 + Math.random() * 90000000)}`;
  const carrier = order.trackingCompany || 'Yurtiçi Kargo';
  const isCod = order.paymentMethod === 'COD';

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>Kargo Barkodu - ${order.orderNumber}</title>
  <style>
    @page { size: 100mm 150mm; margin: 4mm; }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 8px;
      color: #000;
      background: #fff;
      font-size: 11px;
    }
    .label-box {
      border: 2px solid #000;
      padding: 10px;
      height: 94%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
    }
    .carrier-title {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .barcode-section {
      text-align: center;
      margin: 12px 0;
      padding: 8px 0;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
    }
    .barcode-lines {
      display: inline-block;
      height: 52px;
      width: 220px;
      background: repeating-linear-gradient(90deg, #000 0, #000 3px, transparent 3px, transparent 6px, #000 6px, #000 10px, transparent 10px, transparent 12px);
    }
    .tracking-code {
      font-size: 14px;
      font-weight: bold;
      letter-spacing: 2px;
      margin-top: 4px;
    }
    .party-info {
      margin: 8px 0;
      line-height: 1.4;
    }
    .party-title {
      font-weight: 900;
      text-transform: uppercase;
      font-size: 11px;
      background: #eee;
      padding: 2px 4px;
      display: inline-block;
      margin-bottom: 2px;
    }
    .cod-badge {
      border: 2px solid #000;
      padding: 6px;
      text-align: center;
      font-weight: 900;
      font-size: 13px;
      margin-top: 6px;
      background: #f8f8f8;
    }
    .footer {
      font-size: 9px;
      text-align: center;
      color: #555;
      border-top: 1px solid #ccc;
      padding-top: 4px;
    }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 10px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
      Yazdır (Ctrl+P)
    </button>
  </div>

  <div class="label-box">
    <div class="header">
      <div>
        <div class="carrier-title">${carrier}</div>
        <div style="font-size: 10px; font-weight: bold;">KARGONOMİ ENTEGRASYONU</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 13px; font-weight: 900;">${order.orderNumber}</div>
        <div style="font-size: 9px;">${new Date(order.createdAt).toLocaleDateString('tr-TR')}</div>
      </div>
    </div>

    <div class="barcode-section">
      <div class="barcode-lines"></div>
      <div class="tracking-code">${trackingNum}</div>
    </div>

    <div class="party-info">
      <div class="party-title">ALICI:</div>
      <div style="font-size: 13px; font-weight: 900;">${shippingAddr.fullName || order.guestName}</div>
      <div style="font-weight: bold;">${order.guestPhone}</div>
      <div>${shippingAddr.address || ''}</div>
      <div style="font-size: 12px; font-weight: bold;">${shippingAddr.district || ''} / ${shippingAddr.city || ''}</div>
    </div>

    ${isCod ? `
      <div class="cod-badge">
        KAPIDA ÖDEME TAHSİLAT TUTARI: ${order.totalAmount} TL
      </div>
    ` : `
      <div style="font-size: 11px; font-weight: bold; text-align: center; border: 1px solid #ccc; padding: 4px;">
        ÖDEME: PEŞİN (TAHSİLATSIZ)
      </div>
    `}

    <div class="party-info" style="font-size: 10px; border-top: 1px solid #ddd; padding-top: 4px;">
      <div class="party-title" style="font-size: 9px;">GÖNDERİCİ:</div>
      <div><strong>Esla Kids Bebek & Çocuk Giyim</strong></div>
      <div>Osmangazi / Bursa - Tel: 0538 920 92 16</div>
    </div>

    <div class="footer">
      Paket: 1 Desi / İçerik: Bebek & Çocuk Tekstil Ürünleri
    </div>
  </div>

  <script>
    window.onload = function() {
      // Auto trigger print dialog if requested
      if (window.location.search.includes('autoprint=true')) {
        setTimeout(function() { window.print(); }, 500);
      }
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
