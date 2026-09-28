import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import type { Sale, SaleItem, PaymentMethod, SaleStatus, DiscountType } from '../../types';
import { Plus, Trash2, ShoppingCart, UserPlus, CheckCircle2, Package, Sparkles, UserCheck, Tag, Gift, Calendar } from 'lucide-react';

interface NovaVendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleToEdit?: Sale | null;
}

export const NovaVendaModal: React.FC<NovaVendaModalProps> = ({ isOpen, onClose, saleToEdit }) => {
  const { customers, models, variants, employees, addSale, updateSale, addCustomer } = useERP();
  const { user: currentUser } = useAuth();

  // Active customers (hide archived unless editing an older sale for that customer)
  const activeCustomers = customers.filter(
    c => c.status !== 'Arquivado' || (saleToEdit && c.id === saleToEdit.customerId)
  );

  // Active sellers list
  const activeSellers = employees.filter(
    e => (e.isSeller && e.status === 'Ativo') || (saleToEdit && e.id === saleToEdit.sellerId)
  );

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCity, setNewCustCity] = useState('');

  // Sale Date State (Commercial / Retroactive)
  const [saleDate, setSaleDate] = useState<string>('');

  // Seller State
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');

  // Referral State
  const [hasReferral, setHasReferral] = useState(false);
  const [referralName, setReferralName] = useState('');
  const [referralNote, setReferralNote] = useState('');

  // Cart Items State
  const [cartItems, setCartItems] = useState<Omit<SaleItem, 'id'>[]>([]);

  // Tab: 'catalogo' vs 'avulso'
  const [itemMode, setItemMode] = useState<'catalogo' | 'avulso'>('catalogo');

  // Catalog Item Selector State
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);

  // Custom Item (Item Avulso) State
  const [customDesc, setCustomDesc] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [customQty, setCustomQty] = useState<number>(1);
  const [customNotes, setCustomNotes] = useState('');

  // Financial adjusters
  const [discountType, setDiscountType] = useState<DiscountType>('FIXED');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountNote, setDiscountNote] = useState('');
  const [shipping, setShipping] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [saleStatus, setSaleStatus] = useState<SaleStatus>('Concluído');

  // Helper to find matching seller for logged in user
  const findLinkedSellerId = (): string => {
    if (!currentUser) return activeSellers[0]?.id || '';
    // Look for employee directly matching user ID or matching name/email
    const matchedEmployee = employees.find(
      e => e.isSeller && (
        (e.userId && e.userId === currentUser.id) ||
        (e.email && currentUser.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (e.name.toLowerCase() === currentUser.name.toLowerCase())
      )
    );
    if (matchedEmployee) return matchedEmployee.id;
    return activeSellers[0]?.id || '';
  };

  // Helper to get formatted date string for input type="date"
  const getTodayInputDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseExistingDateToInput = (dateStr?: string) => {
    if (!dateStr) return getTodayInputDate();
    if (dateStr.includes('-')) {
      return dateStr.split(' ')[0].slice(0, 10);
    }
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return getTodayInputDate();
  };

  // Populate form on edit or reset on create
  useEffect(() => {
    if (isOpen) {
      if (saleToEdit) {
        setSelectedCustomerId(saleToEdit.customerId);
        setSelectedSellerId(saleToEdit.sellerId || '');
        setSaleDate(parseExistingDateToInput(saleToEdit.date || saleToEdit.saleDate));
        setCartItems(saleToEdit.items.map(it => ({ ...it })));
        setDiscountType(saleToEdit.discountType || 'FIXED');
        setDiscountValue(saleToEdit.discountValue ?? (saleToEdit.discount || 0));
        setDiscountNote(saleToEdit.discountNote || '');
        setHasReferral(Boolean(saleToEdit.hasReferral || saleToEdit.referralName));
        setReferralName(saleToEdit.referralName || '');
        setReferralNote(saleToEdit.referralNote || '');
        setShipping(saleToEdit.shipping || 0);
        setPaymentMethod(saleToEdit.paymentMethod);
        setSaleStatus(saleToEdit.status);
      } else {
        setSelectedCustomerId(activeCustomers[0]?.id || '');
        setSelectedSellerId(findLinkedSellerId());
        setSaleDate(getTodayInputDate());
        setCartItems([]);
        setDiscountType('FIXED');
        setDiscountValue(0);
        setDiscountNote('');
        setHasReferral(false);
        setReferralName('');
        setReferralNote('');
        setShipping(0);
        setPaymentMethod('PIX');
        setSaleStatus('Concluído');
      }
      setSelectedModelId(models[0]?.id || '');
      setSelectedVariantId('');
      setItemQty(1);
      setCustomDesc('');
      setCustomPrice(0);
      setCustomQty(1);
      setCustomNotes('');
      setShowNewCustomerForm(false);
    }
  }, [isOpen, saleToEdit]);

  const availableVariants = variants.filter(v => v.modelId === selectedModelId && v.status !== 'Inativo');

  const handleAddProductToCart = () => {
    if (!selectedVariantId) return;
    const variant = variants.find(v => v.id === selectedVariantId);
    const model = models.find(m => m.id === selectedModelId);
    if (!variant || !model) return;

    const existingIndex = cartItems.findIndex(i => i.variantId === variant.id);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += itemQty;
      updated[existingIndex].subtotal = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCartItems(updated);
    } else {
      setCartItems(prev => [
        ...prev,
        {
          variantId: variant.id,
          modelId: model.id,
          productName: model.name,
          colorName: variant.colorName,
          size: variant.size,
          sku: variant.sku,
          unitPrice: model.basePrice,
          unitCost: model.baseCost,
          quantity: itemQty,
          subtotal: model.basePrice * itemQty,
          isCustom: false,
        }
      ]);
    }

    setItemQty(1);
  };

  const handleAddCustomItem = () => {
    if (!customDesc.trim() || customPrice < 0 || customQty <= 0) return;

    setCartItems(prev => [
      ...prev,
      {
        productName: customDesc.trim(),
        colorName: 'Avulso',
        size: 'Único',
        sku: 'AVULSO',
        unitPrice: customPrice,
        unitCost: 0,
        quantity: customQty,
        subtotal: customPrice * customQty,
        isCustom: true,
        customDescription: customDesc.trim(),
        notes: customNotes.trim() || undefined,
      }
    ]);

    setCustomDesc('');
    setCustomPrice(0);
    setCustomQty(1);
    setCustomNotes('');
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateCustomer = () => {
    if (!newCustName.trim()) return;
    const created = addCustomer({
      name: newCustName.trim(),
      email: newCustEmail.trim() || undefined,
      phone: newCustPhone.trim() || undefined,
      city: newCustCity.trim() || undefined,
      state: 'SP',
    });
    setSelectedCustomerId(created.id);
    setShowNewCustomerForm(false);
    setNewCustName('');
    setNewCustEmail('');
    setNewCustPhone('');
    setNewCustCity('');
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, i) => acc + i.subtotal, 0);
  const totalCost = cartItems.reduce((acc, i) => acc + ((i.unitCost || 0) * i.quantity), 0);
  
  // Calculate discount amount based on type
  const safeDiscountValue = Math.max(0, discountValue || 0);
  let calculatedDiscountAmount = 0;
  if (discountType === 'PERCENTAGE') {
    const safePercent = Math.min(100, safeDiscountValue);
    calculatedDiscountAmount = (subtotal * safePercent) / 100;
  } else {
    calculatedDiscountAmount = Math.min(subtotal, safeDiscountValue);
  }

  const safeShipping = Math.max(0, shipping || 0);
  const total = Math.max(0, subtotal - calculatedDiscountAmount + safeShipping);
  const estimatedProfit = total - totalCost;

  const handleFinalizeSale = () => {
    if (!selectedCustomerId || cartItems.length === 0) return;

    const customer = customers.find(c => c.id === selectedCustomerId);
    const seller = employees.find(e => e.id === selectedSellerId);

    // Format commercial sale date (YYYY-MM-DD HH:mm or selected date + current time)
    const timePortion = new Date().toLocaleTimeString('pt-BR').slice(0, 5);
    const formattedCommercialDate = saleDate
      ? `${saleDate} ${timePortion}`
      : new Date().toISOString().replace('T', ' ').slice(0, 16);

    const salePayload = {
      customerId: selectedCustomerId,
      customerName: customer?.name || 'Cliente Geral',
      customerEmail: customer?.email || undefined,
      sellerId: selectedSellerId || undefined,
      sellerName: seller?.name || undefined,
      date: formattedCommercialDate,
      saleDate: saleDate || getTodayInputDate(),
      occurredAt: saleDate ? new Date(`${saleDate}T12:00:00Z`).toISOString() : new Date().toISOString(),
      items: cartItems.map((item, idx) => ({ ...item, id: `sli-${Date.now()}-${idx}` })),
      subtotal,
      discount: calculatedDiscountAmount,
      discountType,
      discountValue: safeDiscountValue,
      discountAmount: calculatedDiscountAmount,
      discountNote: discountNote.trim() || undefined,
      hasReferral,
      referralName: hasReferral && referralName.trim() ? referralName.trim() : undefined,
      referralNote: hasReferral && referralNote.trim() ? referralNote.trim() : undefined,
      shipping: safeShipping,
      total,
      totalCost,
      estimatedProfit,
      paymentMethod,
      status: saleStatus,
    };

    if (saleToEdit) {
      updateSale({
        ...saleToEdit,
        ...salePayload,
      });
    } else {
      addSale(salePayload);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={saleToEdit ? `Editar Venda #${saleToEdit.id}` : 'Registrar Nova Venda'}
      subtitle={
        saleToEdit
          ? 'Atualização comercial com recálculo automático de estoque e financeiro'
          : 'Checkout comercial com baixa automática no estoque'
      }
      maxWidth="4xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Form: 8 cols */}
        <div className="lg:col-span-8 space-y-4">
          {/* 1. Data, Vendedor & Cliente */}
          <div className="p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD] space-y-3">
            {/* Linha com Data Comercial e Vendedor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Data da Venda */}
              <div>
                <label className="text-xs font-semibold uppercase text-[#101828] flex items-center gap-1.5 mb-1.5">
                  <Calendar size={14} className="text-[#173E75]" />
                  Data da Venda (Comercial)
                </label>
                <input
                  type="date"
                  className="uze-input text-xs bg-white font-medium cursor-pointer"
                  value={saleDate}
                  onChange={e => setSaleDate(e.target.value)}
                />
                <span className="text-[10px] text-[#475467] block mt-0.5">
                  * Pode ser retroativa para registrar pedidos anteriores
                </span>
              </div>

              {/* Vendedor Responsável */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase text-[#101828] flex items-center gap-1.5">
                    <UserCheck size={14} className="text-[#173E75]" />
                    Vendedor Responsável
                  </label>
                  <span className="text-[10px] text-[#475467]">
                    {activeSellers.length} disponíveis
                  </span>
                </div>
                <select
                  className="uze-input text-xs cursor-pointer bg-white"
                  value={selectedSellerId}
                  onChange={e => setSelectedSellerId(e.target.value)}
                >
                  <option value="">Selecione o vendedor...</option>
                  {activeSellers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.jobTitle || 'Vendas'}) {s.status === 'Inativo' ? '[Inativo]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cliente */}
            <div className="pt-2 border-t border-[#EAECF0]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase text-[#101828]">Cliente</label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                  className="text-xs text-[#173E75] font-semibold hover:underline flex items-center gap-1"
                >
                  <UserPlus size={13} /> {showNewCustomerForm ? 'Selecionar da Lista' : '+ Novo Cliente'}
                </button>
              </div>

              {showNewCustomerForm ? (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nome do cliente *"
                      className="uze-input text-xs"
                      value={newCustName}
                      onChange={e => setNewCustName(e.target.value)}
                    />
                    <input
                      type="email"
                      placeholder="E-mail (opcional)"
                      className="uze-input text-xs"
                      value={newCustEmail}
                      onChange={e => setNewCustEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Telefone / WhatsApp (opcional)"
                      className="uze-input text-xs"
                      value={newCustPhone}
                      onChange={e => setNewCustPhone(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Cidade (opcional)"
                      className="uze-input text-xs"
                      value={newCustCity}
                      onChange={e => setNewCustCity(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateCustomer}
                    className="uze-btn-secondary text-xs w-full justify-center"
                  >
                    Cadastrar e Selecionar
                  </button>
                </div>
              ) : (
                <select
                  className="uze-input text-xs cursor-pointer bg-white"
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                >
                  {activeCustomers.length === 0 && (
                    <option value="">Nenhum cliente disponível (cadastre acima)</option>
                  )}
                  {activeCustomers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.city ? `— ${c.city}` : ''} {c.phone ? `(${c.phone})` : ''} {c.status === 'Arquivado' ? '[Arquivado]' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 2. Selecionar Produto & Variante OU Item Avulso */}
          <div className="p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase text-[#101828]">2. Adicionar Itens</label>
              
              {/* Mode Switcher Tabs */}
              <div className="flex items-center gap-1 bg-[#EAECF0] p-0.5 rounded-md text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setItemMode('catalogo')}
                  className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
                    itemMode === 'catalogo'
                      ? 'bg-white text-[#173E75] shadow-xs font-bold'
                      : 'text-[#475467] hover:text-[#101828]'
                  }`}
                >
                  <Package size={12} /> Catálogo
                </button>
                <button
                  type="button"
                  onClick={() => setItemMode('avulso')}
                  className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
                    itemMode === 'avulso'
                      ? 'bg-white text-[#173E75] shadow-xs font-bold'
                      : 'text-[#475467] hover:text-[#101828]'
                  }`}
                >
                  <Sparkles size={12} className="text-[#C69A43]" /> Item Avulso
                </button>
              </div>
            </div>

            {/* Mode 1: Catálogo */}
            {itemMode === 'catalogo' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <div>
                  <span className="text-[10px] font-semibold text-[#475467] uppercase block mb-1">Modelo</span>
                  <select
                    className="uze-input text-xs cursor-pointer bg-white"
                    value={selectedModelId}
                    onChange={e => {
                      setSelectedModelId(e.target.value);
                      setSelectedVariantId('');
                    }}
                  >
                    {models.length === 0 && (
                      <option value="">Nenhum produto no catálogo</option>
                    )}
                    {models.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} (R$ {m.basePrice.toFixed(2)}) {m.status === 'Arquivado' ? '[Arquivado]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-[#475467] uppercase block mb-1">Variante / Cor / Tam</span>
                  <select
                    className="uze-input text-xs cursor-pointer bg-white"
                    value={selectedVariantId}
                    onChange={e => setSelectedVariantId(e.target.value)}
                  >
                    {availableVariants.length === 0 ? (
                      <option value="">Nenhuma variante ativa</option>
                    ) : (
                      <option value="">Selecione a variante...</option>
                    )}
                    {availableVariants.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.colorName} - {v.size} ({v.currentStock > 0 ? `${v.currentStock} un em estoque` : 'Sem estoque'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-[#475467] uppercase block mb-1">Quantidade</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      className="uze-input text-xs w-16 text-center font-bold bg-white"
                      value={itemQty}
                      onChange={e => setItemQty(parseInt(e.target.value) || 1)}
                    />
                    <button
                      type="button"
                      disabled={!selectedVariantId}
                      onClick={handleAddProductToCart}
                      className="uze-btn-primary text-xs flex-1 justify-center disabled:bg-[#EAECF0] disabled:text-[#98A2B3] disabled:border-[#D0D5DD] disabled:cursor-not-allowed"
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode 2: Item Avulso */
              <div className="bg-white border border-[#D0D5DD] rounded-md p-3 mb-3 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#173E75]">
                  <Sparkles size={14} className="text-[#C69A43]" />
                  <span>Item Não Cadastrado no Catálogo (Ajuste, Personalização, Bordado, etc.)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <label className="text-[10px] font-semibold text-[#475467] block mb-1">Descrição do Item *</label>
                    <input
                      type="text"
                      placeholder="Ex: Bordado nome personalizado, Ajuste bainha..."
                      className="uze-input text-xs"
                      value={customDesc}
                      onChange={e => setCustomDesc(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-semibold text-[#475467] block mb-1">Preço Unit. (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="uze-input text-xs font-bold"
                      value={customPrice}
                      onChange={e => setCustomPrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-semibold text-[#475467] block mb-1">Quantidade *</label>
                    <input
                      type="number"
                      min="1"
                      className="uze-input text-xs font-bold text-center"
                      value={customQty}
                      onChange={e => setCustomQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Observações do item avulso (opcional)"
                    className="uze-input text-xs flex-1"
                    value={customNotes}
                    onChange={e => setCustomNotes(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!customDesc.trim() || customPrice < 0 || customQty <= 0}
                    onClick={handleAddCustomItem}
                    className="uze-btn-primary text-xs shrink-0 disabled:bg-[#EAECF0] disabled:text-[#98A2B3] disabled:border-[#D0D5DD] disabled:cursor-not-allowed"
                  >
                    <Plus size={14} /> Adicionar Avulso
                  </button>
                </div>
                <p className="text-[10px] text-[#475467] italic">
                  * Itens avulsos entram no faturamento da venda, mas não alteram nem movimentam estoque.
                </p>
              </div>
            )}

            {/* Carrinho Tabela */}
            <div className="border border-[#D0D5DD] rounded-md bg-white overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F9FAFB] text-[#475467] uppercase text-[10px] font-bold border-b border-[#D0D5DD]">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2">Tipo / SKU</th>
                    <th className="p-2 text-right">Preço</th>
                    <th className="p-2 text-center">Qtd</th>
                    <th className="p-2 text-right">Subtotal</th>
                    <th className="p-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F7]">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-[#475467]">
                        Nenhum item adicionado ao pedido.
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, index) => (
                      <tr key={index}>
                        <td className="p-2 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span>{item.productName}</span>
                            {item.isCustom ? (
                              <span className="uze-badge uze-badge-gold text-[9px] py-0 px-1 font-bold">
                                Item Avulso
                              </span>
                            ) : (
                              <span className="text-[#475467] text-[11px]">
                                ({item.colorName} - {item.size})
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-[10px] text-[#475467] italic mt-0.5">{item.notes}</p>
                          )}
                        </td>
                        <td className="p-2 font-mono text-[10px] text-[#475467]">
                          {item.isCustom ? 'AVULSO' : item.sku}
                        </td>
                        <td className="p-2 text-right">R$ {item.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-center font-bold">{item.quantity}</td>
                        <td className="p-2 text-right font-bold text-[#101828]">R$ {item.subtotal.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(index)}
                            className="text-[#B42318] hover:text-[#912018] p-1 rounded hover:bg-[#FEF3F2]"
                            title="Remover item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Indicação da Venda (Opcional) */}
          <div className="p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-[#101828] flex items-center gap-1.5">
                <Gift size={14} className="text-[#C69A43]" />
                Indicação
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasReferral}
                  onChange={e => setHasReferral(e.target.checked)}
                  className="rounded border-[#D0D5DD] text-[#173E75] focus:ring-[#173E75]"
                />
                <span className="text-xs font-semibold text-[#344054]">
                  Venda originada por indicação
                </span>
              </label>
            </div>

            {hasReferral && (
              <div className="mt-3 pt-3 border-t border-[#EAECF0] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold text-[#475467] block mb-1">
                    Indicado por * (Nome livre)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Dra. Ana Beatriz, Dr. Carlos, Cliente Maria..."
                    className="uze-input text-xs bg-white"
                    value={referralName}
                    onChange={e => setReferralName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#475467] block mb-1">
                    Observação / Clínica / Parceria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Paciente da Clínica X, Parceria Hospital Y..."
                    className="uze-input text-xs bg-white"
                    value={referralNote}
                    onChange={e => setReferralNote(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Pagamento e Status */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD]">
            <div>
              <label className="text-[10px] font-semibold text-[#475467] uppercase block mb-1">Forma de Pagamento</label>
              <select
                className="uze-input text-xs cursor-pointer bg-white"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="PIX">PIX</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Boleto">Boleto</option>
                <option value="Transferência">Transferência Bancária</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#475467] uppercase block mb-1">Status da Venda</label>
              <select
                className="uze-input text-xs cursor-pointer bg-white"
                value={saleStatus}
                onChange={e => setSaleStatus(e.target.value as SaleStatus)}
              >
                <option value="Concluído">Concluído (Baixa Automática no Estoque)</option>
                <option value="Pago">Pago</option>
                <option value="Em produção">Em produção</option>
                <option value="Pendente">Pendente</option>
                <option value="Orçamento">Orçamento</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Summary: 4 cols */}
        <div className="lg:col-span-4 bg-[#07101F] text-white p-5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShoppingCart size={17} className="text-[#C69A43]" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-white">Resumo da Venda</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal ({cartItems.reduce((sum, i) => sum + i.quantity, 0)} itens):</span>
                <span className="font-semibold text-white">R$ {subtotal.toFixed(2)}</span>
              </div>

              {/* Discount Section */}
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Tag size={12} className="text-[#C69A43]" /> Desconto
                  </label>
                  {/* Toggle Fixed vs Percentage */}
                  <div className="flex items-center bg-slate-800 rounded p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDiscountType('FIXED')}
                      className={`px-2 py-0.5 rounded transition-all font-semibold ${
                        discountType === 'FIXED'
                          ? 'bg-[#C69A43] text-[#07101F] font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      R$ Fixo
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('PERCENTAGE')}
                      className={`px-2 py-0.5 rounded transition-all font-semibold ${
                        discountType === 'PERCENTAGE'
                          ? 'bg-[#C69A43] text-[#07101F] font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      % Porc.
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">
                      {discountType === 'FIXED' ? 'R$' : '%'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'PERCENTAGE' ? 100 : subtotal}
                      step={discountType === 'PERCENTAGE' ? '1' : '0.01'}
                      className="w-full h-8 bg-slate-950 border border-slate-700 rounded pl-8 pr-2 text-xs text-white outline-none focus:border-[#C69A43] font-bold"
                      value={discountValue || ''}
                      placeholder="0"
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setDiscountValue(val);
                      }}
                    />
                  </div>
                  {discountType === 'PERCENTAGE' && calculatedDiscountAmount > 0 && (
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold whitespace-nowrap">
                      - R$ {calculatedDiscountAmount.toFixed(2)}
                    </span>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Motivo / negociação do desconto (opcional)"
                    className="w-full h-7 bg-slate-950 border border-slate-700 rounded px-2 text-[11px] text-slate-300 outline-none focus:border-[#C69A43]"
                    value={discountNote}
                    onChange={e => setDiscountNote(e.target.value)}
                  />
                </div>
              </div>

              {/* Shipping */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Frete (R$):</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full h-8 bg-slate-900 border border-slate-700 rounded px-2.5 text-xs text-white outline-none focus:border-[#C69A43]"
                  value={shipping || ''}
                  placeholder="0.00"
                  onChange={e => setShipping(parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Total Final */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span>TOTAL:</span>
                  <span className="text-[#C69A43] font-mono text-base font-extrabold">
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Profit summary */}
              <div className="p-2.5 bg-slate-900/90 rounded border border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Custo Peças:</span>
                  <span>R$ {totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-400">
                  <span>Lucro Estimado:</span>
                  <span>R$ {estimatedProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={handleFinalizeSale}
              disabled={cartItems.length === 0}
              className="w-full uze-btn-primary py-2.5 text-xs font-bold justify-center disabled:bg-slate-800 disabled:text-slate-400 disabled:border-slate-700 disabled:cursor-not-allowed shadow-md"
            >
              <CheckCircle2 size={15} /> {saleToEdit ? 'Salvar Alterações da Venda' : 'Finalizar Venda'}
            </button>
            <button
              onClick={onClose}
              className="w-full text-center text-xs font-semibold text-slate-300 hover:text-white py-1.5 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
