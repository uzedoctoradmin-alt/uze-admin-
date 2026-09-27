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
  X
} from 'lucide-react';
import { ProductImage } from '../components/common/ProductImage';
import { NovoProdutoModal } from '../components/modals/NovoProdutoModal';
import { Modal } from '../components/common/Modal';
import { ExportPdfButton } from '../components/common/ExportPdfButton';
import { exportReportToPdf } from '../services/pdfExportService';

export const ProdutosPage: React.FC = () => {
  const { models, variants } = useERP();
  const { user, hasPermission } = useAuth();

  const canReadCosts = hasPermission('products.cost.read');

  const [isNovoProdutoOpen, setIsNovoProdutoOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ProductModel | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Unique collections for filter
  const collections = useMemo(() => {
    return Array.from(new Set(models.map(m => m.collection)));
  }, [models]);

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
        const matchesCollection = m.collection.toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesCategory && !matchesCollection) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'all' && m.category !== selectedCategory) {
        return false;
      }

      // Collection
      if (selectedCollection !== 'all' && m.collection !== selectedCollection) {
        return false;
      }

      // Stock Status
      if (selectedStockStatus !== 'all') {
        const stats = getModelStats(m.id);
        if (selectedStockStatus === 'available' && stats.totalStock <= 0) return false;
        if (selectedStockStatus === 'low' && stats.stockStatus !== 'low') return false;
        if (selectedStockStatus === 'zero' && stats.totalStock !== 0) return false;
      }

      return true;
    });
  }, [models, search, selectedCategory, selectedCollection, selectedStockStatus, variants]);

  const activeFiltersCount = 
    (selectedCategory !== 'all' ? 1 : 0) + 
    (selectedCollection !== 'all' ? 1 : 0) + 
    (selectedStockStatus !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedCollection('all');
    setSelectedStockStatus('all');
    setSearch('');
  };

  const handleExportPdf = async () => {
    const totalModels = filteredModels.length;
    const totalVariantsCount = filteredModels.reduce((sum, m) => sum + getModelStats(m.id).variantCount, 0);
    const totalStockQty = filteredModels.reduce((sum, m) => sum + getModelStats(m.id).totalStock, 0);

    const kpis = [
      { label: 'Modelos Filtrados', value: `${totalModels} linhas` },
      { label: 'Total de SKUs', value: `${totalVariantsCount} variantes` },
      { label: 'Estoque Físico', value: `${totalStockQty} peças` },
    ];

    const pdfColumns = [
      { header: 'Modelo / Produto', dataKey: 'name' },
      { header: 'Categoria', dataKey: 'category', width: 28 },
      { header: 'Coleção', dataKey: 'collection', width: 28 },
      { header: 'Gênero', dataKey: 'gender', align: 'center' as const, width: 20 },
      { header: 'Preço Venda (R$)', dataKey: 'priceStr', align: 'right' as const, width: 26 },
      ...(canReadCosts ? [{ header: 'Custo Base (R$)', dataKey: 'costStr', align: 'right' as const, width: 26 }] : []),
      { header: 'Variantes', dataKey: 'variantsStr', align: 'center' as const, width: 20 },
      { header: 'Estoque Físico', dataKey: 'stockStr', align: 'right' as const, width: 24 },
      { header: 'Status', dataKey: 'status', align: 'center' as const, width: 20 },
    ];

    const rows = filteredModels.map(m => {
      const stats = getModelStats(m.id);
      return {
        name: m.name,
        category: m.category,
        collection: m.collection || '-',
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
    if (selectedCollection !== 'all') activeFilterLabels.push(`Coleção: ${selectedCollection}`);
    if (selectedStockStatus !== 'all') activeFilterLabels.push(`Estoque: ${selectedStockStatus}`);

    await exportReportToPdf({
      title: 'Relatório Oficial de Catálogo de Produtos & Modelos',
      subtitle: activeFilterLabels.length > 0 ? activeFilterLabels.join(' | ') : 'Todos os produtos ativos e fichas comerciais',
      operatorName: user?.name,
      orientation: 'landscape',
      filename: `uze-doctor-produtos-${new Date().toISOString().slice(0, 10)}.pdf`,
      kpis,
      columns: pdfColumns,
      rows,
    });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#101828] tracking-tight">Produtos</h2>
          <p className="text-xs text-[#475467] font-medium">
            Gerencie modelos, preços, variantes e estoque.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportPdfButton onExport={handleExportPdf} />
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

      {/* 2. Search & Discreet Filters Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475467]" />
            <input
              type="text"
              placeholder="Buscar por modelo, SKU ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#D0D5DD] rounded-lg outline-none focus:border-[#173E75] focus:ring-2 focus:ring-[#173E75]/15 text-[#101828] placeholder:text-[#667085] font-medium transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#475467] hover:text-[#101828] p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Discreet Filters Button / Dropdown Trigger */}
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`h-9 px-3 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                activeFiltersCount > 0 || showFilterDropdown
                  ? 'border-[#173E75] bg-[#173E75]/10 text-[#173E75]'
                  : 'border-[#D0D5DD] bg-white text-[#101828] hover:bg-[#F2F4F7]'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#173E75] text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Quick reset button if filters active */}
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="h-9 px-2 text-xs text-[#475467] font-semibold hover:text-[#101828] hover:underline"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Discreet Filter Popover Panel */}
        {showFilterDropdown && (
          <div className="bg-white border border-[#D0D5DD] rounded-lg p-3.5 shadow-md grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
            {/* Category Select */}
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

            {/* Collection Select */}
            <div>
              <label className="text-[10px] font-bold text-[#344054] uppercase tracking-wider block mb-1">
                Coleção
              </label>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full h-8 text-xs bg-[#F9FAFB] border border-[#D0D5DD] rounded-md px-2 text-[#101828] font-medium outline-none cursor-pointer focus:border-[#173E75]"
              >
                <option value="all">Todas as Coleções</option>
                {collections.map((col: string) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Availability */}
            <div>
              <label className="text-[10px] font-bold text-[#344054] uppercase tracking-wider block mb-1">
                Disponibilidade
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
                {/* Desktop & Tablet Layout (>= 768px): Horizontal Elegant Block */}
                <div className="hidden md:flex items-center justify-between gap-4">
                  {/* Left Side: Photo + Name + Secondary Info + SKU */}
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

                      <p className="text-xs text-[#475467] font-medium truncate mt-0.5" title={`${model.category} • ${model.collection}`}>
                        {model.category} • {model.collection}
                      </p>

                      <div className="mt-1">
                        <span className="text-[10px] font-mono text-[#344054] bg-[#F2F4F7] px-1.5 py-0.5 rounded border border-[#D0D5DD] font-semibold">
                          SKU: {model.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Metrics (Preço para todos; Custo e Margem apenas para perfis autorizados) */}
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

                  {/* Right Side: Variants Count + Stock Units + Ver Detalhes Button */}
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <span className="text-xs font-bold text-[#101828] block">
                        {stats.variantCount} variantes
                      </span>
                      <span className={`text-xs font-bold block ${
                        stats.totalStock === 0 
                          ? 'text-[#B42318]' 
                          : stats.totalStock <= 15 
                          ? 'text-[#B54708]' 
                          : 'text-[#173E75]'
                      }`}>
                        {stats.totalStock} em estoque
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedModel(model)}
                      className="uze-btn-secondary text-xs px-3 py-1.5 shrink-0"
                    >
                      <span>Ver detalhes</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Mobile Layout (< 768px): Compact Vertical Block */}
                <div className="md:hidden space-y-3">
                  {/* Row 1: Image + Title + Category */}
                  <div className="flex items-center gap-3">
                    <ProductImage
                      src={model.imageUrl}
                      alt={model.name}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-[#101828] truncate">
                        {model.name}
                      </h3>
                      <p className="text-xs text-[#475467] font-medium truncate">
                        {model.gender} • {model.collection}
                      </p>
                      <span className="text-[10px] font-mono text-[#344054] bg-[#F2F4F7] px-1.5 py-0.5 rounded border border-[#D0D5DD] font-semibold inline-block mt-0.5">
                        SKU: {model.id}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Price, Variants & Stock, Margin (if permitted) */}
                  <div className="bg-[#F9FAFB] p-2.5 rounded-md border border-[#D0D5DD] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-[#344054] uppercase block font-bold">Preço</span>
                      <span className="font-bold text-[#101828]">R$ {model.basePrice.toFixed(2)}</span>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-[#344054] uppercase block font-bold">Estoque</span>
                      <span className="font-bold text-[#173E75]">
                        {stats.variantCount} var • {stats.totalStock} un
                      </span>
                    </div>

                    {canReadCosts && (
                      <div className="text-right">
                        <span className="text-[10px] text-[#344054] uppercase block font-bold">Margem</span>
                        <span className="font-black text-[#027A48]">{margin.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Action Button */}
                  <button
                    onClick={() => setSelectedModel(model)}
                    className="w-full uze-btn-secondary text-xs justify-center py-2"
                  >
                    <span>Ver detalhes do modelo</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Cadastro de Produto */}
      <NovoProdutoModal
        isOpen={isNovoProdutoOpen}
        onClose={() => setIsNovoProdutoOpen(false)}
      />

      {/* Modal Detalhes do Produto e Variantes */}
      {selectedModel && (
        <Modal
          isOpen={!!selectedModel}
          onClose={() => setSelectedModel(null)}
          title={`Produto: ${selectedModel.name}`}
          subtitle={`Coleção: ${selectedModel.collection} • Categoria: ${selectedModel.category}`}
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
                  <span className="uze-badge uze-badge-gold">{selectedModel.status}</span>
                </div>
                <p className="text-[#344054] font-medium leading-relaxed">{selectedModel.description}</p>
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#D0D5DD] font-medium text-[#101828]">
                  <span>Preço de Venda: <strong className="text-[#101828] font-bold">R$ {selectedModel.basePrice.toFixed(2)}</strong></span>
                  {canReadCosts && (
                    <span>Custo Unitário: <strong className="text-[#475467] font-semibold">R$ {selectedModel.baseCost.toFixed(2)}</strong></span>
                  )}
                  <span>Gênero: <strong className="text-[#101828] font-bold">{selectedModel.gender}</strong></span>
                  <span>SKU Base: <code className="font-mono text-[#173E75] font-bold bg-[#EFF4FF] px-1 py-0.5 rounded border border-[#D0D5DD]">{selectedModel.id}</code></span>
                </div>
              </div>
            </div>

            {/* Variants table */}
            <div>
              <h4 className="font-bold text-[#101828] uppercase text-[11px] mb-2 flex items-center gap-1.5">
                <Layers size={13} className="text-[#173E75]" /> 
                Variantes Físicas Associadas ({getModelStats(selectedModel.id).variantCount})
              </h4>
              <div className="uze-table-container">
                <table className="uze-table text-xs">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Cor</th>
                      <th>Tamanho</th>
                      <th className="text-right">Estoque</th>
                      <th className="text-right">Mínimo</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getModelStats(selectedModel.id).variantsList.map(v => (
                      <tr key={v.id}>
                        <td className="font-mono text-[#344054] font-semibold">{v.sku}</td>
                        <td className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border-2 border-[#D0D5DD] shadow-xs"
                            style={{ backgroundColor: v.colorHex }}
                          />
                          <span className="font-medium text-[#101828]">{v.colorName}</span>
                        </td>
                        <td className="font-bold text-[#101828]">{v.size}</td>
                        <td className="text-right font-bold text-[#101828]">{v.currentStock} un</td>
                        <td className="text-right text-[#475467] font-medium">{v.minStock} un</td>
                        <td>
                          {v.currentStock === 0 ? (
                            <span className="uze-badge uze-badge-danger">Sem Estoque</span>
                          ) : v.currentStock <= v.minStock ? (
                            <span className="uze-badge uze-badge-warning">Estoque Baixo</span>
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
    </div>
  );
};
