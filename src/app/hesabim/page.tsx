import React from 'react';
import { HesabimClient } from './HesabimClient';

export const metadata = {
  title: 'Hesabım | Esla Kids',
  description: 'Siparişleriniz, kayıtlı adresleriniz ve hesap detaylarınız.',
};

export default function AccountPage() {
  return <HesabimClient />;
}
