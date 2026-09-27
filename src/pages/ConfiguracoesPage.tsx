import React, { useState } from 'react';
import { Building, Sliders, Database, Save, CheckCircle2 } from 'lucide-react';

export const ConfiguracoesPage: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [companyName, setCompanyName] = useState('UZE DOCTOR Jalecos de Alta Costura');
  const [cnpj, setCnpj] = useState('38.912.440/0001-92');
  const [address, setAddress] = useState('Av. Brigadeiro Faria Lima, 2200 - São Paulo/SP');
  const [email, setEmail] = useState('contato@uzedoctor.com.br');

  const [defaultMinStock, setDefaultMinStock] = useState(5);
  const [enableLowStockAlert, setEnableLowStockAlert] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="pb-2 border-b border-[#E5E7EB]">
        <h2 className="text-base font-bold text-[#171A21]">Configurações da Empresa</h2>
        <p className="text-xs text-[#667085]">
          Dados cadastrais, políticas de estoque e integração de sistema
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-600" /> Configurações salvas com sucesso!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Section 1: Company Profile */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 border-b border-[#F3F4F6] pb-3">
            <Building size={16} className="text-[#173E75]" />
            <h3 className="text-sm font-bold text-[#171A21]">Dados da Empresa</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-[#667085] uppercase block mb-1">Razão Social / Nome Fantasia *</label>
              <input
                type="text"
                className="uze-input text-xs"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#667085] uppercase block mb-1">CNPJ *</label>
              <input
                type="text"
                className="uze-input text-xs"
                value={cnpj}
                onChange={e => setCnpj(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#667085] uppercase block mb-1">Endereço Comercial</label>
              <input
                type="text"
                className="uze-input text-xs"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#667085] uppercase block mb-1">E-mail Corporativo</label>
              <input
                type="email"
                className="uze-input text-xs"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Inventory & System Rules */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 border-b border-[#F3F4F6] pb-3">
            <Sliders size={16} className="text-[#C69A43]" />
            <h3 className="text-sm font-bold text-[#171A21]">Políticas de Estoque</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
              <div>
                <span className="font-semibold text-[#171A21] block">Estoque Mínimo Padrão</span>
                <span className="text-[#667085]">Quantidade para disparar alerta visual de reposição</span>
              </div>
              <input
                type="number"
                className="w-16 h-8 text-center font-bold bg-white border border-[#E5E7EB] rounded text-xs"
                value={defaultMinStock}
                onChange={e => setDefaultMinStock(parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
              <div>
                <span className="font-semibold text-[#171A21] block">Avisos no Dashboard</span>
                <span className="text-[#667085]">Exibir alerta quando houver itens esgotados</span>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#173E75] cursor-pointer"
                checked={enableLowStockAlert}
                onChange={e => setEnableLowStockAlert(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Future API Readiness */}
        <div className="bg-[#07101F] text-white rounded-lg p-5 space-y-3 border border-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Database size={16} className="text-[#C69A43]" />
            <h3 className="text-sm font-bold text-white">Preparação de Integração Backend</h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Camada de serviços e entidades normalizadas (IDs estáveis e tipagem estrita).
          </p>
          <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-[11px] font-mono text-slate-400">
            Endpoint Base: <span className="text-[#C69A43]">https://api.uzedoctor.com.br/v1/erp</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="uze-btn-primary text-xs shadow-md">
            <Save size={14} /> Salvar Parâmetros
          </button>
        </div>
      </form>
    </div>
  );
};
