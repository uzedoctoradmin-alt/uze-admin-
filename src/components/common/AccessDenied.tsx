import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';

interface AccessDeniedProps {
  areaName?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ areaName = 'esta área' }) => {
  const { setCurrentTab } = useERP();
  const { user } = useAuth();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white border border-[#D0D5DD] rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert size={28} />
        </div>

        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-600 px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
            403 — Acesso Negado
          </span>
          <h3 className="text-base font-bold text-[#101828] mt-2">
            Permissão Insuficiente
          </h3>
          <p className="text-xs text-[#475467] mt-1 leading-relaxed">
            Seu perfil atual (<strong>{user?.role || 'Visitante'}</strong>) não possui autorização para acessar {areaName}. As tentativas de acesso a áreas restritas são registradas nos logs de segurança.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="uze-btn-primary text-xs w-full flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Retornar à Visão Geral</span>
          </button>
        </div>
      </div>
    </div>
  );
};
