import React, { useState, useEffect, useRef } from 'react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { uploadProductImage, deleteProductImage } from '../../services/storageService';
import type { ProductModel, GenderCategory, ProductStatus } from '../../types';
import { CheckCircle2, Layers, Boxes, Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';

interface EditarProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ProductModel | null;
}

export const EditarProdutoModal: React.FC<EditarProdutoModalProps> = ({ isOpen, onClose, model }) => {
  const { variants, updateModel, updateVariant } = useERP();
  const { hasPermission } = useAuth();
  const canReadCosts = hasPermission('products.cost.read');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [collection, setCollection] = useState('');
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

  // Editable minimum stock per variant map
  const [variantMinStocks, setVariantMinStocks] = useState<Record<string, number>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const modelVariants = model ? variants.filter(v => v.modelId === model.id) : [];

  useEffect(() => {
    if (model) {
      setName(model.name || '');
      setCategory(model.category || '');
      setCollection(model.collection || '');
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

      const initialMinStocks: Record<string, number> = {};
      variants.filter(v => v.modelId === model.id).forEach(v => {
        initialMinStocks[v.id] = v.minStock;
      });
      setVariantMinStocks(initialMinStocks);
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

    // Se removeu a imagem existente
    if (imageRemoved) {
      if (imagePath || imageUrl) {
        await deleteProductImage(imagePath || imageUrl);
      }
      finalImageUrl = '';
      finalImagePath = '';
    }

    // Se selecionou uma nova imagem para upload/substituição
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

    // Update model info
    updateModel(model.id, {
      name: name.trim(),
      category: category.trim(),
      collection: collection.trim(),
      description: description.trim(),
      basePrice,
      baseCost: canReadCosts ? baseCost : model.baseCost,
      gender,
      status,
      imageUrl: finalImageUrl,
      imagePath: finalImagePath,
    });

    // Update variants minimum stock
    modelVariants.forEach(v => {
      const updatedMin = variantMinStocks[v.id];
      if (updatedMin !== undefined && updatedMin !== v.minStock) {
        updateVariant(v.id, { minStock: updatedMin });
      }
    });

    setSavedSuccess(true);
    setIsDirty(false);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 500);
  };

  const margin = basePrice > 0 ? ((basePrice - baseCost) / basePrice) * 100 : 0;

  if (!model) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Editar Produto: ${model.name}`}
      subtitle="Edite as características do modelo, fotografia e configurações das variantes sem afetar estoques físicos"
      maxWidth="4xl"
    >
      <form onSubmit={handleSave} className="space-y-5 text-xs text-[#344054]">
        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} /> Alterações salvas com sucesso!
          </div>
        )}

        {/* Informações Básicas do Modelo & Foto */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828] border-b border-[#D0D5DD] pb-1.5 flex items-center gap-1.5">
            <Layers size={14} className="text-[#173E75]" /> 1. Informações Básicas & Foto do Produto
          </h4>

          {/* Seção da Fotografia */}
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
                  Formatos: JPG, PNG ou WEBP (máx. 5MB). Ao substituir ou remover, o arquivo antigo no Supabase Storage é atualizado com segurança.
                </p>

                {imageError && (
                  <p className="text-xs text-rose-600 font-bold mt-1">{imageError}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="uze-label">Nome do Modelo / Produto *</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="uze-label">Coleção</label>
              <input
                type="text"
                className="uze-input text-xs"
                value={collection}
                onChange={e => {
                  setCollection(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>

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

        {/* Variantes Cadastradas */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-[#D0D5DD] pb-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828] flex items-center gap-1.5">
              <Boxes size={14} className="text-[#173E75]" /> 2. Variantes de Estoque ({modelVariants.length})
            </h4>
            <span className="text-[11px] text-[#475467]">
              Para alterar saldo físico, use <b>Ajustar Estoque</b> na aba de Estoque.
            </span>
          </div>

          <div className="overflow-x-auto max-h-48 border border-[#D0D5DD] rounded-lg">
            <table className="uze-table text-xs">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Cor</th>
                  <th>Tamanho</th>
                  <th className="text-center">Estoque Atual</th>
                  <th className="text-center">Estoque Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {modelVariants.map(v => (
                  <tr key={v.id}>
                    <td className="font-mono font-semibold text-[#173E75]">{v.sku}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: v.colorHex }} />
                        <span>{v.colorName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-bold text-[#101828]">{v.size}</span>
                    </td>
                    <td className="text-center">
                      <span className="font-bold text-xs text-[#101828]">{v.currentStock} un</span>
                    </td>
                    <td className="text-center w-28">
                      <input
                        type="number"
                        min="0"
                        className="uze-input text-xs text-center py-1 font-semibold h-7"
                        value={variantMinStocks[v.id] ?? v.minStock}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setVariantMinStocks(prev => ({ ...prev, [v.id]: val }));
                          setIsDirty(true);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#D0D5DD]">
          <button 
            type="button" 
            onClick={handleClose} 
            disabled={isUploadingImage}
            className="uze-btn uze-btn-secondary"
          >
            Cancelar
          </button>
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
              <span>Salvar Alterações</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
