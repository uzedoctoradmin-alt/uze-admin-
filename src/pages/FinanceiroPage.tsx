import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import type { Column } from '../components/common/DataTable';
import { DataTable } from '../components/common/DataTable';
import type { Revenue, Expense } from '../types';
import { StatCard } from '../components/common/StatCard';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { NovaTransacaoModal } from '../components/modals/NovaTransacaoModal';

interface FinanceiroPageProps {
  initialTab?: 'visao' | 'receitas' | 'despesas';
}

export const FinanceiroPage: React.FC<FinanceiroPageProps> = ({ initialTab = 'visao' }) => {
  const { filteredRevenues, filteredExpenses, dashboardMetrics } = useERP();

  const [activeTab, setActiveTab] = useState<'visao' | 'receitas' | 'despesas'>(initialTab);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'despesa' | 'receita'>('despesa');

  const totalReceitas = filteredRevenues.reduce((sum, r) => sum + r.amount, 0);
  const totalDespesas = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const resultadoLiquido = totalReceitas - totalDespesas;

  const revenueColumns: Column<Revenue>[] = [
    {
      header: 'Data',
      accessorKey: 'date',
      sortable: true,
      cell: (r) => <span className="text-xs text-[#475467] font-mono font-medium">{r.date}</span>,
    },
    {
      header: 'Origem / Descrição',
      accessorKey: 'source',
      sortable: true,
      cell: (r) => (
        <div>
          <p className="font-semibold text-[#101828]">{r.source}</p>
          {r.referenceId && <span className="text-[10px] text-[#173E75] font-mono font-bold">Ref: {r.referenceId}</span>}
        </div>
      ),
    },
    {
      header: 'Categoria',
      accessorKey: 'category',
      sortable: true,
      cell: (r) => <span className="uze-badge uze-badge-success">{r.category}</span>,
    },
    {
      header: 'Valor',
      accessorKey: 'amount',
      sortable: true,
      align: 'right',
      cell: (r) => (
        <span className="font-bold text-sm text-[#027A48]">
          + R$ {r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Pagamento',
      accessorKey: 'paymentMethod',
      sortable: true,
      cell: (r) => <span className="text-xs text-[#475467] font-medium">{r.paymentMethod}</span>,
    },
  ];

  const expenseColumns: Column<Expense>[] = [
    {
      header: 'Data',
      accessorKey: 'date',
      sortable: true,
      cell: (e) => <span className="text-xs text-[#475467] font-mono font-medium">{e.date}</span>,
    },
    {
      header: 'Descrição / Fornecedor',
      accessorKey: 'description',
      sortable: true,
      cell: (e) => (
        <div>
          <p className="font-semibold text-[#101828]">{e.description}</p>
          {e.notes && <span className="text-[10px] text-[#475467] font-medium">{e.notes}</span>}
        </div>
      ),
    },
    {
      header: 'Categoria',
      accessorKey: 'category',
      sortable: true,
      cell: (e) => <span className="uze-badge uze-badge-warning">{e.category}</span>,
    },
    {
      header: 'Valor',
      accessorKey: 'amount',
      sortable: true,
      align: 'right',
      cell: (e) => (
        <span className="font-bold text-sm text-[#B42318]">
          - R$ {e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Pagamento',
      accessorKey: 'paymentMethod',
      sortable: true,
      cell: (e) => <span className="text-xs text-[#475467] font-medium">{e.paymentMethod}</span>,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base font-bold text-[#101828]">Gestão Financeira & DRE</h2>
          <p className="text-xs text-[#475467] font-medium">
            Controle de faturamento, receitas, custos de confecção e despesas operacionais
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setModalType('despesa');
              setIsModalOpen(true);
            }}
            className="uze-btn-secondary text-xs"
          >
            <ArrowDownLeft size={13} className="text-[#B42318]" /> Nova Despesa
          </button>
          <button
            onClick={() => {
              setModalType('receita');
              setIsModalOpen(true);
            }}
            className="uze-btn-primary text-xs"
          >
            <ArrowUpRight size={13} className="text-emerald-400" /> Nova Receita
          </button>
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex border-b border-[#D0D5DD] gap-2">
        <button
          onClick={() => setActiveTab('visao')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'visao' 
              ? 'border-[#173E75] text-[#173E75]' 
              : 'border-transparent text-[#475467] hover:text-[#101828]'
          }`}
        >
          Visão Financeira & DRE
        </button>
        <button
          onClick={() => setActiveTab('receitas')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'receitas' 
              ? 'border-[#173E75] text-[#173E75]' 
              : 'border-transparent text-[#475467] hover:text-[#101828]'
          }`}
        >
          Receitas ({filteredRevenues.length})
        </button>
        <button
          onClick={() => setActiveTab('despesas')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'despesas' 
              ? 'border-[#173E75] text-[#173E75]' 
              : 'border-transparent text-[#475467] hover:text-[#101828]'
          }`}
        >
          Despesas ({filteredExpenses.length})
        </button>
      </div>

      {/* Visão Financeira Tab */}
      {activeTab === 'visao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <StatCard
              title="Faturamento"
              value={`R$ ${dashboardMetrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />

            <StatCard
              title="Receitas"
              value={`R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle="Entradas confirmadas"
            />

            <StatCard
              title="Despesas"
              value={`R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle="Operacional + Insumos"
            />

            <StatCard
              title="Lucro Bruto"
              value={`R$ ${(dashboardMetrics.faturamento - dashboardMetrics.custoTotalVendas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle="Faturamento - CMV"
            />

            <StatCard
              title="Resultado Líquido"
              value={`R$ ${resultadoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle="Receitas - Despesas"
            />

            <StatCard
              title="Margem Média"
              value={`${dashboardMetrics.margemMedia.toFixed(1)}%`}
              subtitle="Eficiência operacional"
            />
          </div>

          {/* DRE Simplificado */}
          <div className="bg-white border border-[#D0D5DD] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-bold text-[#101828] mb-1">Demonstrativo de Resultado do Período (DRE)</h3>
            <p className="text-xs text-[#475467] font-medium mb-4">Consolidação contábil da UZE DOCTOR</p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-3 bg-[#F9FAFB] rounded font-semibold text-[#101828] border-l-4 border-[#173E75]">
                <span>(+) RECEITA BRUTA COM VENDAS:</span>
                <span className="font-black text-sm">
                  R$ {dashboardMetrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between p-2 pl-4 text-[#B42318] font-bold">
                <span>(-) Custos de Confecção e Tecidos (CMV):</span>
                <span>- R$ {dashboardMetrics.custoTotalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between p-3 bg-[#ECFDF3] rounded font-bold text-[#027A48] border-l-4 border-[#027A48]">
                <span>(=) LUCRO BRUTO OPERACIONAL:</span>
                <span className="text-sm font-black">
                  R$ {dashboardMetrics.lucroEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between p-2 pl-4 text-[#B42318] font-bold">
                <span>(-) Despesas Operacionais (Marketing, Embalagens, Fretes):</span>
                <span>- R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between p-3.5 bg-[#07101F] text-white rounded font-bold items-center mt-3">
                <span className="text-xs uppercase tracking-wide">(=) RESULTADO LÍQUIDO FINAL:</span>
                <span className="text-base text-[#E5B869] font-mono font-black">
                  R$ {(dashboardMetrics.lucroEstimado - totalDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receitas Tab */}
      {activeTab === 'receitas' && (
        <DataTable
          columns={revenueColumns}
          data={filteredRevenues}
          emptyText="Nenhuma receita registrada."
          searchPlaceholder="Buscar receita..."
          searchField={(r) => `${r.source} ${r.referenceId} ${r.category} ${r.paymentMethod}`}
          filterOptions={[
            {
              label: 'Categoria',
              key: 'category',
              options: [
                { value: 'Vendas Diretas', label: 'Vendas Diretas' },
                { value: 'Vendas Atacado', label: 'Vendas Atacado' },
                { value: 'Personalização/Bordado', label: 'Personalização/Bordado' },
              ],
              filterFn: (r, val) => r.category === val,
            },
          ]}
        />
      )}

      {/* Despesas Tab */}
      {activeTab === 'despesas' && (
        <DataTable
          columns={expenseColumns}
          data={filteredExpenses}
          emptyText="Nenhuma despesa registrada."
          searchPlaceholder="Buscar despesa..."
          searchField={(e) => `${e.description} ${e.category} ${e.notes} ${e.paymentMethod}`}
          filterOptions={[
            {
              label: 'Categoria',
              key: 'category',
              options: [
                { value: 'Matéria-prima', label: 'Matéria-prima' },
                { value: 'Confecção', label: 'Confecção' },
                { value: 'Embalagens', label: 'Embalagens' },
                { value: 'Marketing', label: 'Marketing' },
                { value: 'Transporte', label: 'Transporte' },
              ],
              filterFn: (e, val) => e.category === val,
            },
          ]}
        />
      )}

      {/* Transação Modal */}
      <NovaTransacaoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
      />
    </div>
  );
};
