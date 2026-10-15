import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';
import type { Column } from '../components/common/DataTable';
import { DataTable } from '../components/common/DataTable';
import type { ProductVariant, StockMovement } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Edit3, ArrowLeftRight, AlertTriangle, Boxes, Eye } from 'lucide-react';
import { AjustarEstoqueModal } from '../components/modals/AjustarEstoqueModal';
import { VarianteDetalhesModal } from '../components/modals/VarianteDetalhesModal';
import { ProductImage } from '../components/common/ProductImage';
import { ExportMenu } from '../components/common/ExportMenu';
import { exportReportToPdf } from '../services/pdfExportService';
import { excelService } from '../services/excelService';
import { StockStatusBadge, MovementTypeBadge } from '../components/common/Badge';

export const EstoquePage: React.FC = () => {
  const { variants, models, movements } = useERP();
  const { user, hasPermission } = useAuth();

  const canReadCosts = hasPermission('products.cost.read');
  const canAdjustInventory = hasPermission('inventory.adjust');

  const [activeTab, setActiveTab] = useState<'saldo' | 'baixo' | 'movimentacoes'>('saldo');
  const [isAjustarOpen, setIsAjustarOpen] = useState(false);
  const [targetVariantId, setTargetVariantId] = useState<string | undefined>(undefined);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const totalUnits = variants.reduce((sum, v) => sum + v.currentStock, 0);

  const costValue = variants.reduce((sum, v) => {
    const model = models.find(m => m.id === v.modelId);
    return sum + (v.currentStock * (model?.baseCost || 0));
  }, 0);

  const saleValue = variants.reduce((sum, v) => {
    const model = models.find(m => m.id === v.modelId);
    return sum + (v.currentStock * (model?.basePrice || 0));
  }, 0);

  const lowStockVariants = variants.filter(v => v.currentStock <= v.minStock);
  const lowStockCount = variants.filter(v => v.currentStock > 0 && v.currentStock <= v.minStock).length;
  const outOfStockCount = variants.filter(v => v.currentStock === 0).length;

  const handleOpenAjusteForVariant = (variantId: string) => {
    setTargetVariantId(variantId);
    setIsAjustarOpen(true);
  };

  // Colunas do Saldo Atual
  const saldoColumns: Column<ProductVariant>[] = [
    {
      header: 'Produto',
      accessorKey: 'modelId',
      sortable: true,
      cell: (v) => {
        const model = models.find(m => m.id === v.modelId);
        return (
          <div className="flex items-center gap-2.5">
            <ProductImage
              src={model?.imageUrl}
              alt={model?.name || 'Produto'}
              size="sm"
            />
            <div>
              <p className="font-semibold text-[#101828]">{model?.name || 'Produto'}</p>
              <span className="text-[10px] text-[#475467] font-medium">{model?.category}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'SKU',
      accessorKey: 'sku',
      sortable: true,
      cell: (v) => <span className="font-mono text-xs text-[#344054] font-semibold">{v.sku}</span>,
    },
    {
      header: 'Cor',
      accessorKey: 'colorName',
      sortable: true,
      cell: (v) => (
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs" style={{ backgroundColor: v.colorHex }} />
          <span className="text-xs font-medium text-[#101828]">{v.colorName}</span>
        </div>
      ),
    },
    {
      header: 'Tamanho',
      accessorKey: 'size',
      sortable: true,
      align: 'center',
      cell: (v) => <span className="font-bold text-xs text-[#101828]">{v.size}</span>,
    },
    {
      header: 'Estoque Atual',
      accessorKey: 'currentStock',
      sortable: true,
      align: 'right',
      cell: (v) => (
        <span className={`font-bold text-sm ${v.currentStock === 0 ? 'text-[#B42318]' : 'text-[#101828]'}`}>
          {v.currentStock} un
        </span>
      ),
    },
    {
      header: 'Estoque Mínimo',
      accessorKey: 'minStock',
      sortable: true,
      align: 'right',
      cell: (v) => <span className="text-[#475467] font-medium">{v.minStock} un</span>,
    },
    {
      header: 'Status',
      align: 'left',
      cell: (v) => (
        <StockStatusBadge currentStock={v.currentStock} minStock={v.minStock} />
      ),
    },
  ];

  // Colunas de Movimentações
  const movementColumns: Column<StockMovement>[] = [
    {
      header: 'Data / Hora',
      accessorKey: 'date',
      sortable: true,
      cell: (m) => <span className="text-xs text-[#475467] font-mono font-medium">{m.date}</span>,
    },
    {
      header: 'Produto',
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
      header: 'Motivo / Origem',
      accessorKey: 'reason',
      sortable: true,
      cell: (m) => <span className="text-xs text-[#475467] font-medium">{m.reason}</span>,
    },
    {
      header: 'Operador',
      accessorKey: 'user',
      sortable: true,
      cell: (m) => <span className="text-xs text-[#475467] font-medium">{m.user}</span>,
    },
  ];

  const handleExportPdf = async () => {
    const kpis = [
      { label: 'Total de Peças', value: `${totalUnits} un` },
      { label: 'Potencial de Venda', value: `R$ ${saleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      { label: 'Estoque Baixo', value: `${lowStockCount} SKUs` },
      { label: 'Sem Estoque', value: `${outOfStockCount} SKUs` },
    ];

    const pdfColumns = [
      { header: 'Produto', dataKey: 'modelName' },
      { header: 'SKU', dataKey: 'sku', width: 26 },
      { header: 'Cor', dataKey: 'colorName', width: 22 },
      { header: 'Tam.', dataKey: 'size', align: 'center' as const, width: 15 },
      { header: 'Estoque Atual', dataKey: 'currentStockStr', align: 'right' as const, width: 25 },
      { header: 'Estoque Mín.', dataKey: 'minStockStr', align: 'right' as const, width: 24 },
      { header: 'Preço Venda (R$)', dataKey: 'salePriceStr', align: 'right' as const, width: 28 },
      { header: 'Status', dataKey: 'statusStr', align: 'center' as const, width: 24 },
    ];

    const rows = variants.map(v => {
      const model = models.find(m => m.id === v.modelId);
      const isZero = v.currentStock === 0;
      const isLow = v.currentStock > 0 && v.currentStock <= v.minStock;
      const statusText = isZero ? 'Sem Estoque' : isLow ? 'Estoque Baixo' : 'Normal';

      return {
        modelName: model?.name || 'Produto',
        sku: v.sku,
        colorName: v.colorName,
        size: v.size,
        currentStockStr: `${v.currentStock} un`,
        minStockStr: `${v.minStock} un`,
        salePriceStr: (model?.basePrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        statusStr: statusText,
      };
    });

    await exportReportToPdf({
      title: 'Relatório Oficial de Estoque Físico & Inventário',
      operatorName: user?.name,
      orientation: 'landscape',
      filename: `uze-doctor-estoque-${new Date().toISOString().slice(0, 10)}.pdf`,
      kpis,
      columns: pdfColumns,
      rows,
    });
  };

  const handleExportExcel = async () => {
    const columns = [
      { header: 'Produto', dataKey: 'Produto' },
      { header: 'SKU', dataKey: 'SKU' },
      { header: 'Cor', dataKey: 'Cor' },
      { header: 'Tamanho', dataKey: 'Tamanho' },
      { header: 'Estoque Atual (un)', dataKey: 'EstoqueAtual' },
      { header: 'Estoque Mínimo (un)', dataKey: 'EstoqueMinimo' },
      { header: 'Preço Venda (R$)', dataKey: 'PrecoVenda' },
      { header: 'Status Estoque', dataKey: 'Status' },
    ];

    const data = variants.map(v => {
      const model = models.find(m => m.id === v.modelId);
      const isZero = v.currentStock === 0;
      const isLow = v.currentStock > 0 && v.currentStock <= v.minStock;
      const statusText = isZero ? 'Sem Estoque' : isLow ? 'Estoque Baixo' : 'Normal';

      return {
        'Produto': model?.name || 'Produto',
        'SKU': v.sku,
        'Cor': v.colorName,
        'Tamanho': v.size,
        'EstoqueAtual': v.currentStock,
        'EstoqueMinimo': v.minStock,
        'PrecoVenda': model?.basePrice || 0,
        'Status': statusText,
      };
    });

    excelService.exportToExcel({
      filename: `uze-doctor-estoque-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Estoque_Fisico',
      data,
      columns,
    });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#101828]">Central de Estoque</h2>
          <p className="text-xs text-[#475467] font-medium">
            Saldos em tempo real, reposição e rastreamento completo de entradas e saídas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
          {canAdjustInventory && (
            <button
              onClick={() => {
                setTargetVariantId(undefined);
                setIsAjustarOpen(true);
              }}
              className="uze-btn-primary text-xs cursor-pointer shadow-xs"
            >
              <Edit3 size={13} /> Ajustar Estoque
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Peças em Estoque"
          value={`${totalUnits} un`}
          subtitle="Saldo total somado"
        />
        <StatCard
          title={canReadCosts ? "Custo em Estoque" : "Potencial de Venda"}
          value={canReadCosts ? `R$ ${costValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `R$ ${saleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={canReadCosts ? "Custo base de confecção" : "Preço de etiqueta"}
        />
        <StatCard
          title="Estoque Baixo"
          value={`${lowStockCount} SKUs`}
          subtitle="Abaixo do limite mínimo"
        />
        <StatCard
          title="Sem Estoque"
          value={`${outOfStockCount} SKUs`}
          subtitle="Zerados nas araras"
        />
      </div>

      {/* Navegação Interna do Estoque: Saldo / Baixo / Movimentações */}
      <div className="flex border-b border-[#D0D5DD] gap-2 pt-1">
        <button
          type="button"
          onClick={() => setActiveTab('saldo')}
          className={`pb-2.5 px-3 font-bold text-xs transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === 'saldo'
              ? 'border-[#173E75] text-[#173E75]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes size={14} />
          <span>Saldo Atual ({variants.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('baixo')}
          className={`pb-2.5 px-3 font-bold text-xs transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === 'baixo'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Estoque Baixo & Zerados ({lowStockVariants.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('movimentacoes')}
          className={`pb-2.5 px-3 font-bold text-xs transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === 'movimentacoes'
              ? 'border-[#173E75] text-[#173E75]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowLeftRight size={14} />
          <span>Movimentações & Histórico ({movements.length})</span>
        </button>
      </div>

      {/* TAB 1: SALDO ATUAL */}
      {activeTab === 'saldo' && (
        <DataTable
          columns={saldoColumns}
          data={variants}
          searchPlaceholder="Buscar por produto, SKU, cor ou tamanho..."
          searchField={(v) => {
            const m = models.find(mod => mod.id === v.modelId);
            return `${m?.name || ''} ${v.sku} ${v.colorName} ${v.size}`;
          }}
          actions={(v) => (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedVariant(v)}
                className="p-1.5 text-[#475467] hover:text-[#173E75] hover:bg-[#F2F4F7] rounded transition-colors cursor-pointer"
                title="Ver detalhes físicos, histórico e dados da variante"
              >
                <Eye size={14} />
              </button>
              {canAdjustInventory && (
                <button
                  onClick={() => handleOpenAjusteForVariant(v.id)}
                  className="p-1.5 text-[#475467] hover:text-[#173E75] hover:bg-[#F2F4F7] rounded transition-colors cursor-pointer"
                  title="Ajustar saldo deste SKU"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
          )}
        />
      )}

      {/* TAB 2: ESTOQUE BAIXO & ZERADOS */}
      {activeTab === 'baixo' && (
        <DataTable
          columns={saldoColumns}
          data={lowStockVariants}
          searchPlaceholder="Buscar entre itens com estoque crítico..."
          searchField={(v) => {
            const m = models.find(mod => mod.id === v.modelId);
            return `${m?.name || ''} ${v.sku} ${v.colorName} ${v.size}`;
          }}
          actions={(v) => (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedVariant(v)}
                className="p-1.5 text-[#475467] hover:text-[#173E75] hover:bg-[#F2F4F7] rounded transition-colors cursor-pointer"
                title="Ver detalhes físicos, histórico e dados da variante"
              >
                <Eye size={14} />
              </button>
              {canAdjustInventory && (
                <button
                  onClick={() => handleOpenAjusteForVariant(v.id)}
                  className="p-1.5 text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                  title="Ajustar ou repor este SKU"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
          )}
        />
      )}

      {/* TAB 3: MOVIMENTAÇÕES */}
      {activeTab === 'movimentacoes' && (
        <DataTable
          columns={movementColumns}
          data={movements}
          searchPlaceholder="Buscar histórico por produto, SKU, tipo ou motivo..."
          searchField={(m) => `${m.productName} ${m.sku} ${m.colorName} ${m.size} ${m.type} ${m.reason} ${m.user}`}
        />
      )}

      {/* Modal Ajustar Estoque */}
      {isAjustarOpen && (
        <AjustarEstoqueModal
          isOpen={isAjustarOpen}
          onClose={() => {
            setIsAjustarOpen(false);
            setTargetVariantId(undefined);
          }}
          variantId={targetVariantId}
        />
      )}

      {/* Modal Detalhes Interativos da Variante (Item 11) */}
      {selectedVariant && (
        <VarianteDetalhesModal
          isOpen={!!selectedVariant}
          onClose={() => setSelectedVariant(null)}
          variant={selectedVariant}
          model={models.find(m => m.id === selectedVariant.modelId) || null}
          onVariantUpdated={() => {
            const updated = variants.find(v => v.id === selectedVariant.id);
            if (updated) setSelectedVariant(updated);
          }}
        />
      )}
    </div>
  );
};
