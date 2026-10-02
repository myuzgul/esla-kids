import React from 'react';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { ShieldAlert, Clock, User, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  const logs = await prisma.activityLog.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-indigo-600" />
          <h1 className="font-heading font-black text-2xl text-slate-900">
            Sistem Güvenlik & Denetim Logları
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Fiyat değişiklikleri, sipariş durum hareketleri, PayTR Ödeme bildirimleri ve kullanıcı hareketleri kayıt altına alınır.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-3">İşlem</th>
                <th className="py-3 px-3">Varlık / Modül</th>
                <th className="py-3 px-3">İşlemi Yapan</th>
                <th className="py-3 px-4">Ayrıntılar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Henüz kayıtlı sistem logu bulunmuyor.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {log.entity}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {log.performedBy}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px] truncate max-w-xs">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
