import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';
import type { ProductModel } from '../types';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  ChevronRight, 
  Layers, 
  Boxes, 
  Edit2, 
  Archive, 
  Trash2, 
  RotateCcw, 
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import { ProductImage } from '../components/common/ProductImage';
import { NovoProdutoModal } from '../components/modals/NovoProdutoModal';
import { EditarProdutoModal } from '../components/modals/EditarProdutoModal';
import { VarianteDetalhesModal } from '../components/modals/VarianteDetalhesModal';
import { Modal } from '../components/common/Modal';
import { ExportMenu } from '../components/common/ExportMenu';
import { exportReportToPdf } from '../services/pdfExportService';
import { excelService } from '../services/excelService';
import type { ProductVariant } from '../types';

export const ProdutosPage: React.FC = () => {
  const { models, variants, sales, movements, archiveModel, reactivateModel, deleteModel } = useERP();
  const { user, hasPermission } = useAuth();

  const canReadCosts = hasPermission('products.cost.read');
  const isAdmin = user?.role === 'ADMINISTRADOR';

  const [isNovoProdutoOpen, setIsNovoProdutoOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ProductModel | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [modelToEdit, setModelToEdit] = useState<ProductModel | null>(null);
  const [modelToArchive, setModelToArchive] = useState<ProductModel | null>(null);
  const [modelToDelete, setModelToDelete] = useState<ProductModel | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [adminConfirmWord, setAdminConfirmWord] = useState('');
  const [deleteReason, setDeleteReason] = useState('Remoção de produto de teste/descontinuado');
  const [statusTab, setStatusTab] = useState<'Ativos' | 'Arquivados' | 'Todos'>('Ativos');

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Unique categories for filter
  const categories = useMemo(() => {
    return Array.from(new Set(models.map(m => m.category)));
  }, [models]);

  const getModelStats = (modelId: string) => {
    const modelVariants = variants.filter(v => v.modelId === modelId);
    const totalStock = modelVariants.reduce((sum, v) => sum + v.currentStock, 0);
    const hasZeroStock = modelVariants.some(v => v.currentStock === 0);
    const hasLowStock = modelVariants.some(v => v.currentStock > 0 && v.currentStock <= v.minStock);

    let stockStatus: 'ok' | 'low' | 'zero' = 'ok';
    if (totalStock === 0 || hasZeroStock) {
      stockStatus = totalStock === 0 ? 'zero' : 'low';
    } else if (hasLowStock) {
      stockStatus = 'low';
    }

    return {
      variantCount: modelVariants.length,
      totalStock,
      stockStatus,
      variantsList: modelVariants,
    };
  };

  // Filtered models
  const filteredModels = useMemo(() => {
    return models.filter(m => {
      // Search text
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(query);
        const matchesSku = m.id.toLowerCase().includes(query);
        const matchesCategory = m.category.toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesCategory) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'all' && m.category !== selectedCategory) {
        return false;
      }

      // Stock Status
      if (selectedStockStatus !== 'all') {
        const stats = getModelStats(m.id);
        if (selectedStockStatus === 'available' && stats.totalStock <= 0) return false;
        if (selectedStockStatus === 'low' && stats.stockStatus !== 'low') return false;
        if (selectedStockStatus === 'zero' && stats.totalStock !== 0) return false;
      }

      // Status tab
      if (statusTab === 'Ativos' && m.status === 'Arquivado') return false;
      if (statusTab === 'Arquivados' && m.status !== 'Arquivado') return false;

      return true;
    });
  }, [models, search, selectedCategory, selectedStockStatus, statusTab, variants]);

  const activeFiltersCount = 
    (selectedCategory !== 'all' ? 1 : 0) + 
    (selectedStockStatus !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedStockStatus('all');
    setSearch('');
  };

  const handleExportPdf = async () => {
    const totalModels = filteredModels.length;
    const totalVariantsCount = filteredModels.reduce((sum, m) => sum + getModelStats(m.id).variantCount, 0);
    const totalStockQty = filteredModels.reduce((sum, m) => sum + getModelStats(m.id).totalStock, 0);

    const kpis = [
      { label: 'Produtos Filtrados', value: `${totalModels} itens` },
      { label: 'Total de SKUs', value: `${totalVariantsCount} variantes` },
      { label: 'Estoque Físico', value: `${totalStockQty} peças` },
    ];

    const pdfColumns = [
      { header: 'Produto', dataKey: 'name' },
      { header: 'Categoria', dataKey: 'category', width: 32 },
      { header: 'Gênero', dataKey: 'gender', align: 'center' as const, width: 22 },
      { header: 'Preço Venda (R$)', dataKey: 'priceStr', align: 'right' as const, width: 28 },
      ...(canReadCosts ? [{ header: 'Custo Base (R$)', dataKey: 'costStr', align: 'right' as const, width: 28 }] : []),
      { header: 'Variantes', dataKey: 'variantsStr', align: 'center' as const, width: 22 },
      { header: 'Estoque Físico', dataKey: 'stockStr', align: 'right' as const, width: 26 },
      { header: 'Status', dataKey: 'status', align: 'center' as const, width: 22 },
    ];

    const rows = filteredModels.map(m => {
      const stats = getModelStats(m.id);
      return {
        name: m.name,
        category: m.category,
        gender: m.gender,
        priceStr: m.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        ...(canReadCosts ? { costStr: m.baseCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } : {}),
        variantsStr: `${stats.variantCount} SKUs`,
        stockStr: `${stats.totalStock} un`,
        status: m.status,
      };
    });

    const activeFilterLabels = [];
    if (selectedCategory !== 'all') activeFilterLabels.push(`Categoria: ${selectedCategory}`);
    if (selectedStockStatus !== 'all') activeFilterLabels.push(`Estoque: ${selectedStockStatus}`);

    await exportReportToPdf({
      title: 'Relatório Oficial de Catálogo de Produtos',
      subtitle: activeFilterLabels.length > 0 ? activeFilterLabels.join(' | ') : 'Todos os produtos ativos e fichas comerciais',
      operatorName: user?.name,
      orientation: 'landscape',
      filename: `uze-doctor-produtos-${new Date().toISOString().slice(0, 10)}.pdf`,
      kpis,
      columns: pdfColumns,
      rows,
    });
  };

  const handleExportExcel = async () => {
    const columns = [
      { header: 'Produto', dataKey: 'Produto' },
      { header: 'Categoria', dataKey: 'Categoria' },
      { header: 'Gênero', dataKey: 'Genero' },
      { header: 'Preço Venda (R$)', dataKey: 'PrecoVenda' },
      ...(canReadCosts ? [{ header: 'Custo Base (R$)', dataKey: 'CustoBase' }] : []),
      { header: 'Total Variantes (SKUs)', dataKey: 'Variantes' },
      { header: 'Estoque Físico Total (un)', dataKey: 'EstoqueFisico' },
      { header: 'Status', dataKey: 'Status' },
      { header: 'Descrição', dataKey: 'Descricao' },
    ];

    const data = filteredModels.map(m => {
      const stats = getModelStats(m.id);
      return {
        'Produto': m.name,
        'Categoria': m.category,
        'Genero': m.gender,
        'PrecoVenda': m.basePrice,
        ...(canReadCosts ? { 'CustoBase': m.baseCost } : {}),
        'Variantes': stats.variantCount,
        'EstoqueFisico': stats.totalStock,
        'Status': m.status,
        'Descricao': m.description || '-',
      };
    });

    excelService.exportToExcel({
      filename: `uze-doctor-produtos-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Produtos',
      data,
      columns,
      metadata: {
        title: 'Catálogo de Produtos UZE DOCTOR',
        operator: user?.name,
      }
    });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#101828] tracking-tight">Produtos</h2>
          <p className="text-xs text-[#475467] font-medium">
            Entidade central da loja: fotos, cores, tamanhos, variantes e controle de estoque.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
          {hasPermission('products.create') && (
            <button
              onClick={() => setIsNovoProdutoOpen(true)}
              className="uze-btn-primary text-xs self-start sm:self-auto shadow-xs"
            >
              <Plus size={14} /> Novo Produto
            </button>
          )}
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="text"
              placeholder="Buscar por nome do produto, SKU ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-xs bg-white border border-[#D0D5DD] rounded-lg text-[#101828] placeholder-[#98A2B3] focus:border-[#173E75] focus:ring-1 focus:ring-[#173E75] outline-none transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex bg-[#F2F4F7] p-0.5 rounded-lg border border-[#D0D5DD] shrink-0">
            {(['Ativos', 'Arquivados', 'Todos'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  statusTab === tab
                    ? 'bg-white text-[#173E75] shadow-xs'
                    : 'text-[#475467] hover:text-[#101828]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Toggle Filters Button */}
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`h-9 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeFiltersCount > 0
                ? 'bg-[#EFF4FF] border-[#B2CCFF] text-[#173E75]'
                : 'bg-white border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB]'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#173E75] text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Dropdown Area */}
        {showFilterDropdown && (
          <div className="p-3 bg-white border border-[#D0D5DD] rounded-lg shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="text-[10px] font-bold text-[#344054] uppercase tracking-wider block mb-1">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-8 text-xs bg-[#F9FAFB] border border-[#D0D5DD] rounded-md px-2 text-[#101828] font-medium outline-none cursor-pointer focus:border-[#173E75]"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((cat: string) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Availability */}
            <div>
              <label className="text-[10px] font-bold text-[#344054] uppercase tracking-wider block mb-1">
                Disponibilidade de Estoque
              </label>
              <select
                value={selectedStockStatus}
                onChange={(e) => setSelectedStockStatus(e.target.value)}
                className="w-full h-8 text-xs bg-[#F9FAFB] border border-[#D0D5DD] rounded-md px-2 text-[#101828] font-medium outline-none cursor-pointer focus:border-[#173E75]"
              >
                <option value="all">Todos os Estados</option>
                <option value="available">Em Estoque</option>
                <option value="low">Estoque Baixo</option>
                <option value="zero">Sem Estoque (Zerados)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 3. Products List */}
      <div className="space-y-3">
        {models.length === 0 ? (
          <div className="bg-white border border-[#D0D5DD] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#EFF4FF] border border-[#D0D5DD] flex items-center justify-center text-[#173E75]">
              <Boxes size={28} />
            </div>
            <h3 className="text-base font-bold text-[#101828]">Nenhum produto cadastrado</h3>
            <p className="text-xs text-[#475467] font-medium max-w-md leading-relaxed">
              Cadastre o primeiro produto da UZE DOCTOR para começar a controlar catálogo, variantes e estoque.
            </p>
            <button
              onClick={() => setIsNovoProdutoOpen(true)}
              className="mt-2 uze-btn-primary text-xs shadow-xs"
            >
              <Plus size={14} />
              <span>Cadastrar produto</span>
            </button>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="bg-white border border-[#D0D5DD] rounded-lg p-10 text-center">
            <Boxes size={32} className="mx-auto text-[#98A2B3] mb-2" />
            <h3 className="text-sm font-bold text-[#101828]">Nenhum produto encontrado</h3>
            <p className="text-xs text-[#475467] font-medium mt-1">
              Tente ajustar os filtros ou o termo de busca.
            </p>
            <button
              onClick={resetFilters}
              className="mt-3 text-xs text-[#173E75] font-semibold hover:underline"
            >
              Limpar todos os filtros
            </button>
          </div>
        ) : (
          filteredModels.map((model: ProductModel) => {
            const stats = getModelStats(model.id);
            const margin = model.basePrice > 0 ? ((model.basePrice - model.baseCost) / model.basePrice) * 100 : 0;

            return (
              <div
                key={model.id}
                className="bg-white border border-[#D0D5DD] rounded-lg p-3.5 sm:p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-[#173E75] hover:shadow-xs transition-all"
              >
                {/* Desktop & Tablet Layout */}
                <div className="hidden md:flex items-center justify-between gap-4">
                  {/* Left: Photo + Name + Category + SKU */}
                  <div className="flex items-center gap-3.5 min-w-0 max-w-[40%]">
                    <ProductImage
                      src={model.imageUrl}
                      alt={model.name}
                      size="md"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#101828] truncate" title={model.name}>
                          {model.name}
                        </h3>
                        <span className="uze-badge uze-badge-navy text-[10px] shrink-0">
                          {model.gender}
                        </span>
                      </div>

                      <p className="text-xs text-[#475467] font-medium truncate mt-0.5" title={model.category}>
                        {model.category}
                      </p>

                      <div className="mt-1">
                        <span className="text-[10px] font-mono text-[#344054] bg-[#F2F4F7] px-1.5 py-0.5 rounded border border-[#D0D5DD] font-semibold">
                          SKU: {model.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Prices */}
                  <div className="flex items-center gap-6 lg:gap-8 px-4 border-x border-[#D0D5DD] shrink-0 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-[#344054] uppercase tracking-wider block">
                        Preço
                      </span>
                      <span className="text-sm font-black text-[#101828] whitespace-nowrap">
                        R$ {model.basePrice.toFixed(2)}
                      </span>
                    </div>

                    {canReadCosts && (
                      <>
                        <div>
                          <span className="text-[10px] font-bold text-[#344054] uppercase tracking-wider block">
                            Custo
                          </span>
                          <span className="text-xs font-bold text-[#475467] whitespace-nowrap">
                            R$ {model.baseCost.toFixed(2)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-[#344054] uppercase tracking-wider block">
                            Margem
                          </span>
                          <span className="text-xs font-black text-[#027A48] whitespace-nowrap">
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right: Variants + Stock + Action */}
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <span className="text-xs font-bold text-[#101828] block">
                        {stats.variantCount} variantes
                      </span>
                      <span
                        className={`text-[11px] font-semibold block mt-0.5 ${
                          stats.stockStatus === 'zero'
                            ? 'text-[#B42318]'
                            : stats.stockStatus === 'low'
                            ? 'text-[#B54708]'
                            : 'text-[#027A48]'
                        }`}
                      >
                        {stats.totalStock} em estoque
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedModel(model)}
                        className="uze-btn-secondary text-xs h-8 px-3"
                      >
                        Ver Detalhes
                        <ChevronRight size={13} className="text-[#98A2B3]" />
                      </button>

                      {hasPermission('products.edit') && (
                        <button
                          onClick={() => setModelToEdit(model)}
                          className="w-8 h-8 rounded-md border border-[#D0D5DD] flex items-center justify-center text-[#475467] hover:text-[#173E75] hover:bg-[#F9FAFB] transition-colors"
                          title="Editar Produto"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}

                      {hasPermission('products.delete') && (
                        <button
                          onClick={() => {
                            setModelToDelete(model);
                            setAdminConfirmWord('');
                            setDeleteErrorMessage(null);
                          }}
                          className="w-8 h-8 rounded-md border border-[#D0D5DD] flex items-center justify-center text-[#475467] hover:text-[#B42318] hover:bg-[#FEF3F2] transition-colors"
                          title="Excluir Produto"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile Layout (< 768px) */}
                <div className="md:hidden space-y-3">
                  <div className="flex items-start gap-3">
                    <ProductImage
                      src={model.imageUrl}
                      alt={model.name}
                      size="sm"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-xs font-bold text-[#101828] truncate">{model.name}</h3>
                        <span className="uze-badge uze-badge-navy text-[9px] shrink-0">{model.gender}</span>
                      </div>
                      <p className="text-[11px] text-[#475467] font-medium truncate mt-0.5">{model.category}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[9px] font-mono bg-[#F2F4F7] px-1 py-0.5 rounded border border-[#D0D5DD] text-[#344054]">
                          {model.id}
                        </span>
                        <span className="text-[11px] font-bold text-[#101828]">
                          R$ {model.basePrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#D0D5DD] text-[11px]">
                    <span className="font-semibold text-[#475467]">
                      {stats.variantCount} var. • <b className={stats.stockStatus === 'zero' ? 'text-rose-600' : 'text-emerald-700'}>{stats.totalStock} un</b>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedModel(model)}
                        className="uze-btn-secondary text-[11px] py-1 px-2.5 h-7"
                      >
                        Detalhes
                      </button>
                      {hasPermission('products.edit') && (
                        <button
                          onClick={() => setModelToEdit(model)}
                          className="w-7 h-7 rounded border border-[#D0D5DD] flex items-center justify-center text-[#475467]"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      {hasPermission('products.delete') && (
                        <button
                          onClick={() => {
                            setModelToDelete(model);
                            setAdminConfirmWord('');
                            setDeleteErrorMessage(null);
                          }}
                          className="w-7 h-7 rounded border border-[#D0D5DD] flex items-center justify-center text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Novo Produto */}
      {isNovoProdutoOpen && (
        <NovoProdutoModal
          isOpen={isNovoProdutoOpen}
          onClose={() => setIsNovoProdutoOpen(false)}
        />
      )}

      {/* Modal Editar Produto */}
      {modelToEdit && (
        <EditarProdutoModal
          isOpen={!!modelToEdit}
          onClose={() => setModelToEdit(null)}
          model={modelToEdit}
        />
      )}

      {/* Modal Arquivar Produto */}
      {modelToArchive && (
        <Modal
          isOpen={!!modelToArchive}
          onClose={() => setModelToArchive(null)}
          title={modelToArchive.status === 'Arquivado' ? 'Reativar Produto' : 'Arquivar Produto'}
          subtitle={`Produto: ${modelToArchive.name}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-[#344054] leading-relaxed">
              {modelToArchive.status === 'Arquivado'
                ? 'Deseja reativar este produto? Ele voltará a ficar disponível para novos pedidos e movimentações.'
                : 'Ao arquivar, o produto não aparecerá em novos lançamentos de vendas, mas todo o histórico comercial, estatísticas e estoque atual permanecem integralmente preservados.'}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#D0D5DD]">
              <button onClick={() => setModelToArchive(null)} className="uze-btn-secondary text-xs">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (modelToArchive.status === 'Arquivado') {
                    reactivateModel(modelToArchive.id);
                  } else {
                    archiveModel(modelToArchive.id);
                  }
                  setModelToArchive(null);
                }}
                className={`uze-btn-primary text-xs ${
                  modelToArchive.status === 'Arquivado' ? 'bg-[#027A48] hover:bg-[#05603A]' : 'bg-[#B54708] hover:bg-[#93370D]'
                }`}
              >
                {modelToArchive.status === 'Arquivado' ? 'Confirmar Reativação' : 'Confirmar Arquivamento'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Exclusão de Produto (Segurança + Opção Avançada Administrador) */}
      {modelToDelete && (
        <Modal
          isOpen={!!modelToDelete}
          onClose={() => { setModelToDelete(null); setDeleteErrorMessage(null); }}
          title="Excluir Produto"
          subtitle={`Produto: ${modelToDelete.name} (${modelToDelete.id})`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {(() => {
              const modelVarIds = variants.filter(v => v.modelId === modelToDelete.id).map(v => v.id);
              const hasSalesHistory = sales.some(s => s.items.some(it => it.variantId && modelVarIds.includes(it.variantId)));
              const hasMovements = movements.some(m => modelVarIds.includes(m.variantId));

              // Se tiver vendas históricas
              if (hasSalesHistory) {
                return (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={18} className="shrink-0 text-amber-700 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-900">Este produto possui histórico de vendas realizadas</p>
                          <p className="mt-1 text-slate-700 leading-relaxed">
                            Para manter relatórios contábeis coerentes, a recomendação é <strong>Arquivar</strong> o produto. Ele deixará de ser ofertado sem quebrar o histórico.
                          </p>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2.5">
                        <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                          <ShieldAlert size={16} />
                          <span>Opção Avançada de Administrador: Excluir Definitivamente</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                          Esta ação removerá o produto e suas variantes de teste ou obsoletas. Para confirmar, digite <b>EXCLUIR</b> abaixo:
                        </p>
                        <input
                          type="text"
                          placeholder="Digite EXCLUIR"
                          className="uze-input text-xs font-bold uppercase tracking-wider"
                          value={adminConfirmWord}
                          onChange={e => setAdminConfirmWord(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Motivo da exclusão (auditoria)"
                          className="uze-input text-xs"
                          value={deleteReason}
                          onChange={e => setDeleteReason(e.target.value)}
                        />
                      </div>
                    )}

                    {deleteErrorMessage && (
                      <p className="text-xs text-rose-600 font-bold">{deleteErrorMessage}</p>
                    )}

                    <div className="flex justify-between items-center gap-2 pt-2 border-t border-[#D0D5DD]">
                      <button
                        onClick={() => {
                          const toArch = modelToDelete;
                          setModelToDelete(null);
                          setModelToArchive(toArch);
                        }}
                        className="uze-btn-primary bg-[#B54708] hover:bg-[#93370D] text-xs"
                      >
                        <Archive size={13} /> Arquivar (Recomendado)
                      </button>

                      <div className="flex items-center gap-2">
                        <button onClick={() => setModelToDelete(null)} className="uze-btn-secondary text-xs">
                          Fechar
                        </button>
                        {isAdmin && (
                          <button
                            disabled={adminConfirmWord !== 'EXCLUIR'}
                            onClick={() => {
                              const res = deleteModel(modelToDelete.id, { force: true, reason: deleteReason });
                              if (res.success) {
                                setModelToDelete(null);
                                if (selectedModel?.id === modelToDelete.id) setSelectedModel(null);
                              } else {
                                setDeleteErrorMessage(res.reason || 'Erro ao excluir');
                              }
                            }}
                            className="uze-btn-primary bg-rose-700 hover:bg-rose-800 text-xs disabled:opacity-40"
                          >
                            Excluir Definitivamente
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Se NÃO tiver vendas (produto novo ou de teste, mesmo com movimentações de teste)
              return (
                <div className="space-y-4">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-start gap-2">
                    <Trash2 size={18} className="shrink-0 text-rose-700 mt-0.5" />
                    <div>
                      <p className="font-bold">Excluir Produto Definitivamente</p>
                      <p className="mt-1 text-slate-700 leading-relaxed">
                        Este produto não possui histórico de vendas comerciais. Todas as suas variantes e dados dependentes serão removidos do sistema sem deixar registros órfãos.
                      </p>
                      {hasMovements && (
                        <p className="mt-1 text-xs text-amber-800 font-medium">
                          * As movimentações de estoque associadas a este produto de teste serão devidamente limpas.
                        </p>
                      )}
                    </div>
                  </div>

                  {deleteErrorMessage && (
                    <p className="text-xs text-rose-600 font-bold">{deleteErrorMessage}</p>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#D0D5DD]">
                    <button onClick={() => setModelToDelete(null)} className="uze-btn-secondary text-xs">
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        const res = deleteModel(modelToDelete.id, { force: true });
                        if (res.success) {
                          setModelToDelete(null);
                          if (selectedModel?.id === modelToDelete.id) setSelectedModel(null);
                        } else {
                          setDeleteErrorMessage(res.reason || 'Erro ao excluir modelo');
                        }
                      }}
                      className="uze-btn-primary bg-rose-700 hover:bg-rose-800 text-xs"
                    >
                      Confirmar Exclusão
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Modal Detalhes do Produto e Variantes */}
      {selectedModel && (
        <Modal
          isOpen={!!selectedModel}
          onClose={() => setSelectedModel(null)}
          title={`Produto: ${selectedModel.name}`}
          subtitle={`Categoria: ${selectedModel.category}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD]">
              <ProductImage
                src={selectedModel.imageUrl}
                alt={selectedModel.name}
                size="lg"
              />

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#101828]">{selectedModel.name}</h3>
                  <span className={`uze-badge ${selectedModel.status === 'Arquivado' ? 'uze-badge-warning' : 'uze-badge-gold'}`}>
                    {selectedModel.status}
                  </span>
                </div>
                <p className="text-[#344054] font-medium leading-relaxed">{selectedModel.description || 'Sem descrição cadastrada.'}</p>
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#D0D5DD] font-medium text-[#101828]">
                  <span>Preço de Venda: <strong className="text-[#101828] font-bold">R$ {selectedModel.basePrice.toFixed(2)}</strong></span>
                  {canReadCosts && (
                    <span>Custo Unitário: <strong className="text-[#475467] font-semibold">R$ {selectedModel.baseCost.toFixed(2)}</strong></span>
                  )}
                  <span>Gênero: <strong className="text-[#101828] font-bold">{selectedModel.gender}</strong></span>
                  <span>SKU Base: <code className="font-mono text-[#173E75] font-bold bg-[#EFF4FF] px-1 py-0.5 rounded border border-[#D0D5DD]">{selectedModel.id}</code></span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#D0D5DD]">
                  {hasPermission('products.edit') && (
                    <button
                      onClick={() => {
                        const m = selectedModel;
                        setSelectedModel(null);
                        setModelToEdit(m);
                      }}
                      className="uze-btn-secondary text-xs text-[#173E75]"
                    >
                      <Edit2 size={13} /> Editar Produto / Variantes
                    </button>
                  )}
                  {hasPermission('products.delete') && (
                    <>
                      <button
                        onClick={() => {
                          const m = selectedModel;
                          setSelectedModel(null);
                          setModelToArchive(m);
                        }}
                        className="uze-btn-secondary text-xs text-[#B54708]"
                      >
                        {selectedModel.status === 'Arquivado' ? <RotateCcw size={13} /> : <Archive size={13} />}
                        {selectedModel.status === 'Arquivado' ? 'Reativar' : 'Arquivar'}
                      </button>
                      <button
                        onClick={() => {
                          const m = selectedModel;
                          setSelectedModel(null);
                          setModelToDelete(m);
                        }}
                        className="uze-btn-secondary text-xs text-[#B42318]"
                      >
                        <Trash2 size={13} /> Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Seção: Variantes Físicas Interativas (Itens 9, 10, 11 do Requisito) */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <h4 className="font-bold text-[#101828] uppercase text-[11px] flex items-center gap-1.5">
                  <Layers size={13} className="text-[#173E75]" /> 
                  Variantes Físicas ({getModelStats(selectedModel.id).variantCount})
                </h4>
                <span className="text-[10px] text-[#475467] font-medium">
                  💡 Clique em qualquer linha para abrir detalhes, movimentações e ajuste de estoque
                </span>
              </div>

              <div className="uze-table-container">
                <table className="uze-table text-xs">
                  <thead>
                    <tr>
                      <th>Cor</th>
                      <th className="text-center">Tamanho</th>
                      <th>SKU</th>
                      <th className="text-right">Estoque Atual</th>
                      <th className="text-right">Estoque Mínimo</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getModelStats(selectedModel.id).variantsList.map(v => (
                      <tr 
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className="cursor-pointer hover:bg-[#EFF4FF] transition-colors group"
                        title="Clique para abrir detalhes da variante"
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs shrink-0"
                              style={{ backgroundColor: v.colorHex }}
                            />
                            <span className="font-semibold text-[#101828] group-hover:text-[#173E75]">{v.colorName}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="px-2 py-0.5 bg-[#F2F4F7] text-[#101828] rounded font-bold border border-[#D0D5DD]">
                            {v.size}
                          </span>
                        </td>
                        <td className="font-mono text-[#344054] font-semibold">{v.sku}</td>
                        <td className="text-right font-black text-[#101828]">{v.currentStock} un</td>
                        <td className="text-right text-[#475467] font-medium">{v.minStock} un</td>
                        <td>
                          {v.currentStock === 0 ? (
                            <span className="uze-badge uze-badge-danger">Sem estoque</span>
                          ) : v.currentStock <= v.minStock ? (
                            <span className="uze-badge uze-badge-warning">Estoque baixo</span>
                          ) : (
                            <span className="uze-badge uze-badge-success">Disponível</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Detalhes Interativos da Variante Física (Item 11) */}
      {selectedVariant && (
        <VarianteDetalhesModal
          isOpen={!!selectedVariant}
          onClose={() => setSelectedVariant(null)}
          variant={selectedVariant}
          model={selectedModel || models.find(m => m.id === selectedVariant.modelId) || null}
          onVariantUpdated={() => {
            // Recarrega variante atualizada para manter o modal em sincronia
            const updated = variants.find(v => v.id === selectedVariant.id);
            if (updated) setSelectedVariant(updated);
          }}
        />
      )}
    </div>
  );
};
