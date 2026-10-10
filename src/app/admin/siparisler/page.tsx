import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { OrdersTableClient } from './OrdersTableClient';
import { buildOrderSearchWhere } from '@/lib/orderSearch';
import { Printer } from 'lucide-react';

interface Props {
  searchParams: { status?: string; q?: string; printStatus?: string; page?: string };
}

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status, q, printStatus } = searchParams;
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);

  const where = buildOrderSearchWhere({
    q,
    status,
    printStatus,
  });

  const baseWhereWithoutPrint = buildOrderSearchWhere({
    q,
    status,
  });

  const [totalCount, orders, unprintedCount, printedCount] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        items: true,
        customer: true,
      },
    }),
    prisma.order.count({ where: { ...baseWhereWithoutPrint, isPrinted: false } }),
    prisma.order.count({ where: { ...baseWhereWithoutPrint, isPrinted: true } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-heading font-black text-2xl text-slate-900">
            Sipariş Yönetimi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gelen siparişleri filtreleyin, hazırlayın, yazdırın veya kargoya verin. (Sayfa başı 30 sipariş)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unprintedCount > 0 && (
            <Link
              href="/admin/siparis-cikti"
              target="_blank"
              className="flex-1 sm:flex-none justify-center bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors text-center"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdırılmayanlar ({unprintedCount})</span>
            </Link>
          )}

          <Link
            href="/admin/siparis-cikti"
            target="_blank"
            className="flex-1 sm:flex-none justify-center bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors text-center"
          >
            <Printer className="w-4 h-4" />
            <span>Tümünü Yazdır</span>
          </Link>
        </div>
      </div>

      {/* Orders Table Client (Handles live search, filters, pagination, batch actions) */}
      <OrdersTableClient
        initialOrders={orders}
        initialTotalCount={totalCount}
        initialPage={page}
        pageSize={PAGE_SIZE}
        currentStatus={status || 'ALL'}
        currentPrintStatus={printStatus || 'ALL'}
        initialQuery={q || ''}
        unprintedCount={unprintedCount}
        printedCount={printedCount}
      />
    </div>
  );
}
