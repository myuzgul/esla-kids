'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingCart, CheckSquare, Printer, 
  Package, Layers, Users, Ticket, RefreshCw, 
  BarChart3, Settings, ShieldAlert, ArrowLeft, ExternalLink,
  BadgePercent, Image as ImageIcon, Star, MessageSquareQuote
} from 'lucide-react';

interface MenuItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  highlight?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Siparişler', href: '/admin/siparisler', icon: ShoppingCart },
  { label: 'Ürün Yönetimi', href: '/admin/urunler', icon: Package },
  { label: 'Ürün Yorumları', href: '/admin/yorumlar', icon: MessageSquareQuote },
  { label: 'Anasayfa Vitrin', href: '/admin/vitrin', icon: Star },
  { label: 'Toplu Fiyat Güncelleme', href: '/admin/toplu-fiyat', icon: BadgePercent },
  { label: 'Banner Yönetimi', href: '/admin/bannerlar', icon: ImageIcon },
  { label: 'Kategoriler', href: '/admin/kategoriler', icon: Layers },
  { label: 'Müşteriler', href: '/admin/musteriler', icon: Users },
  { label: 'Kuponlar', href: '/admin/kuponlar', icon: Ticket },
  { label: 'WooCommerce Aktarım', href: '/admin/woocommerce', icon: RefreshCw, highlight: true },
  { label: 'Raporlar & Analiz', href: '/admin/raporlar', icon: BarChart3 },
  { label: 'Sistem Logları', href: '/admin/loglar', icon: ShieldAlert },
  { label: 'Site Ayarları', href: '/admin/ayarlar', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-charcoal-900 text-slate-300 min-h-screen flex flex-col justify-between flex-shrink-0 no-print">
      <div>
        {/* Brand header */}
        <div className="p-5 border-b border-charcoal-800 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              E
            </div>
            <div>
              <div className="font-heading font-extrabold text-white text-base tracking-tight">
                ESLA KIDS
              </div>
              <div className="text-[10px] text-brand-400 font-semibold tracking-wider uppercase">
                YÖNETİM PANELİ
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : item.highlight
                    ? 'text-amber-300 hover:bg-charcoal-800 hover:text-white'
                    : 'text-slate-300 hover:bg-charcoal-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer link to storefront */}
      <div className="p-4 border-t border-charcoal-800 bg-charcoal-900/50 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-charcoal-800 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-brand-400" />
            <span>Mağazayı Gör</span>
          </div>
          <span className="text-[10px] text-slate-500">Yeni sekme</span>
        </Link>
      </div>
    </aside>
  );
}
