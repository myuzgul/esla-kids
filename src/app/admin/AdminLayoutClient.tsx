'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminHeader } from '@/components/AdminHeader';
import { Loader2 } from 'lucide-react';

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!loading) {
      if (isLoginPage) {
        if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'WAREHOUSE')) {
          router.replace('/admin');
        }
      } else {
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'WAREHOUSE')) {
          router.replace('/admin/login');
        }
      }
    }
  }, [user, loading, isLoginPage, router]);

  // If on login page, render clean full-screen login without sidebar/header
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If still checking auth or unauthorized, show smooth loading screen
  if (loading || !user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'WAREHOUSE')) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Yönetici Oturumu Doğrulanıyor...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <AdminHeader onOpenMobile={() => setMobileOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 p-3.5 sm:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}