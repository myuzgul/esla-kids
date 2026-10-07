import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

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

  const settings = await getSettings();

  let shippingAddr: any = {};
  try {
    shippingAddr = typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress)
      : (order.shippingAddress || {});
  } catch (e) {}

  const trackingNum = order.trackingNumber || `KP${Math.floor(1000000000 + Math.random() * 9000000000)}TR`;
  const carrier = order.trackingCompany || 'PTT Kargo';
  const paymentMethodUpper = (order.paymentMethod || '').toUpperCase();
  const isCod = paymentMethodUpper === 'COD' || paymentMethodUpper.includes('KAPIDA') || paymentMethodUpper.includes('CASH');
  const codAmount = Number((order as any).totalAmount || (order as any).total || 0);

  const senderName = settings.stocado_sender_name || 'Esla Kids Bebek & Çocuk Giyim';
  const senderPhone = settings.stocado_sender_phone || '0538 920 92 16';
  const senderCity = settings.stocado_sender_city || 'Bursa';
  const senderDistrict = settings.stocado_sender_district || 'Osmangazi';
  const senderAddress = settings.stocado_sender_address || 'Osmangazi / Bursa';

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>Kargo Barkodu - ${order.orderNumber}</title>
  <style>
    @page { size: 100mm 150mm; margin: 4mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      margin: 0;
      padding: 6px;
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
      box-sizing: border-box;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
    }
    .carrier-title {
      font-size: 19px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    .provider-badge {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #222;
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 2px;
    }
    .barcode-section {
      text-align: center;
      margin: 10px 0;
      padding: 10px 0;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
    }
    .barcode-svg {
      display: block;
      margin: 0 auto;
      max-width: 90%;
      height: 58px;
    }
    .tracking-code {
      font-size: 15px;
      font-weight: 900;
      font-family: monospace;
      letter-spacing: 2px;
      margin-top: 5px;
    }
    .party-info {
      margin: 8px 0;
      line-height: 1.4;
    }
    .party-title {
      font-weight: 900;
      text-transform: uppercase;
      font-size: 10px;
      background: #000;
      color: #fff;
      padding: 2px 6px;
      display: inline-block;
      margin-bottom: 4px;
      border-radius: 3px;
    }
    .cod-badge {
      border: 3px solid #000;
      padding: 8px;
      text-align: center;
      font-weight: 900;
      font-size: 14px;
      margin-top: 6px;
      background: #f5f5f5;
      letter-spacing: 0.5px;
    }
    .paid-badge {
      font-size: 11px;
      font-weight: bold;
      text-align: center;
      border: 1px solid #777;
      padding: 5px;
      margin-top: 4px;
    }
    .footer {
      font-size: 9px;
      text-align: center;
      color: #333;
      border-top: 1px solid #ccc;
      padding-top: 5px;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
    <div style="font-size: 12px; font-weight: bold; color: #333;">
      Kargo Sevk Etiketi (100x150 Termal Format)
    </div>
    <button onclick="window.print()" style="padding: 8px 20px; font-weight: bold; background: #000; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
      🖨️ Yazdır (Ctrl+P)
    </button>
  </div>

  <div class="label-box">
    <div class="header">
      <div>
        <div class="carrier-title">${carrier}</div>
        <div class="provider-badge">STOCADO KARGO PANELİ</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 14px; font-weight: 900; font-family: monospace;">${order.orderNumber}</div>
        <div style="font-size: 9px; color: #444;">${new Date(order.createdAt).toLocaleDateString('tr-TR')}</div>
      </div>
    </div>

    <div class="barcode-section">
      <!-- High contrast barcode SVG simulation -->
      <svg class="barcode-svg" viewBox="0 0 300 60" preserveAspectRatio="none">
        <rect x="0" y="0" width="300" height="60" fill="#fff" />
        <g fill="#000">
          <rect x="10" y="0" width="4" height="60"/>
          <rect x="16" y="0" width="2" height="60"/>
          <rect x="22" y="0" width="6" height="60"/>
          <rect x="32" y="0" width="3" height="60"/>
          <rect x="38" y="0" width="7" height="60"/>
          <rect x="48" y="0" width="2" height="60"/>
          <rect x="54" y="0" width="5" height="60"/>
          <rect x="62" y="0" width="3" height="60"/>
          <rect x="68" y="0" width="6" height="60"/>
          <rect x="78" y="0" width="2" height="60"/>
          <rect x="84" y="0" width="5" height="60"/>
          <rect x="92" y="0" width="7" height="60"/>
          <rect x="102" y="0" width="3" height="60"/>
          <rect x="108" y="0" width="4" height="60"/>
          <rect x="116" y="0" width="6" height="60"/>
          <rect x="126" y="0" width="2" height="60"/>
          <rect x="132" y="0" width="5" height="60"/>
          <rect x="140" y="0" width="7" height="60"/>
          <rect x="150" y="0" width="3" height="60"/>
          <rect x="156" y="0" width="6" height="60"/>
          <rect x="166" y="0" width="2" height="60"/>
          <rect x="172" y="0" width="4" height="60"/>
          <rect x="180" y="0" width="7" height="60"/>
          <rect x="190" y="0" width="3" height="60"/>
          <rect x="196" y="0" width="6" height="60"/>
          <rect x="206" y="0" width="2" height="60"/>
          <rect x="212" y="0" width="5" height="60"/>
          <rect x="220" y="0" width="7" height="60"/>
          <rect x="230" y="0" width="4" height="60"/>
          <rect x="238" y="0" width="2" height="60"/>
          <rect x="244" y="0" width="6" height="60"/>
          <rect x="254" y="0" width="3" height="60"/>
          <rect x="260" y="0" width="7" height="60"/>
          <rect x="270" y="0" width="2" height="60"/>
          <rect x="276" y="0" width="6" height="60"/>
          <rect x="286" y="0" width="4" height="60"/>
        </g>
      </svg>
      <div class="tracking-code">${trackingNum}</div>
    </div>

    <div class="party-info">
      <div class="party-title">ALICI (MÜŞTERİ):</div>
      <div style="font-size: 14px; font-weight: 900; margin-bottom: 2px;">${shippingAddr.fullName || order.guestName}</div>
      <div style="font-size: 13px; font-weight: 800; font-family: monospace;">Tel: ${order.guestPhone || shippingAddr.phone}</div>
      <div style="margin-top: 3px; font-size: 11px;">${shippingAddr.address || ''}</div>
      <div style="font-size: 13px; font-weight: 900; margin-top: 3px; text-transform: uppercase;">
        ${shippingAddr.district || ''} / ${shippingAddr.city || ''}
      </div>
    </div>

    ${isCod ? `
      <div class="cod-badge">
        💰 KAPIDA NAKİT ÖDEME TAHSİLAT TUTARI: ${codAmount} TL
      </div>
    ` : `
      <div class="paid-badge">
        ÖDEME: PEŞİN (TAHSİLATSIZ / ONLİNE ÖDENDİ)
      </div>
    `}

    <div class="party-info" style="font-size: 10px; border-top: 1px solid #000; padding-top: 6px; margin-top: 6px;">
      <div class="party-title" style="font-size: 9px;">GÖNDERİCİ:</div>
      <div><strong>${senderName}</strong></div>
      <div>${senderAddress} - Tel: ${senderPhone}</div>
      <div>${senderDistrict} / ${senderCity}</div>
    </div>

    <div class="footer">
      <span>İçerik: Bebek & Çocuk Tekstil</span>
      <span>Paket: 1 Desi</span>
      <span>Stocado v1</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      if (window.location.search.includes('autoprint=true')) {
        setTimeout(function() { window.print(); }, 400);
      }
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
