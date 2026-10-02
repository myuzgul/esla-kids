import React from 'react';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDate } from '@/lib/utils';
import { Users, Mail, Phone, ShoppingBag } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  const customers = await prisma.customer.findMany({
    where: { role: 'CUSTOMER' },
    include: {
      orders: true,
      addresses: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="font-heading font-black text-2xl text-slate-900">
          Müşteri Yönetimi
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Kayıtlı müşteriler, sipariş geçmişleri ve harcama toplamları
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Müşteri</th>
                <th className="py-3 px-3">E-Posta</th>
                <th className="py-3 px-3">Telefon</th>
                <th className="py-3 px-3">Kayıt Tarihi</th>
                <th className="py-3 px-3">Sipariş Sayısı</th>
                <th className="py-3 px-4 text-right">Toplam Harcama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {customers.map((c) => {
                const totalSpent = c.orders.reduce((sum, o) => sum + o.totalAmount, 0);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-3 text-slate-600">{c.email}</td>
                    <td className="py-3 px-3">{c.phone || '-'}</td>
                    <td className="py-3 px-3 text-slate-400">{formatDate(c.createdAt)}</td>
                    <td className="py-3 px-3">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
                        {c.orders.length} Sipariş
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-brand-600">
                      {formatPrice(totalSpent)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
