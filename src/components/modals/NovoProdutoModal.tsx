import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import type { GenderCategory, VariantSize } from '../../types';

interface NovoProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NovoProdutoModal: React.FC<NovoProdutoModalProps> = ({ isOpen, onClose }) => {
  const { addModel } = useERP();

  // Model Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Jalecos Femininos');
  const [collection, setCollection] = useState('Coleção Royale 2026');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [baseCost, setBaseCost] = useState<number>(0);
  const [gender, setGender] = useState<GenderCategory>('Feminino');
  const [imageUrl] = useState('');

  // Variants Generator State
  const [colorName, setColorName] = useState('Branco');
  const [colorHex, setColorHex] = useState('#FFFFFF');
  const [selectedSizes, setSelectedSizes] = useState<VariantSize[]>(['PP', 'P', 'M', 'G']);
  const [initialStock, setInitialStock] = useState(0);
  const [minStock, setMinStock] = useState(5);

  const sizesList: VariantSize[] = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];

  const toggleSize = (size: VariantSize) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Build variants array
    const createdVariants = selectedSizes.map(size => ({
      sku: `UZE-${name.slice(0, 3).toUpperCase()}-${colorName.slice(0, 2).toUpperCase()}-${size}`,
      colorName,
      colorHex,
      size,
      currentStock: initialStock,
      minStock,
    }));

    addModel(
      {
        name,
        category,
        collection,
        description,
        basePrice,
        baseCost,
        gender,
        status: 'Ativo',
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
      },
      createdVariants
    );

    setName('');
    setDescription('');
    onClose();
  };

  const margin = basePrice > 0 ? ((basePrice - baseCost) / basePrice) * 100 : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cadastrar Novo Produto / Modelo"
      subtitle="Defina o modelo conceitual e gere suas variantes físicas iniciais de estoque"
      maxWidth="2xl"
    >
      <form onSubmit={handleSaveProduct} className="space-y-5">
        {/* Section 1: General Info */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-navy-dark)] border-b pb-1 mb-3">
            1. Informações Gerais do Modelo
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="uze-label">Nome do Modelo *</label>
              <input
                type="text"
                placeholder="Ex: Jaleco Alfaiataria Nobre"
                required
                className="uze-input text-xs"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="uze-label">Categoria *</label>
              <select
                className="uze-input text-xs"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="Jalecos Femininos">Jalecos Femininos</option>
                <option value="Jalecos Masculinos">Jalecos Masculinos</option>
                <option value="Scrubs">Scrubs Cirúrgicos</option>
                <option value="Acessórios">Acessórios Médicos</option>
              </select>
            </div>
            <div>
              <label className="uze-label">Coleção</label>
              <input
                type="text"
                placeholder="Ex: Coleção Royale 2026"
                className="uze-input text-xs"
                value={collection}
                onChange={e => setCollection(e.target.value)}
              />
            </div>
            <div>
              <label className="uze-label">Modelagem / Gênero</label>
              <select
                className="uze-input text-xs"
                value={gender}
                onChange={e => setGender(e.target.value as GenderCategory)}
              >
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Unissex">Unissex</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="uze-label">Descrição Comercial</label>
              <textarea
                rows={2}
                placeholder="Detalhes sobre o corte, tecido nobre, caimento e diferenciais..."
                className="uze-input text-xs"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Commercial & Pricing */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-navy-dark)] border-b pb-1 mb-3">
            2. Precificação & Margem
          </h4>
          <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label className="uze-label">Preço de Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                className="uze-input text-xs font-bold text-[var(--color-navy-dark)]"
                value={basePrice}
                onChange={e => setBasePrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="uze-label">Custo Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                className="uze-input text-xs font-bold text-gray-700"
                value={baseCost}
                onChange={e => setBaseCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="uze-label">Margem Calculada</label>
              <div className="uze-input text-xs font-extrabold bg-white flex items-center text-emerald-600">
                {margin.toFixed(1)}% (R$ {(basePrice - baseCost).toFixed(2)})
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Variantes & Estoque Inicial */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-navy-dark)] border-b pb-1 mb-3">
            3. Gerador de Variantes & Estoque Inicial
          </h4>
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="uze-label">Nome da Cor</label>
                <input
                  type="text"
                  className="uze-input text-xs"
                  value={colorName}
                  onChange={e => setColorName(e.target.value)}
                />
              </div>
              <div>
                <label className="uze-label">Tom de Cor (Hex)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    className="w-9 h-9 rounded border border-gray-300 cursor-pointer p-0.5"
                    value={colorHex}
                    onChange={e => setColorHex(e.target.value)}
                  />
                  <input
                    type="text"
                    className="uze-input text-xs font-mono"
                    value={colorHex}
                    onChange={e => setColorHex(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="uze-label mb-1">Tamanhos a Criar</label>
              <div className="flex flex-wrap gap-2">
                {sizesList.map(sz => {
                  const isSelected = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      className={`px-3 py-1 text-xs font-bold rounded border transition-colors ${
                        isSelected 
                          ? 'bg-[var(--color-navy-deep)] text-white border-[var(--color-navy-deep)]' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="uze-label">Estoque Inicial por Variante</label>
                <input
                  type="number"
                  min="0"
                  className="uze-input text-xs"
                  value={initialStock}
                  onChange={e => setInitialStock(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="uze-label">Estoque Mínimo de Alerta</label>
                <input
                  type="number"
                  min="0"
                  className="uze-input text-xs"
                  value={minStock}
                  onChange={e => setMinStock(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <button type="button" onClick={onClose} className="uze-btn uze-btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="uze-btn uze-btn-primary">
            Salvar Modelo e Gerar Variantes
          </button>
        </div>
      </form>
    </Modal>
  );
};
