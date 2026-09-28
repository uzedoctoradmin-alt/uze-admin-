import React, { useState, useRef } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import { uploadProductImage } from '../../services/storageService';
import type { GenderCategory, VariantSize } from '../../types';
import { Check, Upload, Image as ImageIcon, Trash2, Loader2, Sparkles } from 'lucide-react';

interface NovoProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NovoProdutoModal: React.FC<NovoProdutoModalProps> = ({ isOpen, onClose }) => {
  const { addModel } = useERP();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Model Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Jalecos Femininos');
  const [collection, setCollection] = useState('Coleção Royale 2026');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [baseCost, setBaseCost] = useState<number>(0);
  const [gender, setGender] = useState<GenderCategory>('Feminino');
  
  // Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string>('');

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

    // Upload image to Supabase Storage if selected
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
        name: name.trim(),
        category,
        collection,
        description: description.trim(),
        basePrice,
        baseCost,
        gender,
        status: 'Ativo',
        imageUrl: finalImageUrl,
        imagePath: finalImagePath,
      },
      createdVariants
    );

    setName('');
    setDescription('');
    setImageFile(null);
    setImagePreview('');
    onClose();
  };

  const margin = basePrice > 0 ? ((basePrice - baseCost) / basePrice) * 100 : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cadastrar Novo Produto / Modelo"
      subtitle="Defina o modelo conceitual, foto do produto e configure suas variantes de estoque"
      maxWidth="2xl"
    >
      <form onSubmit={handleSaveProduct} className="space-y-5 text-xs">
        {/* Section 1: Basic Info & Photo */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828] border-b border-[#D0D5DD] pb-1.5 mb-3 flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#C69A43]" />
            1. Informações Básicas & Foto do Produto
          </h4>
          
          <div className="space-y-3.5">
            {/* Foto do Produto */}
            <div className="p-3.5 bg-[#F9FAFB] rounded-xl border border-[#D0D5DD]">
              <label className="uze-label mb-1.5">Fotografia do Produto (Opcional)</label>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Preview Box */}
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

                {/* Upload Controls */}
                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                    id="novo-produto-foto"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="novo-produto-foto"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#173E75] hover:bg-[#122e56] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <Upload size={14} />
                      <span>{imagePreview ? 'Substituir Foto' : 'Selecionar Foto'}</span>
                    </label>

                    {imagePreview && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Formatos: JPG, PNG ou WEBP (máx. 5MB). Se não adicionar foto, será exibido o placeholder da UZE DOCTOR.
                  </p>

                  {imageError && (
                    <p className="text-xs text-rose-600 font-bold mt-1">{imageError}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="uze-label">Nome do Modelo / Produto *</label>
              <input
                type="text"
                placeholder="Ex: Jaleco Alfaiataria Nobre"
                required
                className="uze-input text-xs font-semibold"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="uze-label">Categoria *</label>
                <select 
                  className="uze-input text-xs font-medium cursor-pointer"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="Jalecos Femininos">Jalecos Femininos</option>
                  <option value="Jalecos Masculinos">Jalecos Masculinos</option>
                  <option value="Scrubs Cirúrgicos">Scrubs Cirúrgicos</option>
                  <option value="Acessórios Médicos">Acessórios Médicos</option>
                </select>
              </div>

              <div>
                <label className="uze-label">Coleção</label>
                <input
                  type="text"
                  className="uze-input text-xs"
                  value={collection}
                  onChange={e => setCollection(e.target.value)}
                  placeholder="Ex: Royale 2026"
                />
              </div>

              <div>
                <label className="uze-label">Gênero / Modelagem</label>
                <select
                  className="uze-input text-xs font-medium cursor-pointer"
                  value={gender}
                  onChange={e => setGender(e.target.value as GenderCategory)}
                >
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Unissex">Unissex</option>
                </select>
              </div>
            </div>

            <div>
              <label className="uze-label">Descrição da Ficha Técnica</label>
              <textarea
                rows={2}
                placeholder="Detalhes sobre o corte, tecido nobre, caimento e diferenciais..."
                className="uze-input h-auto py-2 text-xs"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Commercial & Pricing */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828] border-b border-[#D0D5DD] pb-1.5 mb-3">
            2. Precificação & Margem
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD]">
            <div>
              <label className="uze-label">Preço de Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="uze-input text-xs font-extrabold text-[#101828]"
                value={basePrice === 0 ? '' : basePrice}
                placeholder="0.00"
                onChange={e => setBasePrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="uze-label">Custo Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="uze-input text-xs font-extrabold text-[#344054]"
                value={baseCost === 0 ? '' : baseCost}
                placeholder="0.00"
                onChange={e => setBaseCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="uze-label">Margem Calculada</label>
              <div className="uze-input text-xs font-extrabold bg-[#ECFDF3] border border-[#A6F4C5] flex items-center text-[#027A48]">
                {margin.toFixed(1)}% (R$ {(basePrice - baseCost).toFixed(2)})
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Variantes & Estoque Inicial */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#101828] border-b border-[#D0D5DD] pb-1.5 mb-3">
            3. Gerador de Variantes & Estoque Inicial
          </h4>
          <div className="space-y-3.5 p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="uze-label">Nome da Cor *</label>
                <input
                  type="text"
                  required
                  className="uze-input text-xs font-semibold"
                  value={colorName}
                  onChange={e => setColorName(e.target.value)}
                  placeholder="Ex: Branco, Azul Marinho, Nude"
                />
              </div>
              <div>
                <label className="uze-label">Tom de Cor (Hex) *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    className="w-10 h-10 rounded border-2 border-[#D0D5DD] cursor-pointer p-0.5 bg-white shadow-xs focus:ring-2 focus:ring-[#173E75]/30 focus:outline-none"
                    value={colorHex}
                    onChange={e => setColorHex(e.target.value)}
                    title="Seletor de cor"
                  />
                  <input
                    type="text"
                    className="uze-input text-xs font-mono font-bold uppercase text-[#101828]"
                    value={colorHex}
                    onChange={e => setColorHex(e.target.value)}
                    placeholder="#FFFFFF"
                  />
                  <div 
                    className="w-10 h-10 rounded border-2 border-[#D0D5DD] shadow-xs shrink-0 flex items-center justify-center transition-all"
                    style={{ backgroundColor: colorHex }}
                    title={`Amostra de cor: ${colorHex}`}
                  />
                </div>
              </div>
            </div>

            {/* Seleção de Tamanhos */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="uze-label mb-0">Tamanhos a Criar *</label>
                <span className="text-[11px] font-bold text-[#173E75]">
                  {selectedSizes.length} selecionado{selectedSizes.length !== 1 ? 's' : ''} ({selectedSizes.join(', ') || 'Nenhum'})
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                {sizesList.map(sz => {
                  const isSelected = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      aria-pressed={isSelected}
                      className={`
                        min-w-[52px] h-9 px-3 text-xs font-bold rounded-md border-2 transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-[#173E75]/30 focus:ring-offset-1
                        ${isSelected 
                          ? 'bg-[#173E75] text-[#FFFFFF] border-[#173E75] shadow-xs' 
                          : 'bg-[#FFFFFF] text-[#344054] border-[#D0D5DD] hover:bg-[#F2F4F7] hover:border-[#173E75] hover:text-[#173E75]'
                        }
                      `}
                    >
                      {isSelected && (
                        <Check size={13} className="stroke-[3] text-white shrink-0" />
                      )}
                      <span>{sz}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#475467] mt-1.5">
                Clique nos tamanhos para selecionar ou remover.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#E4E7EC]">
              <div>
                <label className="uze-label">Estoque Inicial por Variante (Peças)</label>
                <input
                  type="number"
                  min="0"
                  className="uze-input text-xs font-bold text-[#101828]"
                  value={initialStock}
                  onChange={e => setInitialStock(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="uze-label">Estoque Mínimo de Alerta (Peças)</label>
                <input
                  type="number"
                  min="0"
                  className="uze-input text-xs font-bold text-[#344054]"
                  value={minStock}
                  onChange={e => setMinStock(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D0D5DD]">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isUploadingImage}
            className="uze-btn-secondary text-xs"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={!name.trim() || selectedSizes.length === 0 || isUploadingImage}
            className="uze-btn-primary text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isUploadingImage ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Enviando Imagem...</span>
              </>
            ) : (
              <span>Salvar Modelo e Gerar Variantes</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
