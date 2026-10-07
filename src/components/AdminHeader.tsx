'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between no-print flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-heading font-extrabold text-slate-800 text-lg">
          Esla Kids Kontrol Merkezi
        </span>
        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Güvenli Oturum</span>
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

        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="font-bold text-slate-800">{user?.name || 'Esla Yönetici'}</div>
            <div className="text-[10px] text-slate-400">{user?.email || 'admin@eslakids.com'}</div>
          </div>

          <button
            onClick={handleLogout}
            title="Güvenli Çıkış Yap"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}