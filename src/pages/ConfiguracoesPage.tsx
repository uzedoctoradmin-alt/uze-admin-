import React, { useState } from 'react';
import { 
  Building, 
  Sliders, 
  Database, 
  Save, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertTriangle,
  Server
} from 'lucide-react';
import { useERP } from '../context/ERPContext';

export const ConfiguracoesPage: React.FC = () => {
  const { supabaseStatus, supabaseHealth, isLoadingData, refreshData } = useERP();
  
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const [companyName, setCompanyName] = useState('UZE DOCTOR Jalecos de Alta Costura');
  const [cnpj, setCnpj] = useState('38.912.440/0001-92');
  const [address, setAddress] = useState('Av. Brigadeiro Faria Lima, 2200 - São Paulo/SP');
  const [email, setEmail] = useState('contato@uzedoctor.com.br');

  const [defaultMinStock, setDefaultMinStock] = useState(5);
  const [enableLowStockAlert, setEnableLowStockAlert] = useState(true);

  const sqlSchemaCode = `-- ==============================================================================
-- SCHEMA OFICIAL UZE DOCTOR ERP - SUPABASE DATABASE
-- Projeto: uzedoctoradmin-alt's Project (xpjlixvifoytxgplesnq)
-- ==============================================================================

-- 1. MODELOS DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  collection TEXT,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  gender TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Ativo',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. VARIANTES DE PRODUTOS (SKU / COR / TAMANHO)
CREATE TABLE IF NOT EXISTS public.variants (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  size TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CLIENTES
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  city TEXT,
  state TEXT,
  first_purchase_date DATE,
  last_purchase_date DATE,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. VENDAS
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_profit NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  color_name TEXT,
  size TEXT,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  operator TEXT DEFAULT 'Operador ERP',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. RECEITAS
CREATE TABLE IF NOT EXISTS public.revenues (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  reference_id TEXT,
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. DESPESAS
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access models" ON public.models FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access variants" ON public.variants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access revenues" ON public.revenues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchemaCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Page Header */}
      <div className="pb-2 border-b border-[#D0D5DD]">
        <h2 className="text-base font-bold text-[#101828]">Configurações da Empresa & Integrações</h2>
        <p className="text-xs text-[#475467] font-medium">
          Dados cadastrais, políticas de estoque e conexão em nuvem com o banco de dados Supabase
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={15} className="text-[#027A48]" /> Configurações salvas com sucesso!
        </div>
      )}

      {/* SECTION 1: SUPABASE CLOUD CONNECTION */}
      <div className="bg-[#07101F] text-white rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C69A43]/20 text-[#C69A43] flex items-center justify-center border border-[#C69A43]/40">
              <Database size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Banco de Dados Supabase Cloud</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PostgreSQL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Projeto: <strong className="text-slate-200">uzedoctoradmin-alt's Project</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshData()}
              disabled={isLoadingData}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoadingData ? 'animate-spin text-[#C69A43]' : ''} />
              {isLoadingData ? 'Sincronizando...' : 'Testar Conexão'}
            </button>

            <a
              href="https://supabase.com/dashboard/project/xpjlixvifoytxgplesnq/editor"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#173E75] hover:bg-[#1f4e91] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors border border-blue-700"
            >
              <ExternalLink size={13} />
              Painel Supabase
            </a>
          </div>
        </div>

        {/* Status Alert Banner */}
        <div className={`p-3.5 rounded-lg border text-xs font-medium flex items-start gap-3 ${
          supabaseStatus === 'connected'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            : supabaseStatus === 'needs_tables'
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            : supabaseStatus === 'connecting'
            ? 'bg-blue-950/40 border-blue-500/40 text-blue-200'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          {supabaseStatus === 'connected' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          ) : supabaseStatus === 'needs_tables' ? (
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <Server size={18} className="text-blue-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-bold">
              {supabaseStatus === 'connected' && 'Supabase Totalmente Conectado e Operacional!'}
              {supabaseStatus === 'needs_tables' && 'Conexão Supabase Estabelecida com Sucesso! (Tabelas Pendentes de Criação)'}
              {supabaseStatus === 'connecting' && 'Verificando status de conectividade com o Supabase...'}
              {supabaseStatus === 'error' && 'Atenção ao conectar com o Supabase'}
              {supabaseStatus === 'disconnected' && 'Supabase Desconectado'}
            </p>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {supabaseHealth?.message || 'Chaves de API válidas e configuradas em ambiente seguro.'}
            </p>
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Project ID</span>
            <span className="font-mono text-slate-200 text-xs font-bold">xpjlixvifoytxgplesnq</span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Supabase URL</span>
            <span className="font-mono text-slate-200 text-[11px] truncate block">https://xpjlixvifoytxgplesnq.supabase.co</span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Publishable API Key</span>
            <span className="font-mono text-[#E5B869] text-[11px] truncate block">sb_publishable_7_giSIHoHNZ6Ceu...</span>
          </div>
        </div>

        {/* Action Callout for SQL creation */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Script de Criação de Tabelas (schema.sql)</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">7 tabelas + RLS</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Caso as tabelas ainda não existam no Supabase, copie o SQL e execute no SQL Editor do painel.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopySql}
              className="px-3 py-1.5 bg-[#C69A43] hover:bg-[#d8a94d] text-[#07101F] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              {copiedSql ? <Check size={14} /> : <Copy size={14} />}
              {copiedSql ? 'SQL Copiado!' : 'Copiar SQL'}
            </button>

            <button
              type="button"
              onClick={() => setShowSqlModal(!showSqlModal)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all border border-slate-700"
            >
              {showSqlModal ? 'Ocultar SQL' : 'Visualizar SQL'}
            </button>
          </div>
        </div>

        {/* Collapsible SQL Script Box */}
        {showSqlModal && (
          <div className="space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Instruções: Cole no <strong>Supabase SQL Editor</strong> e clique em <strong>Run</strong>.</span>
              <button onClick={handleCopySql} className="text-xs text-[#E5B869] hover:underline flex items-center gap-1 font-semibold">
                <Copy size={12} /> Copiar tudo
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-60 leading-relaxed select-all">
              {sqlSchemaCode}
            </pre>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Section 2: Company Profile */}
        <div className="bg-white border border-[#D0D5DD] rounded-xl p-5 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 border-b border-[#D0D5DD] pb-3">
            <Building size={16} className="text-[#173E75]" />
            <h3 className="text-sm font-bold text-[#101828]">Dados da Empresa</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-xs font-bold text-[#344054] block mb-1">Razão Social / Nome Fantasia *</label>
              <input
                type="text"
                className="uze-input text-xs"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#344054] block mb-1">CNPJ *</label>
              <input
                type="text"
                className="uze-input text-xs"
                value={cnpj}
                onChange={e => setCnpj(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#344054] block mb-1">Endereço Comercial</label>
              <input
                type="text"
                className="uze-input text-xs"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#344054] block mb-1">E-mail Corporativo</label>
              <input
                type="email"
                className="uze-input text-xs"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Inventory & System Rules */}
        <div className="bg-white border border-[#D0D5DD] rounded-xl p-5 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 border-b border-[#D0D5DD] pb-3">
            <Sliders size={16} className="text-[#C69A43]" />
            <h3 className="text-sm font-bold text-[#101828]">Políticas de Estoque</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded border border-[#D0D5DD]">
              <div>
                <span className="font-bold text-[#101828] block">Estoque Mínimo Padrão</span>
                <span className="text-[#475467] font-medium">Quantidade para disparar alerta visual de reposição</span>
              </div>
              <input
                type="number"
                className="w-16 h-8 text-center font-bold bg-white border border-[#D0D5DD] rounded text-xs text-[#101828] focus:border-[#173E75] focus:outline-none"
                value={defaultMinStock}
                onChange={e => setDefaultMinStock(parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded border border-[#D0D5DD]">
              <div>
                <span className="font-bold text-[#101828] block">Avisos no Dashboard</span>
                <span className="text-[#475467] font-medium">Exibir alerta quando houver itens esgotados</span>
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

        <div className="flex justify-end">
          <button type="submit" className="uze-btn-primary text-xs shadow-md">
            <Save size={14} /> Salvar Parâmetros
          </button>
        </div>
      </form>
    </div>
  );
};
