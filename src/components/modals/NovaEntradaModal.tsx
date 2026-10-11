import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import type { PurchaseEntry, PurchaseItem } from '../../types';
import { Plus, Trash2, Truck, AlertCircle } from 'lucide-react';

interface NovaEntradaModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: PurchaseEntry | null;
}

export const NovaEntradaModal: React.FC<NovaEntradaModalProps> = ({ isOpen, onClose, entryToEdit }) => {
  const { models, variants, suppliers, addPurchase, updatePurchase, addSupplier } = useERP();

  const [date, setDate] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isNewSupplierCustom, setIsNewSupplierCustom] = useState<boolean>(false);
  const [discount, setDiscount] = useState<number>(0);
  const [shipping, setShipping] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Cart / Items
  const [items, setItems] = useState<PurchaseItem[]>([]);

  // Item builder
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemUnitCost, setItemUnitCost] = useState<number>(0);
  const [itemError, setItemError] = useState<string>('');

  const getTodayInputDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (entryToEdit) {
        setDate(entryToEdit.date);
        setSelectedSupplierId(entryToEdit.supplierId || '');
        setSupplierName(entryToEdit.supplierName || '');
        setIsNewSupplierCustom(Boolean(!entryToEdit.supplierId && entryToEdit.supplierName));
        setDiscount(entryToEdit.discount || 0);
        setShipping(entryToEdit.shipping || 0);
        setNotes(entryToEdit.notes || '');
        setItems(entryToEdit.items.map(i => ({ ...i })));
      } else {
        setDate(getTodayInputDate());
        setSelectedSupplierId(suppliers[0]?.id || '');
        setSupplierName(suppliers[0]?.name || 'Fábrica Matriz');
        setIsNewSupplierCustom(false);
        setDiscount(0);
        setShipping(0);
        setNotes('');
        setItems([]);
      }
      setSelectedModelId(models[0]?.id || '');
      setSelectedVariantId('');
      setItemQty(1);
      setItemUnitCost(0);
      setItemError('');
    }
  }, [isOpen, entryToEdit, suppliers, models]);

  // When model changes, update available variants and default unit cost from model baseCost
  const availableVariants = variants.filter(v => v.modelId === selectedModelId && v.status !== 'Inativo');

  useEffect(() => {
    if (selectedModelId) {
      const selectedModel = models.find(m => m.id === selectedModelId);
      if (selectedModel) {
        setItemUnitCost(selectedModel.baseCost || 0);
      }
      if (availableVariants.length > 0) {
        setSelectedVariantId(availableVariants[0].id);
      } else {
        setSelectedVariantId('');
      }
    }
  }, [selectedModelId, models, variants]);

  const handleSupplierSelect = (val: string) => {
    if (val === '__custom__') {
      setIsNewSupplierCustom(true);
      setSelectedSupplierId('');
      setSupplierName('');
    } else {
      setIsNewSupplierCustom(false);
      setSelectedSupplierId(val);
      const sup = suppliers.find(s => s.id === val);
      setSupplierName(sup?.name || '');
    }
  };

  const handleAddItem = () => {
    setItemError('');
    if (!selectedVariantId) {
      setItemError('Selecione uma variante do produto.');
      return;
    }
    if (itemQty <= 0) {
      setItemError('A quantidade deve ser maior que zero.');
      return;
    }

    const variant = variants.find(v => v.id === selectedVariantId);
    const model = models.find(m => m.id === selectedModelId);
    if (!variant || !model) return;

    const existingIndex = items.findIndex(i => i.variantId === variant.id);
    const totalCost = Number((itemQty * itemUnitCost).toFixed(2));

    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += itemQty;
      updated[existingIndex].unitCost = itemUnitCost;
      updated[existingIndex].totalCost = Number((updated[existingIndex].quantity * itemUnitCost).toFixed(2));
      setItems(updated);
    } else {
      const newItem: PurchaseItem = {
        id: `pitem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        variantId: variant.id,
        productName: model.name,
        colorName: variant.colorName,
        size: variant.size,
        sku: variant.sku,
        unitCost: itemUnitCost,
        quantity: itemQty,
        totalCost,
      };
      setItems(prev => [...prev, newItem]);
    }

    setItemQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemQtyChange = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          quantity: newQty,
          totalCost: Number((newQty * item.unitCost).toFixed(2)),
        };
      }
      return item;
    }));
  };

  const handleItemCostChange = (index: number, newCost: number) => {
    if (newCost < 0) return;
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          unitCost: newCost,
          totalCost: Number((item.quantity * newCost).toFixed(2)),
        };
      }
      return item;
    }));
  };

  const subtotal = items.reduce((acc, i) => acc + i.totalCost, 0);
  const total = Math.max(0, subtotal - discount + shipping);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Adicione pelo menos um produto à entrada de estoque.');
      return;
    }

    let finalSupplierId = selectedSupplierId;
    let finalSupplierName = supplierName.trim();

    if (!finalSupplierName) {
      finalSupplierName = 'Fábrica / Fornecedor Geral';
    }

    // Se criou fornecedor novo livre, podemos também salvá-lo no cadastro
    if (isNewSupplierCustom && finalSupplierName) {
      const createdSup = addSupplier({
        name: finalSupplierName,
        status: 'Ativo',
      });
      finalSupplierId = createdSup.id;
    }

    if (entryToEdit) {
      const updatedEntry: PurchaseEntry = {
        ...entryToEdit,
        supplierId: finalSupplierId || undefined,
        supplierName: finalSupplierName,
        date,
        items,
        subtotal,
        discount,
        shipping,
        total,
        notes: notes.trim(),
      };
      const res = updatePurchase(updatedEntry);
      if (!res.success) {
        alert(res.reason || 'Erro ao atualizar compra.');
        return;
      }
    } else {
      addPurchase({
        supplierId: finalSupplierId || undefined,
        supplierName: finalSupplierName,
        date,
        items,
        subtotal,
        discount,
        shipping,
        total,
        notes: notes.trim(),
        status: 'Concluído',
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entryToEdit ? `Editar Entrada (${entryToEdit.entryNumber})` : 'Nova Entrada de Mercadoria / Compra'}
      subtitle="Registre compras diretamente da fábrica para abastecer o estoque físico de suas variantes"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs text-[#101828]">
        {/* Header Informações Básicas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-[#344054] mb-1">
              Data da Compra / Entrada *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-[#D0D5DD] rounded-md px-2.5 py-1.5 font-medium text-xs focus:ring-2 focus:ring-[#173E75] outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-[#344054] mb-1 flex items-center justify-between">
              <span>Fornecedor / Origem da Mercadoria</span>
              <button
                type="button"
                onClick={() => handleSupplierSelect('__custom__')}
                className="text-[10px] text-[#173E75] hover:underline font-bold"
              >
                + Digitar nome livre
              </button>
            </label>
            {isNewSupplierCustom ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome do fornecedor ou confecção (ex: Fábrica Matriz SP)..."
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="flex-1 bg-white border border-[#D0D5DD] rounded-md px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#173E75] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsNewSupplierCustom(false)}
                  className="px-2.5 py-1 border border-slate-300 rounded text-slate-600 hover:bg-slate-100 font-bold text-[11px]"
                >
                  Selecionar
                </button>
              </div>
            ) : (
              <select
                value={selectedSupplierId}
                onChange={(e) => handleSupplierSelect(e.target.value)}
                className="w-full bg-white border border-[#D0D5DD] rounded-md px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#173E75] outline-none"
              >
                <option value="">Selecione ou deixe geral...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.phone ? `(${s.phone})` : ''}
                  </option>
                ))}
                <option value="__custom__">+ Outro fornecedor (Digitar nome livre)...</option>
              </select>
            )}
          </div>
        </div>

        {/* Adicionar Produtos / Itens da Fábrica */}
        <div className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-bold text-xs text-[#173E75] flex items-center gap-1.5">
              <Truck size={15} /> Itens Comprados da Fábrica
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">
              Ao confirmar, cada variante terá seu saldo aumentado
            </span>
          </div>

          {/* Seletor rápido de produtos e variantes */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-slate-50/80 p-2.5 rounded-md border border-slate-200/60 items-end">
            <div className="sm:col-span-4">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Produto
              </label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-semibold"
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Variante (Cor / Tam / SKU)
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-semibold"
              >
                {availableVariants.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.colorName} - {v.size} ({v.currentStock} em est.)
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Qtde
              </label>
              <input
                type="number"
                min="1"
                value={itemQty}
                onChange={(e) => setItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-center"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                Custo Un. (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemUnitCost}
                onChange={(e) => setItemUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-right"
              />
            </div>

            <div className="sm:col-span-1">
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full bg-[#173E75] hover:bg-[#0F284C] text-white font-bold py-1.5 rounded flex items-center justify-center cursor-pointer transition-colors"
                title="Adicionar à lista de entrada"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {itemError && (
            <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
              <AlertCircle size={13} /> {itemError}
            </p>
          )}

          {/* Tabela de itens adicionados */}
          {items.length === 0 ? (
            <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
              Nenhum item adicionado à compra ainda. Selecione os produtos acima e clique no botão +.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-1.5 px-3">Produto / Variante</th>
                    <th className="py-1.5 px-2">SKU</th>
                    <th className="py-1.5 px-2 text-center">Qtde (un)</th>
                    <th className="py-1.5 px-2 text-right">Custo Un. (R$)</th>
                    <th className="py-1.5 px-3 text-right">Subtotal</th>
                    <th className="py-1.5 px-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-semibold text-[#101828]">
                        {item.productName}
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {item.colorName} • Tamanho {item.size}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-mono text-[11px] text-slate-600 font-medium">
                        {item.sku || '-'}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemQtyChange(idx, Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 text-center font-bold text-xs border border-slate-300 rounded px-1 py-0.5"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) => handleItemCostChange(idx, Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-20 text-right font-bold text-xs border border-slate-300 rounded px-1 py-0.5"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#173E75]">
                        R$ {item.totalCost.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totais, Desconto, Frete e Observações */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Observações da Compra
            </label>
            <textarea
              rows={3}
              placeholder="Número de nota fiscal, lote do tecido, condições acordadas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-[#D0D5DD] rounded-md p-2 text-xs focus:ring-2 focus:ring-[#173E75] outline-none"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 text-slate-600 font-medium border-b border-slate-200">
              <span>Subtotal dos Produtos:</span>
              <span className="font-bold">R$ {subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between py-1 text-slate-600 font-medium">
              <span>Desconto da Fábrica (R$):</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 text-right bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-xs"
              />
            </div>

            <div className="flex items-center justify-between py-1 text-slate-600 font-medium border-b border-slate-200 pb-1.5">
              <span>Frete / Transporte (R$):</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={shipping}
                onChange={(e) => setShipping(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 text-right bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-xs"
              />
            </div>

            <div className="flex justify-between py-2 text-sm font-black text-[#173E75]">
              <span>Valor Total da Entrada:</span>
              <span className="text-base">
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
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
            disabled={items.length === 0}
            className={`px-5 py-2 rounded-md font-bold text-xs text-white transition-all shadow-xs cursor-pointer ${
              items.length > 0 ? 'bg-[#173E75] hover:bg-[#0F284C]' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {entryToEdit ? 'Salvar Alterações' : 'Confirmar e Abastecer Estoque'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
