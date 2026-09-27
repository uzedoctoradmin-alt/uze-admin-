import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import type { Column } from '../components/common/DataTable';
import { DataTable } from '../components/common/DataTable';
import type { Sale, SaleStatus } from '../types';
import { StatCard } from '../components/common/StatCard';
import { SaleStatusBadge } from '../components/common/Badge';
import { Plus, Eye } from 'lucide-react';
import { NovaVendaModal } from '../components/modals/NovaVendaModal';
import { Modal } from '../components/common/Modal';

export const VendasPage: React.FC = () => {
  const { filteredSales, dashboardMetrics, updateSaleStatus } = useERP();

  const [isNovaVendaOpen, setIsNovaVendaOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const columns: Column<Sale>[] = [
    {
      header: 'Venda',
      accessorKey: 'id',
      sortable: true,
      cell: (s) => <span className="font-semibold text-[#173E75] font-mono text-xs">{s.id}</span>,
    },
    {
      header: 'Data / Hora',
      accessorKey: 'date',
      sortable: true,
      cell: (s) => <span className="text-xs text-[#667085]">{s.date}</span>,
    },
    {
      header: 'Cliente',
      accessorKey: 'customerName',
      sortable: true,
      cell: (s) => (
        <div>
          <p className="font-medium text-[#171A21]">{s.customerName}</p>
          <span className="text-[10px] text-[#667085]">{s.customerEmail}</span>
        </div>
      ),
    },
    {
      header: 'Itens',
      align: 'center',
      cell: (s) => {
        const totalItems = s.items.reduce((sum, i) => sum + i.quantity, 0);
        return <span className="font-medium text-xs text-[#171A21]">{totalItems} un</span>;
      },
    },
    {
      header: 'Subtotal',
      accessorKey: 'subtotal',
      sortable: true,
      align: 'right',
      cell: (s) => <span className="text-[#667085]">R$ {s.subtotal.toFixed(2)}</span>,
    },
    {
      header: 'Desconto',
      accessorKey: 'discount',
      sortable: true,
      align: 'right',
      cell: (s) => s.discount > 0 ? (
        <span className="text-red-500 font-medium">- R$ {s.discount.toFixed(2)}</span>
      ) : <span className="text-[#667085]">-</span>,
    },
    {
      header: 'Frete',
      accessorKey: 'shipping',
      sortable: true,
      align: 'right',
      cell: (s) => s.shipping > 0 ? (
        <span className="text-[#667085]">+ R$ {s.shipping.toFixed(2)}</span>
      ) : <span className="text-[#667085]">Grátis</span>,
    },
    {
      header: 'Total',
      accessorKey: 'total',
      sortable: true,
      align: 'right',
      cell: (s) => (
        <span className="font-bold text-sm text-[#171A21]">
          R$ {s.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Pagamento',
      accessorKey: 'paymentMethod',
      sortable: true,
      cell: (s) => <span className="text-xs text-[#667085]">{s.paymentMethod}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (s) => <SaleStatusBadge status={s.status} />,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E7EB]">
        <div>
          <h2 className="text-base font-bold text-[#171A21]">Vendas & Pedidos</h2>
          <p className="text-xs text-[#667085]">
            Histórico de pedidos, pagamentos e status de expedição
          </p>
        </div>

        <button
          onClick={() => setIsNovaVendaOpen(true)}
          className="uze-btn-primary text-xs"
        >
          <Plus size={14} /> Nova Venda
        </button>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Vendas"
          value={`${dashboardMetrics.vendasCount} pedidos`}
          subtitle="Volume comercializado"
        />

        <StatCard
          title="Faturamento Bruto"
          value={`R$ ${dashboardMetrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Valor final faturado"
        />

        <StatCard
          title="Ticket Médio"
          value={`R$ ${dashboardMetrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Média por pedido"
        />

        <StatCard
          title="Peças Vendidas"
          value={`${dashboardMetrics.produtosVendidos} un`}
          subtitle="Jalecos e scrubs"
        />
      </div>

      {/* Sales Table or Empty State */}
      {filteredSales.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-[#173E75]">
            <Plus size={28} className="opacity-60" />
          </div>
          <h3 className="text-base font-bold text-[#171A21]">Nenhuma venda registrada</h3>
          <p className="text-xs text-[#667085] max-w-md leading-relaxed">
            Registre o primeiro pedido comercial para iniciar o histórico de faturamento, baixa automática de estoque e relatórios da UZE DOCTOR.
          </p>
          <button
            onClick={() => setIsNovaVendaOpen(true)}
            className="mt-2 uze-btn-primary text-xs shadow-xs"
          >
            <Plus size={14} />
            <span>Nova venda</span>
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredSales}
          searchPlaceholder="Buscar por venda #, cliente ou e-mail..."
          searchField={(s) => `${s.id} ${s.customerName} ${s.customerEmail} ${s.paymentMethod} ${s.status}`}
          filterOptions={[
          {
            label: 'Status',
            key: 'status',
            options: [
              { value: 'Concluído', label: 'Concluído' },
              { value: 'Pago', label: 'Pago' },
              { value: 'Em produção', label: 'Em produção' },
              { value: 'Pendente', label: 'Pendente' },
              { value: 'Cancelado', label: 'Cancelado' },
            ],
            filterFn: (s, val) => s.status === val,
          },
          {
            label: 'Pagamento',
            key: 'paymentMethod',
            options: [
              { value: 'PIX', label: 'PIX' },
              { value: 'Cartão de Crédito', label: 'Cartão de Crédito' },
              { value: 'Boleto', label: 'Boleto' },
              { value: 'Transferência', label: 'Transferência' },
            ],
            filterFn: (s, val) => s.paymentMethod === val,
          },
        ]}
        actions={(s) => (
          <button
            onClick={() => setSelectedSale(s)}
            className="p-1 text-[#667085] hover:text-[#173E75] hover:bg-gray-100 rounded transition-colors"
            title="Ver detalhes"
          >
            <Eye size={15} />
          </button>
        )}
      />
      )}

      {/* Nova Venda Modal */}
      <NovaVendaModal
        isOpen={isNovaVendaOpen}
        onClose={() => setIsNovaVendaOpen(false)}
      />

      {/* Sale Detail Drawer / Modal */}
      {selectedSale && (
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title={`Pedido ${selectedSale.id}`}
          subtitle={`Registrado em ${selectedSale.date}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase text-[#667085]">Cliente</p>
                <h3 className="font-bold text-sm text-[#171A21]">{selectedSale.customerName}</h3>
                <p className="text-[#667085]">{selectedSale.customerEmail}</p>
              </div>

              <div className="text-right space-y-1">
                <label className="text-[10px] uppercase font-semibold text-[#667085] block">Alterar Status</label>
                <select
                  className="uze-input text-xs py-1 h-7"
                  value={selectedSale.status}
                  onChange={(e) => {
                    updateSaleStatus(selectedSale.id, e.target.value as SaleStatus);
                    setSelectedSale({ ...selectedSale, status: e.target.value as SaleStatus });
                  }}
                >
                  <option value="Orçamento">Orçamento</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Pago">Pago</option>
                  <option value="Em produção">Em produção</option>
                  <option value="Enviado">Enviado</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[#171A21] uppercase text-[11px] mb-2">Itens Solicitados</h4>
              <div className="border border-[#E5E7EB] rounded-md overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F9FAFB] text-[#667085] uppercase text-[10px] font-semibold border-b border-[#E5E7EB]">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2 text-center">Qtd</th>
                      <th className="p-2 text-right">Unitário</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {selectedSale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{item.productName} ({item.colorName} - {item.size})</td>
                        <td className="p-2 font-mono text-[10px] text-[#667085]">{item.sku}</td>
                        <td className="p-2 text-center font-bold">{item.quantity}</td>
                        <td className="p-2 text-right">R$ {item.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-right font-bold text-[#171A21]">R$ {item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB] space-y-1">
                <p className="font-semibold text-[#171A21]">Forma: <span className="text-[#173E75]">{selectedSale.paymentMethod}</span></p>
                <p className="text-[#667085]">Custo Peças: R$ {selectedSale.totalCost.toFixed(2)}</p>
                <p className="text-emerald-600 font-bold">Lucro Líquido: R$ {selectedSale.estimatedProfit.toFixed(2)}</p>
              </div>

              <div className="p-3 bg-[#07101F] text-white rounded border border-slate-800 space-y-1 text-right">
                <p className="text-slate-300 text-xs">Subtotal: R$ {selectedSale.subtotal.toFixed(2)}</p>
                <p className="text-red-400 text-xs">Desconto: - R$ {selectedSale.discount.toFixed(2)}</p>
                <p className="text-slate-300 text-xs">Frete: + R$ {selectedSale.shipping.toFixed(2)}</p>
                <p className="text-sm font-bold text-[#C69A43] pt-1 border-t border-slate-800">
                  TOTAL: R$ {selectedSale.total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
