import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import type { MovementType } from '../../types';

interface AjustarEstoqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  variantId?: string;
}

export const AjustarEstoqueModal: React.FC<AjustarEstoqueModalProps> = ({
  isOpen,
  onClose,
  variantId,
}) => {
  const { variants, models, updateVariantStock } = useERP();

  const [selectedVarId, setSelectedVarId] = useState<string>(variantId || variants[0]?.id || '');
  const [newStock, setNewStock] = useState<number>(0);
  const [movementType, setMovementType] = useState<MovementType>('Entrada');
  const [reason, setReason] = useState<string>('Recebimento de lote da fábrica');

  const currentVariant = variants.find(v => v.id === (variantId || selectedVarId));
  const currentModel = models.find(m => m.id === currentVariant?.modelId);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVariant) return;

    updateVariantStock(currentVariant.id, newStock, movementType, reason);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustar / Registrar Movimentação de Estoque"
      subtitle="Todo ajuste gera um registro no histórico de movimentações auditável"
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="uze-label">Variante / Produto</label>
          {variantId && currentVariant ? (
            <div className="p-3 bg-gray-50 border rounded-md text-xs font-semibold">
              <p className="text-[var(--color-navy-dark)] font-bold text-sm">{currentModel?.name}</p>
              <p className="text-gray-600 mt-0.5">
                {currentVariant.colorName} - Tamanho {currentVariant.size} ({currentVariant.sku})
              </p>
              <p className="text-[var(--color-gold-matte)] font-mono font-bold mt-1">
                Estoque atual registrado: {currentVariant.currentStock} unidades
              </p>
            </div>
          ) : (
            <select
              className="uze-input text-xs"
              value={selectedVarId}
              onChange={e => setSelectedVarId(e.target.value)}
            >
              {variants.map(v => {
                const m = models.find(mod => mod.id === v.modelId);
                return (
                  <option key={v.id} value={v.id}>
                    {m?.name} | {v.colorName} - {v.size} ({v.currentStock} un em estoque)
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <div>
          <label className="uze-label">Tipo de Movimentação</label>
          <select
            className="uze-input text-xs"
            value={movementType}
            onChange={e => setMovementType(e.target.value as MovementType)}
          >
            <option value="Entrada">Entrada (Recebimento de Produção / Lote)</option>
            <option value="Ajuste">Ajuste de Inventário</option>
            <option value="Devolução">Devolução de Cliente</option>
            <option value="Perda">Perda / Defeito de Qualidade</option>
            <option value="Troca">Troca</option>
          </select>
        </div>

        <div>
          <label className="uze-label">Novo Estoque Físico Total (Unidades)</label>
          <input
            type="number"
            min="0"
            required
            className="uze-input text-sm font-extrabold text-[var(--color-navy-dark)]"
            value={newStock}
            onChange={e => setNewStock(parseInt(e.target.value) || 0)}
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Diferença em relação ao atual: {' '}
            <span className="font-bold text-[var(--color-navy-deep)]">
              {currentVariant ? newStock - currentVariant.currentStock : 0} unidades
            </span>
          </p>
        </div>

        <div>
          <label className="uze-label">Motivo / Justificativa da Movimentação *</label>
          <input
            type="text"
            required
            placeholder="Ex: Contagem física quinzenal ou nota fiscal de entrada #9482"
            className="uze-input text-xs"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button type="button" onClick={onClose} className="uze-btn uze-btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="uze-btn uze-btn-primary">
            Confirmar Ajuste
          </button>
        </div>
      </form>
    </Modal>
  );
};
