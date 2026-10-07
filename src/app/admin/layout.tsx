import React from 'react';
import { AdminLayoutClient } from './AdminLayoutClient';

export const metadata = {
  title: 'Esla Kids | Yönetim Paneli',
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}