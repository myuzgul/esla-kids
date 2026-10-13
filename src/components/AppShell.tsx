'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-x-hidden w-full max-w-full pb-16 md:pb-0">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
      <MobileBottomNav />
    </>
  );
}
