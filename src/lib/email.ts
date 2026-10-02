import nodemailer from 'nodemailer';
import { getSettings } from './settings';

export async function sendOrderNotificationEmail(order: any, type: 'CREATED' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED') {
  const settings = await getSettings();

  const to = order.guestEmail || order.customer?.email;
  if (!to) return;

  const titles: Record<string, string> = {
    CREATED: 'Siparişiniz Alındı',
    CONFIRMED: 'Siparişiniz Onaylandı',
    PREPARING: 'Siparişiniz Hazırlanıyor',
    SHIPPED: 'Siparişiniz Kargoya Verildi',
    DELIVERED: 'Siparişiniz Teslim Edildi',
  };

  const subject = `${settings.company_name} - ${titles[type] || 'Sipariş Durumu'} (#${order.orderNumber})`;

  let trackingHtml = '';
  if (type === 'SHIPPED' && order.trackingNumber) {
    trackingHtml = `
      <div style="background:#F4F8FA; border-left:4px solid #7BA4B5; padding:15px; margin:20px 0; border-radius:6px;">
        <h4 style="margin:0 0 8px 0; color:#2D3142;">Kargo Takip Bilgileri</h4>
        <p style="margin:0; font-size:14px; color:#4B4F63;">
          <strong>Kargo Firması:</strong> ${order.trackingCompany || 'Yurtiçi Kargo'}<br>
          <strong>Takip Numarası:</strong> ${order.trackingNumber}
        </p>
      </div>
    `;
  }

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width:600px; margin:0 auto; padding:25px; border:1px solid #EBE6DF; border-radius:12px; background:#FFFFFF;">
      <div style="text-align:center; padding-bottom:20px; border-bottom:1px solid #FAF7F2;">
        <h1 style="color:#E88D9C; margin:0; font-size:26px; font-weight:700;">${settings.company_name}</h1>
        <p style="color:#7E8299; margin:5px 0 0 0; font-size:13px;">Premium Bebek ve Çocuk Giyim</p>
      </div>

      <div style="padding:25px 0;">
        <h2 style="color:#2D3142; font-size:18px; margin-top:0;">Sayın ${order.guestName || 'Müşterimiz'},</h2>
        <p style="color:#4B4F63; font-size:15px; line-height:1.6;">
          ${order.orderNumber} numaralı siparişinizle ilgili güncel durum bilgisi aşağıdadır:
        </p>

        <div style="background:#FAF7F2; border-radius:8px; padding:16px; margin:20px 0;">
          <strong style="color:#2D3142;">Durum:</strong> 
          <span style="display:inline-block; padding:4px 10px; border-radius:20px; background:#E88D9C; color:#fff; font-size:13px; font-weight:600; margin-left:8px;">
            ${titles[type] || order.status}
          </span>
        </div>

        ${trackingHtml}

        <p style="color:#7E8299; font-size:13px; margin-top:30px; text-align:center;">
          Herhangi bir sorunuz olursa bizimle <strong>${settings.phone}</strong> numarasından veya WhatsApp hattımızdan iletişime geçebilirsiniz.
        </p>
      </div>

      <div style="text-align:center; border-top:1px solid #FAF7F2; padding-top:20px; color:#A4C8D8; font-size:12px;">
        ? ${new Date().getFullYear()} ${settings.company_name}. Tüm hakları saklıdır.
      </div>
    </div>
  `;

  if (!settings.smtp_host || !settings.smtp_user) {
    console.log(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: parseInt(settings.smtp_port || '587'),
      secure: settings.smtp_port === '465',
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    await transporter.sendMail({
      from: settings.smtp_from || `${settings.company_name} <${settings.email}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL SENT] Notification sent to ${to} for order ${order.orderNumber}`);
  } catch (err) {
    console.error('[EMAIL ERROR] Failed to send email:', err);
  }
}
