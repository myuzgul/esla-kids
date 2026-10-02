import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings, invalidateSettingsCache } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getSettings(true);
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    console.error('Settings fetch error:', err);
    return NextResponse.json({ error: 'Ayarlar getirilemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const settingsMap = await req.json();

    for (const [key, value] of Object.entries(settingsMap)) {
      if (value === undefined || value === null) continue;
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    // Invalidate cache immediately
    invalidateSettingsCache();

    // Log update
    await prisma.activityLog.create({
      data: {
        action: 'SETTINGS_UPDATED',
        entity: 'Setting',
        performedBy: 'Yönetici',
        details: 'Site ayarları güncellendi',
      },
    });

    const updated = await getSettings(true);
    return NextResponse.json({ success: true, message: 'Ayarlar başarıyla kaydedildi!', settings: updated });
  } catch (err: any) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: 'Ayarlar kaydedilemedi' }, { status: 500 });
  }
}
