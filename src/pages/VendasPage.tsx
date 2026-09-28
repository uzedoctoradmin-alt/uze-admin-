import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';
import type { Column } from '../components/common/DataTable';
import { DataTable } from '../components/common/DataTable';
import type { Sale, SaleStatus } from '../types';
import { StatCard } from '../components/common/StatCard';
import { SaleStatusBadge } from '../components/common/Badge';
import { Plus, Eye, Edit2, XCircle, AlertTriangle, UserCheck, Gift } from 'lucide-react';
import { NovaVendaModal } from '../components/modals/NovaVendaModal';
import { Modal } from '../components/common/Modal';
import { ExportMenu } from '../components/common/ExportMenu';
import { exportReportToPdf } from '../services/pdfExportService';
import { excelService } from '../services/excelService';

export const VendasPage: React.FC = () => {
  const { filteredSales, dashboardMetrics, updateSaleStatus, cancelSale, periodFilter, employees } = useERP();
  const { user, hasPermission } = useAuth();

  const [isNovaVendaOpen, setIsNovaVendaOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);

  const sellersList = employees.filter(e => e.isSeller);

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
      header: 'Vendedor',
      accessorKey: 'sellerName',
      sortable: true,
      cell: (s) => (
        <div className="flex items-center gap-1 text-xs">
          <UserCheck size={13} className="text-[#173E75] shrink-0" />
          <span className="font-medium text-[#344054]">
            {s.sellerName || 'Geral'}
          </span>
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
      cell: (s) => (s.discount || 0) > 0 ? (
        <div>
          <span className="text-[#B42318] font-bold">- R$ {s.discount.toFixed(2)}</span>
          {s.discountType === 'PERCENTAGE' && s.discountValue && (
            <span className="block text-[9px] text-[#475467]">({s.discountValue}%)</span>
          )}
        </div>
      ) : <span className="text-[#475467] font-medium">-</span>,
    },
    {
      header: 'Indicação',
      accessorKey: 'referralName',
      sortable: true,
      cell: (s) => s.referralName ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C69A43] bg-[#FEF6EE] px-1.5 py-0.5 rounded border border-[#F9DBAF]">
          <Gift size={11} /> {s.referralName}
        </span>
      ) : (
        <span className="text-xs text-[#98A2B3]">-</span>
      ),
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

  const handleExportPdf = async () => {
    const kpis = [
      { label: 'Total de Vendas', value: `${dashboardMetrics.vendasCount} pedidos` },
      { label: 'Faturamento Bruto', value: `R$ ${dashboardMetrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      { label: 'Ticket Médio', value: `R$ ${dashboardMetrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      { label: 'Peças Vendidas', value: `${dashboardMetrics.produtosVendidos} un` },
    ];

    const pdfColumns = [
      { header: 'Venda', dataKey: 'id', width: 18 },
      { header: 'Data', dataKey: 'date', width: 22 },
      { header: 'Cliente', dataKey: 'customerName' },
      { header: 'Vendedor', dataKey: 'sellerName', width: 24 },
      { header: 'Itens', dataKey: 'itemsSummary', align: 'center' as const, width: 15 },
      { header: 'Subtotal', dataKey: 'subtotalStr', align: 'right' as const, width: 22 },
      { header: 'Desconto', dataKey: 'discountStr', align: 'right' as const, width: 20 },
      { header: 'Total (R$)', dataKey: 'totalStr', align: 'right' as const, width: 24 },
      { header: 'Indicação', dataKey: 'referralName', width: 22 },
      { header: 'Status', dataKey: 'status', align: 'center' as const, width: 20 },
    ];

    const rows = filteredSales.map(s => ({
      id: s.id,
      date: s.date,
      customerName: s.customerName,
      sellerName: s.sellerName || 'Geral',
      itemsSummary: `${s.items.reduce((sum, i) => sum + i.quantity, 0)} un`,
      subtotalStr: s.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      discountStr: s.discount > 0 ? `-${s.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '0,00',
      totalStr: s.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      referralName: s.referralName || '-',
      paymentMethod: s.paymentMethod,
      status: s.status,
    }));

    await exportReportToPdf({
      title: 'Relatório Oficial de Vendas & Pedidos',
      subtitle: 'Listagem de pedidos e faturamento comercial',
      period: periodFilter,
      operatorName: user?.name,
      orientation: 'landscape',
      filename: `uze-doctor-vendas-${new Date().toISOString().slice(0, 10)}.pdf`,
      kpis,
      columns: pdfColumns,
      rows,
    });
  };

  const handleExportExcel = async () => {
    const isSeller = user?.role === 'VENDEDOR';

    const columns = [
      { header: 'ID Venda', dataKey: 'Venda' },
      { header: 'Data', dataKey: 'Data' },
      { header: 'Cliente', dataKey: 'Cliente' },
      { header: 'E-mail', dataKey: 'E-mail' },
      { header: 'Vendedor', dataKey: 'Vendedor' },
      { header: 'Itens (un)', dataKey: 'Itens' },
      { header: 'Subtotal (R$)', dataKey: 'Subtotal' },
      { header: 'Desconto (R$)', dataKey: 'Desconto' },
      { header: 'Observação Desconto', dataKey: 'ObsDesconto' },
      { header: 'Frete (R$)', dataKey: 'Frete' },
      { header: 'Total (R$)', dataKey: 'Total' },
      { header: 'Indicação', dataKey: 'Indicacao' },
      { header: 'Obs Indicação', dataKey: 'ObsIndicacao' },
      ...(!isSeller ? [
        { header: 'Custo Total (R$)', dataKey: 'Custo' },
        { header: 'Lucro Estimado (R$)', dataKey: 'Lucro' },
      ] : []),
      { header: 'Forma Pagamento', dataKey: 'Pagamento' },
      { header: 'Status', dataKey: 'Status' },
    ];

    const data = filteredSales.map(s => ({
      'Venda': s.id,
      'Data': s.date,
      'Cliente': s.customerName,
      'E-mail': s.customerEmail || '-',
      'Vendedor': s.sellerName || 'Geral',
      'Itens': s.items.reduce((sum, i) => sum + i.quantity, 0),
      'Subtotal': s.subtotal,
      'Desconto': s.discount,
      'ObsDesconto': s.discountNote || '-',
      'Frete': s.shipping,
      'Total': s.total,
      'Indicacao': s.referralName || '-',
      'ObsIndicacao': s.referralNote || '-',
      ...(!isSeller ? {
        'Custo': s.totalCost,
        'Lucro': s.estimatedProfit,
      } : {}),
      'Pagamento': s.paymentMethod,
      'Status': s.status,
    }));

    excelService.exportToExcel({
      filename: `uze-doctor-vendas-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Vendas',
      data,
      columns,
      metadata: {
        title: 'Relatório Consolidado de Vendas e Pedidos',
        operator: user?.name,
        period: periodFilter,
      }
    });
  };

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

        <div className="flex items-center gap-2">
          <ExportMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
          {hasPermission('sales.create') && (
            <button
              onClick={() => setIsNovaVendaOpen(true)}
              className="uze-btn-primary text-xs cursor-pointer"
            >
              <Plus size={14} /> Nova Venda
            </button>
          )}
        </div>
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
          searchPlaceholder="Buscar por venda #, cliente, vendedor ou indicação..."
          searchField={(s) => `${s.id} ${s.customerName} ${s.customerEmail} ${s.sellerName || ''} ${s.referralName || ''} ${s.paymentMethod} ${s.status}`}
          filterOptions={[
            {
              label: 'Vendedor',
              key: 'sellerId',
              options: sellersList.map(s => ({ value: s.id, label: s.name })),
              filterFn: (s, val) => s.sellerId === val,
            },
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedSale(s)}
                className="p-1 text-[#475467] hover:text-[#173E75] hover:bg-[#F2F4F7] rounded transition-colors"
                title="Ver detalhes"
              >
                <Eye size={15} />
              </button>
              {hasPermission('sales.edit') && s.status !== 'Cancelado' && (
                <button
                  onClick={() => setSaleToEdit(s)}
                  className="p-1 text-[#173E75] hover:text-[#0C2340] hover:bg-[#173E75]/10 rounded transition-colors"
                  title="Editar venda"
                >
                  <Edit2 size={15} />
                </button>
              )}
              {hasPermission('sales.cancel') && s.status !== 'Cancelado' && (
                <button
                  onClick={() => setSaleToCancel(s)}
                  className="p-1 text-[#B42318] hover:text-[#912018] hover:bg-[#FEF3F2] rounded transition-colors"
                  title="Cancelar venda"
                >
                  <XCircle size={15} />
                </button>
              )}
            </div>
          )}
        />
      )}

      {/* Nova Venda / Edição de Venda Modal */}
      <NovaVendaModal
        isOpen={isNovaVendaOpen || !!saleToEdit}
        onClose={() => {
          setIsNovaVendaOpen(false);
          setSaleToEdit(null);
        }}
        saleToEdit={saleToEdit}
      />

      {/* Cancellation Confirmation Modal */}
      {saleToCancel && (
        <Modal
          isOpen={!!saleToCancel}
          onClose={() => setSaleToCancel(null)}
          title={`Cancelar Venda #${saleToCancel.id}`}
          subtitle={`Cliente: ${saleToCancel.customerName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-[#FEF3F2] border border-[#FECDCA] rounded-lg text-[#B42318] space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-bold text-sm">Confirma o cancelamento desta venda?</p>
                  <p className="text-[#344054] leading-relaxed">
                    Esta ação executará a conciliação comercial e contábil completa:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[#475467]">
                    <li>
                      <strong>Devolução de estoque:</strong> Todas as peças físicas vinculadas ao catálogo retornarão ao saldo de estoque com movimentação do tipo <em>Devolução</em>.
                    </li>
                    <li>
                      <strong>Conciliação financeira:</strong> O lançamento de receita correspondente será marcado como <em>Cancelado</em>, ajustando faturamento e relatórios.
                    </li>
                    <li>
                      <strong>Histórico preservado:</strong> A venda permanecerá registrada no sistema com status <em>Cancelado</em> para auditoria contábil.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#D0D5DD]">
              <button
                type="button"
                onClick={() => setSaleToCancel(null)}
                className="uze-btn-secondary text-xs"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  cancelSale(saleToCancel.id);
                  setSaleToCancel(null);
                  if (selectedSale?.id === saleToCancel.id) {
                    setSelectedSale({ ...selectedSale, status: 'Cancelado' });
                  }
                }}
                className="uze-btn-primary bg-[#B42318] hover:bg-[#912018] text-xs"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </Modal>
      )}

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
            {/* Header info */}
            <div className="p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD] grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div>
                <p className="text-[10px] font-bold uppercase text-[#475467]">Cliente</p>
                <h3 className="font-bold text-sm text-[#101828]">{selectedSale.customerName}</h3>
                <p className="text-[#475467] font-medium">{selectedSale.customerEmail || 'E-mail não informado'}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase text-[#475467]">Vendedor Responsável</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <UserCheck size={14} className="text-[#173E75]" />
                  <span className="font-bold text-xs text-[#101828]">
                    {selectedSale.sellerName || 'Venda Direta / Geral'}
                  </span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#475467] block">Alterar Status</label>
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

            {/* Indicação Badge if any */}
            {selectedSale.referralName && (
              <div className="p-3 bg-[#FEF6EE] border border-[#F9DBAF] rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Gift size={16} className="text-[#C69A43] shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#B54708] block">Venda com Indicação</span>
                    <span className="font-bold text-[#101828]">{selectedSale.referralName}</span>
                    {selectedSale.referralNote && (
                      <span className="text-[#475467] italic ml-1.5">({selectedSale.referralNote})</span>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                    {selectedSale.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-[#101828]">
                          <div className="flex items-center gap-1.5">
                            <span>{item.productName}</span>
                            {item.isCustom ? (
                              <span className="uze-badge uze-badge-gold text-[9px] py-0 px-1 font-bold">
                                Item Avulso
                              </span>
                            ) : (
                              <span className="text-[#475467] text-[11px]">
                                ({item.colorName} - {item.size})
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-[10px] text-[#475467] italic mt-0.5">{item.notes}</p>
                          )}
                        </td>
                        <td className="p-2 font-mono text-[10px] text-[#344054] font-semibold">
                          {item.isCustom ? 'AVULSO' : item.sku}
                        </td>
                        <td className="p-2 text-center font-bold text-[#101828]">{item.quantity}</td>
                        <td className="p-2 text-right text-[#475467] font-medium">R$ {item.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-right font-bold text-[#101828]">R$ {item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-[#F9FAFB] rounded border border-[#D0D5DD] space-y-1.5">
                <p className="font-bold text-[#101828]">Forma: <span className="text-[#173E75]">{selectedSale.paymentMethod}</span></p>
                {selectedSale.discountNote && (
                  <p className="text-[11px] text-[#B54708] bg-[#FEF6EE] p-1.5 rounded border border-[#F9DBAF]">
                    <strong>Motivo Desconto:</strong> {selectedSale.discountNote}
                  </p>
                )}
                {hasPermission('finance.read') && (
                  <>
                    <p className="text-[#475467] font-medium">Custo Peças: R$ {selectedSale.totalCost.toFixed(2)}</p>
                    <p className="text-[#027A48] font-bold">Lucro Líquido: R$ {selectedSale.estimatedProfit.toFixed(2)}</p>
                  </>
                )}
              </div>

              <div className="p-3 bg-[#07101F] text-white rounded border border-slate-800 space-y-1 text-right">
                <p className="text-slate-300 text-xs font-medium">Subtotal: R$ {selectedSale.subtotal.toFixed(2)}</p>
                <p className="text-red-400 text-xs font-semibold">
                  Desconto: - R$ {selectedSale.discount.toFixed(2)}
                  {selectedSale.discountType === 'PERCENTAGE' && selectedSale.discountValue && (
                    <span className="text-slate-400 text-[10px] ml-1">({selectedSale.discountValue}%)</span>
                  )}
                </p>
                <p className="text-slate-300 text-xs font-medium">Frete: + R$ {selectedSale.shipping.toFixed(2)}</p>
                <p className="text-sm font-black text-[#E5B869] pt-1 border-t border-slate-800">
                  TOTAL: R$ {selectedSale.total.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Actions in detail drawer */}
            {hasPermission('sales.edit') && selectedSale.status !== 'Cancelado' && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D0D5DD]">
                <button
                  type="button"
                  onClick={() => {
                    const s = selectedSale;
                    setSelectedSale(null);
                    setSaleToEdit(s);
                  }}
                  className="uze-btn-secondary text-xs text-[#173E75]"
                >
                  <Edit2 size={13} /> Editar Venda
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = selectedSale;
                    setSelectedSale(null);
                    setSaleToCancel(s);
                  }}
                  className="uze-btn-secondary text-xs text-[#B42318]"
                >
                  <XCircle size={13} /> Cancelar Venda
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
