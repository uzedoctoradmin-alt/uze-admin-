import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import type { Column } from '../components/common/DataTable';
import { DataTable } from '../components/common/DataTable';
import type { StockMovement } from '../types';
import { MovementTypeBadge } from '../components/common/Badge';
import { Plus } from 'lucide-react';
import { AjustarEstoqueModal } from '../components/modals/AjustarEstoqueModal';

export const MovimentacoesPage: React.FC = () => {
  const { movements } = useERP();
  const [isAjustarOpen, setIsAjustarOpen] = useState(false);

  const columns: Column<StockMovement>[] = [
    {
      header: 'Data / Hora',
      accessorKey: 'date',
      sortable: true,
      cell: (m) => <span className="text-xs text-[#667085] font-mono">{m.date}</span>,
    },
    {
      header: 'Produto / Modelo',
      accessorKey: 'productName',
      sortable: true,
      cell: (m) => (
        <div>
          <p className="font-semibold text-[#171A21]">{m.productName}</p>
          <span className="text-[10px] font-mono text-[#667085]">{m.sku}</span>
        </div>
      ),
    },
    {
      header: 'Variante',
      accessorKey: 'colorName',
      sortable: true,
      cell: (m) => (
        <span className="text-xs text-[#171A21]">
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
        <span className={`font-bold text-sm ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {m.quantity > 0 ? `+${m.quantity}` : m.quantity} un
        </span>
      ),
    },
    {
      header: 'Motivo / Justificativa',
      accessorKey: 'reason',
      sortable: true,
      cell: (m) => <span className="text-xs text-[#667085]">{m.reason}</span>,
    },
    {
      header: 'Usuário',
      accessorKey: 'user',
      sortable: true,
      cell: (m) => <span className="text-xs text-[#667085]">{m.user}</span>,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E7EB]">
        <div>
          <h2 className="text-base font-bold text-[#171A21]">Movimentações de Estoque</h2>
          <p className="text-xs text-[#667085]">
            Histórico auditável de entradas, vendas, ajustes, perdas e devoluções físicas
          </p>
        </div>

        <button
          onClick={() => setIsAjustarOpen(true)}
          className="uze-btn-primary text-xs"
        >
          <Plus size={14} /> Nova Movimentação
        </button>
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
