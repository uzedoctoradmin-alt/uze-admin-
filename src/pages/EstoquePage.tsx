import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import type { Column } from '../components/common/DataTable';
import { DataTable } from '../components/common/DataTable';
import type { ProductVariant } from '../types';
import { StatCard } from '../components/common/StatCard';
import { StockStatusBadge } from '../components/common/Badge';
import { Edit3, ArrowLeftRight } from 'lucide-react';
import { AjustarEstoqueModal } from '../components/modals/AjustarEstoqueModal';
import { ProductImage } from '../components/common/ProductImage';

export const EstoquePage: React.FC = () => {
  const { variants, models, setCurrentTab } = useERP();

  const [isAjustarOpen, setIsAjustarOpen] = useState(false);
  const [targetVariantId, setTargetVariantId] = useState<string | undefined>(undefined);

  const totalUnits = variants.reduce((sum, v) => sum + v.currentStock, 0);

  const costValue = variants.reduce((sum, v) => {
    const model = models.find(m => m.id === v.modelId);
    return sum + (v.currentStock * (model?.baseCost || 0));
  }, 0);

  const saleValue = variants.reduce((sum, v) => {
    const model = models.find(m => m.id === v.modelId);
    return sum + (v.currentStock * (model?.basePrice || 0));
  }, 0);

  const lowStockCount = variants.filter(v => v.currentStock > 0 && v.currentStock <= v.minStock).length;
  const outOfStockCount = variants.filter(v => v.currentStock === 0).length;

  const handleOpenAjusteForVariant = (variantId: string) => {
    setTargetVariantId(variantId);
    setIsAjustarOpen(true);
  };

  const columns: Column<ProductVariant>[] = [
    {
      header: 'Produto / Modelo',
      accessorKey: 'modelId',
      sortable: true,
      cell: (v) => {
        const model = models.find(m => m.id === v.modelId);
        return (
          <div className="flex items-center gap-2.5">
            <ProductImage
              src={model?.imageUrl}
              alt={model?.name || 'Modelo'}
              size="sm"
            />
            <div>
              <p className="font-semibold text-[#101828]">{model?.name || 'Modelo'}</p>
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
          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#D0D5DD] shadow-xs" style={{ backgroundColor: v.colorHex }} />
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base font-bold text-[#101828]">Central de Estoque Físico</h2>
          <p className="text-xs text-[#475467] font-medium">
            Controle de inventário por SKU, cor, tamanho e regras de nivelamento
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTab('movimentacoes')}
            className="uze-btn-secondary text-xs"
          >
            <ArrowLeftRight size={13} /> Movimentações
          </button>
          <button
            onClick={() => {
              setTargetVariantId(undefined);
              setIsAjustarOpen(true);
            }}
            className="uze-btn-primary text-xs"
          >
            <Edit3 size={13} /> Ajustar Estoque
          </button>
        </div>
      </div>

      {/* Top 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total de Peças"
          value={`${totalUnits} un`}
          subtitle="Inventário físico"
        />

        <StatCard
          title="Valor de Custo"
          value={`R$ ${costValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Investimento em estoque"
        />

        <StatCard
          title="Potencial de Venda"
          value={`R$ ${saleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Faturamento potencial"
        />

        <StatCard
          title="Estoque Baixo"
          value={`${lowStockCount} SKUs`}
          subtitle="Abaixo do limite mínimo"
        />

        <StatCard
          title="Sem Estoque"
          value={`${outOfStockCount} SKUs`}
          subtitle="Quantidade zerada"
        />
      </div>

      {/* Stock Table */}
      <DataTable
        columns={columns}
        data={variants}
        emptyText="Nenhum item de estoque cadastrado."
        searchPlaceholder="Buscar por SKU, nome de cor ou tamanho..."
        searchField={(v) => {
          const model = models.find(m => m.id === v.modelId);
          return `${model?.name} ${v.sku} ${v.colorName} ${v.size}`;
        }}
        filterOptions={[
          {
            label: 'Status',
            key: 'status',
            options: [
              { value: 'OK', label: 'Disponível' },
              { value: 'LOW', label: 'Estoque Baixo' },
              { value: 'OUT', label: 'Sem Estoque' },
            ],
            filterFn: (v, val) => {
              if (val === 'OUT') return v.currentStock === 0;
              if (val === 'LOW') return v.currentStock > 0 && v.currentStock <= v.minStock;
              if (val === 'OK') return v.currentStock > v.minStock;
              return true;
            },
          },
          {
            label: 'Tamanho',
            key: 'size',
            options: [
              { value: 'PP', label: 'PP' },
              { value: 'P', label: 'P' },
              { value: 'M', label: 'M' },
              { value: 'G', label: 'G' },
              { value: 'GG', label: 'GG' },
            ],
            filterFn: (v, val) => v.size === val,
          },
        ]}
        actions={(v) => (
          <button
            onClick={() => handleOpenAjusteForVariant(v.id)}
            className="p-1 text-xs font-bold text-[#173E75] hover:bg-[#F2F4F7] rounded transition-colors"
          >
            Ajustar
          </button>
        )}
      />

      {/* Modal Ajuste de Estoque */}
      <AjustarEstoqueModal
        isOpen={isAjustarOpen}
        onClose={() => setIsAjustarOpen(false)}
        variantId={targetVariantId}
      />
    </div>
  );
};
