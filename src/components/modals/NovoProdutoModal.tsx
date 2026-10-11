import React, { useState, useRef } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { uploadProductImage } from '../../services/storageService';
import type { GenderCategory, VariantSize, ProductColor } from '../../types';
import { DOMAIN_CATEGORIES, DOMAIN_SIZES } from '../../services/mockData';
import { Upload, Image as ImageIcon, Trash2, Loader2, Sparkles, Plus, Palette } from 'lucide-react';

interface NovoProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PRESET_COLORS: ProductColor[] = [
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Azul-marinho', hex: '#0F284C' },
  { name: 'Preto', hex: '#111827' },
  { name: 'Vinho / Bordô', hex: '#831843' },
  { name: 'Verde Cirúrgico', hex: '#0D9488' },
  { name: 'Azul Claro', hex: '#38BDF8' },
  { name: 'Cinza Chumbo', hex: '#4B5563' },
  { name: 'Rosa Quartzo', hex: '#F472B6' },
];

export const NovoProdutoModal: React.FC<NovoProdutoModalProps> = ({ isOpen, onClose }) => {
  const { addModel } = useERP();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Informações Básicas do Produto (Sem Coleção!)
  const [name, setName] = useState('');
  const [category, setCategory] = useState(DOMAIN_CATEGORIES[0] || 'Jalecos Femininos');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [baseCost, setBaseCost] = useState<number>(0);
  const [gender, setGender] = useState<GenderCategory>('Feminino');
  
  // Imagem do Produto
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string>('');

  // 12. Cores do Produto (múltiplas cores permitidas por produto)
  const [availableColors, setAvailableColors] = useState<ProductColor[]>([
    { name: 'Branco', hex: '#FFFFFF' }
  ]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#0F284C');
  const [showNewColorForm, setShowNewColorForm] = useState(false);

  // 7, 8, 9. Tamanhos Disponíveis (com GG garantido, seleção manual do usuário)
  const [selectedSizes, setSelectedSizes] = useState<VariantSize[]>(['P', 'M', 'G']);

  // Estoque Padrão Inicial
  const [defaultInitialStock, setDefaultInitialStock] = useState(0);
  const [defaultMinStock, setDefaultMinStock] = useState(5);

  // 13. Combinações Desativadas manualmente (ex: Azul/GG não existe)
  const [disabledCombinations, setDisabledCombinations] = useState<Record<string, boolean>>({});

  const toggleSize = (size: VariantSize) => {
    setSelectedSizes(prev => {
      if (prev.includes(size)) {
        if (prev.length === 1) return prev; // Não deixar ficar vazio
        return prev.filter(s => s !== size);
      } else {
        return [...prev, size];
      }
    });
  };

  const handleAddColor = () => {
    if (!newColorName.trim()) return;
    const exists = availableColors.some(c => c.name.toLowerCase() === newColorName.trim().toLowerCase());
    if (exists) return;

    setAvailableColors(prev => [...prev, { name: newColorName.trim(), hex: newColorHex }]);
    setNewColorName('');
    setShowNewColorForm(false);
  };

  const handleRemoveColor = (colorName: string) => {
    if (availableColors.length === 1) return;
    setAvailableColors(prev => prev.filter(c => c.name !== colorName));
  };

  const togglePresetColor = (preset: ProductColor) => {
    const exists = availableColors.some(c => c.name.toLowerCase() === preset.name.toLowerCase());
    if (exists) {
      if (availableColors.length > 1) {
        setAvailableColors(prev => prev.filter(c => c.name.toLowerCase() !== preset.name.toLowerCase()));
      }
    } else {
      setAvailableColors(prev => [...prev, preset]);
    }
  };

  const toggleCombination = (colorName: string, size: VariantSize) => {
    const key = `${colorName}-${size}`;
    setDisabledCombinations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError('');
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setImageError('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('A imagem deve ter no máximo 5MB.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalImageUrl = '';
    let finalImagePath = '';

    // Upload imagem se selecionada
    if (imageFile) {
      setIsUploadingImage(true);
      try {
        const uploadRes = await uploadProductImage(imageFile);
        if (uploadRes.success && uploadRes.url) {
          finalImageUrl = uploadRes.url;
          finalImagePath = uploadRes.path || '';
        } else if (uploadRes.error) {
          setImageError(uploadRes.error);
          setIsUploadingImage(false);
          return;
        }
      } catch {
        setImageError('Falha ao enviar imagem para o Storage.');
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    // 13. Gerar apenas as variantes das combinações ativas escolhidas
    const createdVariants: any[] = [];
    availableColors.forEach(color => {
      selectedSizes.forEach(size => {
        const key = `${color.name}-${size}`;
        if (!disabledCombinations[key]) {
          const skuPrefix = name.trim().slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'UZE');
          const colorPrefix = color.name.slice(0, 2).toUpperCase().replace(/[^A-Z]/g, 'CR');
          createdVariants.push({
            sku: `UZE-${skuPrefix}-${colorPrefix}-${size}`,
            colorName: color.name,
            colorHex: color.hex,
            size,
            currentStock: defaultInitialStock,
            minStock: defaultMinStock,
          });
        }
      });
    });

    if (createdVariants.length === 0) {
      alert('Você precisa habilitar pelo menos uma combinação de cor e tamanho para o produto.');
      return;
    }

    addModel(
      {
        name: name.trim(),
        category,
        description: description.trim(),
        basePrice,
        baseCost,
        gender,
        status: 'Ativo',
        imageUrl: finalImageUrl,
        imagePath: finalImagePath,
        availableColors,
        availableSizes: selectedSizes,
      },
      createdVariants
    );

    setName('');
    setDescription('');
    setImageFile(null);
    setImagePreview('');
    setDisabledCombinations({});
    onClose();
  };

  const margin = basePrice > 0 ? ((basePrice - baseCost) / basePrice) * 100 : 0;

  // Contagem de variantes resultantes
  const totalVariantsCount = availableColors.reduce((acc, c) => {
    return acc + selectedSizes.filter(s => !disabledCombinations[`${c.name}-${s}`]).length;
  }, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cadastrar Novo Produto"
      subtitle="Defina o produto, foto, cores e selecione apenas os tamanhos da grade desejada"
      maxWidth="4xl"
    >
      <form onSubmit={handleSaveProduct} className="space-y-5 text-xs text-[#101828]">
        {/* Seção 1: Dados Principais & Foto */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#173E75] border-b border-[#D0D5DD] pb-1.5 mb-3 flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#C69A43]" />
            1. Dados Gerais & Fotografia
          </h4>

          <div className="space-y-3.5">
            {/* Foto do Produto */}
            <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#D0D5DD] flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-[#D0D5DD] bg-white overflow-hidden flex flex-col items-center justify-center shrink-0 relative group">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover object-center" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <Trash2 size={16} className="text-rose-400" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-1 text-slate-400">
                    <ImageIcon size={20} className="mx-auto text-slate-300" />
                    <span className="text-[9px] font-semibold block mt-0.5">Sem foto</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1 text-center sm:text-left">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                  id="novo-produto-foto"
                />
                <label
                  htmlFor="novo-produto-foto"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#D0D5DD] rounded-md font-bold text-xs text-[#344054] hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  <Upload size={13} className="text-[#C69A43]" />
                  {imagePreview ? 'Alterar Foto' : 'Selecionar Foto do Produto'}
                </label>
                <p className="text-[10px] text-[#475467]">JPG, PNG ou WEBP até 5MB.</p>
                {imageError && <p className="text-[10px] text-rose-600 font-bold">{imageError}</p>}
              </div>
            </div>

            {/* Nome e Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#344054] mb-1">
                  Nome do Produto * (ex: Jaleco Florence)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do produto..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-md px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#173E75] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#344054] mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-md px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#173E75] outline-none"
                >
                  {DOMAIN_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gênero e Preços */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#344054] mb-1">
                  Gênero
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as GenderCategory)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-md px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#173E75] outline-none"
                >
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Unissex">Unissex</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#344054] mb-1">
                  Preço de Venda (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={basePrice || ''}
                  onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full bg-white border border-[#D0D5DD] rounded-md px-3 py-1.5 text-xs font-bold text-right focus:ring-2 focus:ring-[#173E75] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#344054] mb-1">
                  Custo Base (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseCost || ''}
                  onChange={(e) => setBaseCost(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full bg-white border border-[#D0D5DD] rounded-md px-3 py-1.5 text-xs font-bold text-right focus:ring-2 focus:ring-[#173E75] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#344054] mb-1">
                  Margem Estimada
                </label>
                <div className="w-full bg-[#F2F4F7] border border-[#EAECF0] rounded-md px-3 py-1.5 text-xs font-bold text-center text-[#173E75]">
                  {margin.toFixed(1)}%
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#344054] mb-1">
                Descrição Detalhada do Produto
              </label>
              <textarea
                rows={2}
                placeholder="Detalhes sobre o corte, tecido, caimento e diferenciais..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-md px-3 py-1.5 text-xs focus:ring-2 focus:ring-[#173E75] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Seção 2: Cores & Grade de Tamanhos */}
        <div className="border-t border-[#D0D5DD] pt-3.5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#173E75] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Palette size={14} className="text-[#C69A43]" />
              2. Cores & Grade de Tamanhos Selecionada
            </span>
            <span className="text-[11px] text-[#173E75] font-black">
              {totalVariantsCount} variantes resultantes
            </span>
          </h4>

          {/* 12. Cores do Produto */}
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#101828]">
                Cores Disponíveis para este Produto
              </label>
              <button
                type="button"
                onClick={() => setShowNewColorForm(!showNewColorForm)}
                className="text-[11px] font-bold text-[#173E75] hover:underline flex items-center gap-1"
              >
                <Plus size={13} /> Criar Nova Cor
              </button>
            </div>

            {/* Cores ativas neste produto */}
            <div className="flex flex-wrap gap-2 items-center">
              {availableColors.map(color => (
                <div
                  key={color.name}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white border-2 border-[#173E75] rounded-full shadow-2xs"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-300"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-xs font-bold text-[#173E75]">{color.name}</span>
                  {availableColors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(color.name)}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Presets rápidos de cores */}
            <div className="pt-1">
              <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                Adicionar rapidamente cores comuns:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_PRESET_COLORS.map(preset => {
                  const isSelected = availableColors.some(c => c.name.toLowerCase() === preset.name.toLowerCase());
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => togglePresetColor(preset)}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border transition-all ${
                        isSelected 
                          ? 'bg-slate-200 border-slate-400 font-bold' 
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: preset.hex }} />
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form de nova cor personalizada */}
            {showNewColorForm && (
              <div className="p-2.5 bg-white border border-[#C69A43] rounded-lg flex items-center gap-2 animate-fadeIn">
                <input
                  type="text"
                  placeholder="Nome da cor (ex: Azul Tiffany)..."
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-[10px] text-slate-500 font-bold">{newColorHex}</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddColor}
                  className="bg-[#173E75] text-white px-3 py-1 rounded text-xs font-bold hover:bg-[#0F284C]"
                >
                  Salvar Cor
                </button>
              </div>
            )}
          </div>

          {/* 7, 8, 9. Seleção de Tamanhos (PP, P, M, G, GG, XGG) */}
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#101828]">
                Tamanhos Disponíveis para este Produto *
              </label>
              <span className="text-[10px] text-slate-500 font-semibold">
                Marque apenas os tamanhos que este produto realmente fabrica
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {DOMAIN_SIZES.map(size => {
                const isChecked = selectedSizes.includes(size as VariantSize);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size as VariantSize)}
                    className={`px-3.5 py-1.5 rounded-lg font-black text-xs border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-[#173E75] text-white border-[#173E75] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {size} {isChecked && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 13. Matriz Cor x Tamanho (Permite desativar combinações individuais) */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <label className="text-xs font-bold text-[#173E75]">
                Combinações Geradas (Cor × Tamanho)
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                Desmarque qualquer combinação que não exista na produção
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 max-h-44 overflow-y-auto">
              {availableColors.map(color => (
                selectedSizes.map(size => {
                  const key = `${color.name}-${size}`;
                  const isDisabled = Boolean(disabledCombinations[key]);
                  return (
                    <div
                      key={key}
                      onClick={() => toggleCombination(color.name, size)}
                      className={`p-2 rounded-md border text-xs flex items-center justify-between cursor-pointer select-none transition-all ${
                        isDisabled
                          ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 line-through'
                          : 'bg-white border-[#173E75]/30 text-[#101828] font-bold hover:border-[#173E75]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="truncate">{color.name}</span>
                      </div>
                      <span className="font-black px-1.5 py-0.5 rounded bg-slate-100 text-[10px] shrink-0">
                        {size}
                      </span>
                    </div>
                  );
                })
              ))}
            </div>

            {/* Configuração de estoque inicial padrão */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-slate-600">
              <div>
                <label className="block text-[10px] font-bold mb-1">
                  Estoque Inicial por Variante
                </label>
                <input
                  type="number"
                  min="0"
                  value={defaultInitialStock}
                  onChange={(e) => setDefaultInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold mb-1">
                  Estoque Mínimo (Alerta)
                </label>
                <input
                  type="number"
                  min="0"
                  value={defaultMinStock}
                  onChange={(e) => setDefaultMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#D0D5DD] text-[#344054] hover:bg-slate-100 rounded-md font-bold text-xs cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isUploadingImage || totalVariantsCount === 0}
            className="px-5 py-2 bg-[#173E75] hover:bg-[#0F284C] text-white rounded-md font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {isUploadingImage ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Salvando Foto...
              </>
            ) : (
              'Cadastrar Produto'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
