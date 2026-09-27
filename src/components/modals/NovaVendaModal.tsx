import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Modal } from '../common/Modal';
import type { Sale, SaleItem, PaymentMethod, SaleStatus } from '../../types';
import { Plus, Trash2, ShoppingCart, UserPlus, CheckCircle2, Package, Sparkles } from 'lucide-react';

interface NovaVendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleToEdit?: Sale | null;
}

export const NovaVendaModal: React.FC<NovaVendaModalProps> = ({ isOpen, onClose, saleToEdit }) => {
  const { customers, models, variants, addSale, updateSale, addCustomer } = useERP();

  // Active customers (hide archived unless editing an older sale for that customer)
  const activeCustomers = customers.filter(
    c => c.status !== 'Arquivado' || (saleToEdit && c.id === saleToEdit.customerId)
  );

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCity, setNewCustCity] = useState('');

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
  const [discount, setDiscount] = useState<number>(0);
  const [shipping, setShipping] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [saleStatus, setSaleStatus] = useState<SaleStatus>('Concluído');

  // Populate form on edit or reset on create
  useEffect(() => {
    if (isOpen) {
      if (saleToEdit) {
        setSelectedCustomerId(saleToEdit.customerId);
        setCartItems(saleToEdit.items.map(it => ({ ...it })));
        setDiscount(saleToEdit.discount || 0);
        setShipping(saleToEdit.shipping || 0);
        setPaymentMethod(saleToEdit.paymentMethod);
        setSaleStatus(saleToEdit.status);
      } else {
        setSelectedCustomerId(activeCustomers[0]?.id || '');
        setCartItems([]);
        setDiscount(0);
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

  const subtotal = cartItems.reduce((acc, i) => acc + i.subtotal, 0);
  const totalCost = cartItems.reduce((acc, i) => acc + ((i.unitCost || 0) * i.quantity), 0);
  const total = Math.max(0, subtotal - discount + shipping);
  const estimatedProfit = total - totalCost;

  const handleFinalizeSale = () => {
    if (!selectedCustomerId || cartItems.length === 0) return;

    const customer = customers.find(c => c.id === selectedCustomerId);

    const salePayload = {
      customerId: selectedCustomerId,
      customerName: customer?.name || 'Cliente Geral',
      customerEmail: customer?.email || undefined,
      items: cartItems.map((item, idx) => ({ ...item, id: `sli-${Date.now()}-${idx}` })),
      subtotal,
      discount,
      shipping,
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
          {/* 1. Cliente */}
          <div className="p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase text-[#101828]">1. Cliente</label>
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
                className="uze-input text-xs cursor-pointer"
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
                      ? 'bg-white text-[#173E75] shadow-xs'
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
                      ? 'bg-white text-[#173E75] shadow-xs'
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
                    className="uze-input text-xs cursor-pointer"
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
                    className="uze-input text-xs cursor-pointer"
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
                      className="uze-input text-xs w-16 text-center font-bold"
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

          {/* 3. Pagamento e Status */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD]">
            <div>
              <label className="text-[10px] font-semibold text-[#475467] uppercase block mb-1">Forma de Pagamento</label>
              <select
                className="uze-input text-xs cursor-pointer"
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
                className="uze-input text-xs cursor-pointer"
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

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal ({cartItems.reduce((sum, i) => sum + i.quantity, 0)} itens):</span>
                <span className="font-semibold text-white">R$ {subtotal.toFixed(2)}</span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Desconto (R$):</label>
                <input
                  type="number"
                  min="0"
                  className="w-full h-7 bg-slate-900 border border-slate-700 rounded px-2 text-xs text-white outline-none focus:border-[#C69A43]"
                  value={discount}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Frete (R$):</label>
                <input
                  type="number"
                  min="0"
                  className="w-full h-7 bg-slate-900 border border-slate-700 rounded px-2 text-xs text-white outline-none focus:border-[#C69A43]"
                  value={shipping}
                  onChange={e => setShipping(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span>TOTAL:</span>
                  <span className="text-[#C69A43] font-mono text-base font-extrabold">
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>

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
