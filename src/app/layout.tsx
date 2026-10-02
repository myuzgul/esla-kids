import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Esla Kids | Premium Bebek ve Çocuk Giyim',
  description: 'En şık ve kaliteli erkek çocuk, kız bebek, erkek bebek ve kız çocuk takımları, elbiseler ve pijama modelleri Esla Kids güvencesiyle.',
  keywords: 'çocuk giyim, bebek giyim, erkek çocuk takım, kız bebek elbise, pijama takımı, esla kids',
  openGraph: {
    title: 'Esla Kids | Bebek ve Çocuk Giyim',
    description: 'En şık ve kaliteli bebek & çocuk takımları.',
    url: 'https://eslakids.com',
    siteName: 'Esla Kids',
    locale: 'tr_TR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="bg-white text-charcoal-800 font-sans selection:bg-brand-100 selection:text-brand-900">
        <AuthProvider>
          <CartProvider>
            <AppShell>
              {children}
            </AppShell>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
