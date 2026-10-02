'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle, Loader2 } from 'lucide-react';

export function GirisClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/hesabim';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMsg(res.error || 'Giriş yapılamadı.');
      } else {
        router.push(returnUrl);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-cream-50/50">
      <div className="w-full max-w-md bg-white rounded-3xl border border-cream-200 shadow-xl p-8 sm:p-10 space-y-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto shadow-inner">
            <UserCheck className="w-7 h-7" />
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-charcoal-900">
            Üye Girişi
          </h1>
          <p className="text-xs text-charcoal-500">
            Siparişlerinizi takip etmek ve hızlı alışveriş için giriş yapın
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-charcoal-700 uppercase block mb-1.5">
              E-Posta Adresi
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adiniz@example.com"
                className="w-full bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 pl-10 text-xs text-charcoal-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
              />
              <Mail className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-charcoal-700 uppercase block">
                Şifre
              </label>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 pl-10 text-xs text-charcoal-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
              />
              <Lock className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm py-3.5 rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Giriş Yapılıyor...</span>
              </>
            ) : (
              <>
                <span>Giriş Yap</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-cream-100 text-center space-y-3">
          <p className="text-xs text-charcoal-500">
            Henüz bir hesabınız yok mu?{' '}
            <Link
              href={`/kayit${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="font-bold text-brand-600 hover:underline"
            >
              Hemen Kayıt Olun
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-charcoal-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit SSL ile güvenli üyelik ve şifrelenmiş veri</span>
          </div>
        </div>
      </div>
    </div>
  );
}
