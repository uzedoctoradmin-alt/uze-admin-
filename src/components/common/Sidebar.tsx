import React from 'react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import type { ViewTab } from '../../types';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  UserCheck,
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
  ChevronRight,
  ShieldCheck,
  LogOut
} from 'lucide-react';

interface NavGroup {
  groupLabel?: string;
  items: {
    tab: ViewTab;
    label: string;
    icon: React.ElementType;
    requiredPermission?: string;
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

  const { user, hasPermission, logout } = useAuth();

  const allNavGroups: NavGroup[] = [
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
        { tab: 'funcionarios', label: 'Funcionários', icon: UserCheck, requiredPermission: 'employees.read' },
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
        { tab: 'financeiro-visao', label: 'Visão Financeira', icon: DollarSign, requiredPermission: 'finance.read' },
        { tab: 'financeiro-receitas', label: 'Receitas', icon: ArrowUpRight, requiredPermission: 'finance.read' },
        { tab: 'financeiro-despesas', label: 'Despesas', icon: ArrowDownLeft, requiredPermission: 'finance.read' },
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
      groupLabel: 'Administração',
      items: [
        { tab: 'administracao', label: 'Administração', icon: ShieldCheck, requiredPermission: 'admin.users.manage' },
        { tab: 'configuracoes', label: 'Configurações', icon: Settings, requiredPermission: 'settings.manage' },
      ],
    },
  ];

  // Filtra itens de acordo com as permissões do perfil autenticado
  const filteredNavGroups = allNavGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.requiredPermission) return true;
        return hasPermission(item.requiredPermission as any);
      }),
    }))
    .filter(group => group.items.length > 0);

  const handleSelectTab = (tab: ViewTab) => {
    setCurrentTab(tab);
    setIsMobileSidebarOpen(false);
  };

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return 'Administrador';
      case 'VENDEDOR':
        return 'Vendedor';
      case 'VISUALIZACAO':
        return 'Visualização';
      default:
        return 'Colaborador';
    }
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

      {/* Main Sidebar */}
      <aside 
        className={`
          fixed top-0 bottom-0 left-0 z-50 bg-[#07101F] text-white flex flex-col border-r border-slate-800/80
          transition-[width,transform] duration-200 ease-in-out lg:static lg:z-auto shrink-0 select-none
          ${isMobileSidebarOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
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

          {/* Desktop Toggle Button */}
          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Recolher menu lateral"
              aria-label="Recolher menu lateral"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden text-slate-300 hover:text-white p-1 rounded-md hover:bg-slate-800 cursor-pointer"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Collapsed Toggle Button */}
        {isSidebarCollapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-slate-800/40">
            <button
              onClick={toggleSidebarCollapse}
              className="w-8 h-7 rounded text-slate-300 hover:text-[#C69A43] hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className={`flex-1 overflow-y-auto py-3 space-y-3 ${isSidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {filteredNavGroups.map((group, groupIdx) => (
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
                      w-full flex items-center rounded-md text-xs transition-all duration-150 relative group cursor-pointer
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

                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#C69A43] rounded-r-full" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile & Logout Section */}
        {user && (
          <div className="border-t border-slate-800/80 p-2.5 bg-[#050C17]">
            {(!isSidebarCollapsed || isMobileSidebarOpen) ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#173E75] text-[#C69A43] flex items-center justify-center text-xs font-bold shrink-0 border border-[#C69A43]/40">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-none">{user.name}</p>
                    <p className="text-[10px] text-[#C69A43] font-semibold mt-1 truncate">
                      {getRoleDisplayName(user.role)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors shrink-0 cursor-pointer"
                  title="Sair do sistema (Logout)"
                  aria-label="Sair"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full bg-[#173E75] text-[#C69A43] flex items-center justify-center text-xs font-bold border border-[#C69A43]/40 cursor-default"
                  title={`${user.name} (${getRoleDisplayName(user.role)})`}
                >
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <button
                  onClick={logout}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Sair do sistema"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
