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
      cell: (s) => <span className="font-bold text-[#173E75] font-mono text-xs">{s.id}</span>,
    },
    {
      header: 'Data / Hora',
      accessorKey: 'date',
      sortable: true,
      cell: (s) => <span className="text-xs text-[#475467] font-medium">{s.date}</span>,
    },
    {
      header: 'Cliente',
      accessorKey: 'customerName',
      sortable: true,
      cell: (s) => (
        <div>
          <p className="font-semibold text-[#101828]">{s.customerName}</p>
          <span className="text-[10px] text-[#475467] font-medium">{s.customerEmail}</span>
        </div>
      ),
    },
    {
      header: 'Itens',
      align: 'center',
      cell: (s) => {
        const totalItems = s.items.reduce((sum, i) => sum + i.quantity, 0);
        return <span className="font-bold text-xs text-[#101828]">{totalItems} un</span>;
      },
    },
    {
      header: 'Subtotal',
      accessorKey: 'subtotal',
      sortable: true,
      align: 'right',
      cell: (s) => <span className="text-[#475467] font-medium">R$ {s.subtotal.toFixed(2)}</span>,
    },
    {
      header: 'Desconto',
      accessorKey: 'discount',
      sortable: true,
      align: 'right',
      cell: (s) => s.discount > 0 ? (
        <span className="text-[#B42318] font-bold">- R$ {s.discount.toFixed(2)}</span>
      ) : <span className="text-[#475467] font-medium">-</span>,
    },
    {
      header: 'Frete',
      accessorKey: 'shipping',
      sortable: true,
      align: 'right',
      cell: (s) => s.shipping > 0 ? (
        <span className="text-[#475467] font-medium">+ R$ {s.shipping.toFixed(2)}</span>
      ) : <span className="text-[#027A48] font-semibold">Grátis</span>,
    },
    {
      header: 'Total',
      accessorKey: 'total',
      sortable: true,
      align: 'right',
      cell: (s) => (
        <span className="font-black text-sm text-[#101828]">
          R$ {s.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Pagamento',
      accessorKey: 'paymentMethod',
      sortable: true,
      cell: (s) => <span className="text-xs text-[#475467] font-medium">{s.paymentMethod}</span>,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base font-bold text-[#101828]">Vendas & Pedidos</h2>
          <p className="text-xs text-[#475467] font-medium">
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
        <div className="bg-white border border-[#D0D5DD] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#EFF4FF] border border-[#D0D5DD] flex items-center justify-center text-[#173E75]">
            <Plus size={28} />
          </div>
          <h3 className="text-base font-bold text-[#101828]">Nenhuma venda registrada</h3>
          <p className="text-xs text-[#475467] font-medium max-w-md leading-relaxed">
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
            className="p-1 text-[#475467] hover:text-[#173E75] hover:bg-[#F2F4F7] rounded transition-colors"
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
            <div className="p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-[#344054]">Cliente</p>
                <h3 className="font-bold text-sm text-[#101828]">{selectedSale.customerName}</h3>
                <p className="text-[#475467] font-medium">{selectedSale.customerEmail}</p>
              </div>

              <div className="text-right space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#344054] block">Alterar Status</label>
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
              <h4 className="font-bold text-[#101828] uppercase text-[11px] mb-2">Itens Solicitados</h4>
              <div className="border border-[#D0D5DD] rounded-md overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F9FAFB] text-[#344054] uppercase text-[10px] font-bold border-b border-[#D0D5DD]">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2 text-center">Qtd</th>
                      <th className="p-2 text-right">Unitário</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0D5DD]">
                    {selectedSale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-[#101828]">{item.productName} ({item.colorName} - {item.size})</td>
                        <td className="p-2 font-mono text-[10px] text-[#344054] font-semibold">{item.sku}</td>
                        <td className="p-2 text-center font-bold text-[#101828]">{item.quantity}</td>
                        <td className="p-2 text-right text-[#475467] font-medium">R$ {item.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-right font-bold text-[#101828]">R$ {item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#F9FAFB] rounded border border-[#D0D5DD] space-y-1">
                <p className="font-bold text-[#101828]">Forma: <span className="text-[#173E75]">{selectedSale.paymentMethod}</span></p>
                <p className="text-[#475467] font-medium">Custo Peças: R$ {selectedSale.totalCost.toFixed(2)}</p>
                <p className="text-[#027A48] font-bold">Lucro Líquido: R$ {selectedSale.estimatedProfit.toFixed(2)}</p>
              </div>

              <div className="p-3 bg-[#07101F] text-white rounded border border-slate-800 space-y-1 text-right">
                <p className="text-slate-300 text-xs font-medium">Subtotal: R$ {selectedSale.subtotal.toFixed(2)}</p>
                <p className="text-red-400 text-xs font-semibold">Desconto: - R$ {selectedSale.discount.toFixed(2)}</p>
                <p className="text-slate-300 text-xs font-medium">Frete: + R$ {selectedSale.shipping.toFixed(2)}</p>
                <p className="text-sm font-black text-[#E5B869] pt-1 border-t border-slate-800">
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
