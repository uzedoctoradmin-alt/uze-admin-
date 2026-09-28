import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Informe o usuário e a senha para acessar.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Usuário ou senha inválidos.');
      }
    } catch {
      setErrorMessage('Falha ao processar login. Verifique sua conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#07101F] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Decorative Refined Elements */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#173E75]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#C69A43]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-[#0B1528] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10">
        {/* Brand Emblem */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white p-2.5 border border-[#C69A43]/50 shadow-2xl mb-4 overflow-hidden">
            <img src="/logo.png" alt="UZE DOCTOR" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-widest text-white uppercase">
            UZE <span className="text-[#C69A43]">DOCTOR</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide mt-1 uppercase">
            Sistema de Gestão Empresarial
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div 
            role="alert"
            className="mb-5 p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Usuário (E-mail)
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="nome@uzedoctor.com.br"
                className="w-full h-11 pl-10 pr-3.5 text-xs bg-[#07101F] border border-slate-700 rounded-xl text-white placeholder:text-slate-500 font-medium focus:border-[#C69A43] focus:ring-2 focus:ring-[#C69A43]/20 outline-none transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full h-11 pl-10 pr-3.5 text-xs bg-[#07101F] border border-slate-700 rounded-xl text-white placeholder:text-slate-500 font-medium focus:border-[#C69A43] focus:ring-2 focus:ring-[#C69A43]/20 outline-none transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 mt-2 bg-[#C69A43] hover:bg-[#d8a94d] active:scale-[0.99] text-[#07101F] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Entrar</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Notice */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck size={14} className="text-[#C69A43]" />
          <span>Acesso corporativo restrito e monitorado</span>
        </div>
      </div>
    </div>
  );
};
