import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { MovementTypeBadge } from '../common/Badge';
import type { ProductVariant, ProductModel } from '../../types';
import { 
  Boxes, 
  Layers, 
  History, 
  Edit3, 
  SlidersHorizontal, 
  Trash2, 
  CheckCircle2, 
  X, 
  ShieldAlert
} from 'lucide-react';

interface VarianteDetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: ProductVariant | null;
  model: ProductModel | null;
  onVariantUpdated?: () => void;
}

export const VarianteDetalhesModal: React.FC<VarianteDetalhesModalProps> = ({
  isOpen,
  onClose,
  variant,
  model,
  onVariantUpdated,
}) => {
  const { movements, sales, updateVariantStock, updateVariant, deleteVariant } = useERP();
  const { hasPermission } = useAuth();

  const canEdit = hasPermission('products.edit');
  const canAdjust = hasPermission('inventory.adjust');

  // Modo de Edição dos Dados da Variante
  const [isEditing, setIsEditing] = useState(false);
  const [editSku, setEditSku] = useState('');
  const [editMinStock, setEditMinStock] = useState<number>(5);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modo de Ajuste Rápido de Estoque
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Ajuste de conferência física');
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  // Confirmação de Exclusão
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Mensagem de Sucesso Geral
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (variant) {
      setEditSku(variant.sku);
      setEditMinStock(variant.minStock);
      setNewStockQty(variant.currentStock);
      setIsEditing(false);
      setIsAdjustingStock(false);
      setIsConfirmingDelete(false);
      setEditError(null);
      setStockError(null);
      setDeleteError(null);
      setSuccessMessage(null);
    }
  }, [variant, isOpen]);

  if (!variant || !model) return null;

  // Filtrar histórico de movimentações para esta variante
  const variantMovements = movements
    .filter(m => m.variantId === variant.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Verificar se há histórico de vendas
  const hasSalesHistory = sales.some(s => 
    s.items.some(i => i.variantId === variant.id)
  );

  const getStockStatus = (current: number, min: number) => {
    if (current === 0) return { label: 'Sem estoque', badgeClass: 'uze-badge-danger' };
    if (current <= min) return { label: 'Estoque baixo', badgeClass: 'uze-badge-warning' };
    return { label: 'Disponível', badgeClass: 'uze-badge-success' };
  };

  const status = getStockStatus(variant.currentStock, variant.minStock);

  const handleSaveVariantInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSku.trim()) {
      setEditError('O código SKU é obrigatório.');
      return;
    }
    if (editMinStock < 0) {
      setEditError('O estoque mínimo não pode ser negativo.');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    const res = await updateVariant(variant.id, {
      sku: editSku.trim(),
      minStock: editMinStock,
    });

    setIsSavingEdit(false);
    if (!res.success) {
      setEditError(res.error || 'Erro ao atualizar dados da variante.');
      return;
    }

    setSuccessMessage('Variante atualizada com sucesso no banco de dados!');
    setIsEditing(false);
    onVariantUpdated?.();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStockQty < 0) {
      setStockError('A quantidade não pode ser negativa.');
      return;
    }
    if (!adjustReason.trim()) {
      setStockError('Informe a justificativa do ajuste.');
      return;
    }

    setIsSavingStock(true);
    setStockError(null);

    try {
      updateVariantStock(
        variant.id, 
        newStockQty, 
        'Ajuste', 
        adjustReason.trim()
      );
      setIsSavingStock(false);
      setIsAdjustingStock(false);
      setSuccessMessage('Estoque físico atualizado com sucesso no Supabase!');
      onVariantUpdated?.();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setIsSavingStock(false);
      setStockError(err.message || 'Erro ao ajustar estoque.');
    }
  };

  const handleDeleteVariant = () => {
    setDeleteError(null);
    const res = deleteVariant(variant.id, { force: true });
    if (!res.success) {
      setDeleteError(res.reason || 'Erro ao remover variante.');
      return;
    }
    onVariantUpdated?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalhes da Variante: ${variant.sku}`}
      subtitle={`${model.name} • Cor: ${variant.colorName} • Tamanho: ${variant.size}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs text-[#101828]">
        {/* Banner de Feedback de Sucesso */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold text-xs">{successMessage}</span>
          </div>
        )}

        {/* 1. SEÇÃO DE IDENTIFICAÇÃO E ESTOQUE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card: Identificação */}
          <div className="p-3.5 bg-[#F9FAFB] rounded-xl border border-[#D0D5DD] space-y-2.5">
            <h4 className="text-[11px] font-bold text-[#173E75] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D0D5DD] pb-1.5">
              <Layers size={13} /> Identificação da Peça
            </h4>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#475467] font-medium">Produto Modelo:</span>
                <span className="font-bold text-[#101828]">{model.name}</span>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#475467] font-medium">Código SKU:</span>
                <code className="font-mono bg-white px-2 py-0.5 rounded border border-[#D0D5DD] font-bold text-[#173E75]">
                  {variant.sku}
                </code>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#475467] font-medium">Cor Selecionada:</span>
                <div className="flex items-center gap-2 font-semibold text-[#101828]">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs shrink-0"
                    style={{ backgroundColor: variant.colorHex }}
                  />
                  <span>{variant.colorName}</span>
                  <span className="font-mono text-[10px] text-[#98A2B3]">({variant.colorHex})</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#475467] font-medium">Tamanho da Grade:</span>
                <span className="px-2 py-0.5 bg-[#173E75] text-white rounded font-bold text-xs">
                  {variant.size}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Estoque & Situação */}
          <div className="p-3.5 bg-[#F9FAFB] rounded-xl border border-[#D0D5DD] space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#D0D5DD] pb-1.5">
              <h4 className="text-[11px] font-bold text-[#173E75] uppercase tracking-wider flex items-center gap-1.5">
                <Boxes size={13} /> Situação do Estoque Físico
              </h4>
              <span className={`uze-badge ${status.badgeClass} text-[10px]`}>
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-center">
              <div className="p-2.5 bg-white rounded-lg border border-[#D0D5DD]">
                <span className="text-[10px] font-bold text-[#475467] uppercase block">Estoque Atual</span>
                <span className={`text-xl font-black block mt-0.5 ${
                  variant.currentStock === 0 ? 'text-[#B42318]' : 'text-[#101828]'
                }`}>
                  {variant.currentStock} <span className="text-xs font-normal text-[#475467]">un</span>
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-[#D0D5DD]">
                <span className="text-[10px] font-bold text-[#475467] uppercase block">Estoque Mínimo</span>
                <span className="text-xl font-bold text-[#344054] block mt-0.5">
                  {variant.minStock} <span className="text-xs font-normal text-[#475467]">un</span>
                </span>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="pt-2 flex items-center gap-2 border-t border-[#D0D5DD]">
              {canAdjust && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAdjustingStock(prev => !prev);
                    setIsEditing(false);
                    setIsConfirmingDelete(false);
                  }}
                  className={`uze-btn-secondary text-xs h-7 flex-1 justify-center ${
                    isAdjustingStock ? 'bg-[#EFF4FF] border-[#173E75] text-[#173E75]' : ''
                  }`}
                >
                  <SlidersHorizontal size={12} />
                  <span>{isAdjustingStock ? 'Fechar Ajuste' : 'Ajustar Saldo'}</span>
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(prev => !prev);
                    setIsAdjustingStock(false);
                    setIsConfirmingDelete(false);
                  }}
                  className={`uze-btn-secondary text-xs h-7 flex-1 justify-center ${
                    isEditing ? 'bg-[#EFF4FF] border-[#173E75] text-[#173E75]' : ''
                  }`}
                >
                  <Edit3 size={12} />
                  <span>{isEditing ? 'Fechar Edição' : 'Editar Dados'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. FORMULÁRIO COLAPSÁVEL: EDITAR DADOS DA VARIANTE */}
        {isEditing && (
          <form onSubmit={handleSaveVariantInfo} className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-blue-200 pb-1.5">
              <h5 className="font-bold text-xs text-[#173E75] flex items-center gap-1.5">
                <Edit3 size={13} /> Editar Identificação & Estoque Mínimo
              </h5>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            </div>

            {editError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                {editError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-[#344054] block mb-1">
                  Código SKU
                </label>
                <input
                  type="text"
                  value={editSku}
                  onChange={e => setEditSku(e.target.value.toUpperCase())}
                  className="uze-input font-mono font-bold"
                  placeholder="Ex: JAL-BRA-M"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[#344054] block mb-1">
                  Estoque Mínimo de Alerta
                </label>
                <input
                  type="number"
                  min="0"
                  value={editMinStock}
                  onChange={e => setEditMinStock(Number(e.target.value))}
                  className="uze-input"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-blue-200">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="uze-btn-secondary text-xs h-7 px-3"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="uze-btn-primary text-xs h-7 px-3 disabled:opacity-50"
              >
                {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}

        {/* 3. FORMULÁRIO COLAPSÁVEL: AJUSTAR ESTOQUE FÍSICO */}
        {isAdjustingStock && (
          <form onSubmit={handleSaveStockAdjustment} className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
              <h5 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-amber-700" /> Ajustar Saldo em Estoque (Auditável)
              </h5>
              <button
                type="button"
                onClick={() => setIsAdjustingStock(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            </div>

            {stockError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                {stockError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-[#344054] block mb-1">
                  Novo Saldo Físico (unidades)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newStockQty}
                  onChange={e => setNewStockQty(Number(e.target.value))}
                  className="uze-input font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[#344054] block mb-1">
                  Motivo do Ajuste (Obrigatório para Auditoria)
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="uze-input"
                  placeholder="Ex: Contagem física de inventário"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-amber-200">
              <button
                type="button"
                onClick={() => setIsAdjustingStock(false)}
                className="uze-btn-secondary text-xs h-7 px-3"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingStock}
                className="uze-btn-primary bg-[#B54708] hover:bg-[#93370D] text-xs h-7 px-3 disabled:opacity-50"
              >
                {isSavingStock ? 'Atualizando...' : 'Confirmar Ajuste'}
              </button>
            </div>
          </form>
        )}

        {/* 4. SEÇÃO: HISTÓRICO DE MOVIMENTAÇÕES DESTA VARIANTE */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-[#101828] uppercase tracking-wider flex items-center gap-1.5">
              <History size={13} className="text-[#173E75]" /> Histórico de Movimentações ({variantMovements.length})
            </h4>
            <span className="text-[10px] text-[#475467] font-medium">
              Entradas, vendas, ajustes e trocas registradas
            </span>
          </div>

          <div className="border border-[#D0D5DD] rounded-lg overflow-hidden max-h-52 overflow-y-auto bg-white">
            {variantMovements.length === 0 ? (
              <div className="p-8 text-center text-[#98A2B3]">
                <History size={24} className="mx-auto mb-1.5 opacity-40" />
                <p className="font-semibold text-xs text-[#344054]">Nenhuma movimentação registrada</p>
                <p className="text-[11px] mt-0.5">As alterações de estoque desta peça aparecerão aqui automaticamente.</p>
              </div>
            ) : (
              <table className="uze-table text-xs">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Tipo</th>
                    <th className="text-right">Qtd</th>
                    <th>Motivo</th>
                    <th>Operador</th>
                  </tr>
                </thead>
                <tbody>
                  {variantMovements.map(m => (
                    <tr key={m.id}>
                      <td className="font-mono text-[#475467] text-[11px] whitespace-nowrap">{m.date}</td>
                      <td>
                        <MovementTypeBadge type={m.type} />
                      </td>
                      <td className={`text-right font-bold ${
                        m.quantity > 0 ? 'text-[#027A48]' : 'text-[#B42318]'
                      }`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} un
                      </td>
                      <td className="text-[#344054] max-w-xs truncate" title={m.reason}>
                        {m.reason}
                      </td>
                      <td className="text-[#475467] text-[11px] whitespace-nowrap">{m.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 5. SEÇÃO: EXCLUSÃO / ARQUIVAMENTO */}
        {canEdit && (
          <div className="pt-2 border-t border-[#D0D5DD]">
            {!isConfirmingDelete ? (
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#98A2B3]">
                  ID do Sistema: <code className="font-mono text-[10px]">{variant.id}</code>
                </span>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 hover:underline"
                >
                  <Trash2 size={12} /> Excluir variante
                </button>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2.5 animate-fadeIn">
                <div className="flex items-start gap-2 text-rose-900">
                  <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">Confirmar Exclusão Definitiva da Variante?</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {hasSalesHistory
                        ? 'Atenção: Esta variante possui vendas vinculadas no histórico. Ao excluir, ela deixará de existir no catálogo ativo.'
                        : 'Esta variante e seus registros de estoque serão removidos definitivamente sem afetar os demais itens do produto.'}
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <p className="text-xs font-bold text-rose-600">{deleteError}</p>
                )}

                <div className="flex justify-end gap-2 pt-1 border-t border-rose-200">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="uze-btn-secondary text-xs h-7 px-3"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteVariant}
                    className="uze-btn-primary bg-rose-700 hover:bg-rose-800 text-xs h-7 px-3"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
