import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const s = await getSettings(true);
    return NextResponse.json({
      success: true,
      settings: {
        site_title: s.site_title,
        company_name: s.company_name,
        phone: s.phone,
        email: s.email,
        whatsapp: s.whatsapp,
        address: s.address,
        free_shipping_limit: s.free_shipping_limit,
        shipping_fee: s.shipping_fee,
        shipping_company: s.shipping_company,
        havale_discount_percent: s.havale_discount_percent,
        havale_bank_info: s.havale_bank_info,
        cod_fee: s.cod_fee,
        cod_enabled: s.cod_enabled,
        paytr_enabled: s.paytr_enabled,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Ayarlar yüklenemedi' }, { status: 500 });
  }
}
