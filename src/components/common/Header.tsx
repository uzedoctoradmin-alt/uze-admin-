import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import type { PeriodFilter } from '../../types';
import { 
  Search, 
  Plus, 
  Calendar, 
  Bell, 
  Menu, 
  Cross, 
  PanelLeftClose, 
  PanelLeftOpen,
  X
} from 'lucide-react';

interface HeaderProps {
  onOpenNovaVendaModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNovaVendaModal }) => {
  const { 
    periodFilter, 
    setPeriodFilter, 
    searchQuery, 
    setSearchQuery, 
    currentTab,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    setIsMobileSidebarOpen,
    supabaseStatus
  } = useERP();

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const periods: PeriodFilter[] = [
    'Hoje',
    '7d',
    '30d',
    'Este mês',
    'Mês anterior',
    'Personalizado',
  ];

  const getPageInfo = () => {
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Visão Geral', subtitle: 'Acompanhe o desempenho da UZE DOCTOR' };
      case 'vendas':
        return { title: 'Vendas', subtitle: 'Gestão de pedidos e faturamento comercial' };
      case 'clientes':
        return { title: 'Clientes', subtitle: 'Base de médicos, clínicas e profissionais de saúde' };
      case 'produtos':
        return { title: 'Produtos', subtitle: 'Gerencie modelos, preços, variantes e estoque' };
      case 'modelos':
        return { title: 'Modelos de Jalecos', subtitle: 'Fichas técnicas e coleções de alta costura' };
      case 'estoque':
        return { title: 'Estoque Físico', subtitle: 'Inventário por SKU, cor e tamanho' };
      case 'movimentacoes':
        return { title: 'Movimentações', subtitle: 'Histórico auditável de entradas, saídas e perdas' };
      case 'financeiro-visao':
      case 'financeiro-receitas':
      case 'financeiro-despesas':
        return { title: 'Financeiro', subtitle: 'Demonstrativo de receitas, despesas e margens' };
      case 'relatorio-mensal':
        return { title: 'Relatório Mensal', subtitle: 'Consolidação executiva de resultados' };
      case 'desempenho':
        return { title: 'Desempenho', subtitle: 'Ranking de modelos e produtos mais vendidos' };
      case 'configuracoes':
        return { title: 'Configurações', subtitle: 'Parâmetros empresariais e regras do sistema' };
      default:
        return { title: 'Visão Geral', subtitle: 'Acompanhe o desempenho da UZE DOCTOR' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="h-16 bg-white border-b border-[#D0D5DD] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Left: Mobile Toggle / Desktop Collapse Toggle + Title */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="lg:hidden p-2 text-[#101828] hover:bg-[#F2F4F7] rounded-md transition-colors shrink-0"
          title="Abrir menu de navegação"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        {/* Mobile Brand Emblem */}
        <div className="lg:hidden flex items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 rounded bg-[#07101F] text-[#C69A43] flex items-center justify-center border border-[#C69A43]/40">
            <Cross size={13} className="stroke-[2.5]" />
          </div>
          <span className="text-xs font-black tracking-wider text-[#07101F] uppercase hidden xs:inline">
            UZE <span className="text-[#C69A43]">DOCTOR</span>
          </span>
        </div>

        {/* Desktop Sidebar Toggle Icon */}
        <button
          onClick={toggleSidebarCollapse}
          className="hidden lg:flex p-1.5 text-[#344054] hover:text-[#173E75] hover:bg-[#F2F4F7] rounded-md transition-colors shrink-0"
          title={isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-label="Alternar menu lateral"
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Page Title & Subtitle */}
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-[#101828] leading-tight truncate">
            {pageInfo.title}
          </h2>
          <p className="text-[10px] sm:text-[11px] text-[#475467] font-medium leading-none mt-0.5 truncate hidden sm:block">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls: Period, Search, Action Button, Notifications, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Mobile Search Toggle Icon */}
        <button
          onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
          className="md:hidden p-1.5 text-[#475467] hover:text-[#101828] hover:bg-[#F2F4F7] rounded-md transition-colors"
          title="Buscar"
          aria-label="Buscar"
        >
          <Search size={17} />
        </button>

        {/* Desktop Global Search */}
        <div className="relative hidden md:block w-40 lg:w-56 xl:w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#475467]" />
          <input
            type="text"
            placeholder="Buscar SKU, produto, cliente..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-[#F9FAFB] border border-[#D0D5DD] rounded-md outline-none focus:border-[#173E75] focus:ring-2 focus:ring-[#173E75]/15 focus:bg-white transition-all text-[#101828] placeholder:text-[#667085] font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Supabase Live Status Pill */}
        <div 
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
            supabaseStatus === 'connected' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : supabaseStatus === 'needs_tables'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : supabaseStatus === 'connecting'
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
          title={
            supabaseStatus === 'connected'
              ? 'Supabase Conectado e tabelas sincronizadas'
              : supabaseStatus === 'needs_tables'
              ? 'Conectado ao Supabase! Tabelas precisam ser criadas no SQL Editor'
              : supabaseStatus === 'connecting'
              ? 'Conectando ao Supabase...'
              : 'Desconectado do Supabase'
          }
        >
          <span 
            className={`w-2 h-2 rounded-full animate-pulse ${
              supabaseStatus === 'connected' 
                ? 'bg-emerald-500' 
                : supabaseStatus === 'needs_tables'
                ? 'bg-amber-500'
                : supabaseStatus === 'connecting'
                ? 'bg-blue-500'
                : 'bg-rose-500'
            }`} 
          />
          <span className="font-mono text-[10px]">
            {supabaseStatus === 'connected' && 'Supabase Ativo'}
            {supabaseStatus === 'needs_tables' && 'Supabase: SQL Pendente'}
            {supabaseStatus === 'connecting' && 'Supabase: Conectando...'}
            {supabaseStatus === 'error' && 'Supabase: Erro'}
            {supabaseStatus === 'disconnected' && 'Supabase: Offline'}
          </span>
        </div>

        {/* Period Selector Dropdown */}
        <div className="hidden sm:flex items-center gap-1.5 bg-[#F9FAFB] border border-[#D0D5DD] h-8 px-2 rounded-md text-xs">
          <Calendar size={13} className="text-[#173E75] shrink-0" />
          <select
            className="bg-transparent font-medium text-[#101828] outline-none cursor-pointer text-xs pr-1"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Primary Action Button: Nova Venda (Responsive) */}
        <button
          onClick={onOpenNovaVendaModal}
          className="uze-btn-primary h-8 px-2.5 sm:px-3.5 text-xs shadow-xs shrink-0 flex items-center gap-1.5"
          title="Registrar nova venda"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Nova venda</span>
          <span className="sm:hidden text-[11px] font-semibold">Venda</span>
        </button>

        {/* Notifications */}
        <button 
          className="h-8 w-8 flex items-center justify-center text-[#475467] hover:text-[#101828] hover:bg-[#F2F4F7] rounded-md transition-colors relative shrink-0"
          title="Notificações"
          aria-label="Notificações"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#C69A43] rounded-full" />
        </button>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-[#D0D5DD] shrink-0">
          <div className="w-7 h-7 rounded-full bg-[#07101F] text-[#C69A43] flex items-center justify-center text-[10px] font-bold border border-[#C69A43]/40">
            UD
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-[#101828] leading-none">Diretoria</p>
            <p className="text-[10px] text-[#475467] font-medium leading-none mt-0.5">UZE DOCTOR</p>
          </div>
        </div>
      </div>

      {/* Mobile Expandable Search Bar Overlay */}
      {isMobileSearchOpen && (
        <div className="absolute inset-x-0 top-0 h-16 bg-white px-4 flex items-center gap-2 z-40 border-b border-[#D0D5DD] animate-fadeIn">
          <Search size={16} className="text-[#475467] shrink-0" />
          <input
            type="text"
            placeholder="Buscar produto, modelo, SKU ou venda..."
            className="flex-1 h-9 text-xs outline-none text-[#101828] placeholder:text-[#667085]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <button
            onClick={() => {
              setSearchQuery('');
              setIsMobileSearchOpen(false);
            }}
            className="p-1 text-[#475467] hover:text-[#101828]"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </header>
  );
};
