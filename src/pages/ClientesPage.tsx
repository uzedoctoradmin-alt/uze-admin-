import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { useAuth } from '../context/AuthContext';
import type { Column } from '../components/common/DataTable';
import { DataTable } from '../components/common/DataTable';
import type { Customer } from '../types';
import { UserPlus, Eye, ShoppingBag } from 'lucide-react';
import { NovoClienteModal } from '../components/modals/NovoClienteModal';
import { Modal } from '../components/common/Modal';

export const ClientesPage: React.FC = () => {
  const { customers, sales } = useERP();
  const { hasPermission } = useAuth();

  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const columns: Column<Customer>[] = [
    {
      header: 'Cliente',
      accessorKey: 'name',
      sortable: true,
      cell: (c) => (
        <div>
          <p className="font-semibold text-[#101828]">{c.name}</p>
          <span className="text-[10px] text-[#475467] font-medium">{c.document}</span>
        </div>
      ),
    },
    {
      header: 'Contato',
      accessorKey: 'email',
      sortable: true,
      cell: (c) => (
        <div>
          <p className="text-xs text-[#101828] font-medium">{c.email}</p>
          <span className="text-[10px] font-mono text-[#475467]">{c.phone}</span>
        </div>
      ),
    },
    {
      header: 'Cidade / UF',
      accessorKey: 'city',
      sortable: true,
      cell: (c) => <span className="text-xs text-[#101828] font-medium">{c.city}/{c.state}</span>,
    },
    {
      header: 'Primeira Compra',
      accessorKey: 'firstPurchaseDate',
      sortable: true,
      cell: (c) => <span className="text-xs text-[#475467] font-mono font-medium">{c.firstPurchaseDate}</span>,
    },
    {
      header: 'Última Compra',
      accessorKey: 'lastPurchaseDate',
      sortable: true,
      cell: (c) => <span className="text-xs text-[#475467] font-mono font-medium">{c.lastPurchaseDate}</span>,
    },
    {
      header: 'Pedidos',
      accessorKey: 'totalOrders',
      sortable: true,
      align: 'center',
      cell: (c) => (
        <span className="uze-badge uze-badge-navy">
          {c.totalOrders} pedidos
        </span>
      ),
    },
    {
      header: 'Total Acumulado',
      accessorKey: 'totalSpent',
      sortable: true,
      align: 'right',
      cell: (c) => (
        <span className="font-bold text-sm text-[#101828]">
          R$ {c.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  const customerSalesHistory = selectedCustomer
    ? sales.filter(s => s.customerId === selectedCustomer.id)
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D0D5DD]">
        <div>
          <h2 className="text-base font-bold text-[#101828]">Base de Clientes</h2>
          <p className="text-xs text-[#475467] font-medium">
            Médicos, clínicas e profissionais cadastrados na UZE DOCTOR
          </p>
        </div>

        {hasPermission('customers.create') && (
          <button
            onClick={() => setIsNovoClienteOpen(true)}
            className="uze-btn-primary text-xs cursor-pointer"
          >
            <UserPlus size={14} /> Novo Cliente
          </button>
        )}
      </div>

      {/* Customers Table or Empty State */}
      {customers.length === 0 ? (
        <div className="bg-white border border-[#D0D5DD] rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#EFF4FF] border border-[#D0D5DD] flex items-center justify-center text-[#173E75]">
            <UserPlus size={28} />
          </div>
          <h3 className="text-base font-bold text-[#101828]">Nenhum cliente cadastrado</h3>
          <p className="text-xs text-[#475467] font-medium max-w-md leading-relaxed">
            Cadastre os médicos, clínicas e profissionais de saúde para associar vendas, histórico de medidas e personalizações da UZE DOCTOR.
          </p>
          <button
            onClick={() => setIsNovoClienteOpen(true)}
            className="mt-2 uze-btn-primary text-xs shadow-xs"
          >
            <UserPlus size={14} />
            <span>Cadastrar primeiro cliente</span>
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={customers}
          searchPlaceholder="Buscar por nome, e-mail, telefone ou cidade..."
          searchField={(c) => `${c.name} ${c.email} ${c.phone} ${c.city} ${c.document}`}
          actions={(c) => (
            <button
              onClick={() => setSelectedCustomer(c)}
              className="p-1 text-xs font-bold text-[#173E75] hover:bg-[#F2F4F7] rounded transition-colors inline-flex items-center gap-1"
            >
              <Eye size={13} /> Histórico
            </button>
          )}
        />
      )}

      {/* Novo Cliente Modal */}
      <NovoClienteModal
        isOpen={isNovoClienteOpen}
        onClose={() => setIsNovoClienteOpen(false)}
      />

      {/* Customer History Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Ficha do Cliente: ${selectedCustomer.name}`}
          subtitle="Histórico de pedidos e compras acumuladas"
          maxWidth="4xl"
        >
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F9FAFB] rounded-lg border border-[#D0D5DD]">
              <div>
                <span className="text-[10px] text-[#344054] font-bold uppercase block">Contato</span>
                <p className="font-bold text-sm text-[#101828]">{selectedCustomer.name}</p>
                <p className="text-[#475467] font-medium">{selectedCustomer.email}</p>
                <p className="text-[#475467] font-mono font-medium">{selectedCustomer.phone}</p>
              </div>

              <div>
                <span className="text-[10px] text-[#344054] font-bold uppercase block">Localização</span>
                <p className="font-bold text-sm text-[#101828]">{selectedCustomer.city} / {selectedCustomer.state}</p>
                <p className="text-[#475467] mt-1 font-mono font-medium">Doc: {selectedCustomer.document}</p>
              </div>

              <div>
                <span className="text-[10px] text-[#344054] font-bold uppercase block">Total Gasto</span>
                <p className="text-base font-black text-[#173E75]">
                  R$ {selectedCustomer.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[#475467] font-medium">{selectedCustomer.totalOrders} pedidos realizados</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#101828] uppercase text-[11px] mb-2 flex items-center gap-1">
                <ShoppingBag size={13} className="text-[#173E75]" /> Histórico de Compras ({customerSalesHistory.length})
              </h4>

              <div className="uze-table-container">
                <table className="uze-table text-xs">
                  <thead>
                    <tr>
                      <th>Venda</th>
                      <th>Data</th>
                      <th>Itens</th>
                      <th className="text-right">Total</th>
                      <th>Pagamento</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerSalesHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-5 text-[#475467] font-medium">
                          Nenhum pedido anterior localizado.
                        </td>
                      </tr>
                    ) : (
                      customerSalesHistory.map(sale => (
                        <tr key={sale.id}>
                          <td className="font-mono font-bold text-[#173E75]">{sale.id}</td>
                          <td className="text-[#475467] font-medium">{sale.date}</td>
                          <td className="text-[#101828] font-medium">
                            {sale.items.map(i => `${i.productName} (${i.size})`).join(', ')}
                          </td>
                          <td className="text-right font-bold text-[#101828]">
                            R$ {sale.total.toFixed(2)}
                          </td>
                          <td className="text-[#475467] font-medium">{sale.paymentMethod}</td>
                          <td>
                            <span className="uze-badge uze-badge-success">{sale.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
