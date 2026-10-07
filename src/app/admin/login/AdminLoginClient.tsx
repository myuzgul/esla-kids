'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, Mail, ShieldAlert, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AdminLoginClient() {
  const router = useRouter();
  const { login, refreshUser } = useAuth();
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
        setErrorMsg(res.error || 'E-posta veya şifre hatalı.');
        return;
      }

      await refreshUser();
      // Hard redirect to ensure full session state is loaded cleanly
      window.location.href = '/admin';
    } catch (err: any) {
      setErrorMsg(err.message || 'Bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand & Security Header */}
        <div className="text-center space-y-3">
          <div className="relative w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center p-2 shadow-inner">
            <Image
              src="/uploads/eslasiyahlogo.png"
              alt="Esla Kids Logo"
              width={56}
              height={56}
              className="w-full h-full object-contain invert brightness-200"
            />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-black text-white tracking-tight">
              ESLA KIDS
            </h1>
            <p className="text-xs font-semibold text-brand-400 tracking-wider uppercase mt-0.5">
              Yönetici Kontrol Paneli
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Güvenli erişim için yönetici kimlik bilgilerinizi girin.
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-400" />
              <span>Yönetici E-posta</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@eslakids.com"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-400" />
              <span>Şifre</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Doğrulanıyor...</span>
              </>
            ) : (
              <>
                <span>Panele Giriş Yap</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="pt-2 border-t border-slate-700/60 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <KeyRound className="w-3 h-3 text-slate-500" />
            <span>256-Bit SSL Şifreli Güvenli Yönetim Oturumu</span>
          </div>
        </div>

      </div>
    </div>
  );
}