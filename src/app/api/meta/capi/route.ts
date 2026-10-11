import { NextRequest, NextResponse } from 'next/server';
import { sendMetaServerEvent } from '@/lib/metaCapiServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventName,
      eventId,
      eventTime,
      eventSourceUrl,
      customData,
      userData = {},
      testEventCode,
    } = body;

    if (!eventName) {
      return NextResponse.json({ error: 'eventName is required' }, { status: 400 });
    }

    // Extract Client IP
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip')?.trim() ||
      '';

    // Extract Client User Agent
    const clientUserAgent = req.headers.get('user-agent') || '';

    // Extract Meta Cookies (_fbp, _fbc)
    const cookies = req.cookies;
    const fbp = cookies.get('_fbp')?.value;
    const fbc = cookies.get('_fbc')?.value;

    const result = await sendMetaServerEvent({
      eventName,
      eventId,
      eventTime,
      eventSourceUrl: eventSourceUrl || req.headers.get('referer') || 'https://eslakids.com',
      clientIp,
      clientUserAgent,
      fbp,
      fbc,
      customData,
      userData,
      testEventCode,
    });

    if ('skipped' in result && result.skipped) {
      return NextResponse.json(result, { status: 200 });
    }

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[Meta CAPI Route Exception]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
