import React from 'react';
import { AdminSidebar } from '@/components/AdminSidebar';
import { User, Bell, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Esla Kids | Yönetim Paneli',
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between no-print flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-heading font-extrabold text-slate-800 text-lg">
              Esla Kids Kontrol Merkezi
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
              ? Sistem Aktif & çevrimiçi
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              <span>Mağaza Vitrini</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                EY
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-bold text-slate-800">Esla Yönetici</div>
                <div className="text-[10px] text-slate-400">admin@eslakids.com</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
