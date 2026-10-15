import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';
import type { Column } from '../components/common/DataTable';
import { DataTable } from '../components/common/DataTable';
import type { Customer, Installment, PaymentMethod, PaymentRecord } from '../types';
import { 
  UserPlus, 
  Eye, 
  ShoppingBag, 
  Edit2, 
  Archive, 
  Trash2, 
  RotateCcw, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Users
} from 'lucide-react';
import { NovoClienteModal } from '../components/modals/NovoClienteModal';
import { Modal } from '../components/common/Modal';
import { ExportMenu } from '../components/common/ExportMenu';
import { exportReportToPdf } from '../services/pdfExportService';
import { excelService } from '../services/excelService';
import { generateSaleReceiptPdf } from '../services/comprovanteVendaPdfService';

export const ClientesPage: React.FC = () => {
  const { 
    customers, 
    sales, 
    installments,
    payments,
    registerPayment,
    undoPayment,
    updatePayment,
    updateInstallmentDueDate,
    archiveCustomer, 
    reactivateCustomer, 
    deleteCustomer 
  } = useERP();
  const { user, hasPermission } = useAuth();

  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerModalTab, setCustomerModalTab] = useState<'perfil' | 'compras' | 'carne' | 'extrato'>('perfil');

  const [customerToArchive, setCustomerToArchive] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'Ativos' | 'Arquivados' | 'Todos'>('Ativos');
  const [debtFilter, setDebtFilter] = useState<'all' | 'open' | 'overdue'>('all');

  // Modal para registrar pagamento com rateio sequencial automático
  const [paymentSaleId, setPaymentSaleId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Modal para editar pagamento
  const [editingPaymentRecord, setEditingPaymentRecord] = useState<PaymentRecord | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState<number>(0);
  const [editPaymentDate, setEditPaymentDate] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('PIX');
  const [editPaymentNotes, setEditPaymentNotes] = useState<string>('');
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null);

  // Modal para alterar vencimento
  const [editingDueDateInstallment, setEditingDueDateInstallment] = useState<Installment | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>('');

  // Helper de métricas financeiras por cliente (Fonte Única da Verdade)
  const getCustomerFinancials = (custId: string) => {
    const custSales = sales.filter(s => s.customerId === custId && s.status !== 'Cancelado');
    const custInstallments = installments.filter(i => i.customerId === custId && i.status !== 'Cancelado');

    const totalComprado = custSales.reduce((acc, s) => acc + s.total, 0);
    
    // Total pago rigorosamente derivado dos pagamentos reais
    const totalPago = custSales.reduce((acc, s) => {
      if (s.paymentMethod === 'PIX Parcelado') {
        const salePays = payments.filter(p => p.saleId === s.id);
        return acc + salePays.reduce((sum, p) => sum + p.amount, 0);
      }
      return acc + s.total;
    }, 0);

    // Saldo a receber matematicamente estrito
    const totalReceber = Math.max(0, Number((totalComprado - totalPago).toFixed(2)));
    
    const openInstallments = custInstallments.filter(i => (i.remainingAmount ?? (i.amount - (i.paidAmount || 0))) > 0.001);
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueInstallments = openInstallments.filter(i => i.dueDate < todayStr);

    return {
      totalComprado,
      totalPago,
      totalReceber,
      openCount: openInstallments.length,
      overdueCount: overdueInstallments.length,
      installments: custInstallments,
      sales: custSales,
    };
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (statusFilter === 'Ativos' && (c.status === 'Arquivado' || c.status === 'Inativo')) return false;
      if (statusFilter === 'Arquivados' && (c.status !== 'Arquivado' && c.status !== 'Inativo')) return false;

      if (debtFilter !== 'all') {
        const fin = getCustomerFinancials(c.id);
        if (debtFilter === 'open' && fin.totalReceber <= 0) return false;
        if (debtFilter === 'overdue' && fin.overdueCount <= 0) return false;
      }

      return true;
    });
  }, [customers, statusFilter, debtFilter, sales, installments]);

  const columns: Column<Customer>[] = [
    {
      header: 'Cliente',
      accessorKey: 'name',
      sortable: true,
      cell: (c) => {
        const fin = getCustomerFinancials(c.id);
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#101828]">{c.name}</p>
              {fin.overdueCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                  {fin.overdueCount} atrasada{fin.overdueCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#475467] font-medium">{c.document || 'Sem documento'}</span>
          </div>
        );
      },
    },
    {
      header: 'Contato',
      accessorKey: 'email',
      sortable: true,
      cell: (c) => (
        <div>
          <p className="text-xs text-[#101828] font-medium">{c.email || '-'}</p>
          <span className="text-[10px] font-mono text-[#475467]">{c.phone || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Cidade / UF',
      accessorKey: 'city',
      sortable: true,
      cell: (c) => <span className="text-xs text-[#101828] font-medium">{c.city || '-'}/{c.state || '-'}</span>,
    },
    {
      header: 'Total Comprado',
      accessorKey: 'totalSpent',
      sortable: true,
      align: 'right',
      cell: (c) => (
        <span className="font-bold text-xs text-[#101828]">
          R$ {c.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Saldo Devedor',
      align: 'right',
      cell: (c) => {
        const fin = getCustomerFinancials(c.id);
        if (fin.totalReceber <= 0) {
          return <span className="text-emerald-700 font-semibold text-xs">Em dia</span>;
        }
        return (
          <div>
            <span className="font-bold text-xs text-rose-700">
              R$ {fin.totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="block text-[10px] text-slate-500 font-medium">
              {fin.openCount} parcela{fin.openCount > 1 ? 's' : ''}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      align: 'center',
      cell: (c) => (
        <span className={`uze-badge ${c.status === 'Arquivado' ? 'uze-badge-warning' : 'uze-badge-gold'}`}>
          {c.status}
        </span>
      ),
    },
  ];

  const handleExportPdf = async () => {
    const kpis = [
      { label: 'Clientes Listados', value: `${filteredCustomers.length}` },
      { 
        label: 'Total a Receber', 
        value: `R$ ${filteredCustomers.reduce((acc, c) => acc + getCustomerFinancials(c.id).totalReceber, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
      },
    ];

    const pdfColumns = [
      { header: 'Cliente', dataKey: 'name' },
      { header: 'Documento', dataKey: 'document', width: 25 },
      { header: 'Contato', dataKey: 'contact', width: 35 },
      { header: 'Total Comprado (R$)', dataKey: 'spentStr', align: 'right' as const, width: 28 },
      { header: 'A Receber (R$)', dataKey: 'dueStr', align: 'right' as const, width: 28 },
      { header: 'Status', dataKey: 'status', align: 'center' as const, width: 20 },
    ];

    const rows = filteredCustomers.map(c => {
      const fin = getCustomerFinancials(c.id);
      return {
        name: c.name,
        document: c.document || '-',
        contact: `${c.phone || ''} ${c.email || ''}`.trim() || '-',
        spentStr: c.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        dueStr: fin.totalReceber > 0 ? fin.totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00',
        status: c.status,
      };
    });

    await exportReportToPdf({
      title: 'Relatório Oficial de Clientes & Contas Correntes',
      operatorName: user?.name,
      orientation: 'landscape',
      filename: `uze-doctor-clientes-${new Date().toISOString().slice(0, 10)}.pdf`,
      kpis,
      columns: pdfColumns,
      rows,
    });
  };

  const handleExportExcel = async () => {
    const columns = [
      { header: 'Nome', dataKey: 'Nome' },
      { header: 'Documento', dataKey: 'Documento' },
      { header: 'E-mail', dataKey: 'Email' },
      { header: 'Telefone', dataKey: 'Telefone' },
      { header: 'Cidade', dataKey: 'Cidade' },
      { header: 'Total Comprado (R$)', dataKey: 'TotalComprado' },
      { header: 'A Receber (R$)', dataKey: 'AReceber' },
      { header: 'Status', dataKey: 'Status' },
    ];

    const data = filteredCustomers.map(c => {
      const fin = getCustomerFinancials(c.id);
      return {
        'Nome': c.name,
        'Documento': c.document || '-',
        'Email': c.email || '-',
        'Telefone': c.phone || '-',
        'Cidade': `${c.city || ''}/${c.state || ''}`,
        'TotalComprado': c.totalSpent,
        'AReceber': fin.totalReceber,
        'Status': c.status,
      };
    });

    excelService.exportToExcel({
      filename: `uze-doctor-clientes-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Clientes',
      data,
      columns,
    });
  };

  const selectedFin = selectedCustomer ? getCustomerFinancials(selectedCustomer.id) : null;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#101828] tracking-tight">Clientes</h2>
          <p className="text-xs text-[#475467] font-medium">
            Fichas cadastrais, controle de carnê, parcelas a receber e histórico de compras.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
          {hasPermission('customers.create') && (
            <button
              onClick={() => {
                setCustomerToEdit(null);
                setIsNovoClienteOpen(true);
              }}
              className="uze-btn-primary text-xs shadow-xs"
            >
              <UserPlus size={14} /> Novo Cliente
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Status Tab */}
          <div className="flex bg-[#F2F4F7] p-0.5 rounded-lg border border-[#D0D5DD]">
            {(['Ativos', 'Arquivados', 'Todos'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-white text-[#173E75] shadow-xs' : 'text-[#475467]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Débito filter */}
          <div className="flex bg-[#F2F4F7] p-0.5 rounded-lg border border-[#D0D5DD]">
            <button
              onClick={() => setDebtFilter('all')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                debtFilter === 'all' ? 'bg-white text-[#173E75] shadow-xs' : 'text-[#475467]'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setDebtFilter('open')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                debtFilter === 'open' ? 'bg-white text-[#173E75] shadow-xs' : 'text-[#475467]'
              }`}
            >
              Com Saldo em Aberto
            </button>
            <button
              onClick={() => setDebtFilter('overdue')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                debtFilter === 'overdue' ? 'bg-white text-rose-700 shadow-xs' : 'text-[#475467]'
              }`}
            >
              Parcelas Atrasadas
            </button>
          </div>
        </div>
      </div>

      {/* Table or Empty State */}
      {customers.length === 0 ? (
        <div className="bg-white border border-[#D0D5DD] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#EFF4FF] border border-[#D0D5DD] flex items-center justify-center text-[#173E75]">
            <Users size={28} />
          </div>
          <h3 className="text-base font-bold text-[#101828]">Nenhum cliente cadastrado</h3>
          <p className="text-xs text-[#475467] font-medium max-w-md leading-relaxed">
            Cadastre o primeiro cliente da UZE DOCTOR para iniciar o registro de vendas, carnês e histórico de relacionamento comercial.
          </p>
          <button
            onClick={() => {
              setCustomerToEdit(null);
              setIsNovoClienteOpen(true);
            }}
            className="mt-2 uze-btn-primary text-xs shadow-xs"
          >
            <UserPlus size={14} />
            <span>Cadastrar primeiro cliente</span>
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredCustomers}
          searchPlaceholder="Buscar por nome, documento, e-mail, telefone..."
          searchField={(c) => `${c.name} ${c.document || ''} ${c.email || ''} ${c.phone || ''} ${c.city || ''}`}
          actions={(c) => (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSelectedCustomer(c);
                  setCustomerModalTab('perfil');
                }}
                className="p-1.5 text-[#475467] hover:text-[#173E75] hover:bg-[#F2F4F7] rounded transition-colors cursor-pointer"
                title="Abrir Ficha / Carnê"
              >
                <Eye size={14} />
              </button>
              {hasPermission('customers.edit') && (
                <button
                  onClick={() => {
                    setCustomerToEdit(c);
                    setIsNovoClienteOpen(true);
                  }}
                  className="p-1.5 text-[#475467] hover:text-[#101828] hover:bg-[#F2F4F7] rounded transition-colors cursor-pointer"
                  title="Editar Cliente"
                >
                  <Edit2 size={14} />
                </button>
              )}
              {hasPermission('customers.edit') && (
                c.status === 'Arquivado' ? (
                  <button
                    onClick={() => reactivateCustomer(c.id)}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                    title="Reativar Cliente"
                  >
                    <RotateCcw size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => setCustomerToArchive(c)}
                    className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                    title="Arquivar Cliente"
                  >
                    <Archive size={14} />
                  </button>
                )
              )}
              {hasPermission('customers.edit') && (
                <button
                  onClick={() => {
                    setDeleteErrorMessage(null);
                    setCustomerToDelete(c);
                  }}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  title="Excluir Cliente"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        />
      )}

      {/* Modal Novo / Editar Cliente */}
      <NovoClienteModal
        isOpen={isNovoClienteOpen}
        onClose={() => {
          setIsNovoClienteOpen(false);
          setCustomerToEdit(null);
        }}
        customerToEdit={customerToEdit}
      />

      {/* Modal Ficha Completa do Cliente / Carnê */}
      {selectedCustomer && selectedFin && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Cliente: ${selectedCustomer.name}`}
          subtitle={`Doc: ${selectedCustomer.document || 'Não informado'} • Cidade: ${selectedCustomer.city || '-'}/${selectedCustomer.state || '-'}`}
          maxWidth="4xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header: Resumo Financeiro da Conta Corrente */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3.5 bg-[#F9FAFB] rounded-xl border border-[#D0D5DD]">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Comprado</span>
                <span className="text-sm font-black text-[#101828]">
                  R$ {selectedFin.totalComprado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Total Pago</span>
                <span className="text-sm font-black text-emerald-700">
                  R$ {selectedFin.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-rose-700 font-bold uppercase block">Total a Receber</span>
                <span className="text-sm font-black text-rose-700">
                  R$ {selectedFin.totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Parcelas em Aberto</span>
                <span className="text-sm font-bold text-slate-800">
                  {selectedFin.openCount} parcela{selectedFin.openCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-rose-700 font-bold uppercase block">Em Atraso</span>
                <span className="text-sm font-bold text-rose-700">
                  {selectedFin.overdueCount} parcela{selectedFin.overdueCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Sub-navegação interna do Cliente */}
            <div className="flex border-b border-[#D0D5DD] gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCustomerModalTab('perfil')}
                className={`pb-2 px-2.5 font-bold transition-colors cursor-pointer border-b-2 ${
                  customerModalTab === 'perfil'
                    ? 'border-[#173E75] text-[#173E75]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Perfil & Cadastro
              </button>
              <button
                type="button"
                onClick={() => setCustomerModalTab('carne')}
                className={`pb-2 px-2.5 font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  customerModalTab === 'carne'
                    ? 'border-[#173E75] text-[#173E75]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar size={13} />
                <span>Carnê / Parcelas ({selectedFin.installments.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomerModalTab('compras')}
                className={`pb-2 px-2.5 font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  customerModalTab === 'compras'
                    ? 'border-[#173E75] text-[#173E75]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShoppingBag size={13} />
                <span>Compras ({selectedFin.sales.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomerModalTab('extrato')}
                className={`pb-2 px-2.5 font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  customerModalTab === 'extrato'
                    ? 'border-[#173E75] text-[#173E75]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText size={13} />
                <span>Extrato Cronológico</span>
              </button>
            </div>

            {/* TAB 1: PERFIL */}
            {customerModalTab === 'perfil' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Dados de Contato</span>
                  <p><strong>Nome:</strong> {selectedCustomer.name}</p>
                  <p><strong>E-mail:</strong> {selectedCustomer.email || 'Não informado'}</p>
                  <p><strong>Telefone / WhatsApp:</strong> {selectedCustomer.phone || 'Não informado'}</p>
                  <p><strong>Documento (CPF/CNPJ):</strong> {selectedCustomer.document || 'Não informado'}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Endereço & Histórico</span>
                  <p><strong>Cidade:</strong> {selectedCustomer.city || '-'}/{selectedCustomer.state || '-'}</p>
                  <p><strong>Primeira Compra:</strong> {selectedCustomer.firstPurchaseDate || 'Nenhuma'}</p>
                  <p><strong>Última Compra:</strong> {selectedCustomer.lastPurchaseDate || 'Nenhuma'}</p>
                  <p><strong>Status Cadastral:</strong> {selectedCustomer.status}</p>
                </div>
              </div>
            )}

            {/* TAB 2: CARNÊ / PARCELAS */}
            {customerModalTab === 'carne' && (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {selectedFin.installments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-lg">
                    Nenhum carnê ou parcelamento ativo para este cliente.
                  </div>
                ) : (
                  Array.from(new Set(selectedFin.installments.map(i => i.saleId))).map(saleId => {
                    const sale = sales.find(s => s.id === saleId);
                    const saleInsts = selectedFin.installments
                      .filter(i => i.saleId === saleId)
                      .sort((a, b) => a.installmentNumber - b.installmentNumber);
                    const salePayments = payments.filter(p => p.saleId === saleId);

                    const saleTotal = sale ? sale.total : saleInsts.reduce((acc, i) => acc + i.amount, 0);
                    const salePaid = salePayments.reduce((acc, p) => acc + p.amount, 0);
                    const saleRemaining = Math.max(0, Number((saleTotal - salePaid).toFixed(2)));

                    const paidCount = saleInsts.filter(i => (i.remainingAmount ?? (i.amount - (i.paidAmount || 0))) <= 0.001).length;
                    const percentInstallments = saleInsts.length > 0 ? Math.round((paidCount / saleInsts.length) * 100) : 0;
                    const percentFinancial = saleTotal > 0 ? Number(((salePaid / saleTotal) * 100).toFixed(1)) : 0;

                    return (
                      <div key={saleId} className="p-4 bg-white border border-[#D0D5DD] rounded-xl shadow-xs space-y-3.5">
                        {/* Header da Venda no Carnê */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#173E75] font-mono">
                                {sale?.saleNumber || `Venda ${saleId}`}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                • {sale?.date ? `Data: ${sale.date}` : ''}
                              </span>
                            </div>
                            <div className="text-xs text-slate-700 font-semibold mt-0.5">
                              Valor Total da Venda: R$ {saleTotal.toFixed(2)}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                generateSaleReceiptPdf({
                                  sale: sale || {
                                    id: saleId,
                                    date: new Date().toISOString().slice(0, 10),
                                    customerId: selectedCustomer.id,
                                    customerName: selectedCustomer.name,
                                    total: saleTotal,
                                    subtotal: saleTotal,
                                    discount: 0,
                                    shipping: 0,
                                    totalCost: 0,
                                    estimatedProfit: saleTotal,
                                    paymentMethod: 'PIX Parcelado',
                                    status: 'Concluído',
                                    items: [],
                                  },
                                  customer: selectedCustomer,
                                  installments: saleInsts,
                                  payments: salePayments,
                                  operatorName: user?.name,
                                });
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-[#173E75] border border-[#D0D5DD] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Gerar Comprovante de Venda em PDF (Documento Não Fiscal)"
                            >
                              <FileText size={13} className="text-[#173E75]" />
                              <span>Comprovante de Venda</span>
                            </button>

                            {saleRemaining > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentSaleId(saleId);
                                  setPaymentAmount(saleRemaining);
                                  setPaymentDate(new Date().toISOString().split('T')[0]);
                                  setPaymentMethod('PIX');
                                  setPaymentNotes('');
                                  setPaymentError(null);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <span>+ Registrar Pagamento</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Indicadores Claros e Separados */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Parcelas Quitadas</span>
                            <span className="text-xs font-bold text-slate-800">
                              {paidCount} de {saleInsts.length} quitadas ({percentInstallments}%)
                            </span>
                          </div>

                          <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200">
                            <span className="text-[10px] text-emerald-800 font-bold uppercase block">Progresso Financeiro</span>
                            <span className="text-xs font-bold text-emerald-800">
                              R$ {salePaid.toFixed(2)} de R$ {saleTotal.toFixed(2)} ({percentFinancial}%)
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progresso Financeiro */}
                        <div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, percentFinancial)}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-semibold mt-1">
                            <span className="text-emerald-700">Pago: R$ {salePaid.toFixed(2)}</span>
                            <span className="text-slate-500 font-normal">{percentFinancial}% do valor recebido</span>
                            <span className="text-rose-700 font-bold">Saldo a Receber: R$ {saleRemaining.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Grade de Parcelas */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Cronograma das Parcelas ({saleInsts.length}x)
                          </span>
                          {saleInsts.map(inst => {
                            const isPaid = (inst.remainingAmount ?? (inst.amount - (inst.paidAmount || 0))) <= 0.001;
                            const isOverdue = !isPaid && (inst.status === 'Atrasado' || inst.dueDate < new Date().toISOString().split('T')[0]);
                            const isPartial = !isPaid && (inst.paidAmount || 0) > 0;

                            return (
                              <div
                                key={inst.id}
                                className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                  isPaid 
                                    ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950' 
                                    : isOverdue 
                                    ? 'bg-rose-50/40 border-rose-200 text-rose-950' 
                                    : isPartial
                                    ? 'bg-amber-50/40 border-amber-200 text-amber-950'
                                    : 'bg-slate-50/60 border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isPaid ? (
                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                  ) : isOverdue ? (
                                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                                  ) : (
                                    <Clock size={16} className="text-slate-400 shrink-0" />
                                  )}
                                  <div>
                                    <span className="font-bold">
                                      Parcela {inst.installmentNumber}/{inst.totalInstallments}
                                    </span>
                                    <span className="font-mono ml-2 font-bold">R$ {inst.amount.toFixed(2)}</span>
                                    <span className="text-[11px] text-slate-500 ml-2">
                                      venc. {new Date(inst.dueDate).toLocaleDateString('pt-BR')}
                                    </span>
                                    {isPaid ? (
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded ml-2">
                                        Quitada
                                      </span>
                                    ) : isPartial ? (
                                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded ml-2">
                                        Parcial (Pago: R$ {inst.paidAmount.toFixed(2)} | Resta: R$ {inst.remainingAmount.toFixed(2)})
                                      </span>
                                    ) : isOverdue ? (
                                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded ml-2">
                                        Em Atraso
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded ml-2">
                                        Pendente
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                  {!isPaid && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingDueDateInstallment(inst);
                                        setNewDueDate(inst.dueDate);
                                      }}
                                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                    >
                                      Alterar Vencimento
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Histórico dos Pagamentos Efetivados desta Venda */}
                        {salePayments.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                              Pagamentos Confirmados ({salePayments.length})
                            </span>
                            <div className="space-y-1">
                              {salePayments.map(p => (
                                <div
                                  key={p.id}
                                  className="p-2 bg-slate-50 border border-slate-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                                >
                                  <div>
                                    <span className="font-bold text-emerald-700">
                                      R$ {p.amount.toFixed(2)}
                                    </span>
                                    <span className="text-slate-600 ml-2">
                                      ({p.paymentMethod} em {new Date(p.paymentDate).toLocaleDateString('pt-BR')})
                                    </span>
                                    {p.allocations && p.allocations.length > 0 && (
                                      <span className="text-slate-500 text-[10px] ml-2 block sm:inline">
                                        • Rateio: {p.allocations.map(a => `R$ ${a.amount.toFixed(2)} na Parc. ${a.installmentNumber || '?'}`).join(', ')}
                                      </span>
                                    )}
                                    {p.notes && (
                                      <span className="text-slate-400 text-[10px] block italic">
                                        Obs: {p.notes}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 self-end sm:self-auto">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPaymentRecord(p);
                                        setEditPaymentAmount(p.amount);
                                        setEditPaymentDate(p.paymentDate);
                                        setEditPaymentMethod(p.paymentMethod);
                                        setEditPaymentNotes(p.notes || '');
                                        setEditPaymentError(null);
                                      }}
                                      className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Deseja desfazer o recebimento de R$ ${p.amount.toFixed(2)}? As parcelas voltarão ao saldo anterior.`)) {
                                          undoPayment(p.id);
                                        }
                                      }}
                                      className="px-2 py-0.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                    >
                                      Desfazer
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: COMPRAS */}
            {customerModalTab === 'compras' && (
              <div className="overflow-x-auto max-h-80 border border-[#D0D5DD] rounded-lg">
                <table className="uze-table text-xs">
                  <thead>
                    <tr>
                      <th>Venda</th>
                      <th>Data</th>
                      <th>Itens</th>
                      <th className="text-right">Total</th>
                      <th>Forma</th>
                      <th>Status</th>
                      <th className="text-center">Comprovante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFin.sales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400">
                          Nenhum pedido anterior localizado.
                        </td>
                      </tr>
                    ) : (
                      selectedFin.sales.map(s => (
                        <tr key={s.id}>
                          <td className="font-mono font-bold text-[#173E75]">{s.id}</td>
                          <td className="text-slate-500">{s.date}</td>
                          <td>
                            {s.items.map(i => `${i.productName} (${i.size || 'Tam'})`).join(', ')}
                          </td>
                          <td className="text-right font-bold text-slate-800">
                            R$ {s.total.toFixed(2)}
                          </td>
                          <td>{s.paymentMethod}</td>
                          <td>
                            <span className="uze-badge uze-badge-success">{s.status}</span>
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const saleInsts = installments.filter(i => i.saleId === s.id);
                                const salePays = payments.filter(p => p.saleId === s.id);
                                generateSaleReceiptPdf({
                                  sale: s,
                                  customer: selectedCustomer,
                                  installments: saleInsts,
                                  payments: salePays,
                                  operatorName: user?.name,
                                });
                              }}
                              className="px-2 py-1 bg-white hover:bg-slate-50 text-[#173E75] border border-slate-300 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              title="Gerar Comprovante de Venda em PDF"
                            >
                              <FileText size={11} />
                              <span>PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: EXTRATO CRONOLÓGICO */}
            {customerModalTab === 'extrato' && (
              <div className="space-y-2 max-h-80 overflow-y-auto p-1">
                {(() => {
                  type TimelineEvent = {
                    date: string;
                    type: 'COMPRA' | 'PAGAMENTO';
                    desc: string;
                    amount: number;
                  };

                  const events: TimelineEvent[] = [];

                  selectedFin.sales.forEach(s => {
                    events.push({
                      date: s.date || '2026-01-01',
                      type: 'COMPRA',
                      desc: `Compra ${s.saleNumber || s.id} (${s.items.length} itens)`,
                      amount: s.total,
                    });
                  });

                  // Incluir pagamentos registrados
                  payments
                    .filter(p => p.customerId === selectedCustomer.id)
                    .forEach(p => {
                      events.push({
                        date: p.paymentDate,
                        type: 'PAGAMENTO',
                        desc: `Recebimento ${p.paymentMethod} (Ref. Venda ${p.saleId})`,
                        amount: p.amount,
                      });
                    });

                  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                  let runningBalance = 0;

                  return (
                    <div className="space-y-2">
                      {events.length === 0 ? (
                        <p className="text-center text-slate-400 py-6">Nenhum evento financeiro localizado.</p>
                      ) : (
                        events.map((ev, idx) => {
                          if (ev.type === 'COMPRA') runningBalance += ev.amount;
                          else runningBalance -= ev.amount;

                          return (
                            <div
                              key={idx}
                              className="p-2.5 bg-white border border-[#D0D5DD] rounded-lg flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                {ev.type === 'COMPRA' ? (
                                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                                    <ArrowUpRight size={14} />
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                                    <ArrowDownLeft size={14} />
                                  </div>
                                )}
                                <div>
                                  <span className="font-bold text-slate-800">{ev.desc}</span>
                                  <span className="text-[10px] text-slate-400 block">{ev.date}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className={`font-mono font-bold ${ev.type === 'COMPRA' ? 'text-slate-800' : 'text-emerald-700'}`}>
                                  {ev.type === 'COMPRA' ? '+' : '-'} R$ {ev.amount.toFixed(2)}
                                </span>
                                <span className="block text-[10px] text-slate-500 font-mono">
                                  Saldo: R$ {Math.max(0, runningBalance).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Registrar Pagamento com Rateio Automático Sequencial */}
      {paymentSaleId && (() => {
        const targetSale = sales.find(s => s.id === paymentSaleId);
        const salePayments = payments.filter(p => p.saleId === paymentSaleId);
        const saleInsts = installments.filter(i => i.saleId === paymentSaleId && i.status !== 'Cancelado');
        const saleTotal = targetSale ? targetSale.total : saleInsts.reduce((a, b) => a + b.amount, 0);
        const salePaid = salePayments.reduce((a, b) => a + b.amount, 0);
        const saleRemaining = Math.max(0, Number((saleTotal - salePaid).toFixed(2)));

        const isExceeding = paymentAmount > saleRemaining + 0.001;

        // Pré-visualização ao vivo do rateio
        const preview = (() => {
          if (paymentAmount <= 0) return [];
          const sorted = [...saleInsts].sort((a, b) => a.installmentNumber - b.installmentNumber);
          let unalloc = paymentAmount;
          const res: Array<{
            num: number;
            total: number;
            allocated: number;
            isPaid: boolean;
            remainingAfter: number;
          }> = [];

          for (const inst of sorted) {
            if (unalloc <= 0.0001) break;
            const currentRem = Math.max(0, inst.amount - (inst.paidAmount || 0));
            if (currentRem <= 0.0001) continue;

            const alloc = Math.min(unalloc, currentRem);
            const remAfter = Math.max(0, currentRem - alloc);
            res.push({
              num: inst.installmentNumber,
              total: inst.totalInstallments,
              allocated: alloc,
              isPaid: remAfter <= 0.001,
              remainingAfter: remAfter,
            });
            unalloc -= alloc;
          }
          return res;
        })();

        return (
          <Modal
            isOpen={!!paymentSaleId}
            onClose={() => setPaymentSaleId(null)}
            title={`Registrar Pagamento — ${targetSale?.saleNumber || `Venda ${paymentSaleId}`}`}
            subtitle={`Total da Venda: R$ ${saleTotal.toFixed(2)} • Saldo Devedor Atual: R$ ${saleRemaining.toFixed(2)}`}
            maxWidth="md"
          >
            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Valor Venda</span>
                  <span className="font-black text-slate-800">R$ {saleTotal.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Já Pago</span>
                  <span className="font-black text-emerald-700">R$ {salePaid.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-700 font-bold uppercase block">Saldo a Receber</span>
                  <span className="font-black text-rose-700">R$ {saleRemaining.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="uze-label">Valor Recebido (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={`uze-input font-bold text-sm ${isExceeding ? 'border-rose-500 text-rose-700 focus:ring-rose-500' : ''}`}
                  value={paymentAmount || ''}
                  onChange={e => {
                    setPaymentAmount(Math.max(0, Number(e.target.value)));
                    setPaymentError(null);
                  }}
                />
                {isExceeding && (
                  <span className="text-[11px] text-rose-600 font-bold block mt-1">
                    O pagamento informado excede o saldo devedor em R$ {(paymentAmount - saleRemaining).toFixed(2)}. Não é permitido registrar valor acima do saldo.
                  </span>
                )}
              </div>

              {/* Preview em tempo real da distribuição */}
              {preview.length > 0 && !isExceeding && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#173E75] block">
                    Rateio Automático / Distribuição deste Pagamento:
                  </span>
                  <div className="space-y-1">
                    {preview.map(p => (
                      <div key={p.num} className="flex justify-between items-center text-[11px] font-medium text-slate-700">
                        <span>• Parcela {p.num}/{p.total}:</span>
                        <span className="font-bold text-[#173E75]">
                          R$ {p.allocated.toFixed(2)}{' '}
                          <span className={p.isPaid ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                            ({p.isPaid ? 'Quita esta parcela' : `Restará R$ ${p.remainingAfter.toFixed(2)}`})
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-blue-200/60 flex justify-between text-[11px] font-bold">
                    <span>Novo Saldo Devedor:</span>
                    <span className="text-emerald-800">R$ {Math.max(0, saleRemaining - paymentAmount).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="uze-label">Data do Recebimento *</label>
                  <input
                    type="date"
                    className="uze-input"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="uze-label">Forma do Pagamento</label>
                  <select
                    className="uze-input font-semibold"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="PIX">PIX (Padrão)</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Transferência">Transferência Bancária</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="uze-label">Observação / Comprovante</label>
                <input
                  type="text"
                  placeholder="Ex: Recebido via chave PIX, comprovante anexado"
                  className="uze-input"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                />
              </div>

              {paymentError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 font-bold text-xs">
                  {paymentError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D0D5DD]">
                <button
                  type="button"
                  onClick={() => setPaymentSaleId(null)}
                  className="uze-btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={paymentAmount <= 0 || isExceeding}
                  onClick={() => {
                    const res = registerPayment(paymentSaleId, {
                      amount: paymentAmount,
                      paymentDate,
                      paymentMethod,
                      notes: paymentNotes,
                    });
                    if (res.success) {
                      setPaymentSaleId(null);
                    } else {
                      setPaymentError(res.error || 'Erro ao registrar pagamento.');
                    }
                  }}
                  className="uze-btn-primary text-xs"
                >
                  Confirmar Recebimento
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Modal: Editar Pagamento */}
      {editingPaymentRecord && (
        <Modal
          isOpen={!!editingPaymentRecord}
          onClose={() => setEditingPaymentRecord(null)}
          title="Editar Pagamento Confirmado"
          subtitle={`Venda: ${editingPaymentRecord.saleId} • ID: ${editingPaymentRecord.id}`}
          maxWidth="sm"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="uze-label">Valor do Pagamento (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="uze-input font-bold"
                value={editPaymentAmount}
                onChange={e => setEditPaymentAmount(Math.max(0, Number(e.target.value)))}
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                * Se alterar o valor, a distribuição entre as parcelas será recalculada automaticamente.
              </span>
            </div>

            <div>
              <label className="uze-label">Data do Pagamento *</label>
              <input
                type="date"
                className="uze-input"
                value={editPaymentDate}
                onChange={e => setEditPaymentDate(e.target.value)}
              />
            </div>

            <div>
              <label className="uze-label">Forma do Pagamento</label>
              <select
                className="uze-input font-semibold"
                value={editPaymentMethod}
                onChange={e => setEditPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Transferência">Transferência Bancária</option>
              </select>
            </div>

            <div>
              <label className="uze-label">Observação</label>
              <input
                type="text"
                className="uze-input"
                value={editPaymentNotes}
                onChange={e => setEditPaymentNotes(e.target.value)}
              />
            </div>

            {editPaymentError && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 font-bold text-xs">
                {editPaymentError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#D0D5DD]">
              <button
                type="button"
                onClick={() => setEditingPaymentRecord(null)}
                className="uze-btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={editPaymentAmount <= 0}
                onClick={() => {
                  const res = updatePayment(editingPaymentRecord.id, {
                    amount: editPaymentAmount,
                    paymentDate: editPaymentDate,
                    paymentMethod: editPaymentMethod,
                    notes: editPaymentNotes,
                  });
                  if (res.success) {
                    setEditingPaymentRecord(null);
                  } else {
                    setEditPaymentError(res.error || 'Erro ao editar pagamento.');
                  }
                }}
                className="uze-btn-primary text-xs"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Sub-modal: Alterar Vencimento da Parcela */}
      {editingDueDateInstallment && (
        <Modal
          isOpen={!!editingDueDateInstallment}
          onClose={() => setEditingDueDateInstallment(null)}
          title="Alterar Data de Vencimento"
          subtitle={`Parcela ${editingDueDateInstallment.installmentNumber}/${editingDueDateInstallment.totalInstallments}`}
          maxWidth="sm"
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="uze-label">Nova Data de Vencimento *</label>
              <input
                type="date"
                className="uze-input font-bold"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#D0D5DD]">
              <button
                type="button"
                onClick={() => setEditingDueDateInstallment(null)}
                className="uze-btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!newDueDate}
                onClick={() => {
                  updateInstallmentDueDate(editingDueDateInstallment.id, newDueDate);
                  setEditingDueDateInstallment(null);
                }}
                className="uze-btn-primary text-xs"
              >
                Salvar Novo Vencimento
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Arquivar */}
      {customerToArchive && (
        <Modal
          isOpen={!!customerToArchive}
          onClose={() => setCustomerToArchive(null)}
          title="Arquivar Cliente?"
          subtitle="Preservação de histórico com desativação para novas vendas"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-[#344054]">
            <p>Ao arquivar, o cliente não aparecerá em novos lançamentos, mas seu histórico permanecerá intacto.</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#D0D5DD]">
              <button onClick={() => setCustomerToArchive(null)} className="uze-btn-secondary text-xs">Cancelar</button>
              <button
                onClick={() => {
                  archiveCustomer(customerToArchive.id);
                  setCustomerToArchive(null);
                }}
                className="uze-btn-primary bg-amber-700 hover:bg-amber-800 text-xs"
              >
                Confirmar Arquivamento
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Exclusão */}
      {customerToDelete && (
        <Modal
          isOpen={!!customerToDelete}
          onClose={() => { setCustomerToDelete(null); setDeleteErrorMessage(null); }}
          title={`Excluir Cliente: ${customerToDelete.name}`}
          subtitle="Exclusão segura com verificação de histórico comercial"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {deleteErrorMessage ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                <p className="font-bold">Aviso de Bloqueio</p>
                <p className="mt-1">{deleteErrorMessage}</p>
              </div>
            ) : (
              <p className="text-slate-600">
                Tem certeza que deseja remover este cliente? Se ele não tiver pedidos no histórico, será excluído definitivamente.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#D0D5DD]">
              <button onClick={() => setCustomerToDelete(null)} className="uze-btn-secondary text-xs">Fechar</button>
              {!deleteErrorMessage && (
                <button
                  onClick={async () => {
                    const res = await deleteCustomer(customerToDelete.id);
                    if (res.success) {
                      setCustomerToDelete(null);
                    } else {
                      setDeleteErrorMessage(res.reason || 'Erro ao excluir');
                    }
                  }}
                  className="uze-btn-primary bg-rose-700 hover:bg-rose-800 text-xs"
                >
                  Confirmar Exclusão
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
