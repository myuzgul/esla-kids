import React from 'react';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { Ticket, Plus, Tag, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-heading font-black text-2xl text-slate-900">
            Kupon & Kampanya Yönetimi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            İndirim kodları, sepet limitleri ve kullanım istatistikleri
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {coupons.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-black text-base text-brand-600 bg-brand-50 px-3 py-1 rounded-xl border border-brand-200">
                {c.code}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {c.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>İndirim Değeri:</span>
                <strong className="text-slate-900">
                  {c.discountType === 'PERCENT' ? `%${c.discountValue}` : `${c.discountValue} TL`}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Min. Sepet Tutarı:</span>
                <strong className="text-slate-900">{c.minSpend ? `${c.minSpend} TL` : 'Limitsiz'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Kullanım Sayısı:</span>
                <strong className="text-slate-900">{c.usageCount} / {c.usageLimit || 'Sınırsız'}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
