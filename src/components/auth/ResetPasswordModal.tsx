import React, { useState } from 'react';
import { KeyRound, Lock, Check, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ResetPasswordModal: React.FC = () => {
  const { isPasswordRecovery, completePasswordRecovery, setIsPasswordRecovery } = useAuth();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isPasswordRecovery) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Preencha os dois campos de senha.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As novas senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await completePasswordRecovery(newPassword);
      if (!res.success) {
        setError(res.error || 'Falha ao redefinir a nova senha.');
      } else {
        setSuccess(true);
        setTimeout(() => {
          setIsPasswordRecovery(false);
        }, 2000);
      }
    } catch {
      setError('Erro de comunicação com o Supabase Auth ao redefinir a senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07101F]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0B1528] border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.7)] animate-fadeIn">
        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#C69A43]/15 text-[#C69A43] border border-[#C69A43]/30 mb-3">
            <KeyRound size={24} />
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide">
            Definir Nova Senha
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Link de recuperação validado pelo Supabase Auth. Digite sua nova senha de acesso abaixo.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={15} className="text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>Senha alterada com sucesso! Redirecionando...</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nova Senha *
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-10 pl-9 pr-3 text-xs bg-[#07101F] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 font-medium focus:border-[#C69A43] focus:ring-1 focus:ring-[#C69A43] outline-none"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Confirmar Nova Senha *
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Repita a nova senha"
                  className="w-full h-10 pl-9 pr-3 text-xs bg-[#07101F] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 font-medium focus:border-[#C69A43] focus:ring-1 focus:ring-[#C69A43] outline-none"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 bg-[#C69A43] hover:bg-[#d8a94d] text-[#07101F] font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Salvando no Supabase...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Salvar Nova Senha</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPasswordRecovery(false)}
                className="w-full h-9 bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
