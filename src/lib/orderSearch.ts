import { Prisma } from '@prisma/client';

export interface OrderSearchOptions {
  q?: string | null;
  status?: string | null;
  printStatus?: string | null;
  searchAllStatusesIfQuery?: boolean;
}

export function buildOrderSearchWhere(options: OrderSearchOptions): Prisma.OrderWhereInput {
  const { q, status, printStatus, searchAllStatusesIfQuery } = options;
  const where: any = {};

  const hasQuery = Boolean(q && q.trim().length > 0);

  // Status filter (unless searchAllStatusesIfQuery is true and query is present)
  if (status && status !== 'ALL' && (!hasQuery || !searchAllStatusesIfQuery)) {
    if (status === 'CONFIRMED') {
      where.status = { in: ['CONFIRMED', 'NEW', 'APPROVED'] };
    } else if (status === 'PACKED') {
      where.status = { in: ['PACKED', 'PRINTED', 'PREPARING'] };
    } else {
      where.status = status;
    }
  }

  // Print status filter
  if (printStatus === 'unprinted') {
    where.isPrinted = false;
  } else if (printStatus === 'printed') {
    where.isPrinted = true;
  }

  if (hasQuery) {
    const raw = q!.trim();
    const cleanNum = raw.replace(/^#+/, '').trim();
    const isNumeric = /^\d+$/.test(cleanNum);

    const variations = new Set<string>();
    variations.add(raw);
    variations.add(cleanNum);
    if (isNumeric) {
      variations.add(`EK-${cleanNum}`);
      variations.add(`EK${cleanNum}`);
    }
    if (/^EK\d+$/i.test(cleanNum)) {
      variations.add(`EK-${cleanNum.substring(2)}`);
      variations.add(cleanNum.substring(2));
    }

    const orConditions: any[] = [];

    // Order number matches
    for (const v of variations) {
      orConditions.push({ orderNumber: { contains: v, mode: 'insensitive' } });
    }

    // Customer & Guest details
    orConditions.push(
      { guestName: { contains: raw, mode: 'insensitive' } },
      { guestPhone: { contains: raw, mode: 'insensitive' } },
      { guestEmail: { contains: raw, mode: 'insensitive' } },
      { trackingNumber: { contains: raw, mode: 'insensitive' } },
      { trackingCompany: { contains: raw, mode: 'insensitive' } },
      { shippingAddress: { contains: raw, mode: 'insensitive' } },
      { billingAddress: { contains: raw, mode: 'insensitive' } },
      { customerNote: { contains: raw, mode: 'insensitive' } },
      { internalNote: { contains: raw, mode: 'insensitive' } },
      {
        customer: {
          OR: [
            { name: { contains: raw, mode: 'insensitive' } },
            { phone: { contains: raw, mode: 'insensitive' } },
            { email: { contains: raw, mode: 'insensitive' } },
          ],
        },
      },
      {
        items: {
          some: {
            OR: [
              { title: { contains: raw, mode: 'insensitive' } },
              { sku: { contains: raw, mode: 'insensitive' } },
              { barcode: { contains: raw, mode: 'insensitive' } },
              { variationName: { contains: raw, mode: 'insensitive' } },
            ],
          },
        },
      }
    );

    // Phone digits match (e.g. "0538 920 92 16" -> "5389209216")
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 4) {
      orConditions.push(
        { guestPhone: { contains: digits, mode: 'insensitive' } },
        { customer: { phone: { contains: digits, mode: 'insensitive' } } }
      );
      if (digits.startsWith('0')) {
        const noZero = digits.substring(1);
        orConditions.push(
          { guestPhone: { contains: noZero, mode: 'insensitive' } },
          { customer: { phone: { contains: noZero, mode: 'insensitive' } } }
        );
      } else {
        const withZero = '0' + digits;
        orConditions.push(
          { guestPhone: { contains: withZero, mode: 'insensitive' } },
          { customer: { phone: { contains: withZero, mode: 'insensitive' } } }
        );
      }
    }

    where.OR = orConditions;
  }

  return where;
}
