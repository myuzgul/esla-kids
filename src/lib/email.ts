import nodemailer from 'nodemailer';
import { getSettings } from './settings';
import { prisma } from './prisma';

function formatCurrency(val: number | null | undefined): string {
  const num = typeof val === 'number' ? val : 0;
  return num.toFixed(2).replace('.', ',') + ' TL';
}

export async function sendOrderNotificationEmail(
  orderData: any,
  type: 'CREATED' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED'
) {
  try {
    const settings = await getSettings();

    // Ensure we have the full order with items if only partial order was passed
    let order = orderData;
    if (!order || !order.items || order.items.length === 0) {
      try {
        const full = await prisma.order.findUnique({
          where: { id: order?.id || orderData?.id },
          include: { items: true, customer: true },
        });
        if (full) order = full;
      } catch (e) {
        console.error('Error fetching full order for email:', e);
      }
    }

    if (!order) {
      console.log('[EMAIL SKIPPED] No order provided.');
      return;
    }

    const to = order.guestEmail || order.customer?.email;
    if (!to) {
      console.log(`[EMAIL SKIPPED] No recipient email for order ${order.orderNumber}`);
      return;
    }

    const titles: Record<string, string> = {
      CREATED: 'Siparişiniz Alındı',
      CONFIRMED: 'Ödemeniz Onaylandı & Siparişiniz Alındı',
      PREPARING: 'Siparişiniz Hazırlanıyor',
      SHIPPED: 'Siparişiniz Kargoya Verildi',
      DELIVERED: 'Siparişiniz Teslim Edildi',
    };

    const statusBadgeColors: Record<string, { bg: string; text: string }> = {
      CREATED: { bg: '#FEF3C7', text: '#92400E' },
      CONFIRMED: { bg: '#D1FAE5', text: '#065F46' },
      PREPARING: { bg: '#E0E7FF', text: '#3730A3' },
      SHIPPED: { bg: '#DBEAFE', text: '#1E40AF' },
      DELIVERED: { bg: '#DCFCE7', text: '#166534' },
    };

    const badge = statusBadgeColors[type] || { bg: '#F1F5F9', text: '#334155' };
    const subject = `${settings.company_name} - ${titles[type] || 'Sipariş Durumu'} (#${order.orderNumber})`;

    // Parse shipping address
    let addressLines = '';
    let customerName = order.guestName || order.customer?.name || 'Değerli Müşterimiz';
    let customerPhone = order.guestPhone || order.customer?.phone || '';

    try {
      const parsed = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
      if (parsed) {
        if (parsed.fullName) customerName = parsed.fullName;
        if (parsed.phone) customerPhone = parsed.phone;
        addressLines = `
          <div><strong>${parsed.fullName || customerName}</strong></div>
          <div>${parsed.address || ''}</div>
          <div>${parsed.district || ''} / ${parsed.city || ''}</div>
          ${parsed.phone || customerPhone ? `<div>Tel: ${parsed.phone || customerPhone}</div>` : ''}
        `;
      }
    } catch (e) {
      addressLines = `<div>${order.shippingAddress || ''}</div>`;
    }

    // Payment method & status text
    const methodUpper = (order.paymentMethod || '').toUpperCase();
    const isCod = methodUpper === 'COD' || methodUpper.includes('KAPIDA') || methodUpper.includes('CASH');
    const isHavale = methodUpper === 'HAVALE' || methodUpper === 'BANK_TRANSFER' || methodUpper.includes('EFT') || methodUpper.includes('TRANSFER');

    const paymentMethods: Record<string, string> = {
      PAYTR: 'Kredi / Banka Kartı (PayTR)',
      HAVALE: 'Banka Havalesi / EFT',
      COD: 'Kapıda Nakit Ödeme',
    };
    const paymentMethodText = isCod
      ? 'Kapıda Nakit Ödeme'
      : paymentMethods[order.paymentMethod] || (isHavale ? 'Banka Havalesi / EFT' : order.paymentMethod || 'Online Ödeme');

    let paymentStatusText = order.paymentStatus === 'PAID' ? 'Ödeme Alındı' : 'Ödeme Bekleniyor';
    let paymentStatusColor = order.paymentStatus === 'PAID' ? '#059669' : '#D97706';

    if (isCod) {
      if (order.paymentStatus === 'PAID') {
        paymentStatusText = 'Kapıda Tahsil Edildi';
        paymentStatusColor = '#059669';
      } else {
        paymentStatusText = 'Kapıda Nakit Ödeme';
        paymentStatusColor = '#1E293B';
      }
    } else if (isHavale && order.paymentStatus !== 'PAID') {
      paymentStatusText = 'Havale Bekleniyor';
      paymentStatusColor = '#D97706';
    }

    // Tracking info HTML
    let trackingHtml = '';
    if (type === 'SHIPPED' && order.trackingNumber) {
      trackingHtml = `
        <div style="background:#EFF6FF; border-left:4px solid #3B82F6; padding:16px; margin:20px 0; border-radius:8px;">
          <h4 style="margin:0 0 8px 0; color:#1E40AF; font-size:14px; font-weight:700;">🚚 Kargo Takip Bilgileri</h4>
          <p style="margin:0; font-size:13px; color:#1E3A8A; line-height:1.6;">
            <strong>Kargo Firması:</strong> ${order.trackingCompany || 'Yurtiçi Kargo'}<br>
            <strong>Takip Kodu:</strong> <span style="font-family:monospace; font-weight:bold; font-size:14px;">${order.trackingNumber}</span>
          </p>
        </div>
      `;
    }

    // Bank transfer info HTML
    let havaleHtml = '';
    if (order.paymentMethod === 'HAVALE') {
      havaleHtml = `
        <div style="background:#FFFBEB; border-left:4px solid #F59E0B; padding:16px; margin:20px 0; border-radius:8px;">
          <h4 style="margin:0 0 8px 0; color:#92400E; font-size:14px; font-weight:700;">🏦 Havale / EFT Banka Hesap Bilgileri</h4>
          <div style="margin:0 0 10px 0; font-size:13px; color:#78350F; line-height:1.6; white-space:pre-line;">
            ${settings.havale_bank_info || 'Halk Bankası - Kemal Bostan\nIBAN: TR93 0001 2009 2910 0009 0200 15'}
          </div>
          <div style="font-size:12px; color:#92400E; font-weight:600; padding-top:8px; border-top:1px dashed #FDE68A;">
            ⚠️ Havale veya EFT yaparken açıklama kısmına mutlaka <strong>#${order.orderNumber}</strong> sipariş numaranızı yazınız.
          </div>
        </div>
      `;
    }

    // Order items table
    const items = order.items || [];
    const itemsHtml = items.map((it: any) => {
      let attrText = '';
      try {
        const attrs = typeof it.attributes === 'string' ? JSON.parse(it.attributes) : it.attributes;
        if (attrs) {
          const parts = [];
          if (attrs.color || attrs.Renk) parts.push(`Renk: ${attrs.color || attrs.Renk}`);
          if (attrs.size || attrs.Beden) parts.push(`Beden: ${attrs.size || attrs.Beden}`);
          if (parts.length > 0) attrText = parts.join(' • ');
        }
      } catch (e) {}

      const lineTotal = (it.price || 0) * (it.quantity || 1);

      return `
        <tr style="border-bottom:1px solid #F1F5F9; font-size:13px;">
          <td style="padding:12px 8px; vertical-align:top;">
            <div style="font-weight:600; color:#1E293B;">${it.title || 'Ürün'}</div>
            ${attrText ? `<div style="font-size:11px; color:#64748B; margin-top:2px;">${attrText}</div>` : ''}
          </td>
          <td style="padding:12px 8px; text-align:center; color:#475569; vertical-align:top;">
            ${it.quantity}
          </td>
          <td style="padding:12px 8px; text-align:right; color:#475569; vertical-align:top; white-space:nowrap;">
            ${formatCurrency(it.price)}
          </td>
          <td style="padding:12px 8px; text-align:right; font-weight:600; color:#0F172A; vertical-align:top; white-space:nowrap;">
            ${formatCurrency(lineTotal)}
          </td>
        </tr>
      `;
    }).join('');

    // HTML Email template
    const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin:0; padding:0; background-color:#F8FAFC; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F8FAFC; padding:25px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05); border:1px solid #E2E8F0;">
                
                <!-- HEADER -->
                <tr>
                  <td style="background:#FFFFFF; padding:28px 24px; text-align:center; border-bottom:1px solid #F1F5F9;">
                    <h1 style="margin:0; font-size:26px; font-weight:800; color:#1E293B; letter-spacing:-0.5px;">
                      ${settings.company_name || 'ESLA KIDS'}
                    </h1>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; font-weight:600;">
                      Bebek & Çocuk Giyim
                    </p>
                  </td>
                </tr>

                <!-- STATUS BANNER -->
                <tr>
                  <td style="padding:24px 24px 16px 24px;">
                    <div style="background:${badge.bg}; color:${badge.text}; padding:10px 16px; border-radius:12px; text-align:center; font-weight:700; font-size:15px; margin-bottom:20px;">
                      ${titles[type] || 'Sipariş Bilgilendirmesi'}
                    </div>

                    <p style="margin:0 0 12px 0; font-size:15px; color:#334155; line-height:1.5;">
                      Sayın <strong>${customerName}</strong>,
                    </p>
                    <p style="margin:0 0 20px 0; font-size:14px; color:#64748B; line-height:1.6;">
                      ${order.orderNumber} numaralı siparişiniz sistemimize kaydedilmiştir. Siparişinizin detayları aşağıda yer almaktadır:
                    </p>

                    <!-- ORDER INFO BOX -->
                    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F8FAFC; border-radius:12px; padding:16px; margin-bottom:24px; font-size:13px;">
                      <tr>
                        <td style="padding:6px 0; color:#64748B;">Sipariş Numarası:</td>
                        <td style="padding:6px 0; text-align:right; font-weight:700; color:#0F172A; font-family:monospace; font-size:14px;">
                          ${order.orderNumber}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#64748B;">Ödeme Yöntemi:</td>
                        <td style="padding:6px 0; text-align:right; font-weight:600; color:#0F172A;">
                          ${paymentMethodText}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; color:#64748B;">Ödeme Durumu:</td>
                        <td style="padding:6px 0; text-align:right; font-weight:600; color:${paymentStatusColor};">
                          ${paymentStatusText}
                        </td>
                      </tr>
                    </table>

                    ${trackingHtml}
                    ${havaleHtml}

                    <!-- PRODUCTS TITLE -->
                    <h3 style="margin:24px 0 10px 0; font-size:14px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">
                      Sipariş Edilen Ürünler
                    </h3>

                    <!-- PRODUCTS TABLE -->
                    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
                      <thead>
                        <tr style="border-bottom:2px solid #E2E8F0; text-align:left; font-size:11px; color:#64748B; text-transform:uppercase;">
                          <th style="padding:8px 8px 10px 8px;">Ürün</th>
                          <th style="padding:8px 8px 10px 8px; text-align:center;">Adet</th>
                          <th style="padding:8px 8px 10px 8px; text-align:right;">Fiyat</th>
                          <th style="padding:8px 8px 10px 8px; text-align:right;">Tutar</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>

                    <!-- TOTALS BREAKDOWN -->
                    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F8FAFC; border-radius:12px; padding:16px; margin-bottom:24px; font-size:13px;">
                      <tr>
                        <td style="padding:4px 0; color:#64748B;">Ara Toplam:</td>
                        <td style="padding:4px 0; text-align:right; font-weight:600; color:#1E293B;">
                          ${formatCurrency(order.subtotal || 0)}
                        </td>
                      </tr>
                      ${order.discountAmount ? `
                      <tr>
                        <td style="padding:4px 0; color:#059669;">İndirim:</td>
                        <td style="padding:4px 0; text-align:right; font-weight:600; color:#059669;">
                          -${formatCurrency(order.discountAmount)}
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:4px 0; color:#64748B;">Kargo:</td>
                        <td style="padding:4px 0; text-align:right; font-weight:600; color:#1E293B;">
                          ${(order.shippingFee || 0) > 0 ? formatCurrency(order.shippingFee) : 'Ücretsiz Kargo'}
                        </td>
                      </tr>
                      ${order.codFee ? `
                      <tr>
                        <td style="padding:4px 0; color:#64748B;">Kapıda Ödeme Bedeli:</td>
                        <td style="padding:4px 0; text-align:right; font-weight:600; color:#1E293B;">
                          ${formatCurrency(order.codFee)}
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:10px 0 0 0; border-top:1px solid #CBD5E1; font-size:15px; font-weight:700; color:#0F172A;">
                          Genel Toplam:
                        </td>
                        <td style="padding:10px 0 0 0; border-top:1px solid #CBD5E1; text-align:right; font-size:16px; font-weight:800; color:#E11D48;">
                          ${formatCurrency(order.totalAmount || 0)}
                        </td>
                      </tr>
                    </table>

                    <!-- DELIVERY ADDRESS -->
                    <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:16px; margin-bottom:24px;">
                      <h4 style="margin:0 0 8px 0; font-size:13px; font-weight:700; color:#0F172A;">
                        📍 Teslimat Adresi
                      </h4>
                      <div style="font-size:13px; color:#475569; line-height:1.6;">
                        ${addressLines}
                      </div>
                    </div>

                    <!-- SUPPORT INFO -->
                    <div style="text-align:center; padding:16px 0; border-top:1px dashed #E2E8F0;">
                      <p style="margin:0 0 6px 0; font-size:13px; color:#64748B;">
                        Siparişinizle ilgili herhangi bir sorunuz olursa bize her zaman ulaşabilirsiniz:
                      </p>
                      <p style="margin:0; font-size:13px; font-weight:600; color:#1E293B;">
                        WhatsApp / Tel: <strong>${settings.phone || '0538 920 92 16'}</strong> • E-posta: <strong>${settings.email || 'info@eslakids.com'}</strong>
                      </p>
                    </div>

                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="background:#F1F5F9; padding:20px; text-align:center; font-size:11px; color:#94A3B8; border-top:1px solid #E2E8F0;">
                    © ${new Date().getFullYear()} ${settings.company_name || 'Esla Kids'}. Tüm hakları saklıdır.<br>
                    Bu e-posta siparişinizle ilgili bilgilendirme amacıyla otomatik olarak gönderilmiştir.
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const smtpHost = settings.smtp_host || 'smtp.hostinger.com';
    const smtpPort = parseInt(settings.smtp_port || '465');
    const isSsl = smtpPort === 465;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSsl,
      auth: {
        user: settings.smtp_user || 'info@eslakids.com',
        pass: settings.smtp_pass || 'Tpass147852*',
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const fromAddress = settings.smtp_from || `Esla Kids <info@eslakids.com>`;
    const storeEmail = settings.email || settings.smtp_user || 'info@eslakids.com';

    await transporter.sendMail({
      from: fromAddress,
      to,
      bcc: storeEmail, // Also notify store owner
      subject,
      html,
    });

    console.log(`[EMAIL SENT] Order ${order.orderNumber} notification (${type}) sent to ${to} and bcc ${storeEmail}`);
  } catch (err: any) {
    console.error('[EMAIL ERROR] Failed to send order notification email:', err?.message || err);
  }
}
