import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import type { ExpenseCategory, RevenueCategory } from '../../types';

interface NovaTransacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'despesa' | 'receita';
}

export const NovaTransacaoModal: React.FC<NovaTransacaoModalProps> = ({
  isOpen,
  onClose,
  type,
}) => {
  const { addExpense, addRevenue } = useERP();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Matéria-prima');
  const [revenueCategory, setRevenueCategory] = useState<RevenueCategory>('Personalização/Bordado');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    const todayStr = new Date().toISOString().split('T')[0];

    if (type === 'despesa') {
      addExpense({
        date: todayStr,
        description,
        category: expenseCategory,
        amount,
        paymentMethod,
        notes,
      });
    } else {
      addRevenue({
        date: todayStr,
        source: description,
        category: revenueCategory,
        amount,
        paymentMethod,
      });
    }

    setDescription('');
    setAmount(0);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'despesa' ? 'Registrar Nova Despesa Operacional' : 'Registrar Nova Receita / Entrada'}
      subtitle={type === 'despesa' ? 'Despesas como insumos, facção, marketing ou logística' : 'Entradas avulsas, bordados ou vendas atacado'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="uze-label">{type === 'despesa' ? 'Descrição da Despesa *' : 'Origem da Receita *'}</label>
          <input
            type="text"
            required
            placeholder={type === 'despesa' ? 'Ex: Lote de zíperes banhados a ouro + tecidos' : 'Ex: Serviço de bordado personalizado hospitalar'}
            className="uze-input text-xs"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="uze-label">Valor (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className="uze-input text-sm font-extrabold text-[var(--color-navy-dark)]"
              value={amount}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="uze-label">Categoria</label>
            {type === 'despesa' ? (
              <select
                className="uze-input text-xs"
                value={expenseCategory}
                onChange={e => setExpenseCategory(e.target.value as ExpenseCategory)}
              >
                <option value="Fornecedores">Fornecedores</option>
                <option value="Matéria-prima">Matéria-prima</option>
                <option value="Confecção">Confecção</option>
                <option value="Embalagens">Embalagens</option>
                <option value="Transporte">Transporte</option>
                <option value="Marketing">Marketing</option>
                <option value="Aluguel">Aluguel</option>
                <option value="Serviços">Serviços</option>
                <option value="Impostos">Impostos</option>
                <option value="Outras">Outras Despesas</option>
              </select>
            ) : (
              <select
                className="uze-input text-xs"
                value={revenueCategory}
                onChange={e => setRevenueCategory(e.target.value as RevenueCategory)}
              >
                <option value="Vendas Diretas">Vendas Diretas</option>
                <option value="Vendas Atacado">Vendas Atacado</option>
                <option value="Personalização/Bordado">Personalização/Bordado</option>
                <option value="Outras Receitas">Outras Receitas</option>
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="uze-label">Forma de Pagamento</label>
            <select
              className="uze-input text-xs"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
            >
              <option value="PIX">PIX</option>
              <option value="Transferência">Transferência Bancária</option>
              <option value="Boleto">Boleto Bancário</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
            </select>
          </div>
          {type === 'despesa' && (
            <div>
              <label className="uze-label">Observações / Fornecedor</label>
              <input
                type="text"
                placeholder="Ex: Fornecedor Tecidos Luxo SP"
                className="uze-input text-xs"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button type="button" onClick={onClose} className="uze-btn uze-btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="uze-btn uze-btn-primary">
            {type === 'despesa' ? 'Salvar Despesa' : 'Salvar Receita'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
