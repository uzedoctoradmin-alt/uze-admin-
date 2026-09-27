import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import type { ProductModel } from '../types';
import { Layers, Boxes } from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { ProductImage } from '../components/common/ProductImage';
import { NovoProdutoModal } from '../components/modals/NovoProdutoModal';

export const ModelosPage: React.FC = () => {
  const { models, variants, sales } = useERP();
  const [selectedModel, setSelectedModel] = useState<ProductModel | null>(null);

  const getModelMetrics = (modelId: string) => {
    const modelVariants = variants.filter(v => v.modelId === modelId);
    const totalStock = modelVariants.reduce((sum, v) => sum + v.currentStock, 0);

    let unitsSold = 0;
    let revenueGenerated = 0;

    sales.forEach(sale => {
      if (sale.status !== 'Cancelado') {
        sale.items.forEach(item => {
          if (item.modelId === modelId) {
            unitsSold += item.quantity;
            revenueGenerated += item.subtotal;
          }
        });
      }
    });

    return {
      variantCount: modelVariants.length,
      totalStock,
      unitsSold,
      revenueGenerated,
      variantsList: modelVariants,
    };
  };

  const [isNovoModeloOpen, setIsNovoModeloOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base font-bold text-[#101828]">Modelos de Jalecos & Coleções</h2>
          <p className="text-xs text-[#475467] font-medium">
            Apresentação visual das linhas exclusivas da UZE DOCTOR com inteligência de vendas
          </p>
        </div>

        <button
          onClick={() => setIsNovoModeloOpen(true)}
          className="uze-btn-primary text-xs self-start sm:self-auto shadow-xs"
        >
          <Layers size={14} />
          <span>Novo Modelo</span>
        </button>
      </div>

      {/* Visual Model Cards Grid or Empty State */}
      {models.length === 0 ? (
        <div className="bg-white border border-[#D0D5DD] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#EFF4FF] border border-[#D0D5DD] flex items-center justify-center text-[#173E75]">
            <Layers size={28} />
          </div>
          <h3 className="text-base font-bold text-[#101828]">Nenhum modelo cadastrado</h3>
          <p className="text-xs text-[#475467] font-medium max-w-md leading-relaxed">
            Cadastre o primeiro modelo de jaleco ou scrub da UZE DOCTOR para compor fichas técnicas, coleções e matrizes de estoque.
          </p>
          <button
            onClick={() => setIsNovoModeloOpen(true)}
            className="mt-2 uze-btn-primary text-xs shadow-xs"
          >
            <Layers size={14} />
            <span>Cadastrar primeiro modelo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {models.map((model) => {
          const metrics = getModelMetrics(model.id);

          return (
            <div
              key={model.id}
              onClick={() => setSelectedModel(model)}
              className="bg-white border border-[#D0D5DD] rounded-lg overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[#173E75] hover:shadow-md transition-all group"
            >
              <div>
                {/* Image Header with Badge Overlay */}
                <div className="relative h-48 bg-[#F4F6F9] overflow-hidden">
                  <ProductImage
                    src={model.imageUrl}
                    alt={model.name}
                    size="custom"
                    className="w-full h-full rounded-none"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="uze-badge uze-badge-gold">
                      {model.status}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <span className="uze-badge uze-badge-navy">
                      {model.gender}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-[#93370D] uppercase tracking-wider block">
                      {model.collection}
                    </span>
                    <h3 className="text-sm font-bold text-[#101828] group-hover:text-[#173E75] transition-colors">
                      {model.name}
                    </h3>
                  </div>

                  <p className="text-xs text-[#475467] font-medium line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>

                  <div className="pt-2.5 border-t border-[#D0D5DD] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#344054] font-bold uppercase block">A partir de</span>
                      <span className="text-sm font-black text-[#101828]">
                        R$ {model.basePrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#344054] font-bold uppercase block">Estoque</span>
                      <span className={`text-xs font-bold ${metrics.totalStock > 0 ? 'text-[#173E75]' : 'text-[#B42318]'}`}>
                        {metrics.totalStock} peças
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Bar */}
              <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#D0D5DD] flex items-center justify-between text-xs text-[#344054] font-semibold">
                <span className="flex items-center gap-1">
                  <Layers size={13} className="text-[#C69A43]" />
                  {metrics.variantCount} variantes
                </span>

                <span className="text-[#173E75] font-bold group-hover:underline text-[11px]">
                  Ficha Técnica →
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Model Full Detail Modal */}
      {selectedModel && (
        <Modal
          isOpen={!!selectedModel}
          onClose={() => setSelectedModel(null)}
          title={`Ficha do Modelo: ${selectedModel.name}`}
          subtitle="Desempenho Comercial & Matriz de Estoque"
          maxWidth="4xl"
        >
          {(() => {
            const metrics = getModelMetrics(selectedModel.id);
            const margin = selectedModel.basePrice > 0 ? ((selectedModel.basePrice - selectedModel.baseCost) / selectedModel.basePrice) * 100 : 0;

            return (
              <div className="space-y-5 text-xs">
                {/* 4 Mini KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-[#07101F] text-white rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase block">Faturamento</span>
                    <span className="text-base font-black text-[#E5B869]">
                      R$ {metrics.revenueGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase block">Vendidos</span>
                    <span className="text-base font-bold text-white">
                      {metrics.unitsSold} peças
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase block">Estoque Físico</span>
                    <span className="text-base font-bold text-emerald-400">
                      {metrics.totalStock} un
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase block">Margem</span>
                    <span className="text-base font-bold text-white">
                      {margin.toFixed(1)}% (R$ {(selectedModel.basePrice - selectedModel.baseCost).toFixed(2)})
                    </span>
                  </div>
                </div>

                {/* Model General Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <ProductImage
                    src={selectedModel.imageUrl}
                    alt={selectedModel.name}
                    size="custom"
                    className="w-full h-44 rounded-md"
                  />

                  <div className="md:col-span-2 space-y-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-[#93370D] uppercase tracking-wider block">
                        {selectedModel.collection} • {selectedModel.category}
                      </span>
                      <h3 className="text-base font-bold text-[#101828]">{selectedModel.name}</h3>
                    </div>

                    <p className="text-[#344054] font-medium leading-relaxed">{selectedModel.description}</p>

                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#F9FAFB] rounded border border-[#D0D5DD] text-center">
                      <div>
                        <span className="text-[10px] text-[#344054] font-bold block">Preço</span>
                        <span className="font-black text-[#101828]">R$ {selectedModel.basePrice.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#344054] font-bold block">Custo</span>
                        <span className="font-bold text-[#475467]">R$ {selectedModel.baseCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#344054] font-bold block">Modelagem</span>
                        <span className="font-bold text-[#173E75]">{selectedModel.gender}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variants Matrix */}
                <div>
                  <h4 className="font-bold text-[#101828] uppercase text-[11px] mb-2 flex items-center gap-1">
                    <Boxes size={13} className="text-[#173E75]" /> Matriz de Estoque por Variante
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
                        {metrics.variantsList.map(v => (
                          <tr key={v.id}>
                            <td className="font-mono text-[#344054] font-semibold">{v.sku}</td>
                            <td className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded-full border-2 border-[#D0D5DD] shadow-xs" style={{ backgroundColor: v.colorHex }} />
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
            );
          })()}
        </Modal>
      )}

      {/* Modal Cadastro de Modelo */}
      <NovoProdutoModal
        isOpen={isNovoModeloOpen}
        onClose={() => setIsNovoModeloOpen(false)}
      />
    </div>
  );
};
