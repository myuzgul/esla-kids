import React from 'react';
import { AdminLoginClient } from './AdminLoginClient';

export const metadata = {
  title: 'Yönetici Girişi | Esla Kids Admin',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminLoginClient />;
}