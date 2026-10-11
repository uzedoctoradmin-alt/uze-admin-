import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';
import type { Column } from '../components/common/DataTable';
import { DataTable } from '../components/common/DataTable';
import type { PurchaseEntry } from '../types';
import { StatCard } from '../components/common/StatCard';
import { 
  Truck, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  Package, 
  DollarSign, 
  Building2, 
  AlertTriangle
} from 'lucide-react';
import { NovaEntradaModal } from '../components/modals/NovaEntradaModal';
import { Modal } from '../components/common/Modal';
import { ExportMenu } from '../components/common/ExportMenu';
import { exportReportToPdf } from '../services/pdfExportService';
import { excelService } from '../services/excelService';

export const EntradasPage: React.FC = () => {
  const { purchases, suppliers, deletePurchase } = useERP();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission('purchases.create' as any);
  const canEdit = hasPermission('purchases.edit' as any);
  const canDelete = hasPermission('purchases.delete' as any);
  const canReadCosts = hasPermission('products.cost.read');

  const [isNovaEntradaOpen, setIsNovaEntradaOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PurchaseEntry | null>(null);
  const [entryToEdit, setEntryToEdit] = useState<PurchaseEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<PurchaseEntry | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // KPIs
  const totalEntries = purchases.length;
  const totalPieces = purchases.reduce(
    (sum, p) => sum + p.items.reduce((iSum, i) => iSum + i.quantity, 0),
    0
  );
  const totalCost = purchases.reduce((sum, p) => sum + p.total, 0);
  const activeSuppliersCount = suppliers.filter(s => s.status === 'Ativo').length;

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchNum = p.entryNumber.toLowerCase().includes(q);
      const matchSup = p.supplierName.toLowerCase().includes(q);
      const matchItem = p.items.some(i => i.productName.toLowerCase().includes(q) || (i.sku && i.sku.toLowerCase().includes(q)));
      return matchNum || matchSup || matchItem;
    });
  }, [purchases, search]);

  const handleDeleteConfirm = () => {
    if (!entryToDelete) return;
    setDeleteErrorMessage(null);

    const result = deletePurchase(entryToDelete.id);
    if (!result.success) {
      setDeleteErrorMessage(result.reason || 'Erro ao excluir entrada de mercadoria.');
    } else {
      setEntryToDelete(null);
    }
  };

  const handleExportPdf = async () => {
    const kpis = [
      { label: 'Total de Entradas', value: `${totalEntries} registros` },
      { label: 'Peças Adquiridas', value: `${totalPieces} un` },
      { label: 'Investimento Total', value: `R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      { label: 'Fornecedores Ativos', value: `${activeSuppliersCount} cadastrados` },
    ];

    const pdfColumns = [
      { header: 'Entrada', dataKey: 'entryNumber', width: 22 },
      { header: 'Data', dataKey: 'date', width: 22 },
      { header: 'Fornecedor', dataKey: 'supplierName' },
      { header: 'Peças', dataKey: 'piecesStr', align: 'center' as const, width: 18 },
      { header: 'Valor Total', dataKey: 'totalStr', align: 'right' as const, width: 26 },
      { header: 'Status', dataKey: 'status', align: 'center' as const, width: 20 },
    ];

    const rows = filteredPurchases.map(p => ({
      entryNumber: p.entryNumber,
      date: p.date,
      supplierName: p.supplierName,
      piecesStr: `${p.items.reduce((s, i) => s + i.quantity, 0)} un`,
      totalStr: `R$ ${p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      status: p.status,
    }));

    await exportReportToPdf({
      title: 'Relatório de Entradas e Compras de Mercadorias',
      period: 'Histórico Completo',
      kpis,
      columns: pdfColumns,
      rows,
      filename: 'uze_entradas_compras.pdf',
    });
  };

  const handleExportExcel = () => {
    const data = filteredPurchases.map(p => ({
      'Número da Entrada': p.entryNumber,
      'Data da Compra': p.date,
      'Fornecedor': p.supplierName,
      'Total de Peças': p.items.reduce((s, i) => s + i.quantity, 0),
      'Subtotal (R$)': p.subtotal,
      'Desconto (R$)': p.discount,
      'Frete (R$)': p.shipping,
      'Valor Total (R$)': p.total,
      'Status': p.status,
      'Observações': p.notes || '',
    }));
    const excelColumns = [
      { header: 'Número da Entrada', dataKey: 'Número da Entrada', width: 18 },
      { header: 'Data da Compra', dataKey: 'Data da Compra', width: 15 },
      { header: 'Fornecedor', dataKey: 'Fornecedor', width: 25 },
      { header: 'Total de Peças', dataKey: 'Total de Peças', width: 15 },
      { header: 'Subtotal (R$)', dataKey: 'Subtotal (R$)', width: 15 },
      { header: 'Desconto (R$)', dataKey: 'Desconto (R$)', width: 15 },
      { header: 'Frete (R$)', dataKey: 'Frete (R$)', width: 15 },
      { header: 'Valor Total (R$)', dataKey: 'Valor Total (R$)', width: 18 },
      { header: 'Status', dataKey: 'Status', width: 15 },
      { header: 'Observações', dataKey: 'Observações', width: 30 },
    ];
    excelService.exportToExcel({
      filename: `uze-doctor-entradas-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Entradas_Compras',
      data,
      columns: excelColumns,
    });
  };

  const columns: Column<PurchaseEntry>[] = [
    {
      header: 'Entrada',
      accessorKey: 'entryNumber',
      sortable: true,
      cell: (p) => (
        <span className="font-mono font-bold text-xs text-[#173E75] bg-[#F2F4F7] px-2 py-0.5 rounded border border-[#EAECF0]">
          {p.entryNumber}
        </span>
      ),
    },
    {
      header: 'Data',
      accessorKey: 'date',
      sortable: true,
      cell: (p) => <span className="text-xs text-[#475467] font-medium">{p.date}</span>,
    },
    {
      header: 'Fornecedor',
      accessorKey: 'supplierName',
      sortable: true,
      cell: (p) => (
        <div className="flex items-center gap-1.5">
          <Building2 size={13} className="text-[#173E75] shrink-0" />
          <span className="font-semibold text-xs text-[#101828]">{p.supplierName}</span>
        </div>
      ),
    },
    {
      header: 'Itens & Peças',
      align: 'center',
      cell: (p) => {
        const totalItems = p.items.reduce((sum, i) => sum + i.quantity, 0);
        return (
          <span className="font-bold text-xs text-[#101828] bg-slate-100 px-2 py-0.5 rounded">
            {totalItems} peças ({p.items.length} itens)
          </span>
        );
      },
    },
    {
      header: 'Valor Total',
      accessorKey: 'total',
      sortable: true,
      align: 'right',
      cell: (p) => (
        <span className="font-black text-sm text-[#101828]">
          R$ {p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      align: 'center',
      cell: (p) => (
        <span className={`uze-badge ${p.status === 'Concluído' ? 'uze-badge-green' : 'uze-badge-gray'}`}>
          {p.status}
        </span>
      ),
    },
    {
      header: 'Ações',
      align: 'center',
      cell: (p) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => setSelectedEntry(p)}
            className="p-1.5 text-slate-500 hover:text-[#173E75] hover:bg-slate-100 rounded cursor-pointer transition-colors"
            title="Visualizar itens e detalhes"
          >
            <Eye size={15} />
          </button>

          {canEdit && (
            <button
              onClick={() => setEntryToEdit(p)}
              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
              title="Editar entrada"
            >
              <Edit2 size={15} />
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => {
                setEntryToDelete(p);
                setDeleteErrorMessage(null);
              }}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
              title="Excluir entrada e reverter estoque"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#101828] tracking-tight">
            Entradas de Mercadorias & Compras
          </h2>
          <p className="text-xs text-[#475467] font-medium mt-0.5">
            Registro de compras da fábrica e controle direto de abastecimento de estoque
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu
            onExportPdf={handleExportPdf}
            onExportExcel={handleExportExcel}
          />

          {canCreate && (
            <button
              onClick={() => {
                setEntryToEdit(null);
                setIsNovaEntradaOpen(true);
              }}
              className="bg-[#173E75] hover:bg-[#0F284C] text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Plus size={16} /> Nova Entrada
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Entradas Registradas"
          value={`${totalEntries} compras`}
          icon={Truck}
        />
        <StatCard
          title="Peças Entradas no Estoque"
          value={`${totalPieces} un`}
          icon={Package}
        />
        <StatCard
          title="Investimento Total"
          value={`R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <StatCard
          title="Fornecedores Cadastrados"
          value={`${activeSuppliersCount} ativos`}
          icon={Building2}
        />
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-[#EAECF0] shadow-xs p-4 space-y-4">
        {/* Search */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Buscar por entrada, fornecedor ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#D0D5DD] rounded-lg pl-3 pr-3 py-1.5 text-xs text-[#101828] font-medium placeholder:text-[#98A2B3] focus:ring-2 focus:ring-[#173E75] outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {filteredPurchases.length} registros
          </span>
        </div>

        {/* DataTable */}
        <DataTable
          data={filteredPurchases}
          columns={columns}
          searchPlaceholder="Buscar por entrada, fornecedor..."
          searchField={(p) => `${p.entryNumber} ${p.supplierName} ${p.notes || ''}`}
        />
      </div>

      {/* Modal Nova Entrada / Editar */}
      <NovaEntradaModal
        isOpen={isNovaEntradaOpen || Boolean(entryToEdit)}
        onClose={() => {
          setIsNovaEntradaOpen(false);
          setEntryToEdit(null);
        }}
        entryToEdit={entryToEdit}
      />

      {/* Modal Detalhes da Entrada */}
      {selectedEntry && (
        <Modal
          isOpen={Boolean(selectedEntry)}
          onClose={() => setSelectedEntry(null)}
          title={`Detalhes da Entrada ${selectedEntry.entryNumber}`}
          subtitle={`Compra realizada em ${selectedEntry.date} de ${selectedEntry.supplierName}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Data</span>
                <span className="font-bold text-[#101828]">{selectedEntry.date}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Fornecedor</span>
                <span className="font-bold text-[#101828]">{selectedEntry.supplierName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Registrado por</span>
                <span className="font-bold text-[#101828]">{selectedEntry.createdBy || 'Sistema'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Valor Total</span>
                <span className="font-black text-[#173E75]">
                  R$ {selectedEntry.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100/80 px-3 py-1.5 font-bold text-xs text-slate-700 border-b border-slate-200">
                Itens Abastecidos
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-600">
                  <tr>
                    <th className="py-1.5 px-3">Produto</th>
                    <th className="py-1.5 px-2">Cor / Tamanho</th>
                    <th className="py-1.5 px-2">SKU</th>
                    <th className="py-1.5 px-2 text-center">Qtde</th>
                    {canReadCosts && <th className="py-1.5 px-2 text-right">Custo Un.</th>}
                    {canReadCosts && <th className="py-1.5 px-3 text-right">Total</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedEntry.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-[#101828]">{it.productName}</td>
                      <td className="py-2 px-2 text-slate-600">{it.colorName || '-'} • {it.size || '-'}</td>
                      <td className="py-2 px-2 font-mono text-slate-500">{it.sku || '-'}</td>
                      <td className="py-2 px-2 text-center font-bold text-[#101828]">{it.quantity} un</td>
                      {canReadCosts && <td className="py-2 px-2 text-right text-slate-600">R$ {it.unitCost.toFixed(2)}</td>}
                      {canReadCosts && <td className="py-2 px-3 text-right font-bold text-[#173E75]">R$ {it.totalCost.toFixed(2)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedEntry.notes && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg text-slate-700">
                <span className="font-bold block text-[11px] text-amber-800 mb-0.5">Observações:</span>
                <p className="text-xs">{selectedEntry.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Confirmação de Exclusão de Entrada */}
      {entryToDelete && (
        <Modal
          isOpen={Boolean(entryToDelete)}
          onClose={() => {
            setEntryToDelete(null);
            setDeleteErrorMessage(null);
          }}
          title="Excluir Entrada de Mercadoria?"
          subtitle="Esta ação reverterá as unidades físicas do estoque com movimentação de estorno auditada"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-lg flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-800 text-xs">Atenção: Impacto no Estoque</h4>
                <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                  Ao excluir a entrada <strong>{entryToDelete.entryNumber}</strong>, o sistema tentará subtrair{' '}
                  <strong>{entryToDelete.items.reduce((s, i) => s + i.quantity, 0)} unidades</strong> do estoque físico.
                  Caso alguma variante tenha sido vendida e possua saldo insuficiente, a exclusão será cancelada para evitar estoque negativo.
                </p>
              </div>
            </div>

            {deleteErrorMessage && (
              <div className="p-2.5 bg-rose-100 border border-rose-300 text-rose-900 rounded font-bold text-xs">
                {deleteErrorMessage}
              </div>
            )}

            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Entrada:</span>
                <span className="font-bold text-slate-800">{entryToDelete.entryNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Fornecedor:</span>
                <span className="font-bold text-slate-800">{entryToDelete.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Valor Total:</span>
                <span className="font-black text-[#173E75]">
                  R$ {entryToDelete.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setEntryToDelete(null);
                  setDeleteErrorMessage(null);
                }}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded font-bold hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold"
              >
                Confirmar Exclusão e Reversão
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
