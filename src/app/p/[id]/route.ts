import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.redirect(new URL('/', req.url), 302);
  }

  const decoded = decodeURIComponent(id).trim();

  // Try matching by id, sku, or wooId
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { id: decoded },
        { sku: decoded },
        { sku: decoded.split('-VAR-')[0] },
        { slug: decoded },
        { slug: decoded.replace(/%100/g, '100').replace(/%/g, '') },
        ...(!isNaN(Number(decoded)) ? [{ wooId: Number(decoded) }] : []),
      ],
    },
    select: { slug: true },
  });

  if (product?.slug) {
    return NextResponse.redirect(new URL('/urun/' + product.slug, req.url), 301);
  }

  return NextResponse.redirect(new URL('/', req.url), 302);
}
