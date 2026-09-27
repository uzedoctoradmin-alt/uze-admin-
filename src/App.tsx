import React, { useState } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';

import { DashboardPage } from './pages/DashboardPage';
import { VendasPage } from './pages/VendasPage';
import { ClientesPage } from './pages/ClientesPage';
import { ProdutosPage } from './pages/ProdutosPage';
import { ModelosPage } from './pages/ModelosPage';
import { EstoquePage } from './pages/EstoquePage';
import { MovimentacoesPage } from './pages/MovimentacoesPage';
import { FinanceiroPage } from './pages/FinanceiroPage';
import { RelatorioMensalPage } from './pages/RelatorioMensalPage';
import { DesempenhoPage } from './pages/DesempenhoPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';

import { NovaVendaModal } from './components/modals/NovaVendaModal';

const ERPMainContent: React.FC = () => {
  const { currentTab } = useERP();
  const [isNovaVendaModalOpen, setIsNovaVendaModalOpen] = useState(false);

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'vendas':
        return <VendasPage />;
      case 'clientes':
        return <ClientesPage />;
      case 'produtos':
        return <ProdutosPage />;
      case 'modelos':
        return <ModelosPage />;
      case 'estoque':
        return <EstoquePage />;
      case 'movimentacoes':
        return <MovimentacoesPage />;
      case 'financeiro-visao':
        return <FinanceiroPage key="visao" initialTab="visao" />;
      case 'financeiro-receitas':
        return <FinanceiroPage key="receitas" initialTab="receitas" />;
      case 'financeiro-despesas':
        return <FinanceiroPage key="despesas" initialTab="despesas" />;
      case 'relatorio-mensal':
        return <RelatorioMensalPage />;
      case 'desempenho':
        return <DesempenhoPage />;
      case 'configuracoes':
        return <ConfiguracoesPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F6F7F9] overflow-hidden">
      {/* Sidebar Navigation (Collapsible on Desktop, Drawer on Mobile) */}
      <Sidebar />

      {/* Main Workspace: Automatically takes remaining width */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header onOpenNovaVendaModal={() => setIsNovaVendaModalOpen(true)} />

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 min-w-0">
          {renderActiveTab()}
        </main>
      </div>

      {/* Global Nova Venda Modal */}
      <NovaVendaModal
        isOpen={isNovaVendaModalOpen}
        onClose={() => setIsNovaVendaModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <ERPProvider>
      <ERPMainContent />
    </ERPProvider>
  );
}

export default App;
