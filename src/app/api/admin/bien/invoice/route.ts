import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createBienInvoice, getBienInvoicePdf, testBienConnection } from '@/lib/bien';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderId, isDraft, customTckn, customTitle, customTaxOffice } = body;

    // Test bağlantısı sorgusu
    if (action === 'test_connection') {
      const result = await testBienConnection();
      return NextResponse.json(result);
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Sipariş ID gereklidir.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
    }

    // Fatura kes
    const result = await createBienInvoice(order.id, {
      isDraft: Boolean(isDraft),
      customTckn,
      customTitle,
      customTaxOffice,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Fatura oluşturulamadı.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Bien Route] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Fatura işlemi sırasında bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const uuid = searchParams.get('uuid');

    let targetUuid = uuid;
    let fileName = 'fatura.pdf';

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!order || !order.invoiceUuid) {
        return new NextResponse('Bu sipariş için henüz fatura oluşturulmamış.', { status: 404 });
      }
      targetUuid = order.invoiceUuid;
      fileName = `fatura-${order.invoiceNumber || order.orderNumber}.pdf`;
    }

    if (!targetUuid) {
      return new NextResponse('Fatura UUID veya Sipariş ID gereklidir.', { status: 400 });
    }

    const pdfBuffer = await getBienInvoicePdf(targetUuid);
    if (!pdfBuffer) {
      return new NextResponse('Fatura PDF dosyası Bien Portal üzerinden alınamadı.', { status: 404 });
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[Bien PDF Route] Error:', err);
    return new NextResponse('PDF yüklenirken hata oluştu.', { status: 500 });
  }
}
