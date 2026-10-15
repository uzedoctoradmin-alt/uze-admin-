import React, { useState, useRef, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { uploadProductImage } from '../../services/storageService';
import type { GenderCategory, VariantSize, ProductColor, ColorItem } from '../../types';
import { DOMAIN_CATEGORIES, DOMAIN_SIZES } from '../../services/mockData';
import { 
  Upload, 
  Trash2, 
  Loader2, 
  Sparkles, 
  Plus, 
  Palette, 
  Star, 
  AlertCircle, 
  CheckCircle2, 
  Check 
} from 'lucide-react';

interface NovoProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NovoProdutoModal: React.FC<NovoProdutoModalProps> = ({ isOpen, onClose }) => {
  const { colors, addColor, addModel, variants: existingVariants } = useERP();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Informações Básicas do Produto
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

  // 15 - 20. Biblioteca de Cores & Cores Selecionadas
  const [selectedColors, setSelectedColors] = useState<ProductColor[]>([
    { name: 'Branco', hex: '#FFFFFF', id: 'col-branco', isFavorite: true }
  ]);
  const [showNewColorForm, setShowNewColorForm] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#0F284C');
  const [newColorIsFavorite, setNewColorIsFavorite] = useState(false);
  const [colorActionError, setColorActionError] = useState<string | null>(null);
  const [colorActionWarning, setColorActionWarning] = useState<string | null>(null);

  // Tamanhos Disponíveis
  const [selectedSizes, setSelectedSizes] = useState<VariantSize[]>(['P', 'M', 'G', 'GG']);

  // Estoque Padrão Inicial & Mínimo
  const [defaultInitialStock, setDefaultInitialStock] = useState(0);
  const [defaultMinStock, setDefaultMinStock] = useState(3);

  // Combinações Desativadas manualmente (ex: Azul/GG não existe)
  const [disabledCombinations, setDisabledCombinations] = useState<Record<string, boolean>>({});

  // Status de Submissão e Mensagens de Erro/Sucesso
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Separar cores da biblioteca em Favoritas e Outras Salvas
  const favoriteColors = useMemo(() => colors.filter(c => c.isFavorite), [colors]);
  const otherSavedColors = useMemo(() => colors.filter(c => !c.isFavorite), [colors]);

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

  const handleToggleColorFromPalette = (color: ColorItem) => {
    const exists = selectedColors.some(
      c => c.name.toLowerCase().trim() === color.name.toLowerCase().trim()
    );

    if (exists) {
      if (selectedColors.length > 1) {
        setSelectedColors(prev => prev.filter(c => c.name.toLowerCase().trim() !== color.name.toLowerCase().trim()));
      }
    } else {
      setSelectedColors(prev => [
        ...prev,
        {
          id: color.id,
          name: color.name,
          hex: color.hexCode,
          isFavorite: color.isFavorite,
        }
      ]);
    }
  };

  const handleCreateAndSelectNewColor = async (e: React.FormEvent) => {
    e.preventDefault();
    setColorActionError(null);
    setColorActionWarning(null);

    if (!newColorName.trim()) {
      setColorActionError('Informe o nome da cor.');
      return;
    }

    const res = await addColor({
      name: newColorName.trim(),
      hexCode: newColorHex,
      isFavorite: newColorIsFavorite,
    });

    if (!res.success || !res.color) {
      setColorActionError(res.error || 'Erro ao registrar nova cor.');
      return;
    }

    if (res.warning) {
      setColorActionWarning(res.warning);
    }

    // Adicionar à lista do produto
    const created = res.color;
    setSelectedColors(prev => {
      const exists = prev.some(c => c.name.toLowerCase() === created.name.toLowerCase());
      if (exists) return prev;
      return [...prev, { id: created.id, name: created.name, hex: created.hexCode, isFavorite: created.isFavorite }];
    });

    setNewColorName('');
    setNewColorIsFavorite(false);
    setShowNewColorForm(false);
  };

  const handleRemoveSelectedColor = (colorName: string) => {
    if (selectedColors.length === 1) return;
    setSelectedColors(prev => prev.filter(c => c.name !== colorName));
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

  // Gerador de SKU único sem colisões
  const generateCleanUniqueSku = (
    modelName: string, 
    colorName: string, 
    size: string, 
    currentBatch: Array<{ sku: string }>
  ): string => {
    const cleanModel = modelName.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'UZE');
    const cleanColor = colorName.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'COR');
    const baseSku = `${cleanModel}-${cleanColor}-${size}`;

    let candidate = baseSku;
    let counter = 2;

    const allSkus = new Set([
      ...existingVariants.map(v => v.sku.toUpperCase()),
      ...currentBatch.map(v => v.sku.toUpperCase())
    ]);

    while (allSkus.has(candidate.toUpperCase())) {
      candidate = `${baseSku}-${counter}`;
      counter++;
    }

    return candidate;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setSubmitError('O nome do produto é obrigatório.');
      return;
    }

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

    // Gerar apenas as variantes das combinações ativas escolhidas
    const createdVariants: any[] = [];
    selectedColors.forEach(color => {
      selectedSizes.forEach(size => {
        const key = `${color.name}-${size}`;
        if (!disabledCombinations[key]) {
          const sku = generateCleanUniqueSku(name, color.name, size, createdVariants);
          createdVariants.push({
            sku,
            colorId: color.id,
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
      setSubmitError('Você precisa habilitar pelo menos uma combinação de cor e tamanho para o produto.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Chamada real ao Supabase com validação estrita (Item 5: Não aceitar 'salvo' antes de confirmação real)
      const res = await addModel(
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
          availableColors: selectedColors,
          availableSizes: selectedSizes,
        },
        createdVariants
      );

      if (!res.success) {
        setIsSubmitting(false);
        setSubmitError(res.error || 'Erro ao persistir produto e variantes no banco de dados.');
        return;
      }

      setSuccessMessage('Produto e variantes físicas salvos com sucesso no Supabase!');
      setIsSubmitting(false);

      setTimeout(() => {
        setName('');
        setDescription('');
        setImageFile(null);
        setImagePreview('');
        setDisabledCombinations({});
        onClose();
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err.message || 'Falha de comunicação ao cadastrar produto.');
    }
  };

  const margin = basePrice > 0 ? ((basePrice - baseCost) / basePrice) * 100 : 0;

  // Contagem de variantes resultantes
  const totalVariantsCount = selectedColors.reduce((acc, c) => {
    return acc + selectedSizes.filter(s => !disabledCombinations[`${c.name}-${s}`]).length;
  }, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cadastrar Novo Produto"
      subtitle="Defina o produto, foto, cores da paleta oficial e selecione apenas os tamanhos da grade"
      maxWidth="4xl"
    >
      <form onSubmit={handleSaveProduct} className="space-y-4 text-xs text-[#101828]">
        {/* Banner de Feedback de Erro de Persistência */}
        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg flex items-start gap-2 animate-fadeIn">
            <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-xs">Erro ao persistir produto no banco:</p>
              <p className="text-[11px] mt-0.5 leading-relaxed">{submitError}</p>
            </div>
          </div>
        )}

        {/* Banner de Confirmação Real */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <p className="font-bold text-xs">{successMessage}</p>
          </div>
        )}

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
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <div className="text-center text-[#98A2B3]">
                    <Upload size={18} className="mx-auto mb-1 opacity-60" />
                    <span className="text-[9px] font-bold block">Foto</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="uze-btn-secondary text-xs h-7 px-3 inline-flex items-center gap-1.5"
                >
                  <Upload size={12} />
                  <span>{imagePreview ? 'Trocar Imagem' : 'Selecionar Imagem Oficial'}</span>
                </button>
                <p className="text-[10px] text-[#475467]">Formatos aceitos: JPG, PNG ou WEBP (máx. 5MB).</p>
                {imageError && <p className="text-[11px] text-[#B42318] font-bold">{imageError}</p>}
              </div>
            </div>

            {/* Nome e Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#344054] mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Jaleco Florença com Zíper Ouro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-md px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#173E75] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#344054] mb-1">
                  Categoria *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-md px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#173E75] outline-none cursor-pointer"
                >
                  {DOMAIN_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gênero, Preço, Custo e Margem */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#344054] mb-1">
                  Gênero
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as GenderCategory)}
                  className="w-full bg-white border border-[#D0D5DD] rounded-md px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#173E75] outline-none cursor-pointer"
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

        {/* Seção 2: Biblioteca de Cores & Cores Selecionadas (Itens 15 - 20) */}
        <div className="border-t border-[#D0D5DD] pt-3.5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#173E75] flex items-center gap-1.5">
              <Palette size={14} className="text-[#C69A43]" />
              2. Cores Salvas & Biblioteca UZE DOCTOR
            </h4>
            <span className="text-[11px] text-[#173E75] font-black">
              {totalVariantsCount} variantes resultantes
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-slate-200 space-y-3">
            {/* Cores ativas neste produto */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#101828]">
                  Cores Selecionadas para este Produto ({selectedColors.length})
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewColorForm(!showNewColorForm)}
                  className="text-[11px] font-bold text-[#173E75] hover:underline flex items-center gap-1"
                >
                  <Plus size={13} /> + Nova Cor na Biblioteca
                </button>
              </div>

              <div className="flex flex-wrap gap-2 items-center min-h-[34px] p-2 bg-white rounded-lg border border-slate-200">
                {selectedColors.map(color => (
                  <div
                    key={color.name}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white border-2 border-[#173E75] rounded-full shadow-2xs"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs font-bold text-[#173E75]">{color.name}</span>
                    {selectedColors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedColor(color.name)}
                        className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                        title="Remover cor deste produto"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Alertas do formulário de nova cor */}
            {colorActionError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                {colorActionError}
              </p>
            )}
            {colorActionWarning && (
              <p className="text-xs font-bold text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                {colorActionWarning}
              </p>
            )}

            {/* Formulário Inline: Criar Nova Cor com Deduplicação e Favorita */}
            {showNewColorForm && (
              <div className="p-3 bg-white border border-[#C69A43] rounded-lg space-y-2.5 animate-fadeIn">
                <span className="text-xs font-bold text-[#173E75] block">
                  Adicionar Nova Cor à Biblioteca Reutilizável
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nome da cor (ex: Azul Petróleo)..."
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold outline-none focus:border-[#173E75]"
                  />
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded px-2 py-1">
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-[11px] text-slate-600 font-bold">{newColorHex}</span>
                  </div>

                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#344054] cursor-pointer px-1">
                    <input
                      type="checkbox"
                      checked={newColorIsFavorite}
                      onChange={(e) => setNewColorIsFavorite(e.target.checked)}
                      className="rounded text-[#173E75]"
                    />
                    <Star size={13} className={newColorIsFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} />
                    <span>Favorita</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleCreateAndSelectNewColor}
                    className="uze-btn-primary text-xs h-7 px-3"
                  >
                    Salvar na Paleta
                  </button>
                </div>
              </div>
            )}

            {/* 19. Cores Favoritas da Biblioteca (Aparecem Primeiro) */}
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <Star size={11} className="text-amber-500 fill-amber-500" />
                Cores Favoritas da UZE DOCTOR (Clique para adicionar/remover)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {favoriteColors.map(color => {
                  const isSelected = selectedColors.some(
                    c => c.name.toLowerCase() === color.name.toLowerCase()
                  );
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => handleToggleColorFromPalette(color)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#173E75] text-white border-[#173E75] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: color.hexCode }}
                      />
                      <span>{color.name}</span>
                      {isSelected && <Check size={11} className="stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Outras Cores Salvas na Biblioteca */}
            {otherSavedColors.length > 0 && (
              <div className="pt-1 border-t border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">
                  Outras Cores Salvas na Paleta
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {otherSavedColors.map(color => {
                    const isSelected = selectedColors.some(
                      c => c.name.toLowerCase() === color.name.toLowerCase()
                    );
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => handleToggleColorFromPalette(color)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#173E75] text-white border-[#173E75]'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: color.hexCode }}
                        />
                        <span>{color.name}</span>
                        {isSelected && <Check size={10} className="stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 23. Seleção de Tamanhos (PP, P, M, G, GG, XGG) */}
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#101828]">
                Tamanhos Disponíveis para este Produto *
              </label>
              <span className="text-[10px] text-slate-500 font-semibold">
                Marque apenas os tamanhos da grade fabricada
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

          {/* Matriz Cor x Tamanho (Permite desativar combinações individuais) */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <label className="text-xs font-bold text-[#173E75]">
                Combinações Físicas Geradas (Cor × Tamanho)
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                Desmarque qualquer combinação que não exista na produção
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 max-h-44 overflow-y-auto">
              {selectedColors.map(color => (
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

            {/* Configuração de estoque inicial e estoque mínimo padrão */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-slate-600">
              <div>
                <label className="block text-[10px] font-bold mb-1">
                  Estoque Inicial por Variante (peças)
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
                  Estoque Mínimo de Alerta por Variante
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
            disabled={isSubmitting}
            className="px-4 py-2 border border-[#D0D5DD] text-[#344054] hover:bg-slate-100 rounded-md font-bold text-xs cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploadingImage || totalVariantsCount === 0}
            className="px-5 py-2 bg-[#173E75] hover:bg-[#0F284C] text-white rounded-md font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Persistindo no Supabase...
              </>
            ) : isUploadingImage ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Enviando Imagem...
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
