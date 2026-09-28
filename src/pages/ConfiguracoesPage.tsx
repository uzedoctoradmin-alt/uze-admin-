import React, { useState, useEffect } from 'react';
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
  Server,
  ShieldCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  MapPin,
  FileText
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';
import { supabaseService } from '../services/supabaseService';

export const ConfiguracoesPage: React.FC = () => {
  const { supabaseStatus, supabaseHealth, isLoadingData, refreshData } = useERP();
  const { user: currentUser, changePasswordWithVerification, hasPermission } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'empresa' | 'seguranca' | 'supabase'>('empresa');

  // ==========================================
  // DADOS DA EMPRESA (OPCIONAIS / PERSISTENTES)
  // ==========================================
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [defaultMinStock, setDefaultMinStock] = useState(5);
  const [enableLowStockAlert, setEnableLowStockAlert] = useState(true);

  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyFeedback, setCompanyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ==========================================
  // SEGURANÇA / ALTERAR SENHA
  // ==========================================
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ==========================================
  // SUPABASE SQL MODAL
  // ==========================================
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const isAdministrator = currentUser?.role === 'ADMINISTRADOR' || hasPermission('settings.manage');

  // Carrega as configurações persistidas no Supabase
  const loadCompanySettings = async () => {
    setIsLoadingCompany(true);
    try {
      const data = await supabaseService.fetchCompanySettings();
      if (data) {
        setCompanyName(data.tradeName || data.legalName || '');
        setCnpj(data.taxId || '');
        setAddress(data.commercialAddress || '');
        setEmail(data.corporateEmail || '');
        setDefaultMinStock(data.defaultMinStock ?? 5);
        setEnableLowStockAlert(data.enableLowStockAlert ?? true);
      } else {
        // Sem dados fictícios: inicializa vazio
        setCompanyName('');
        setCnpj('');
        setAddress('');
        setEmail('');
        setDefaultMinStock(5);
        setEnableLowStockAlert(true);
      }
    } catch (err) {
      console.warn('[ConfiguracoesPage] Falha ao carregar dados da empresa:', err);
    } finally {
      setIsLoadingCompany(false);
    }
  };

  useEffect(() => {
    loadCompanySettings();
  }, []);

  // Feedback helper
  const showCompanyFeedback = (type: 'success' | 'error', message: string) => {
    setCompanyFeedback({ type, message });
    setTimeout(() => setCompanyFeedback(null), 5000);
  };

  const showPasswordFeedback = (type: 'success' | 'error', message: string) => {
    setPasswordFeedback({ type, message });
    setTimeout(() => setPasswordFeedback(null), 6000);
  };

  // Salva dados da empresa com validação de campos opcionais
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdministrator) {
      showCompanyFeedback('error', 'Apenas administradores possuem permissão para alterar as configurações empresariais.');
      return;
    }

    // Validação de CNPJ (apenas se preenchido)
    const cleanCnpj = cnpj.trim().replace(/\D/g, '');
    if (cnpj.trim() && cleanCnpj.length !== 14 && cleanCnpj.length !== 11) {
      showCompanyFeedback('error', 'Formato de CNPJ inválido. Digite um CNPJ válido com 14 dígitos ou deixe o campo em branco.');
      return;
    }

    // Validação de E-mail Corporativo (apenas se preenchido)
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        showCompanyFeedback('error', 'Formato de e-mail corporativo inválido. Informe um e-mail válido ou deixe em branco.');
        return;
      }
    }

    setIsSavingCompany(true);
    try {
      const success = await supabaseService.saveCompanySettings({
        tradeName: companyName.trim() || undefined,
        legalName: companyName.trim() || undefined,
        taxId: cnpj.trim() || undefined,
        commercialAddress: address.trim() || undefined,
        corporateEmail: email.trim() || undefined,
        defaultMinStock: defaultMinStock,
        enableLowStockAlert: enableLowStockAlert,
        updatedBy: currentUser?.name || 'Administrador',
      });

      if (success) {
        showCompanyFeedback('success', 'Configurações da empresa salvas com sucesso no Supabase!');
      } else {
        showCompanyFeedback('error', 'Não foi possível salvar as configurações no Supabase. Verifique a conexão.');
      }
    } catch {
      showCompanyFeedback('error', 'Erro ao salvar alterações da empresa.');
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Alteração segura da própria senha com validação da senha atual
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showPasswordFeedback('error', 'Informe a senha atual.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      showPasswordFeedback('error', 'Preencha a nova senha e a confirmação.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showPasswordFeedback('error', 'As novas senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      showPasswordFeedback('error', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword === currentPassword) {
      showPasswordFeedback('error', 'A nova senha não pode ser exatamente igual à senha atual.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changePasswordWithVerification(currentPassword, newPassword);

      if (res.success) {
        showPasswordFeedback('success', 'Senha alterada com sucesso.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showPasswordFeedback('error', res.error || 'Falha ao alterar senha.');
      }
    } catch {
      showPasswordFeedback('error', 'Erro de conexão ao validar e alterar senha.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const sqlSchemaCode = `-- ==============================================================================
-- SCHEMA OFICIAL UZE DOCTOR ERP - SUPABASE DATABASE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.company_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    trade_name TEXT,
    legal_name TEXT,
    tax_id TEXT,
    commercial_address TEXT,
    corporate_email TEXT,
    default_min_stock INTEGER DEFAULT 5,
    enable_low_stock_alert BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_settings_select_all" ON public.company_settings
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "company_settings_admin_all" ON public.company_settings
    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchemaCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="pb-3 border-b border-[#D0D5DD]">
        <h2 className="text-base font-bold text-[#101828]">Configurações da Plataforma</h2>
        <p className="text-xs text-[#475467] font-medium">
          Gerencie os dados cadastrais da empresa, segurança de acesso e integração com o Supabase
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#D0D5DD]">
        <button
          onClick={() => setActiveTab('empresa')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] ${
            activeTab === 'empresa'
              ? 'border-[#173E75] text-[#173E75]'
              : 'border-transparent text-[#475467] hover:text-[#101828]'
          }`}
        >
          <Building size={15} />
          <span>Dados da Empresa</span>
        </button>

        <button
          onClick={() => setActiveTab('seguranca')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] ${
            activeTab === 'seguranca'
              ? 'border-[#173E75] text-[#173E75]'
              : 'border-transparent text-[#475467] hover:text-[#101828]'
          }`}
        >
          <ShieldCheck size={15} />
          <span>Segurança & Senha</span>
        </button>

        <button
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] ${
            activeTab === 'supabase'
              ? 'border-[#173E75] text-[#173E75]'
              : 'border-transparent text-[#475467] hover:text-[#101828]'
          }`}
        >
          <Database size={15} />
          <span>Banco de Dados & Supabase</span>
        </button>
      </div>

      {/* TAB 1: DADOS DA EMPRESA */}
      {activeTab === 'empresa' && (
        <div className="space-y-5 animate-fadeIn">
          {companyFeedback && (
            <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
              companyFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                : 'bg-rose-50 text-rose-950 border border-rose-300'
            }`}>
              {companyFeedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-[#027A48] shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{companyFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSaveCompany} className="space-y-5">
            {/* Section: Informações Cadastrais */}
            <div className="bg-white border border-[#D0D5DD] rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#D0D5DD] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#173E75]/10 text-[#173E75]">
                    <Building size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#101828]">Dados da Empresa</h3>
                    <p className="text-[11px] text-[#475467]">
                      Todos os campos são opcionais. Você pode preencher parcialmente e salvar a qualquer momento.
                    </p>
                  </div>
                </div>

                {!isAdministrator && (
                  <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-bold">
                    Somente Leitura
                  </span>
                )}
              </div>

              {isLoadingCompany ? (
                <div className="py-8 text-center text-xs text-[#475467] flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-[#C69A43]" />
                  <span>Carregando dados da empresa do Supabase...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-xs font-bold text-[#344054] block mb-1 flex items-center gap-1.5">
                      <FileText size={13} className="text-[#475467]" />
                      <span>Razão Social / Nome Fantasia</span>
                      <span className="text-[10px] font-normal text-[#475467]">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isAdministrator}
                      placeholder="Ex: UZE DOCTOR"
                      className="uze-input text-xs disabled:bg-slate-50 disabled:text-slate-500"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#344054] block mb-1 flex items-center gap-1.5">
                      <FileText size={13} className="text-[#475467]" />
                      <span>CNPJ</span>
                      <span className="text-[10px] font-normal text-[#475467]">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isAdministrator}
                      placeholder="00.000.000/0000-00"
                      className="uze-input text-xs disabled:bg-slate-50 disabled:text-slate-500"
                      value={cnpj}
                      onChange={e => setCnpj(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#344054] block mb-1 flex items-center gap-1.5">
                      <MapPin size={13} className="text-[#475467]" />
                      <span>Endereço Comercial</span>
                      <span className="text-[10px] font-normal text-[#475467]">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isAdministrator}
                      placeholder="Ex: Av. Paulista, 1000 - São Paulo/SP"
                      className="uze-input text-xs disabled:bg-slate-50 disabled:text-slate-500"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#344054] block mb-1 flex items-center gap-1.5">
                      <Mail size={13} className="text-[#475467]" />
                      <span>E-mail Corporativo</span>
                      <span className="text-[10px] font-normal text-[#475467]">(opcional)</span>
                    </label>
                    <input
                      type="email"
                      disabled={!isAdministrator}
                      placeholder="contato@empresa.com.br"
                      className="uze-input text-xs disabled:bg-slate-50 disabled:text-slate-500"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                    <p className="text-[10px] text-[#475467] mt-1">
                      Apenas contato institucional. Não altera credenciais nem login de usuários.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Section: Políticas de Estoque */}
            <div className="bg-white border border-[#D0D5DD] rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#D0D5DD] pb-3">
                <div className="p-1.5 rounded-lg bg-[#C69A43]/15 text-[#C69A43]">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#101828]">Políticas de Estoque</h3>
                  <p className="text-[11px] text-[#475467]">Regras padrão para controle de estoque e alertas do sistema</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD]">
                  <div>
                    <span className="font-bold text-[#101828] block">Estoque Mínimo Padrão</span>
                    <span className="text-[#475467] font-medium text-[11px]">Quantidade para disparar alerta visual de reposição</span>
                  </div>
                  <input
                    type="number"
                    disabled={!isAdministrator}
                    min={0}
                    className="w-20 h-9 text-center font-bold bg-white border border-[#D0D5DD] rounded-lg text-xs text-[#101828] focus:border-[#173E75] focus:outline-none disabled:bg-slate-100"
                    value={defaultMinStock}
                    onChange={e => setDefaultMinStock(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD]">
                  <div>
                    <span className="font-bold text-[#101828] block">Avisos no Dashboard</span>
                    <span className="text-[#475467] font-medium text-[11px]">Exibir alerta quando houver itens esgotados ou com estoque crítico</span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isAdministrator}
                    className="w-4 h-4 accent-[#173E75] cursor-pointer disabled:cursor-not-allowed"
                    checked={enableLowStockAlert}
                    onChange={e => setEnableLowStockAlert(e.target.checked)}
                  />
                </div>
              </div>
            </div>

            {/* Save Action */}
            {isAdministrator && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingCompany}
                  className="uze-btn-primary text-xs shadow-md flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>{isSavingCompany ? 'Salvando no Supabase...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 2: SEGURANÇA & ALTERAR SENHA */}
      {activeTab === 'seguranca' && (
        <div className="space-y-5 animate-fadeIn">
          {passwordFeedback && (
            <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
              passwordFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                : 'bg-rose-50 text-rose-950 border border-rose-300'
            }`}>
              {passwordFeedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-[#027A48] shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{passwordFeedback.message}</span>
            </div>
          )}

          <div className="bg-white border border-[#D0D5DD] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-[#D0D5DD] pb-3">
              <div className="p-2 rounded-xl bg-[#173E75]/10 text-[#173E75]">
                <KeyRound size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#101828]">Alterar minha senha</h3>
                <p className="text-xs text-[#475467]">
                  Atualize sua senha de acesso pessoal. A senha atual é obrigatória para validar a alteração no Supabase Auth.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-lg text-xs">
              {/* Senha Atual */}
              <div>
                <label className="block font-bold text-[#344054] mb-1">
                  Senha atual *
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475467]" />
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    placeholder="Digite sua senha atual"
                    className="uze-input pl-9 pr-10 text-xs"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475467] hover:text-[#101828]"
                  >
                    {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <span className="text-[11px] text-[#475467] mt-0.5 block">
                  A senha atual será validada contra o Supabase Auth antes de aceitar a troca.
                </span>
              </div>

              {/* Nova Senha */}
              <div className="pt-2 border-t border-[#D0D5DD]">
                <label className="block font-bold text-[#344054] mb-1">
                  Nova senha *
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475467]" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="uze-input pl-9 pr-10 text-xs"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475467] hover:text-[#101828]"
                  >
                    {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <label className="block font-bold text-[#344054] mb-1">
                  Confirmar nova senha *
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475467]" />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    placeholder="Repita a nova senha"
                    className="uze-input pl-9 pr-10 text-xs"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475467] hover:text-[#101828]"
                  >
                    {showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="uze-btn-primary text-xs shadow-md flex items-center gap-1.5"
                >
                  <KeyRound size={14} />
                  <span>{isChangingPass ? 'Validando no Supabase...' : 'Alterar senha'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-[#475467]">
            <h4 className="font-bold text-[#101828] flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#C69A43]" />
              Políticas de Segurança e Sessão
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed">
              <li>A senha é gerenciada exclusivamente pelo <strong>Supabase Auth</strong> criptografado com bcrypt/argon2.</li>
              <li>Nenhuma senha ou hash é gravado em tabelas públicas ou visíveis do banco de dados.</li>
              <li>A alteração mantém sua identidade, permissões (RBAC) e sessão ativa intactas.</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: SUPABASE CLOUD CONNECTION */}
      {activeTab === 'supabase' && (
        <div className="bg-[#07101F] text-white rounded-xl p-5 border border-slate-800 shadow-md space-y-4 animate-fadeIn">
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
                {supabaseStatus === 'needs_tables' && 'Conexão Supabase Estabelecida com Sucesso!'}
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
                <span>Script de Configurações da Empresa (company_settings)</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tabela para persistência dos dados cadastrais opcionais no Supabase.
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
      )}
    </div>
  );
};
