import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ERPProvider, useERP } from './context/ERPContext';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';

import { DashboardPage } from './pages/DashboardPage';
import { VendasPage } from './pages/VendasPage';
import { ClientesPage } from './pages/ClientesPage';
import { FuncionariosPage } from './pages/FuncionariosPage';
import { ProdutosPage } from './pages/ProdutosPage';
import { ModelosPage } from './pages/ModelosPage';
import { EstoquePage } from './pages/EstoquePage';
import { MovimentacoesPage } from './pages/MovimentacoesPage';
import { FinanceiroPage } from './pages/FinanceiroPage';
import { RelatorioMensalPage } from './pages/RelatorioMensalPage';
import { DesempenhoPage } from './pages/DesempenhoPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { AdministracaoPage } from './pages/AdministracaoPage';

import { LoginPage } from './pages/LoginPage';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { AccessDenied } from './components/common/AccessDenied';
import { NovaVendaModal } from './components/modals/NovaVendaModal';
import { Cross } from 'lucide-react';

const ERPMainContent: React.FC = () => {
  const { currentTab } = useERP();
  const { hasPermission } = useAuth();
  const [isNovaVendaModalOpen, setIsNovaVendaModalOpen] = useState(false);

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'vendas':
        return <VendasPage />;
      case 'clientes':
        return <ClientesPage />;
      case 'funcionarios':
        return <FuncionariosPage />;
      case 'produtos':
        return <ProdutosPage />;
      case 'modelos':
        return <ModelosPage />;
      case 'estoque':
        return <EstoquePage />;
      case 'movimentacoes':
        return <MovimentacoesPage />;
      case 'financeiro-visao':
        if (!hasPermission('finance.read')) {
          return <AccessDenied areaName="o Módulo Financeiro" />;
        }
        return <FinanceiroPage key="visao" initialTab="visao" />;
      case 'financeiro-receitas':
        if (!hasPermission('finance.read')) {
          return <AccessDenied areaName="o Módulo Financeiro (Receitas)" />;
        }
        return <FinanceiroPage key="receitas" initialTab="receitas" />;
      case 'financeiro-despesas':
        if (!hasPermission('finance.read')) {
          return <AccessDenied areaName="o Módulo Financeiro (Despesas)" />;
        }
        return <FinanceiroPage key="despesas" initialTab="despesas" />;
      case 'relatorio-mensal':
        return <RelatorioMensalPage />;
      case 'desempenho':
        return <DesempenhoPage />;
      case 'configuracoes':
        if (!hasPermission('settings.manage')) {
          return <AccessDenied areaName="as Configurações da Empresa" />;
        }
        return <ConfiguracoesPage />;
      case 'administracao':
        if (!hasPermission('admin.users.manage')) {
          return <AccessDenied areaName="a Administração de Usuários e Acessos" />;
        }
        return <AdministracaoPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F6F7F9] overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header onOpenNovaVendaModal={() => setIsNovaVendaModalOpen(true)} />

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 min-w-0">
          {renderActiveTab()}
        </main>
      </div>

      {/* Global Nova Venda Modal */}
      {hasPermission('sales.create') && (
        <NovaVendaModal
          isOpen={isNovaVendaModalOpen}
          onClose={() => setIsNovaVendaModalOpen(false)}
        />
      )}

      {/* Modal de Troca Obrigatória de Senha no Primeiro Login */}
      <ChangePasswordModal />
    </div>
  );
};

const AuthGuard: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07101F] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-[#07101F] border border-[#C69A43] flex items-center justify-center text-[#C69A43] animate-pulse shadow-lg">
          <Cross size={28} className="stroke-[2.5]" />
        </div>
        <p className="text-xs text-slate-300 font-bold mt-4 tracking-widest uppercase">
          Carregando UZE DOCTOR...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ERPProvider>
      <ERPMainContent />
    </ERPProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AuthGuard />
    </AuthProvider>
  );
}

export default App;
