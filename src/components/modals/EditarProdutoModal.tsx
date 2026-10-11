import React, { useState, useEffect, useRef } from 'react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { uploadProductImage, deleteProductImage } from '../../services/storageService';
import type { ProductModel, GenderCategory, ProductStatus, VariantSize } from '../../types';
import { 
  CheckCircle2, 
  Layers, 
  Boxes, 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Loader2, 
  Plus, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface EditarProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ProductModel | null;
}

const AVAILABLE_SIZES: VariantSize[] = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];

export const EditarProdutoModal: React.FC<EditarProdutoModalProps> = ({ isOpen, onClose, model }) => {
  const { 
    variants, 
    updateModel, 
    addVariant, 
    updateVariant, 
    deleteVariant, 
    updateVariantStock 
  } = useERP();
  const { hasPermission } = useAuth();
  const canReadCosts = hasPermission('products.cost.read');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [baseCost, setBaseCost] = useState<number>(0);
  const [gender, setGender] = useState<GenderCategory>('Feminino');
  const [status, setStatus] = useState<ProductStatus>('Ativo');
  
  // Image State
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string>('');
  const [imageRemoved, setImageRemoved] = useState<boolean>(false);

  // Modal Sub-tools
  const [showAddSizeModal, setShowAddSizeModal] = useState(false);
  const [selectedNewSize, setSelectedNewSize] = useState<VariantSize>('GG');
  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#173E75');

  // Stock Adjustment inline
  const [adjustingVariantId, setAdjustingVariantId] = useState<string | null>(null);
  const [adjustStockQty, setAdjustStockQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Ajuste de inventário');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const modelVariants = model ? variants.filter(v => v.modelId === model.id) : [];

  // Unique existing colors and sizes in this model
  const existingColors = Array.from(new Set(modelVariants.map(v => JSON.stringify({ name: v.colorName, hex: v.colorHex }))))
    .map(str => JSON.parse(str) as { name: string; hex: string });
  const existingSizes = Array.from(new Set(modelVariants.map(v => v.size)));

  useEffect(() => {
    if (model) {
      setName(model.name || '');
      setCategory(model.category || '');
      setDescription(model.description || '');
      setBasePrice(model.basePrice || 0);
      setBaseCost(model.baseCost || 0);
      setGender(model.gender || 'Feminino');
      setStatus(model.status || 'Ativo');
      setImageUrl(model.imageUrl || '');
      setImagePath(model.imagePath || '');
      setImagePreview(model.imageUrl || '');
      setNewImageFile(null);
      setImageRemoved(false);
      setImageError('');
      setFeedbackMsg(null);
      setIsDirty(false);
    }
  }, [model, isOpen]);

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

    setNewImageFile(file);
    setImageRemoved(false);
    setIsDirty(true);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setNewImageFile(null);
    setImagePreview('');
    setImageRemoved(true);
    setIsDirty(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (isDirty) {
      const confirmLeave = window.confirm('Existem alterações não salvas no produto. Deseja sair mesmo assim?');
      if (!confirmLeave) return;
    }
    onClose();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !name.trim()) return;

    let finalImageUrl = imageUrl;
    let finalImagePath = imagePath;

    if (imageRemoved) {
      if (imagePath || imageUrl) {
        await deleteProductImage(imagePath || imageUrl);
      }
      finalImageUrl = '';
      finalImagePath = '';
    }

    if (newImageFile) {
      setIsUploadingImage(true);
      try {
        const uploadRes = await uploadProductImage(newImageFile, imagePath || imageUrl);
        if (uploadRes.success && uploadRes.url) {
          finalImageUrl = uploadRes.url;
          finalImagePath = uploadRes.path || '';
        } else if (uploadRes.error) {
          setImageError(uploadRes.error);
          setIsUploadingImage(false);
          return;
        }
      } catch {
        setImageError('Falha ao processar upload da imagem.');
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    updateModel(model.id, {
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      basePrice,
      baseCost: canReadCosts ? baseCost : model.baseCost,
      gender,
      status,
      imageUrl: finalImageUrl,
      imagePath: finalImagePath,
    });

    setFeedbackMsg({ type: 'success', text: 'Produto atualizado com sucesso!' });
    setIsDirty(false);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  // Add a new size across existing colors
  const handleAddNewSize = () => {
    if (!model) return;
    const colorsToUse = existingColors.length > 0 ? existingColors : [{ name: 'Padrão', hex: '#173E75' }];
    
    let createdCount = 0;
    colorsToUse.forEach(c => {
      const exists = modelVariants.some(v => v.size === selectedNewSize && v.colorName.toLowerCase() === c.name.toLowerCase());
      if (!exists) {
        const cleanSku = `${model.name.slice(0, 3).toUpperCase()}-${c.name.slice(0, 3).toUpperCase()}-${selectedNewSize}`;
        addVariant({
          modelId: model.id,
          sku: cleanSku,
          colorName: c.name,
          colorHex: c.hex,
          size: selectedNewSize,
          currentStock: 0,
          minStock: 5,
        });
        createdCount++;
      }
    });

    setShowAddSizeModal(false);
    setFeedbackMsg({ 
      type: 'success', 
      text: createdCount > 0 
        ? `${createdCount} nova(s) variante(s) adicionada(s) com tamanho ${selectedNewSize}.` 
        : `Tamanho ${selectedNewSize} já existia para todas as cores.` 
    });
  };

  // Add a new color across existing sizes
  const handleAddNewColor = () => {
    if (!model || !newColorName.trim()) return;
    const sizesToUse = existingSizes.length > 0 ? existingSizes : ['M'];

    let createdCount = 0;
    sizesToUse.forEach(sz => {
      const exists = modelVariants.some(v => v.size === sz && v.colorName.toLowerCase() === newColorName.trim().toLowerCase());
      if (!exists) {
        const cleanSku = `${model.name.slice(0, 3).toUpperCase()}-${newColorName.trim().slice(0, 3).toUpperCase()}-${sz}`;
        addVariant({
          modelId: model.id,
          sku: cleanSku,
          colorName: newColorName.trim(),
          colorHex: newColorHex,
          size: sz as VariantSize,
          currentStock: 0,
          minStock: 5,
        });
        createdCount++;
      }
    });

    setNewColorName('');
    setShowAddColorModal(false);
    setFeedbackMsg({
      type: 'success',
      text: createdCount > 0
        ? `Cor ${newColorName} adicionada com sucesso!`
        : `Cor já cadastrada para estes tamanhos.`
    });
  };

  // Delete / Archive Variant
  const handleDeleteVariant = (vId: string, sku: string) => {
    if (!window.confirm(`Deseja remover a variante SKU ${sku}? Se houver histórico de vendas, ela será preservada ou bloqueada.`)) {
      return;
    }
    const res = deleteVariant(vId, { force: true });
    if (res.success) {
      setFeedbackMsg({ type: 'success', text: `Variante ${sku} removida com sucesso.` });
    } else {
      setFeedbackMsg({ type: 'error', text: res.reason || 'Não foi possível excluir a variante.' });
    }
  };

  // Handle stock quick adjustment
  const handleConfirmStockAdjust = (vId: string) => {
    updateVariantStock(vId, adjustStockQty, 'Ajuste', adjustReason || 'Ajuste manual');
    setAdjustingVariantId(null);
    setFeedbackMsg({ type: 'success', text: `Estoque da variante ajustado para ${adjustStockQty} un.` });
  };

  const margin = basePrice > 0 ? ((basePrice - baseCost) / basePrice) * 100 : 0;

  if (!model) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Editar Produto: ${model.name}`}
      subtitle="Edite as características do produto, fotografia e gerencie suas variantes de tamanho e cor"
      maxWidth="4xl"
    >
      <div className="space-y-6 text-xs text-[#344054]">
        {feedbackMsg && (
          <div className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between gap-2 ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{feedbackMsg.text}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setFeedbackMsg(null)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Informações Básicas do Produto & Foto */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828] border-b border-[#D0D5DD] pb-1.5 flex items-center gap-1.5">
              <Layers size={14} className="text-[#173E75]" /> 1. Informações Básicas & Foto do Produto
            </h4>

            {/* Foto */}
            <div className="p-3.5 bg-[#F9FAFB] rounded-xl border border-[#D0D5DD]">
              <label className="uze-label mb-1.5">Fotografia do Produto</label>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-[#D0D5DD] bg-white overflow-hidden flex flex-col items-center justify-center shrink-0 relative group">
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover object-center"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                        title="Remover foto"
                      >
                        <Trash2 size={18} className="text-rose-400" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <ImageIcon size={24} className="mx-auto text-slate-300" />
                      <span className="text-[10px] font-semibold block mt-1">Sem foto</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                    id="editar-produto-foto"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="editar-produto-foto"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#173E75] hover:bg-[#122e56] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <Upload size={14} />
                      <span>{imagePreview ? 'Substituir Foto' : 'Adicionar Foto'}</span>
                    </label>

                    {imagePreview && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Remover Foto</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Formatos: JPG, PNG ou WEBP (máx. 5MB).
                  </p>

                  {imageError && (
                    <p className="text-xs text-rose-600 font-bold mt-1">{imageError}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="uze-label">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  className="uze-input text-xs font-semibold"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    setIsDirty(true);
                  }}
                />
              </div>

              <div>
                <label className="uze-label">Categoria *</label>
                <input
                  type="text"
                  required
                  className="uze-input text-xs"
                  value={category}
                  onChange={e => {
                    setCategory(e.target.value);
                    setIsDirty(true);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="uze-label">Gênero</label>
                <select
                  className="uze-input text-xs"
                  value={gender}
                  onChange={e => {
                    setGender(e.target.value as GenderCategory);
                    setIsDirty(true);
                  }}
                >
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Unissex">Unissex</option>
                </select>
              </div>

              <div>
                <label className="uze-label">Status do Catálogo</label>
                <select
                  className="uze-input text-xs font-semibold"
                  value={status}
                  onChange={e => {
                    setStatus(e.target.value as ProductStatus);
                    setIsDirty(true);
                  }}
                >
                  <option value="Ativo">Ativo (visível em vendas)</option>
                  <option value="Inativo">Inativo (temporariamente pausado)</option>
                  <option value="Arquivado">Arquivado (preservado no histórico)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="uze-label">Descrição Comercial</label>
              <textarea
                rows={2}
                className="uze-input text-xs resize-none"
                value={description}
                onChange={e => {
                  setDescription(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>

            {/* Precificação & Margem */}
            <div className="bg-[#F9FAFB] p-3.5 rounded-lg border border-[#D0D5DD] grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="uze-label">Preço de Venda (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="uze-input text-xs font-bold text-[#101828]"
                  value={basePrice}
                  onChange={e => {
                    setBasePrice(Number(e.target.value));
                    setIsDirty(true);
                  }}
                />
              </div>

              {canReadCosts ? (
                <div>
                  <label className="uze-label">Custo Base de Confecção (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="uze-input text-xs font-bold text-[#101828]"
                    value={baseCost}
                    onChange={e => {
                      setBaseCost(Number(e.target.value));
                      setIsDirty(true);
                    }}
                  />
                </div>
              ) : (
                <div>
                  <label className="uze-label">Custo Confecção</label>
                  <input
                    type="text"
                    disabled
                    value="Confidencial"
                    className="uze-input text-xs bg-[#F2F4F7] text-[#98A2B3] cursor-not-allowed"
                  />
                </div>
              )}

              <div>
                <label className="uze-label">Margem Bruta Estimada</label>
                <div className="h-9 flex items-center px-3 bg-white border border-[#D0D5DD] rounded-md font-black text-sm text-[#027A48]">
                  {canReadCosts ? `${margin.toFixed(1)}%` : 'Restrito'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D0D5DD]">
            <button 
              type="submit" 
              disabled={isUploadingImage}
              className="uze-btn uze-btn-primary flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isUploadingImage ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Informações do Produto</span>
              )}
            </button>
          </div>
        </form>

        {/* 2. GERENCIADOR DE VARIANTES (COR × TAMANHO × ESTOQUE) */}
        <div className="space-y-3 pt-4 border-t border-[#D0D5DD]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D0D5DD] pb-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828] flex items-center gap-1.5">
                <Boxes size={14} className="text-[#173E75]" /> 2. Gerenciador de Variantes ({modelVariants.length})
              </h4>
              <p className="text-[11px] text-[#475467]">
                Adicione tamanhos ou cores conforme a grade deste produto. Cada variante possui seu próprio SKU e estoque.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddSizeModal(true)}
                className="px-2.5 py-1.5 bg-[#F2F4F7] hover:bg-[#E4E7EC] text-[#344054] rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>+ Adicionar Tamanho</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddColorModal(true)}
                className="px-2.5 py-1.5 bg-[#F2F4F7] hover:bg-[#E4E7EC] text-[#344054] rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>+ Adicionar Cor</span>
              </button>
            </div>
          </div>

          {/* Sub-modal: Adicionar Tamanho */}
          {showAddSizeModal && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#173E75]">Selecione o tamanho para adicionar à grade:</span>
                <button type="button" onClick={() => setShowAddSizeModal(false)} className="text-xs text-slate-500 hover:text-slate-800">Cancelar</button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {AVAILABLE_SIZES.map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedNewSize(sz)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                      selectedNewSize === sz 
                        ? 'bg-[#173E75] text-white shadow-xs' 
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleAddNewSize}
                  className="ml-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1"
                >
                  <Plus size={14} /> Adicionar {selectedNewSize}
                </button>
              </div>
            </div>
          )}

          {/* Sub-modal: Adicionar Cor */}
          {showAddColorModal && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#173E75]">Cadastrar nova cor para este produto:</span>
                <button type="button" onClick={() => setShowAddColorModal(false)} className="text-xs text-slate-500 hover:text-slate-800">Cancelar</button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Nome da cor (ex: Azul Marinho)"
                  className="uze-input text-xs py-1.5 flex-1 min-w-[150px]"
                  value={newColorName}
                  onChange={e => setNewColorName(e.target.value)}
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                    value={newColorHex}
                    onChange={e => setNewColorHex(e.target.value)}
                  />
                  <span className="font-mono text-xs">{newColorHex}</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewColor}
                  disabled={!newColorName.trim()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus size={14} /> Criar Cor
                </button>
              </div>
            </div>
          )}

          {/* Inline Stock Adjustment Modal */}
          {adjustingVariantId && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-900">Ajustar Estoque Físico</span>
                <button type="button" onClick={() => setAdjustingVariantId(null)} className="text-xs text-slate-500">Cancelar</button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="0"
                  className="uze-input text-xs py-1 w-24 text-center font-bold"
                  value={adjustStockQty}
                  onChange={e => setAdjustStockQty(Math.max(0, Number(e.target.value)))}
                />
                <input
                  type="text"
                  placeholder="Motivo (ex: Contagem física, avaria)"
                  className="uze-input text-xs py-1 flex-1 min-w-[140px]"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleConfirmStockAdjust(adjustingVariantId)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs"
                >
                  Confirmar Saldo
                </button>
              </div>
            </div>
          )}

          {/* Tabela de Variantes */}
          <div className="overflow-x-auto max-h-60 border border-[#D0D5DD] rounded-lg">
            <table className="uze-table text-xs">
              <thead>
                <tr>
                  <th>Cor</th>
                  <th>Tamanho</th>
                  <th>SKU</th>
                  <th className="text-center">Estoque Atual</th>
                  <th className="text-center">Estoque Mínimo</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {modelVariants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      Nenhuma variante cadastrada. Use os botões acima para adicionar tamanhos ou cores.
                    </td>
                  </tr>
                ) : (
                  modelVariants.map(v => (
                    <tr key={v.id}>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: v.colorHex }} />
                          <span className="font-semibold text-[#101828]">{v.colorName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-xs text-[#173E75]">{v.size}</span>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="font-mono text-xs text-[#173E75] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#173E75] outline-hidden px-1 py-0.5"
                          value={v.sku}
                          onChange={e => updateVariant(v.id, { sku: e.target.value })}
                        />
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingVariantId(v.id);
                            setAdjustStockQty(v.currentStock);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 font-bold text-xs text-[#101828] transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Clique para ajustar o estoque"
                        >
                          <span>{v.currentStock} un</span>
                          <RotateCcw size={11} className="text-slate-400" />
                        </button>
                      </td>
                      <td className="text-center w-24">
                        <input
                          type="number"
                          min="0"
                          className="uze-input text-xs text-center py-0.5 font-semibold h-7"
                          value={v.minStock}
                          onChange={e => updateVariant(v.id, { minStock: Math.max(0, Number(e.target.value)) })}
                        />
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(v.id, v.sku)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remover variante"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#D0D5DD]">
          <button 
            type="button" 
            onClick={handleClose} 
            className="uze-btn uze-btn-secondary"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};
