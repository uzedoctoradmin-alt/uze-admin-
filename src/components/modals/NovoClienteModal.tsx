import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';

interface NovoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NovoClienteModal: React.FC<NovoClienteModalProps> = ({ isOpen, onClose }) => {
  const { addCustomer } = useERP();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCustomer({
      name,
      email,
      phone,
      document,
      city,
      state,
    });

    setName('');
    setEmail('');
    setPhone('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cadastrar Novo Cliente"
      subtitle="Base de médicos, clínicas e profissionais cadastrados na UZE DOCTOR"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="uze-label">Nome Completo / Dra. / Dr. *</label>
          <input
            type="text"
            required
            placeholder="Ex: Dra. Ana Beatriz Santos"
            className="uze-input text-xs"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="uze-label">E-mail *</label>
            <input
              type="email"
              required
              placeholder="dra.ana@dermatologia.com"
              className="uze-input text-xs"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="uze-label">Telefone / WhatsApp *</label>
            <input
              type="text"
              required
              placeholder="(11) 98765-4321"
              className="uze-input text-xs"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="uze-label">CPF / CNPJ</label>
            <input
              type="text"
              placeholder="000.000.000-00"
              className="uze-input text-xs"
              value={document}
              onChange={e => setDocument(e.target.value)}
            />
          </div>
          <div>
            <label className="uze-label">Cidade</label>
            <input
              type="text"
              placeholder="São Paulo"
              className="uze-input text-xs"
              value={city}
              onChange={e => setCity(e.target.value)}
            />
          </div>
          <div>
            <label className="uze-label">UF</label>
            <select
              className="uze-input text-xs"
              value={state}
              onChange={e => setState(e.target.value)}
            >
              {['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'DF', 'BA', 'PE', 'CE', 'GO'].map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#D0D5DD]">
          <button type="button" onClick={onClose} className="uze-btn uze-btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="uze-btn uze-btn-primary">
            Salvar Cliente
          </button>
        </div>
      </form>
    </Modal>
  );
};
