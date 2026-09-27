import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import type { Column } from '../components/common/DataTable';
import { DataTable } from '../components/common/DataTable';
import type { StockMovement } from '../types';
import { MovementTypeBadge } from '../components/common/Badge';
import { Plus } from 'lucide-react';
import { AjustarEstoqueModal } from '../components/modals/AjustarEstoqueModal';
import { useAuth } from '../context/AuthContext';
import { ExportMenu } from '../components/common/ExportMenu';
import { exportReportToPdf } from '../services/pdfExportService';
import { excelService } from '../services/excelService';

export const MovimentacoesPage: React.FC = () => {
  const { movements } = useERP();
  const { user } = useAuth();
  const [isAjustarOpen, setIsAjustarOpen] = useState(false);

  const columns: Column<StockMovement>[] = [
    {
      header: 'Data / Hora',
      accessorKey: 'date',
      sortable: true,
      cell: (m) => <span className="text-xs text-[#475467] font-mono font-medium">{m.date}</span>,
    },
    {
      header: 'Produto / Modelo',
      accessorKey: 'productName',
      sortable: true,
      cell: (m) => (
        <div>
          <p className="font-semibold text-[#101828]">{m.productName}</p>
          <span className="text-[10px] font-mono text-[#344054] font-semibold">{m.sku}</span>
        </div>
      ),
    },
    {
      header: 'Variante',
      accessorKey: 'colorName',
      sortable: true,
      cell: (m) => (
        <span className="text-xs font-medium text-[#101828]">
          {m.colorName} - {m.size}
        </span>
      ),
    },
    {
      header: 'Tipo',
      accessorKey: 'type',
      sortable: true,
      cell: (m) => <MovementTypeBadge type={m.type} />,
    },
    {
      header: 'Quantidade',
      accessorKey: 'quantity',
      sortable: true,
      align: 'right',
      cell: (m) => (
        <span className={`font-bold text-sm ${m.quantity > 0 ? 'text-[#027A48]' : 'text-[#B42318]'}`}>
          {m.quantity > 0 ? `+${m.quantity}` : m.quantity} un
        </span>
      ),
    },
    {
      header: 'Motivo / Justificativa',
      accessorKey: 'reason',
      sortable: true,
      cell: (m) => <span className="text-xs text-[#475467] font-medium">{m.reason}</span>,
    },
    {
      header: 'Usuário',
      accessorKey: 'user',
      sortable: true,
      cell: (m) => <span className="text-xs text-[#475467] font-medium">{m.user}</span>,
    },
  ];

  const handleExportPdf = async () => {
    const totalEntries = movements.filter(m => m.quantity > 0).reduce((sum, m) => sum + m.quantity, 0);
    const totalExits = movements.filter(m => m.quantity < 0).reduce((sum, m) => sum + Math.abs(m.quantity), 0);

    const kpis = [
      { label: 'Total de Movimentos', value: `${movements.length} logs` },
      { label: 'Entradas Físicas', value: `+${totalEntries} un` },
      { label: 'Saídas / Vendas', value: `-${totalExits} un` },
      { label: 'Saldo de Fluxo', value: `${totalEntries - totalExits} un` },
    ];

    const pdfColumns = [
      { header: 'Data / Hora', dataKey: 'date', width: 28 },
      { header: 'Produto / Modelo', dataKey: 'productName' },
      { header: 'SKU', dataKey: 'sku', width: 26 },
      { header: 'Variante', dataKey: 'variant', width: 24 },
      { header: 'Tipo', dataKey: 'type', align: 'center' as const, width: 22 },
      { header: 'Qtd.', dataKey: 'quantityStr', align: 'right' as const, width: 18 },
      { header: 'Motivo / Justificativa', dataKey: 'reason' },
      { header: 'Operador', dataKey: 'user', width: 26 },
    ];

    const rows = movements.map(m => ({
      date: m.date,
      productName: m.productName,
      sku: m.sku,
      variant: `${m.colorName} - ${m.size}`,
      type: m.type,
      quantityStr: `${m.quantity > 0 ? '+' : ''}${m.quantity} un`,
      reason: m.reason || '-',
      user: m.user || 'Sistema',
    }));

    await exportReportToPdf({
      title: 'Relatório Oficial de Movimentações de Estoque',
      subtitle: 'Histórico auditável e cronológico de entradas, baixas, perdas e estornos',
      operatorName: user?.name,
      orientation: 'landscape',
      filename: `uze-doctor-movimentacoes-${new Date().toISOString().slice(0, 10)}.pdf`,
      kpis,
      columns: pdfColumns,
      rows,
    });
  };

  const handleExportExcel = async () => {
    const columns = [
      { header: 'Data / Hora', dataKey: 'Data' },
      { header: 'Produto / Modelo', dataKey: 'Produto' },
      { header: 'SKU', dataKey: 'SKU' },
      { header: 'Variante (Cor / Tamanho)', dataKey: 'Variante' },
      { header: 'Tipo de Movimento', dataKey: 'Tipo' },
      { header: 'Quantidade (un)', dataKey: 'Quantidade' },
      { header: 'Motivo / Justificativa', dataKey: 'Motivo' },
      { header: 'Operador Responsável', dataKey: 'Operador' },
    ];

    const data = movements.map(m => ({
      'Data': m.date,
      'Produto': m.productName,
      'SKU': m.sku,
      'Variante': `${m.colorName} - ${m.size}`,
      'Tipo': m.type,
      'Quantidade': m.quantity,
      'Motivo': m.reason || '-',
      'Operador': m.user || 'Sistema',
    }));

    excelService.exportToExcel({
      filename: `uze-doctor-movimentacoes-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Movimentacoes',
      data,
      columns,
      metadata: {
        title: 'Histórico Auditável de Movimentações de Estoque',
        operator: user?.name,
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base font-bold text-[#101828]">Movimentações de Estoque</h2>
          <p className="text-xs text-[#475467] font-medium">
            Histórico auditável de entradas, vendas, ajustes, perdas e devoluções físicas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
          <button
            onClick={() => setIsAjustarOpen(true)}
            className="uze-btn-primary text-xs"
          >
            <Plus size={14} /> Nova Movimentação
          </button>
        </div>
      </div>

      {/* Movements Table */}
      <DataTable
        columns={columns}
        data={movements}
        searchPlaceholder="Buscar por produto, SKU, motivo ou operador..."
        searchField={(m) => `${m.productName} ${m.sku} ${m.reason} ${m.type} ${m.user}`}
        filterOptions={[
          {
            label: 'Tipo de Movimento',
            key: 'type',
            options: [
              { value: 'Entrada', label: 'Entradas' },
              { value: 'Venda', label: 'Vendas' },
              { value: 'Ajuste', label: 'Ajustes' },
              { value: 'Devolução', label: 'Devoluções' },
              { value: 'Perda', label: 'Perdas' },
            ],
            filterFn: (m, val) => m.type === val,
          },
        ]}
      />

      {/* Modal Nova Movimentação */}
      <AjustarEstoqueModal
        isOpen={isAjustarOpen}
        onClose={() => setIsAjustarOpen(false)}
      />
    </div>
  );
};
