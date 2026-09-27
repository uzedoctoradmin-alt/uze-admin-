import React from 'react';
import { useERP } from '../../context/ERPContext';
import type { ViewTab } from '../../types';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Package, 
  Shirt, 
  Boxes, 
  History, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileSpreadsheet, 
  BarChart3, 
  Settings,
  X,
  Cross,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface NavGroup {
  groupLabel?: string;
  items: {
    tab: ViewTab;
    label: string;
    icon: React.ElementType;
  }[];
}

export const Sidebar: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab, 
    isSidebarCollapsed, 
    toggleSidebarCollapse, 
    isMobileSidebarOpen, 
    setIsMobileSidebarOpen 
  } = useERP();

  const navGroups: NavGroup[] = [
    {
      items: [
        { tab: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
      ],
    },
    {
      groupLabel: 'Comercial',
      items: [
        { tab: 'vendas', label: 'Vendas', icon: ShoppingBag },
        { tab: 'clientes', label: 'Clientes', icon: Users },
      ],
    },
    {
      groupLabel: 'Catálogo & Estoque',
      items: [
        { tab: 'produtos', label: 'Produtos', icon: Package },
        { tab: 'modelos', label: 'Modelos', icon: Shirt },
        { tab: 'estoque', label: 'Estoque Físico', icon: Boxes },
        { tab: 'movimentacoes', label: 'Movimentações', icon: History },
      ],
    },
    {
      groupLabel: 'Financeiro',
      items: [
        { tab: 'financeiro-visao', label: 'Visão Financeira', icon: DollarSign },
        { tab: 'financeiro-receitas', label: 'Receitas', icon: ArrowUpRight },
        { tab: 'financeiro-despesas', label: 'Despesas', icon: ArrowDownLeft },
      ],
    },
    {
      groupLabel: 'Análises',
      items: [
        { tab: 'relatorio-mensal', label: 'Relatório Mensal', icon: FileSpreadsheet },
        { tab: 'desempenho', label: 'Desempenho', icon: BarChart3 },
      ],
    },
    {
      groupLabel: 'Sistema',
      items: [
        { tab: 'configuracoes', label: 'Configurações', icon: Settings },
      ],
    },
  ];

  const handleSelectTab = (tab: ViewTab) => {
    setCurrentTab(tab);
    setIsMobileSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar (Desktop Collapsible & Mobile Slide-in Drawer) */}
      <aside 
        className={`
          fixed top-0 bottom-0 left-0 z-50 bg-[#07101F] text-white flex flex-col border-r border-slate-800/80
          transition-[width,transform] duration-200 ease-in-out lg:static lg:z-auto shrink-0 select-none
          ${/* Mobile drawer behavior */ ''}
          ${isMobileSidebarOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${/* Desktop collapsible width behavior */ ''}
          ${isSidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-60'}
        `}
      >
        {/* Brand Header */}
        <div className={`h-16 flex items-center border-b border-slate-800/70 transition-all ${
          isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}>
          {/* Logo & Monogram */}
          <div 
            onClick={() => handleSelectTab('dashboard')} 
            className="flex items-center gap-2.5 cursor-pointer overflow-hidden"
            title="UZE DOCTOR Gestão Empresarial"
          >
            <div className="w-8 h-8 rounded bg-[#173E75] border border-[#C69A43] flex items-center justify-center text-[#C69A43] shrink-0 shadow-sm">
              <Cross size={16} className="stroke-[2.5]" />
            </div>

            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <div className="overflow-hidden whitespace-nowrap animate-fadeIn">
                <h1 className="text-sm font-extrabold tracking-wider text-white uppercase font-sans leading-none">
                  UZE <span className="text-[#C69A43]">DOCTOR</span>
                </h1>
                <span className="text-[9px] tracking-widest text-slate-300 font-semibold block uppercase mt-1">
                  Gestão Empresarial
                </span>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button (Visible only when expanded on desktop) */}
          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Recolher menu lateral"
              aria-label="Recolher menu lateral"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden text-slate-300 hover:text-white p-1 rounded-md hover:bg-slate-800"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Collapsed Toggle Button at the top bar when desktop is collapsed */}
        {isSidebarCollapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-slate-800/40">
            <button
              onClick={toggleSidebarCollapse}
              className="w-8 h-7 rounded text-slate-300 hover:text-[#C69A43] hover:bg-slate-800 flex items-center justify-center transition-colors"
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className={`flex-1 overflow-y-auto py-3 space-y-3 ${isSidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {group.groupLabel && (
                <>
                  {(!isSidebarCollapsed || isMobileSidebarOpen) ? (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap">
                      {group.groupLabel}
                    </div>
                  ) : (
                    <div className="my-2 border-t border-slate-800/60 mx-1" />
                  )}
                </>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.tab;
                const isItemCollapsed = isSidebarCollapsed && !isMobileSidebarOpen;

                return (
                  <button
                    key={item.tab}
                    onClick={() => handleSelectTab(item.tab)}
                    title={isItemCollapsed ? item.label : undefined}
                    className={`
                      w-full flex items-center rounded-md text-xs transition-all duration-150 relative group
                      ${isItemCollapsed ? 'justify-center h-10 px-0' : 'gap-2.5 px-3 py-2 text-left'}
                      ${isActive 
                        ? 'bg-[#173E75] text-white font-bold shadow-xs' 
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white font-medium'
                      }
                    `}
                  >
                    <Icon 
                      size={18} 
                      className={`shrink-0 transition-colors ${isActive ? 'text-[#C69A43]' : 'text-slate-300 group-hover:text-white'}`} 
                    />

                    {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                      <span className="truncate">{item.label}</span>
                    )}

                    {/* Active Accent Indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#C69A43] rounded-r-full" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Brand Info */}
        <div className={`py-3 border-t border-slate-800/60 bg-[#050C17] text-slate-300 text-xs ${
          isSidebarCollapsed && !isMobileSidebarOpen 
            ? 'px-2 flex flex-col items-center justify-center gap-1.5' 
            : 'px-4 flex items-center justify-between'
        }`}>
          {(!isSidebarCollapsed || isMobileSidebarOpen) ? (
            <>
              <span className="text-[11px] font-semibold text-slate-300">UZE DOCTOR v1.0</span>
              <div className="flex items-center gap-1.5" title="Sistema Online">
                <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                <span className="text-[10px] text-emerald-300 font-bold">Online</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1" title="UZE DOCTOR v1.0 - Online">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
              <span className="text-[9px] font-mono text-slate-400">v1.0</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
