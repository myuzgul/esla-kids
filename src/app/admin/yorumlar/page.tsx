import React from 'react';
import { prisma } from '@/lib/prisma';
import { ReviewsTableClient } from './ReviewsTableClient';
import { MessageSquareQuote, CheckSquare, Clock } from 'lucide-react';

interface Props {
  searchParams: { status?: string; q?: string };
}

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage({ searchParams }: Props) {
  const { status, q } = searchParams;

  const where: any = {};

  if (status === 'pending') {
    where.isApproved = false;
  } else if (status === 'approved') {
    where.isApproved = true;
  }

  if (q) {
    where.OR = [
      { customerName: { contains: q } },
      { email: { contains: q } },
      { comment: { contains: q } },
      { product: { title: { contains: q } } },
    ];
  }

  const [reviews, totalCount, pendingCount, approvedCount] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        product: {
          select: { id: true, title: true, slug: true, images: true, price: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.count(),
    prisma.review.count({ where: { isApproved: false } }),
    prisma.review.count({ where: { isApproved: true } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-black text-2xl text-slate-900">
              Ürün Değerlendirmeleri & Yorumlar
            </h1>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-black animate-pulse">
                {pendingCount} Onay Bekliyor
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Müşterilerinizin ürünlerinize yaptığı fotoğraflı ve metinli yorumları inceleyin, onaylayın veya yönetin.
          </p>
        </div>
      </div>

      {/* Interactive Reviews Table */}
      <ReviewsTableClient
        initialReviews={reviews as any}
        counts={{
          total: totalCount,
          pending: pendingCount,
          approved: approvedCount,
        }}
        currentStatus={status || 'all'}
        currentQuery={q || ''}
      />
    </div>
  );
}
