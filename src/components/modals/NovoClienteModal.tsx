import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import type { Customer } from '../../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface NovoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

export const NovoClienteModal: React.FC<NovoClienteModalProps> = ({ 
  isOpen, 
  onClose,
  customerToEdit = null,
}) => {
  const { customers, addCustomer, updateCustomer } = useERP();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [notes, setNotes] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || '');
      setEmail(customerToEdit.email || '');
      setPhone(customerToEdit.phone || '');
      setDocument(customerToEdit.document || '');
      setCity(customerToEdit.city || '');
      setState(customerToEdit.state || 'SP');
      setNotes(customerToEdit.notes || '');
      setIsDirty(false);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setDocument('');
      setCity('');
      setState('SP');
      setNotes('');
      setIsDirty(false);
    }
  }, [customerToEdit, isOpen]);

  // Checagem de coincidência de nome (não bloqueia, apenas alerta)
  const similarCustomer = name.trim().length >= 3 ? customers.find(c => 
    c.id !== customerToEdit?.id &&
    c.name.toLowerCase().trim() === name.toLowerCase().trim()
  ) : null;

  const handleClose = () => {
    if (isDirty) {
      const confirmLeave = window.confirm('Existem alterações não salvas no cliente. Deseja sair mesmo assim?');
      if (!confirmLeave) return;
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (customerToEdit) {
      updateCustomer(customerToEdit.id, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        document: document.trim() || undefined,
        city: city.trim() || undefined,
        state,
        notes: notes.trim() || undefined,
      });
    } else {
      addCustomer({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        document: document.trim() || undefined,
        city: city.trim() || undefined,
        state,
        notes: notes.trim() || undefined,
      });
    }

    setSavedSuccess(true);
    setIsDirty(false);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={customerToEdit ? `Editar Cliente: ${customerToEdit.name}` : "Cadastrar Novo Cliente"}
      subtitle={customerToEdit ? "Atualize as informações cadastrais do profissional ou clínica" : "Apenas o nome é obrigatório; contato e localização são opcionais"}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} /> Alterações salvas com sucesso!
          </div>
        )}

        <div>
          <label className="uze-label">Nome Completo / Dra. / Dr. *</label>
          <input
            type="text"
            required
            placeholder="Ex: Dra. Ana Beatriz Santos ou José da Silva"
            className="uze-input text-xs"
            value={name}
            onChange={e => {
              setName(e.target.value);
              setIsDirty(true);
            }}
          />
        </div>

        {/* Alerta não bloqueante de nome duplicado/semelhante */}
        {similarCustomer && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-[11px] flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold">Atenção: Já existe um cliente com nome semelhante cadastrado.</p>
              <p className="text-amber-700 mt-0.5">
                Cliente encontrado: <b>{similarCustomer.name}</b> {similarCustomer.city ? `(${similarCustomer.city}/${similarCustomer.state})` : ''}. Deseja continuar o cadastro mesmo assim?
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="uze-label">E-mail <span className="text-[#475467] font-normal">(Opcional)</span></label>
            <input
              type="email"
              placeholder="dra.ana@dermatologia.com"
              className="uze-input text-xs"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setIsDirty(true);
              }}
            />
          </div>
          <div>
            <label className="uze-label">Telefone / WhatsApp <span className="text-[#475467] font-normal">(Opcional)</span></label>
            <input
              type="text"
              placeholder="(11) 98765-4321"
              className="uze-input text-xs"
              value={phone}
              onChange={e => {
                setPhone(e.target.value);
                setIsDirty(true);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="uze-label">CPF / CNPJ <span className="text-[#475467] font-normal">(Opcional)</span></label>
            <input
              type="text"
              placeholder="000.000.000-00"
              className="uze-input text-xs"
              value={document}
              onChange={e => {
                setDocument(e.target.value);
                setIsDirty(true);
              }}
            />
          </div>
          <div>
            <label className="uze-label">Cidade <span className="text-[#475467] font-normal">(Opcional)</span></label>
            <input
              type="text"
              placeholder="São Paulo"
              className="uze-input text-xs"
              value={city}
              onChange={e => {
                setCity(e.target.value);
                setIsDirty(true);
              }}
            />
          </div>
          <div>
            <label className="uze-label">UF</label>
            <select
              className="uze-input text-xs"
              value={state}
              onChange={e => {
                setState(e.target.value);
                setIsDirty(true);
              }}
            >
              {['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'DF', 'BA', 'PE', 'CE', 'GO', 'ES', 'MT', 'MS', 'PA', 'AM', 'RN', 'PB', 'AL', 'SE', 'PI', 'MA', 'TO', 'RO', 'AC', 'AP', 'RR'].map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="uze-label">Observações e Preferências <span className="text-[#475467] font-normal">(Opcional)</span></label>
          <textarea
            rows={2}
            placeholder="Ex: Medidas especiais, preferência por bordado dourado, jalecos slim..."
            className="uze-input text-xs resize-none"
            value={notes}
            onChange={e => {
              setNotes(e.target.value);
              setIsDirty(true);
            }}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#D0D5DD]">
          <button type="button" onClick={handleClose} className="uze-btn uze-btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="uze-btn uze-btn-primary">
            {customerToEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
