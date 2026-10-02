import { NextRequest, NextResponse } from 'next/server';
import { generateQrDataUrl } from '@/lib/qr';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text') || searchParams.get('url') || '';

  if (!text) {
    return NextResponse.json({ error: 'Text/URL required' }, { status: 400 });
  }

  const dataUrl = await generateQrDataUrl(text);
  return NextResponse.json({ dataUrl });
}
