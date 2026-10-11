import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import type { 
  ProductModel, 
  ProductVariant, 
  StockMovement, 
  Customer, 
  Employee,
  Sale, 
  Revenue, 
  Expense, 
  PeriodFilter, 
  ViewTab,
  MovementType,
  SaleStatus,
  Supplier,
  PurchaseEntry,
  Installment,
  InstallmentStatus,
  PaymentMethod,
  PaymentRecord,
  PaymentAllocation,
} from '../types';

import { 
  INITIAL_MODELS, 
  INITIAL_VARIANTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_SALES, 
  INITIAL_MOVEMENTS, 
  INITIAL_REVENUES, 
  INITIAL_EXPENSES 
} from '../services/mockData';

import { supabaseService } from '../services/supabaseService';
import { checkSupabaseHealth, type SupabaseHealth } from '../services/supabase';
import { useAuth } from './AuthContext';
import { authService } from '../services/authService';

interface DashboardMetrics {
  faturamento: number;
  faturamentoPrevious: number;
  vendasCount: number;
  vendasPreviousCount: number;
  ticketMedio: number;
  lucroEstimado: number;
  margemMedia: number;
  produtosVendidos: number;
  custoTotalVendas: number;
  isCommercialOnly?: boolean;
  totalRecebido: number;
  totalReceber: number;
  totalEmAtraso: number;
}

export type SupabaseStatus = 'connecting' | 'connected' | 'needs_tables' | 'error' | 'disconnected';

interface ERPContextType {
  // State
  models: ProductModel[];
  variants: ProductVariant[];
  customers: Customer[];
  employees: Employee[];
  sales: Sale[];
  movements: StockMovement[];
  revenues: Revenue[];
  expenses: Expense[];
  suppliers: Supplier[];
  purchases: PurchaseEntry[];
  installments: Installment[];
  periodFilter: PeriodFilter;
  currentTab: ViewTab;
  searchQuery: string;
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;

  // Supabase Integration State
  supabaseStatus: SupabaseStatus;
  supabaseHealth: SupabaseHealth | null;
  isLoadingData: boolean;
  refreshData: () => Promise<void>;

  // Setters & Actions
  setPeriodFilter: (filter: PeriodFilter) => void;
  setCurrentTab: (tab: ViewTab) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebarCollapse: () => void;
  setIsMobileSidebarOpen: (open: boolean) => void;

  addSale: (saleData: Omit<Sale, 'id'> & { date?: string }) => Sale;
  updateSale: (updatedSale: Sale) => void;
  updateSaleStatus: (saleId: string, newStatus: SaleStatus) => void;
  cancelSale: (saleId: string, reason?: string) => void;
  deleteSale: (saleId: string, options?: { force?: boolean; reason?: string }) => { success: boolean; reason?: string };
  
  addModel: (
    modelData: Omit<ProductModel, 'id' | 'createdAt'>, 
    variantsData: Array<Omit<ProductVariant, 'id' | 'modelId'>>
  ) => void;
  updateModel: (id: string, modelData: Partial<ProductModel>) => void;
  archiveModel: (id: string) => void;
  reactivateModel: (id: string) => void;
  deleteModel: (id: string, options?: { force?: boolean; reason?: string }) => { success: boolean; reason?: string };

  addVariant: (variantData: Omit<ProductVariant, 'id'>) => ProductVariant;
  updateVariant: (id: string, variantData: Partial<ProductVariant>) => void;
  deleteVariant: (id: string, options?: { force?: boolean; reason?: string }) => { success: boolean; reason?: string };
  
  updateVariantStock: (variantId: string, newQty: number, type: MovementType, reason: string) => void;
  addStockMovement: (variantId: string, type: MovementType, qty: number, reason: string) => void;
  
  addCustomer: (customerData: Omit<Customer, 'id' | 'firstPurchaseDate' | 'lastPurchaseDate' | 'totalOrders' | 'totalSpent'>) => Customer;
  updateCustomer: (id: string, customerData: Partial<Customer>) => void;
  archiveCustomer: (id: string) => void;
  reactivateCustomer: (id: string) => void;
  deleteCustomer: (id: string) => { success: boolean; reason?: string };

  addEmployee: (employeeData: Omit<Employee, 'id' | 'createdAt'>) => Employee;
  updateEmployee: (id: string, employeeData: Partial<Employee>) => void;
  archiveEmployee: (id: string) => void;
  reactivateEmployee: (id: string) => void;
  deleteEmployee: (id: string) => { success: boolean; reason?: string };

  addSupplier: (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => { success: boolean; reason?: string };

  addPurchase: (purchaseData: Omit<PurchaseEntry, 'id' | 'entryNumber' | 'createdAt'>) => PurchaseEntry;
  updatePurchase: (purchase: PurchaseEntry) => { success: boolean; reason?: string };
  deletePurchase: (purchaseId: string) => { success: boolean; reason?: string };

  payments: PaymentRecord[];
  registerPayment: (
    saleId: string, 
    paymentData: { amount: number; paymentDate: string; paymentMethod: PaymentMethod; notes?: string }
  ) => { success: boolean; error?: string };
  undoPayment: (paymentId: string) => { success: boolean; error?: string };
  updatePayment: (
    paymentId: string, 
    updatedData: { amount: number; paymentDate: string; paymentMethod: PaymentMethod; notes?: string }
  ) => { success: boolean; error?: string };

  registerInstallmentPayment: (
    installmentId: string, 
    paymentData: { amount: number; paymentDate: string; paymentMethod: PaymentMethod; notes?: string }
  ) => void;
  undoInstallmentPayment: (installmentId: string, paymentId: string) => void;
  updateInstallmentDueDate: (installmentId: string, newDueDate: string) => { success: boolean; error?: string };

  addRevenue: (revenueData: Omit<Revenue, 'id'>) => Revenue;
  addExpense: (expenseData: Omit<Expense, 'id'>) => Expense;

  // Analytics Helpers
  dashboardMetrics: DashboardMetrics;
  filteredSales: Sale[];
  filteredRevenues: Revenue[];
  filteredExpenses: Expense[];
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, hasPermission } = useAuth();

  const [rawModels, setRawModels] = useState<ProductModel[]>(INITIAL_MODELS);
  const [rawVariants, setRawVariants] = useState<ProductVariant[]>(INITIAL_VARIANTS);
  const [rawCustomers, setRawCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [rawEmployees, setRawEmployees] = useState<Employee[]>([]);
  const [rawSales, setRawSales] = useState<Sale[]>(INITIAL_SALES);
  const [rawMovements, setRawMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
  const [rawRevenues, setRawRevenues] = useState<Revenue[]>(INITIAL_REVENUES);
  const [rawExpenses, setRawExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [rawSuppliers, setRawSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('uze_suppliers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [rawPurchases, setRawPurchases] = useState<PurchaseEntry[]>(() => {
    try {
      const saved = localStorage.getItem('uze_purchases');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [rawInstallments, setRawInstallments] = useState<Installment[]>(() => {
    try {
      const saved = localStorage.getItem('uze_installments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [rawPayments, setRawPayments] = useState<PaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('uze_payments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('Este mês');
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Supabase status & loading
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>('connecting');
  const [supabaseHealth, setSupabaseHealth] = useState<SupabaseHealth | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  
  // Persist sidebar collapsed state in localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('uze_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('uze_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Hydrate data from Supabase
  const refreshData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const health = await checkSupabaseHealth();
      setSupabaseHealth(health);
      setSupabaseStatus(health.status);

      if (health.status === 'connected') {
        const [
          remoteModels,
          remoteVariants,
          remoteCustomers,
          remoteEmployees,
          remoteSales,
          remoteMovements,
          remoteRevenues,
          remoteExpenses,
          remoteSuppliers,
          remotePurchases,
          remoteInstallments,
          remotePayments,
        ] = await Promise.all([
          supabaseService.fetchModels(),
          supabaseService.fetchVariants(),
          supabaseService.fetchCustomers(),
          supabaseService.fetchEmployees(),
          supabaseService.fetchSales(),
          supabaseService.fetchMovements(),
          supabaseService.fetchRevenues(),
          supabaseService.fetchExpenses(),
          supabaseService.fetchSuppliers(),
          supabaseService.fetchPurchases(),
          supabaseService.fetchInstallments(),
          supabaseService.fetchPayments(),
        ]);

        if (remoteModels !== null) setRawModels(remoteModels);
        if (remoteVariants !== null) setRawVariants(remoteVariants);
        if (remoteCustomers !== null) setRawCustomers(remoteCustomers);
        if (remoteEmployees !== null) setRawEmployees(remoteEmployees);
        if (remoteSales !== null) setRawSales(remoteSales);
        if (remoteMovements !== null) setRawMovements(remoteMovements);
        if (remoteRevenues !== null) setRawRevenues(remoteRevenues);
        if (remoteExpenses !== null) setRawExpenses(remoteExpenses);
        if (remoteSuppliers !== null) {
          setRawSuppliers(remoteSuppliers);
          try { localStorage.setItem('uze_suppliers', JSON.stringify(remoteSuppliers)); } catch {}
        }
        if (remotePurchases !== null) {
          setRawPurchases(remotePurchases);
          try { localStorage.setItem('uze_purchases', JSON.stringify(remotePurchases)); } catch {}
        }
        if (remoteInstallments !== null) {
          setRawInstallments(remoteInstallments);
          try { localStorage.setItem('uze_installments', JSON.stringify(remoteInstallments)); } catch {}
        }
        if (remotePayments !== null) {
          setRawPayments(remotePayments);
          try { localStorage.setItem('uze_payments', JSON.stringify(remotePayments)); } catch {}
        }
      }
    } catch (err) {
      console.warn('[ERPContext] Error syncing with Supabase:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ============================================================================
  // RBAC DATA SANITIZATION
  // ============================================================================
  const isSeller = user?.role === 'VENDEDOR';
  const canReadCosts = hasPermission('products.cost.read');
  const canReadFinance = hasPermission('finance.read');

  const models = useMemo<ProductModel[]>(() => {
    if (!canReadCosts) {
      return rawModels.map(m => ({
        ...m,
        baseCost: 0,
      }));
    }
    return rawModels;
  }, [rawModels, canReadCosts]);

  const variants = useMemo<ProductVariant[]>(() => {
    return rawVariants;
  }, [rawVariants]);

  const customers = useMemo<Customer[]>(() => {
    return rawCustomers;
  }, [rawCustomers]);

  const employees = useMemo<Employee[]>(() => {
    return rawEmployees;
  }, [rawEmployees]);

  const suppliers = useMemo<Supplier[]>(() => {
    return rawSuppliers;
  }, [rawSuppliers]);

  const purchases = useMemo<PurchaseEntry[]>(() => {
    if (!canReadCosts) {
      return rawPurchases.map(p => ({
        ...p,
        total: 0,
        subtotal: 0,
        items: p.items.map(i => ({ ...i, unitCost: 0, totalCost: 0 })),
      }));
    }
    return rawPurchases;
  }, [rawPurchases, canReadCosts]);

  const installments = useMemo<Installment[]>(() => {
    return rawInstallments;
  }, [rawInstallments]);

  const sales = useMemo<Sale[]>(() => {
    if (isSeller) {
      return rawSales.map(s => ({
        ...s,
        totalCost: 0,
        estimatedProfit: 0,
        items: s.items.map(item => ({
          ...item,
          unitCost: 0,
        })),
      }));
    }
    return rawSales;
  }, [rawSales, isSeller]);

  const movements = useMemo<StockMovement[]>(() => {
    return rawMovements;
  }, [rawMovements]);

  const revenues = useMemo<Revenue[]>(() => {
    if (!canReadFinance) return [];
    return rawRevenues;
  }, [rawRevenues, canReadFinance]);

  const expenses = useMemo<Expense[]>(() => {
    if (!canReadFinance) return [];
    return rawExpenses;
  }, [rawExpenses, canReadFinance]);

  // ============================================================================
  // MUTATIONS (SALES, MODELS, CUSTOMERS, EMPLOYEES, FINANCE)
  // ============================================================================

  const addSale = (saleData: Omit<Sale, 'id'> & { date?: string }): Sale => {
    if (!hasPermission('sales.create')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para cadastrar vendas.');
    }

    const saleId = `#${String(rawSales.length + 1).padStart(6, '0')}`;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const commercialDate = saleData.date?.trim() || nowStr;
    
    const newSale: Sale = {
      ...saleData,
      id: saleId,
      saleNumber: saleId,
      date: commercialDate,
      saleDate: saleData.saleDate || commercialDate.split(' ')[0],
      occurredAt: saleData.occurredAt || (commercialDate.includes('-') ? new Date(commercialDate.replace(' ', 'T')).toISOString() : new Date().toISOString()),
    };

    setRawSales(prev => [newSale, ...prev]);

    // Update variant stocks & log movements
    newSale.items.forEach(item => {
      if (item.isCustom || !item.variantId) return;

      let updatedStock = 0;
      setRawVariants(prevVariants => 
        prevVariants.map(v => {
          if (v.id === item.variantId) {
            updatedStock = Math.max(0, v.currentStock - item.quantity);
            return { ...v, currentStock: updatedStock };
          }
          return v;
        })
      );

      const newMovement: StockMovement = {
        id: `mov-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        date: commercialDate,
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku || 'AVULSO',
        colorName: item.colorName || '-',
        size: item.size || '-',
        type: 'Venda',
        quantity: -item.quantity,
        reason: `Venda ${saleId} registrada`,
        user: user?.name || 'Sistema ERP',
      };

      setRawMovements(prev => [newMovement, ...prev]);

      supabaseService.insertMovement(newMovement);
      supabaseService.updateVariantStock(item.variantId, updatedStock);
    });

    // Create automated revenue record or installments with commercial date
    if (newSale.status !== 'Cancelado' && newSale.status !== 'Orçamento') {
      if (newSale.paymentMethod === 'PIX Parcelado') {
        const count = newSale.installmentDetails?.count || newSale.installments || 1;
        const downPayment = Number(newSale.installmentDetails?.downPayment) || 0;
        const remainingTotal = Math.max(0, newSale.total - downPayment);
        const baseAmount = count > 0 ? Number((remainingTotal / count).toFixed(2)) : 0;
        
        const generatedInstallments: Installment[] = [];
        const firstDueDateStr = newSale.installmentDetails?.firstDueDate || commercialDate.split(' ')[0];
        const firstDueDate = new Date(firstDueDateStr + 'T12:00:00');

        // Se houver entrada à vista, registra receita imediata em caixa
        if (downPayment > 0) {
          const downRevenue: Revenue = {
            id: `rev-${Date.now()}-down`,
            date: commercialDate.split(' ')[0],
            source: `Entrada da Venda ${saleId}`,
            referenceId: saleId,
            category: 'Vendas Diretas',
            amount: downPayment,
            paymentMethod: 'PIX',
            status: 'Pago',
          };
          setRawRevenues(prev => [downRevenue, ...prev]);
          supabaseService.insertRevenue(downRevenue);
        }

        for (let i = 1; i <= count; i++) {
          const dueDate = new Date(firstDueDate);
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
          const dueDateFormatted = dueDate.toISOString().split('T')[0];
          
          // Ajusta centavos na última parcela
          const installmentAmount = (i === count)
            ? Number((remainingTotal - baseAmount * (count - 1)).toFixed(2))
            : baseAmount;

          const isOverdue = dueDateFormatted < new Date().toISOString().split('T')[0];

          generatedInstallments.push({
            id: `inst-${saleId.replace('#', '')}-${i}-${Date.now()}`,
            saleId: saleId,
            customerId: newSale.customerId,
            customerName: newSale.customerName,
            installmentNumber: i,
            totalInstallments: count,
            amount: installmentAmount,
            dueDate: dueDateFormatted,
            status: isOverdue ? 'Atrasado' : 'Pendente',
            paidAmount: 0,
            remainingAmount: installmentAmount,
            paymentMethod: 'PIX',
            payments: [],
            notes: `Parcela ${i}/${count} da venda ${saleId}`,
            createdAt: new Date().toISOString(),
          });
        }

        setRawInstallments(prev => [...prev, ...generatedInstallments]);
        supabaseService.insertInstallments(generatedInstallments);
      } else {
        // Venda comum: receita integral imediata
        const newRevenue: Revenue = {
          id: `rev-${Date.now()}`,
          date: commercialDate.split(' ')[0],
          source: `Venda ${saleId}`,
          referenceId: saleId,
          category: 'Vendas Diretas',
          amount: newSale.total,
          paymentMethod: newSale.paymentMethod,
          status: 'Pago',
        };
        setRawRevenues(prev => [newRevenue, ...prev]);
        supabaseService.insertRevenue(newRevenue);
      }
    }

    // Update customer stats
    const targetCustomer = rawCustomers.find(c => c.id === newSale.customerId);
    if (targetCustomer) {
      const updatedTotalOrders = targetCustomer.totalOrders + 1;
      const updatedTotalSpent = targetCustomer.totalSpent + newSale.total;
      const dateOnly = commercialDate.split(' ')[0];

      setRawCustomers(prev => 
        prev.map(c => {
          if (c.id === newSale.customerId) {
            return {
              ...c,
              lastPurchaseDate: dateOnly,
              totalOrders: updatedTotalOrders,
              totalSpent: updatedTotalSpent,
            };
          }
          return c;
        })
      );

      supabaseService.updateCustomerStats(targetCustomer.id, dateOnly, updatedTotalOrders, updatedTotalSpent);
    }

    supabaseService.insertSale(newSale);
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'SALE_CREATED',
      { id: newSale.id, name: `Venda ${newSale.id}` },
      { total: newSale.total, seller: newSale.sellerName, discount: newSale.discount, date: newSale.date }
    );
    return newSale;
  };

  const updateSale = (updatedSale: Sale) => {
    if (!hasPermission('sales.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para alterar vendas.');
    }

    const previousSale = rawSales.find(s => s.id === updatedSale.id);
    if (!previousSale) return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // Se ambos os estados afetam estoque, reconciliar diferenças físicas
    if (previousSale.status !== 'Cancelado' && previousSale.status !== 'Orçamento' &&
        updatedSale.status !== 'Cancelado' && updatedSale.status !== 'Orçamento') {
      
      const oldMap: Record<string, number> = {};
      previousSale.items.forEach(i => {
        if (!i.isCustom && i.variantId) {
          oldMap[i.variantId] = (oldMap[i.variantId] || 0) + i.quantity;
        }
      });

      const newMap: Record<string, number> = {};
      updatedSale.items.forEach(i => {
        if (!i.isCustom && i.variantId) {
          newMap[i.variantId] = (newMap[i.variantId] || 0) + i.quantity;
        }
      });

      const allVariantIds = Array.from(new Set([...Object.keys(oldMap), ...Object.keys(newMap)]));

      allVariantIds.forEach(vId => {
        const oldQty = oldMap[vId] || 0;
        const newQty = newMap[vId] || 0;
        const diff = newQty - oldQty;

        if (diff !== 0) {
          const variant = rawVariants.find(v => v.id === vId);
          const model = rawModels.find(m => m.id === variant?.modelId);
          let newStock = 0;

          setRawVariants(prevVariants =>
            prevVariants.map(v => {
              if (v.id === vId) {
                newStock = Math.max(0, v.currentStock - diff);
                return { ...v, currentStock: newStock };
              }
              return v;
            })
          );

          const movement: StockMovement = {
            id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: nowStr,
            variantId: vId,
            productName: model?.name || 'Produto',
            sku: variant?.sku || 'SKU',
            colorName: variant?.colorName || '-',
            size: variant?.size || '-',
            type: diff > 0 ? 'Venda' : 'Devolução',
            quantity: -diff,
            reason: diff > 0 
              ? `Adicional por edição no pedido ${updatedSale.id}` 
              : `Devolução por alteração no pedido ${updatedSale.id}`,
            user: user?.name || 'Sistema ERP',
          };

          setRawMovements(prev => [movement, ...prev]);
          supabaseService.insertMovement(movement);
          supabaseService.updateVariantStock(vId, newStock);
        }
      });
    }

    // Atualizar receita correspondente
    const updatedRevDate = updatedSale.date ? updatedSale.date.split(' ')[0] : undefined;
    setRawRevenues(prev =>
      prev.map(r => r.referenceId === updatedSale.id ? {
        ...r,
        amount: updatedSale.total,
        paymentMethod: updatedSale.paymentMethod,
        date: updatedRevDate || r.date,
        status: updatedSale.status === 'Cancelado' ? 'Cancelado' : r.status,
      } : r)
    );
    supabaseService.updateRevenueByReference(updatedSale.id, {
      amount: updatedSale.total,
      paymentMethod: updatedSale.paymentMethod,
      date: updatedRevDate,
      status: updatedSale.status === 'Cancelado' ? 'Cancelado' : undefined,
    });

    // Ajustar total do cliente se houve variação
    const diffTotal = updatedSale.total - previousSale.total;
    if (diffTotal !== 0) {
      setRawCustomers(prev =>
        prev.map(c => c.id === updatedSale.customerId ? {
          ...c,
          totalSpent: Math.max(0, c.totalSpent + diffTotal),
        } : c)
      );
    }

    setRawSales(prev => prev.map(s => s.id === updatedSale.id ? updatedSale : s));
    supabaseService.updateSale(updatedSale);

    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'SALE_UPDATED',
      { id: updatedSale.id, name: `Venda ${updatedSale.id}` },
      { previousTotal: previousSale.total, newTotal: updatedSale.total, seller: updatedSale.sellerName }
    );
  };

  const cancelSale = (saleId: string, reason?: string) => {
    if (!hasPermission('sales.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para cancelar vendas.');
    }

    const sale = rawSales.find(s => s.id === saleId);
    if (!sale || sale.status === 'Cancelado') return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // Devolver itens físicos ao estoque
    if (sale.status !== 'Orçamento') {
      sale.items.forEach(item => {
        if (!item.isCustom && item.variantId) {
          let restoredStock = 0;
          setRawVariants(prevVariants =>
            prevVariants.map(v => {
              if (v.id === item.variantId) {
                restoredStock = v.currentStock + item.quantity;
                return { ...v, currentStock: restoredStock };
              }
              return v;
            })
          );

          const movement: StockMovement = {
            id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: nowStr,
            variantId: item.variantId,
            productName: item.productName,
            sku: item.sku || 'SKU',
            colorName: item.colorName || '-',
            size: item.size || '-',
            type: 'Devolução',
            quantity: item.quantity,
            reason: `Cancelamento da venda ${saleId}: ${reason || 'Devolução ao estoque'}`,
            user: user?.name || 'Sistema ERP',
          };

          setRawMovements(prev => [movement, ...prev]);
          supabaseService.insertMovement(movement);
          supabaseService.updateVariantStock(item.variantId, restoredStock);
        }
      });

      // Cancelar receita
      setRawRevenues(prev =>
        prev.map(r => r.referenceId === saleId ? { ...r, status: 'Cancelado' } : r)
      );
      supabaseService.updateRevenueByReference(saleId, { status: 'Cancelado' });

      // Atualizar cliente
      setRawCustomers(prev =>
        prev.map(c => c.id === sale.customerId ? {
          ...c,
          totalSpent: Math.max(0, c.totalSpent - sale.total),
          totalOrders: Math.max(0, c.totalOrders - 1),
        } : c)
      );
    }

    setRawSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'Cancelado' } : s));
    supabaseService.updateSaleStatus(saleId, 'Cancelado');

    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'SALE_CANCELLED',
      { id: saleId, name: `Venda ${saleId}` },
      { reason: reason || 'Cancelada pelo operador' }
    );
  };

  const deleteSale = (saleId: string, options?: { force?: boolean; reason?: string }): { success: boolean; reason?: string } => {
    if (!hasPermission('sales.delete' as any)) {
      throw new Error('403 Forbidden: Usuário não tem permissão para excluir vendas.');
    }

    const sale = rawSales.find(s => s.id === saleId);
    if (!sale) {
      return { success: false, reason: 'Venda não encontrada.' };
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // 1. Devolver estoque físico se a venda não estava cancelada e não era orçamento
    if (sale.status !== 'Cancelado' && sale.status !== 'Orçamento') {
      sale.items.forEach(item => {
        if (!item.isCustom && item.variantId) {
          let restoredStock = 0;
          setRawVariants(prevVariants =>
            prevVariants.map(v => {
              if (v.id === item.variantId) {
                restoredStock = v.currentStock + item.quantity;
                return { ...v, currentStock: restoredStock };
              }
              return v;
            })
          );

          const movement: StockMovement = {
            id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: nowStr,
            variantId: item.variantId,
            productName: item.productName,
            sku: item.sku || 'SKU',
            colorName: item.colorName || '-',
            size: item.size || '-',
            type: 'Devolução',
            quantity: item.quantity,
            direction: 'ENTRADA',
            reason: `Exclusão definitiva da venda ${saleId}: Restauração de estoque (+${item.quantity})`,
            user: user?.name || 'Administrador ERP',
          };

          setRawMovements(prev => [movement, ...prev]);
          supabaseService.insertMovement(movement);
          supabaseService.updateVariantStock(item.variantId, restoredStock);
        }
      });

      // Atualizar total gasto e pedidos do cliente
      setRawCustomers(prev =>
        prev.map(c => c.id === sale.customerId ? {
          ...c,
          totalSpent: Math.max(0, c.totalSpent - sale.total),
          totalOrders: Math.max(0, c.totalOrders - 1),
        } : c)
      );
    }

    // 2. Remover receitas vinculadas à venda
    setRawRevenues(prev => prev.filter(r => r.referenceId !== saleId && r.source !== `Venda ${saleId}`));

    // 3. Remover parcelas vinculadas à venda
    setRawInstallments(prev => prev.filter(i => i.saleId !== saleId));
    supabaseService.deleteInstallmentsBySale(saleId);

    // 4. Remover venda do estado local
    setRawSales(prev => prev.filter(s => s.id !== saleId));

    // 5. Excluir do Supabase em cadeia
    supabaseService.deleteSaleCompletely(saleId);

    // 6. Auditoria administrativa
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'admin', name: 'Administrador', email: 'admin' },
      'SALE_DELETED_PERMANENTLY',
      { id: saleId, name: `Venda ${saleId}` },
      { 
        customerName: sale.customerName,
        total: sale.total,
        reason: options?.reason || 'Exclusão definitiva realizada pelo administrador'
      }
    );

    return { success: true };
  };

  const updateSaleStatus = (saleId: string, newStatus: SaleStatus) => {
    if (!hasPermission('sales.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para alterar vendas.');
    }
    setRawSales(prev => 
      prev.map(s => s.id === saleId ? { ...s, status: newStatus } : s)
    );
    supabaseService.updateSaleStatus(saleId, newStatus);
  };

  const addModel = (
    modelData: Omit<ProductModel, 'id' | 'createdAt'>, 
    variantsData: Array<Omit<ProductVariant, 'id' | 'modelId'>>
  ) => {
    if (!hasPermission('products.create')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para cadastrar modelos.');
    }

    const modelId = `mod-${String(rawModels.length + 1).padStart(3, '0')}`;
    const newModel: ProductModel = {
      ...modelData,
      id: modelId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const newVariants: ProductVariant[] = variantsData.map((v, index) => ({
      ...v,
      id: `var-${Date.now()}-${index}`,
      modelId: modelId,
    }));

    setRawModels(prev => [...prev, newModel]);
    setRawVariants(prev => [...prev, ...newVariants]);

    supabaseService.insertModel(newModel, newVariants);
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'PRODUCT_CREATED',
      { id: modelId, name: newModel.name }
    );
  };

  const updateModel = (id: string, modelData: Partial<ProductModel>) => {
    if (!hasPermission('products.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para editar produtos.');
    }
    setRawModels(prev => prev.map(m => m.id === id ? { ...m, ...modelData } : m));
    supabaseService.updateModel(id, modelData);
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'PRODUCT_UPDATED',
      { id, name: modelData.name || id },
      modelData
    );
  };

  const archiveModel = (id: string) => {
    if (!hasPermission('products.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para arquivar produtos.');
    }
    const target = rawModels.find(m => m.id === id);
    setRawModels(prev => prev.map(m => m.id === id ? { ...m, status: 'Arquivado' } : m));
    supabaseService.updateModel(id, { status: 'Arquivado' });
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'PRODUCT_ARCHIVED',
      { id, name: target?.name || id }
    );
  };

  const reactivateModel = (id: string) => {
    if (!hasPermission('products.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para reativar produtos.');
    }
    setRawModels(prev => prev.map(m => m.id === id ? { ...m, status: 'Ativo' } : m));
    supabaseService.updateModel(id, { status: 'Ativo' });
  };

  const deleteModel = (id: string, options?: { force?: boolean; reason?: string }): { success: boolean; reason?: string } => {
    if (!hasPermission('products.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para excluir produtos.');
    }

    const hasSalesHistory = rawSales.some(s => s.items.some(i => i.modelId === id));

    if (hasSalesHistory && !options?.force) {
      return {
        success: false,
        reason: 'Este produto possui vendas registradas no histórico. Para preservar a consistência dos relatórios, utilize "Arquivar Produto" ou confirme a exclusão avançada de Administrador.',
      };
    }

    const modelTarget = rawModels.find(m => m.id === id);
    const modelVariantIds = rawVariants.filter(v => v.modelId === id).map(v => v.id);

    // Remover variantes do modelo e movimentações dependentes
    setRawVariants(prev => prev.filter(v => v.modelId !== id));
    setRawMovements(prev => prev.filter(m => !modelVariantIds.includes(m.variantId)));
    setRawModels(prev => prev.filter(m => m.id !== id));

    supabaseService.deleteModel(id);

    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'PRODUCT_DELETED',
      { id, name: modelTarget?.name || id },
      { force: Boolean(options?.force), reason: options?.reason || 'Exclusão definitiva de produto' }
    );

    return { success: true };
  };

  const addVariant = (variantData: Omit<ProductVariant, 'id'>): ProductVariant => {
    if (!hasPermission('products.create' as any) && !hasPermission('products.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para cadastrar variantes.');
    }

    const newVariant: ProductVariant = {
      ...variantData,
      id: `var-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };

    setRawVariants(prev => [...prev, newVariant]);
    supabaseService.insertVariant(newVariant);
    return newVariant;
  };

  const updateVariant = (id: string, variantData: Partial<ProductVariant>) => {
    if (!hasPermission('products.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para editar variantes.');
    }
    setRawVariants(prev => prev.map(v => v.id === id ? { ...v, ...variantData } : v));
    supabaseService.updateVariant(id, variantData);
  };

  const deleteVariant = (id: string, options?: { force?: boolean; reason?: string }): { success: boolean; reason?: string } => {
    if (!hasPermission('products.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para excluir variantes.');
    }

    const hasSales = rawSales.some(s => s.items.some(i => i.variantId === id));
    if (hasSales && !options?.force) {
      return {
        success: false,
        reason: 'Esta variante possui histórico de vendas. Desative-a ou confirme a exclusão avançada.',
      };
    }

    setRawVariants(prev => prev.filter(v => v.id !== id));
    setRawMovements(prev => prev.filter(m => m.variantId !== id));
    supabaseService.deleteVariant(id);

    return { success: true };
  };

  // ============================================================================
  // FORNECEDORES (SUPPLIERS)
  // ============================================================================
  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt'>): Supplier => {
    const id = `sup-${Date.now()}`;
    const newSupplier: Supplier = {
      ...supplierData,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setRawSuppliers(prev => [newSupplier, ...prev]);
    supabaseService.insertSupplier(newSupplier);
    return newSupplier;
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setRawSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    supabaseService.updateSupplier(id, updates);
  };

  const deleteSupplier = (id: string): { success: boolean; reason?: string } => {
    setRawSuppliers(prev => prev.filter(s => s.id !== id));
    supabaseService.deleteSupplier(id);
    return { success: true };
  };

  // ============================================================================
  // ENTRADAS / COMPRAS DE MERCADORIAS (PURCHASES)
  // ============================================================================
  const addPurchase = (purchaseData: Omit<PurchaseEntry, 'id' | 'entryNumber' | 'createdAt'>): PurchaseEntry => {
    if (!hasPermission('purchases.create' as any)) {
      throw new Error('403 Forbidden: Usuário não tem permissão para registrar compras/entradas.');
    }

    const entryNum = `ENT-${String(rawPurchases.length + 1).padStart(5, '0')}`;
    const id = `pur-${Date.now()}`;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const newPurchase: PurchaseEntry = {
      ...purchaseData,
      id,
      entryNumber: entryNum,
      createdAt: nowStr,
      createdBy: user?.name || 'Administrador ERP',
    };

    setRawPurchases(prev => [newPurchase, ...prev]);

    // Aumentar o estoque de cada variante e gerar stock_movements com motivo auditável
    newPurchase.items.forEach(item => {
      let updatedStock = 0;
      setRawVariants(prev =>
        prev.map(v => {
          if (v.id === item.variantId) {
            updatedStock = v.currentStock + item.quantity;
            return {
              ...v,
              currentStock: updatedStock,
              costPrice: item.unitCost > 0 ? item.unitCost : v.costPrice,
            };
          }
          return v;
        })
      );

      const movement: StockMovement = {
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: newPurchase.date,
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku || 'SKU',
        colorName: item.colorName || '-',
        size: item.size || '-',
        type: 'Entrada',
        quantity: item.quantity,
        direction: 'ENTRADA',
        reason: `Entrada da compra ${entryNum} (${newPurchase.supplierName})`,
        user: user?.name || 'Operador ERP',
      };

      setRawMovements(prev => [movement, ...prev]);
      supabaseService.insertMovement(movement);
      supabaseService.updateVariantStock(item.variantId, updatedStock);
    });

    supabaseService.insertPurchase(newPurchase);

    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'admin', name: 'Administrador', email: 'admin' },
      'PURCHASE_ENTRY_CREATED',
      { id, name: entryNum },
      { supplierName: newPurchase.supplierName, total: newPurchase.total, itemsCount: newPurchase.items.length }
    );

    return newPurchase;
  };

  const updatePurchase = (updated: PurchaseEntry): { success: boolean; reason?: string } => {
    if (!hasPermission('purchases.edit' as any)) {
      throw new Error('403 Forbidden: Sem permissão para editar compras.');
    }

    const oldPurchase = rawPurchases.find(p => p.id === updated.id);
    if (!oldPurchase) return { success: false, reason: 'Entrada não encontrada.' };

    // Calcular diferença de estoque para cada variante
    for (const newItem of updated.items) {
      const oldItem = oldPurchase.items.find(i => i.variantId === newItem.variantId);
      const oldQty = oldItem ? oldItem.quantity : 0;
      const diff = newItem.quantity - oldQty;

      if (diff !== 0) {
        let newStock = 0;
        setRawVariants(prev =>
          prev.map(v => {
            if (v.id === newItem.variantId) {
              newStock = Math.max(0, v.currentStock + diff);
              return { ...v, currentStock: newStock };
            }
            return v;
          })
        );

        const movement: StockMovement = {
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          date: updated.date,
          variantId: newItem.variantId,
          productName: newItem.productName,
          sku: newItem.sku || 'SKU',
          colorName: newItem.colorName || '-',
          size: newItem.size || '-',
          type: 'Ajuste',
          quantity: diff,
          direction: diff > 0 ? 'ENTRADA' : 'SAIDA',
          reason: `Ajuste da compra ${updated.entryNumber}: alteração de ${oldQty} para ${newItem.quantity}`,
          user: user?.name || 'Operador ERP',
        };

        setRawMovements(prev => [movement, ...prev]);
        supabaseService.insertMovement(movement);
        supabaseService.updateVariantStock(newItem.variantId, newStock);
      }
    }

    setRawPurchases(prev => prev.map(p => p.id === updated.id ? updated : p));
    supabaseService.updatePurchase(updated);

    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'admin', name: 'Administrador', email: 'admin' },
      'PURCHASE_ENTRY_UPDATED',
      { id: updated.id, name: updated.entryNumber }
    );

    return { success: true };
  };

  const deletePurchase = (purchaseId: string): { success: boolean; reason?: string } => {
    if (!hasPermission('purchases.delete' as any)) {
      throw new Error('403 Forbidden: Sem permissão para excluir compras.');
    }

    const purchase = rawPurchases.find(p => p.id === purchaseId);
    if (!purchase) return { success: false, reason: 'Entrada não encontrada.' };

    // Verificar se há estoque suficiente para reverter sem gerar estoque negativo
    for (const item of purchase.items) {
      const variant = rawVariants.find(v => v.id === item.variantId);
      if (variant && variant.currentStock < item.quantity) {
        return {
          success: false,
          reason: `Não é possível estornar esta entrada: a variante "${variant.sku}" possui apenas ${variant.currentStock} unidades em estoque, mas esta compra continha ${item.quantity} unidades (produtos já foram vendidos).`,
        };
      }
    }

    // Reverter estoque físico
    purchase.items.forEach(item => {
      let newStock = 0;
      setRawVariants(prev =>
        prev.map(v => {
          if (v.id === item.variantId) {
            newStock = Math.max(0, v.currentStock - item.quantity);
            return { ...v, currentStock: newStock };
          }
          return v;
        })
      );

      const movement: StockMovement = {
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: new Date().toISOString().split('T')[0],
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku || 'SKU',
        colorName: item.colorName || '-',
        size: item.size || '-',
        type: 'Ajuste',
        quantity: -item.quantity,
        direction: 'SAIDA',
        reason: `Estorno por exclusão da compra ${purchase.entryNumber}`,
        user: user?.name || 'Operador ERP',
      };

      setRawMovements(prev => [movement, ...prev]);
      supabaseService.insertMovement(movement);
      supabaseService.updateVariantStock(item.variantId, newStock);
    });

    setRawPurchases(prev => prev.filter(p => p.id !== purchaseId));
    supabaseService.deletePurchase(purchaseId);

    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'admin', name: 'Administrador', email: 'admin' },
      'PURCHASE_ENTRY_DELETED',
      { id: purchaseId, name: purchase.entryNumber }
    );

    return { success: true };
  };

  // ============================================================================
  // PARCELAS / CARNÊ / RECEBIMENTOS & RATEIO AUTOMÁTICO
  // ============================================================================
  const registerPayment = (
    saleId: string, 
    paymentData: { amount: number; paymentDate: string; paymentMethod: PaymentMethod; notes?: string }
  ): { success: boolean; error?: string } => {
    if (paymentData.amount <= 0) {
      return { success: false, error: 'O valor do pagamento deve ser superior a zero.' };
    }

    const targetSale = rawSales.find(s => s.id === saleId);
    if (!targetSale) {
      return { success: false, error: 'Venda de referência não localizada.' };
    }

    // Identificar pagamentos prévios da venda
    const currentPaidOnSale = rawPayments
      .filter(p => p.saleId === saleId)
      .reduce((sum, p) => sum + p.amount, 0);

    const saleTotal = targetSale.total;
    const currentRemaining = Math.max(0, Number((saleTotal - currentPaidOnSale).toFixed(2)));

    // Validação rígida contra saldo negativo / excedente de recebimento
    if (paymentData.amount > currentRemaining + 0.001) {
      const excess = Number((paymentData.amount - currentRemaining).toFixed(2));
      return { 
        success: false, 
        error: `O pagamento informado (R$ ${paymentData.amount.toFixed(2)}) excede o saldo devedor em R$ ${excess.toFixed(2)}.` 
      };
    }

    const paymentId = `pay-${Date.now()}`;
    const nowIso = new Date().toISOString();
    let unallocated = paymentData.amount;
    const newAllocations: PaymentAllocation[] = [];
    const updatedInstallments = [...rawInstallments];

    // Rateio automático sequencial por ordem cronológica das parcelas da venda
    const saleInstIndexes = updatedInstallments
      .map((inst, idx) => ({ inst, idx }))
      .filter(x => x.inst.saleId === saleId && x.inst.status !== 'Cancelado')
      .sort((a, b) => a.inst.installmentNumber - b.inst.installmentNumber);

    for (const { inst, idx } of saleInstIndexes) {
      if (unallocated <= 0.0001) break;

      const instRemaining = Math.max(0, Number((inst.amount - (inst.paidAmount || 0)).toFixed(2)));
      if (instRemaining <= 0.0001) continue;

      const alloc = Math.min(unallocated, instRemaining);
      newAllocations.push({
        id: `alloc-${Date.now()}-${newAllocations.length + 1}`,
        paymentId,
        installmentId: inst.id,
        installmentNumber: inst.installmentNumber,
        amount: Number(alloc.toFixed(2)),
        createdAt: nowIso,
      });

      const newPaid = Number(((inst.paidAmount || 0) + alloc).toFixed(2));
      const newRem = Math.max(0, Number((inst.amount - newPaid).toFixed(2)));

      const todayStr = new Date().toISOString().split('T')[0];
      let newStatus: InstallmentStatus = 'Pendente';
      if (newRem <= 0.001) {
        newStatus = 'Pago';
      } else if (newPaid > 0) {
        newStatus = 'Parcial';
      } else if (inst.dueDate < todayStr) {
        newStatus = 'Atrasado';
      }

      updatedInstallments[idx] = {
        ...inst,
        paidAmount: newPaid,
        remainingAmount: newRem,
        status: newStatus,
        paymentDate: newRem <= 0.001 ? paymentData.paymentDate : inst.paymentDate,
        paymentMethod: paymentData.paymentMethod,
      };

      unallocated = Number((unallocated - alloc).toFixed(2));
    }

    const newPaymentRecord: PaymentRecord = {
      id: paymentId,
      saleId,
      customerId: targetSale.customerId,
      customerName: targetSale.customerName,
      amount: paymentData.amount,
      paymentDate: paymentData.paymentDate,
      paymentMethod: paymentData.paymentMethod,
      notes: paymentData.notes || '',
      createdBy: user?.name || 'Operador ERP',
      createdAt: nowIso,
      allocations: newAllocations,
    };

    setRawPayments(prev => [newPaymentRecord, ...prev]);
    setRawInstallments(updatedInstallments);

    // Registra receita de caixa confirmada
    const revenue: Revenue = {
      id: `rev-${paymentId}`,
      date: paymentData.paymentDate,
      source: `Recebimento Venda ${saleId}`,
      referenceId: saleId,
      category: 'Vendas Diretas',
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      status: 'Pago',
    };
    setRawRevenues(prev => [revenue, ...prev]);

    supabaseService.insertPayment(newPaymentRecord);
    supabaseService.insertRevenue(revenue);
    updatedInstallments
      .filter(i => i.saleId === saleId)
      .forEach(inst => supabaseService.updateInstallment(inst.id, inst));

    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'admin', name: 'Administrador', email: 'admin' },
      'PAYMENT_CREATED',
      { id: paymentId, name: `Pagamento Venda ${saleId}` },
      { amount: paymentData.amount, saleId, allocationsCount: newAllocations.length }
    );

    return { success: true };
  };

  const undoPayment = (paymentId: string): { success: boolean; error?: string } => {
    const targetPayment = rawPayments.find(p => p.id === paymentId);
    if (!targetPayment) return { success: false, error: 'Pagamento não localizado.' };

    const updatedInstallments = rawInstallments.map(inst => {
      const alloc = (targetPayment.allocations || []).find(a => a.installmentId === inst.id);
      if (!alloc) return inst;

      const newPaid = Math.max(0, Number(((inst.paidAmount || 0) - alloc.amount).toFixed(2)));
      const newRem = Math.max(0, Number((inst.amount - newPaid).toFixed(2)));

      const todayStr = new Date().toISOString().split('T')[0];
      let newStatus: InstallmentStatus = 'Pendente';
      if (newRem <= 0.001 && newPaid > 0) {
        newStatus = 'Pago';
      } else if (newPaid > 0) {
        newStatus = 'Parcial';
      } else if (inst.dueDate < todayStr) {
        newStatus = 'Atrasado';
      }

      return {
        ...inst,
        paidAmount: newPaid,
        remainingAmount: newRem,
        status: newStatus,
      };
    });

    setRawInstallments(updatedInstallments);
    setRawPayments(prev => prev.filter(p => p.id !== paymentId));
    setRawRevenues(prev => prev.filter(r => r.id !== `rev-${paymentId}`));

    supabaseService.deletePayment(paymentId);
    updatedInstallments
      .filter(i => i.saleId === targetPayment.saleId)
      .forEach(inst => supabaseService.updateInstallment(inst.id, inst));

    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'admin', name: 'Administrador', email: 'admin' },
      'PAYMENT_REVERSED',
      { id: paymentId, name: `Estorno Pagamento ${paymentId}` },
      { amount: targetPayment.amount, saleId: targetPayment.saleId }
    );

    return { success: true };
  };

  const updatePayment = (
    paymentId: string, 
    updatedData: { amount: number; paymentDate: string; paymentMethod: PaymentMethod; notes?: string }
  ): { success: boolean; error?: string } => {
    const targetPayment = rawPayments.find(p => p.id === paymentId);
    if (!targetPayment) return { success: false, error: 'Pagamento não localizado.' };

    if (updatedData.amount !== targetPayment.amount) {
      const saleId = targetPayment.saleId;
      const undoRes = undoPayment(paymentId);
      if (!undoRes.success) return undoRes;
      return registerPayment(saleId, updatedData);
    }

    setRawPayments(prev => prev.map(p => p.id === paymentId ? {
      ...p,
      paymentDate: updatedData.paymentDate,
      paymentMethod: updatedData.paymentMethod,
      notes: updatedData.notes || '',
    } : p));

    supabaseService.updatePayment(paymentId, updatedData);

    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'admin', name: 'Administrador', email: 'admin' },
      'PAYMENT_EDITED',
      { id: paymentId, name: `Edição Pagamento ${paymentId}` },
      { amount: updatedData.amount, paymentMethod: updatedData.paymentMethod }
    );

    return { success: true };
  };

  const updateInstallmentDueDate = (installmentId: string, newDueDate: string): { success: boolean; error?: string } => {
    const inst = rawInstallments.find(i => i.id === installmentId);
    if (!inst) return { success: false, error: 'Parcela não localizada.' };

    const todayStr = new Date().toISOString().split('T')[0];
    let newStatus: InstallmentStatus = inst.status;
    if (inst.status !== 'Pago') {
      if ((inst.paidAmount || 0) > 0) {
        newStatus = 'Parcial';
      } else if (newDueDate < todayStr) {
        newStatus = 'Atrasado';
      } else {
        newStatus = 'Pendente';
      }
    }

    const updatedInst: Installment = {
      ...inst,
      dueDate: newDueDate,
      status: newStatus,
    };

    setRawInstallments(prev => prev.map(i => i.id === installmentId ? updatedInst : i));
    supabaseService.updateInstallment(installmentId, updatedInst);

    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'admin', name: 'Administrador', email: 'admin' },
      'INSTALLMENT_DUE_DATE_CHANGED',
      { id: installmentId, name: `Parcela ${inst.installmentNumber}/${inst.totalInstallments}` },
      { oldDueDate: inst.dueDate, newDueDate }
    );

    return { success: true };
  };

  // Compatibilidade retroativa para chamadas diretas por parcela
  const registerInstallmentPayment = (
    installmentId: string, 
    paymentData: { amount: number; paymentDate: string; paymentMethod: PaymentMethod; notes?: string }
  ) => {
    const inst = rawInstallments.find(i => i.id === installmentId);
    if (!inst) return;
    registerPayment(inst.saleId, paymentData);
  };

  const undoInstallmentPayment = (_installmentId: string, paymentId: string) => {
    undoPayment(paymentId);
  };

  const updateVariantStock = (variantId: string, newQty: number, type: MovementType, reason: string) => {
    if (!hasPermission('inventory.adjust')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para ajustar estoque.');
    }

    const targetVariant = rawVariants.find(v => v.id === variantId);
    if (!targetVariant) return;

    const diff = newQty - targetVariant.currentStock;
    const model = rawModels.find(m => m.id === targetVariant.modelId);

    setRawVariants(prev => 
      prev.map(v => v.id === variantId ? { ...v, currentStock: newQty } : v)
    );

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      variantId,
      productName: model?.name || 'Produto',
      sku: targetVariant.sku,
      colorName: targetVariant.colorName,
      size: targetVariant.size,
      type,
      quantity: diff,
      reason,
      user: user?.name || 'Operador ERP',
    };

    setRawMovements(prev => [newMovement, ...prev]);

    supabaseService.updateVariantStock(variantId, newQty);
    supabaseService.insertMovement(newMovement);
  };

  const addStockMovement = (variantId: string, type: MovementType, qty: number, reason: string) => {
    if (!hasPermission('inventory.adjust')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para registrar movimentações.');
    }

    const targetVariant = rawVariants.find(v => v.id === variantId);
    if (!targetVariant) return;

    const delta = (type === 'Venda' || type === 'Perda') ? -Math.abs(qty) : Math.abs(qty);
    const newStock = Math.max(0, targetVariant.currentStock + delta);
    const model = rawModels.find(m => m.id === targetVariant.modelId);

    setRawVariants(prev => 
      prev.map(v => v.id === variantId ? { ...v, currentStock: newStock } : v)
    );

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      variantId,
      productName: model?.name || 'Produto',
      sku: targetVariant.sku,
      colorName: targetVariant.colorName,
      size: targetVariant.size,
      type,
      quantity: delta,
      reason,
      user: user?.name || 'Operador ERP',
    };

    setRawMovements(prev => [newMovement, ...prev]);

    supabaseService.updateVariantStock(variantId, newStock);
    supabaseService.insertMovement(newMovement);
  };

  // ============================================================================
  // CUSTOMERS
  // ============================================================================
  const addCustomer = (customerData: Omit<Customer, 'id' | 'firstPurchaseDate' | 'lastPurchaseDate' | 'totalOrders' | 'totalSpent'>): Customer => {
    if (!hasPermission('customers.create')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para cadastrar clientes.');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${String(rawCustomers.length + 1).padStart(3, '0')}`,
      firstPurchaseDate: todayStr,
      lastPurchaseDate: todayStr,
      totalOrders: 0,
      totalSpent: 0,
    };
    setRawCustomers(prev => [...prev, newCustomer]);
    supabaseService.insertCustomer(newCustomer);
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'CUSTOMER_CREATED',
      { id: newCustomer.id, name: newCustomer.name }
    );
    return newCustomer;
  };

  const updateCustomer = (id: string, customerData: Partial<Customer>) => {
    if (!hasPermission('customers.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para editar clientes.');
    }
    setRawCustomers(prev => prev.map(c => c.id === id ? { ...c, ...customerData } : c));
    supabaseService.updateCustomer(id, customerData);
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'CUSTOMER_UPDATED',
      { id, name: customerData.name || id },
      customerData
    );
  };

  const archiveCustomer = (id: string) => {
    if (!hasPermission('customers.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para arquivar clientes.');
    }
    const target = rawCustomers.find(c => c.id === id);
    setRawCustomers(prev => prev.map(c => c.id === id ? { ...c, status: 'Arquivado' } : c));
    supabaseService.updateCustomer(id, { status: 'Arquivado' });
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'CUSTOMER_ARCHIVED',
      { id, name: target?.name || id }
    );
  };

  const reactivateCustomer = (id: string) => {
    if (!hasPermission('customers.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para reativar clientes.');
    }
    setRawCustomers(prev => prev.map(c => c.id === id ? { ...c, status: 'Ativo' } : c));
    supabaseService.updateCustomer(id, { status: 'Ativo' });
  };

  const deleteCustomer = (id: string): { success: boolean; reason?: string } => {
    if (!hasPermission('customers.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para excluir clientes.');
    }
    const hasHistory = rawSales.some(s => s.customerId === id);
    if (hasHistory) {
      return {
        success: false,
        reason: 'Este cliente possui histórico de vendas e compras registrado no sistema. Por segurança e conformidade, ele não pode ser excluído fisicamente. Utilize a opção "Arquivar cliente".',
      };
    }
    setRawCustomers(prev => prev.filter(c => c.id !== id));
    supabaseService.deleteCustomer(id);
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'CUSTOMER_DELETED',
      { id, name: id }
    );
    return { success: true };
  };

  // ============================================================================
  // EMPLOYEES (FUNCIONÁRIOS / VENDEDORES)
  // ============================================================================
  const addEmployee = (employeeData: Omit<Employee, 'id' | 'createdAt'>): Employee => {
    if (!hasPermission('employees.create')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para cadastrar funcionários.');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newEmployee: Employee = {
      ...employeeData,
      id: `emp-${String(rawEmployees.length + 1).padStart(3, '0')}`,
      createdAt: todayStr,
      createdBy: user?.name || 'Administrador',
    };

    setRawEmployees(prev => [...prev, newEmployee]);
    supabaseService.insertEmployee(newEmployee);
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'EMPLOYEE_CREATED',
      { id: newEmployee.id, name: newEmployee.name },
      { jobTitle: newEmployee.jobTitle, isSeller: newEmployee.isSeller }
    );
    return newEmployee;
  };

  const updateEmployee = (id: string, employeeData: Partial<Employee>) => {
    if (!hasPermission('employees.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para editar funcionários.');
    }
    setRawEmployees(prev => prev.map(e => e.id === id ? { ...e, ...employeeData } : e));
    supabaseService.updateEmployee(id, employeeData);
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'EMPLOYEE_UPDATED',
      { id, name: employeeData.name || id },
      employeeData
    );
  };

  const archiveEmployee = (id: string) => {
    if (!hasPermission('employees.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para desativar funcionários.');
    }
    const target = rawEmployees.find(e => e.id === id);
    const nowIso = new Date().toISOString();
    setRawEmployees(prev => prev.map(e => e.id === id ? { ...e, status: 'Inativo', archivedAt: nowIso } : e));
    supabaseService.updateEmployee(id, { status: 'Inativo', archivedAt: nowIso });
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'EMPLOYEE_ARCHIVED',
      { id, name: target?.name || id }
    );
  };

  const reactivateEmployee = (id: string) => {
    if (!hasPermission('employees.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para reativar funcionários.');
    }
    setRawEmployees(prev => prev.map(e => e.id === id ? { ...e, status: 'Ativo', archivedAt: undefined } : e));
    supabaseService.updateEmployee(id, { status: 'Ativo', archivedAt: undefined });
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'EMPLOYEE_REACTIVATED',
      { id }
    );
  };

  const deleteEmployee = (id: string): { success: boolean; reason?: string } => {
    if (!hasPermission('employees.delete')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para excluir funcionários.');
    }
    const target = rawEmployees.find(e => e.id === id);
    const hasHistory = rawSales.some(s => s.sellerId === id || (target && s.sellerName === target.name));
    if (hasHistory) {
      return {
        success: false,
        reason: 'Este colaborador possui histórico de vendas vinculado. Para manter a integridade dos relatórios e comissões, ele não pode ser excluído fisicamente. Utilize a opção "Desativar colaborador".',
      };
    }
    setRawEmployees(prev => prev.filter(e => e.id !== id));
    supabaseService.deleteEmployee(id);
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'EMPLOYEE_DELETED',
      { id, name: target?.name || id }
    );
    return { success: true };
  };

  // ============================================================================
  // FINANCE
  // ============================================================================
  const addRevenue = (revenueData: Omit<Revenue, 'id'>): Revenue => {
    if (!hasPermission('finance.manage')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para lançar receitas.');
    }

    const newRev: Revenue = {
      ...revenueData,
      id: `rev-${Date.now()}`,
    };
    setRawRevenues(prev => [newRev, ...prev]);
    supabaseService.insertRevenue(newRev);
    return newRev;
  };

  const addExpense = (expenseData: Omit<Expense, 'id'>): Expense => {
    if (!hasPermission('finance.manage')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para lançar despesas.');
    }

    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setRawExpenses(prev => [newExp, ...prev]);
    supabaseService.insertExpense(newExp);
    return newExp;
  };

  // Filter Sales according to selected PeriodFilter and Search
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchId = s.id.toLowerCase().includes(q);
        const matchCustomer = s.customerName.toLowerCase().includes(q);
        const matchSeller = s.sellerName?.toLowerCase().includes(q);
        const matchReferral = s.referralName?.toLowerCase().includes(q);
        const matchProduct = s.items.some(i => i.productName.toLowerCase().includes(q) || (i.sku && i.sku.toLowerCase().includes(q)));
        if (!matchId && !matchCustomer && !matchSeller && !matchReferral && !matchProduct) return false;
      }
      return true;
    });
  }, [sales, searchQuery]);

  const filteredRevenues = useMemo(() => {
    return revenues;
  }, [revenues]);

  const filteredExpenses = useMemo(() => {
    return expenses;
  }, [expenses]);

  // Dashboard Metrics Calculation
  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    const completedSales = filteredSales.filter(s => s.status !== 'Cancelado');
    const faturamento = completedSales.reduce((acc, s) => acc + s.total, 0);
    const vendasCount = completedSales.length;
    const ticketMedio = vendasCount > 0 ? faturamento / vendasCount : 0;
    const produtosVendidos = completedSales.reduce((acc, s) => 
      acc + s.items.reduce((sum, item) => sum + item.quantity, 0), 0
    );

    const faturamentoPrevious = faturamento * 0.88;
    const vendasPreviousCount = Math.round(vendasCount * 0.9);

    // Indicadores Financeiros Derivados (Faturamento Comercial vs Caixa Real vs Contas a Receber)
    const totalRecebido = revenues
      .filter(r => r.status === 'Pago')
      .reduce((sum, r) => sum + r.amount, 0);

    const todayDateStr = new Date().toISOString().split('T')[0];

    const activeInstallments = installments.filter(i => i.status !== 'Cancelado' && i.status !== 'Pago');
    const totalReceber = activeInstallments.reduce((sum, i) => sum + i.remainingAmount, 0);

    const totalEmAtraso = activeInstallments
      .filter(i => i.status === 'Atrasado' || (i.dueDate < todayDateStr && i.remainingAmount > 0))
      .reduce((sum, i) => sum + i.remainingAmount, 0);

    if (isSeller) {
      return {
        faturamento,
        faturamentoPrevious,
        vendasCount,
        vendasPreviousCount,
        ticketMedio,
        lucroEstimado: 0,
        margemMedia: 0,
        produtosVendidos,
        custoTotalVendas: 0,
        isCommercialOnly: true,
        totalRecebido,
        totalReceber,
        totalEmAtraso,
      };
    }

    const custoTotalVendas = completedSales.reduce((acc, s) => acc + s.totalCost, 0);
    const lucroEstimado = faturamento - custoTotalVendas;
    const margemMedia = faturamento > 0 ? (lucroEstimado / faturamento) * 100 : 0;

    return {
      faturamento,
      faturamentoPrevious,
      vendasCount,
      vendasPreviousCount,
      ticketMedio,
      lucroEstimado,
      margemMedia,
      produtosVendidos,
      custoTotalVendas,
      isCommercialOnly: false,
      totalRecebido,
      totalReceber,
      totalEmAtraso,
    };
  }, [filteredSales, revenues, installments, isSeller]);

  return (
    <ERPContext.Provider value={{
      models,
      variants,
      customers,
      employees,
      sales,
      movements,
      revenues,
      expenses,
      suppliers,
      purchases,
      installments,
      periodFilter,
      currentTab,
      searchQuery,
      isSidebarCollapsed,
      isMobileSidebarOpen,
      supabaseStatus,
      supabaseHealth,
      isLoadingData,
      refreshData,
      setPeriodFilter,
      setCurrentTab,
      setSearchQuery,
      toggleSidebarCollapse,
      setIsMobileSidebarOpen,
      addSale,
      updateSale,
      updateSaleStatus,
      cancelSale,
      deleteSale,
      addModel,
      updateModel,
      archiveModel,
      reactivateModel,
      deleteModel,
      addVariant,
      updateVariant,
      deleteVariant,
      updateVariantStock,
      addStockMovement,
      addCustomer,
      updateCustomer,
      archiveCustomer,
      reactivateCustomer,
      deleteCustomer,
      addEmployee,
      updateEmployee,
      archiveEmployee,
      reactivateEmployee,
      deleteEmployee,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addPurchase,
      updatePurchase,
      deletePurchase,
      payments: rawPayments,
      registerPayment,
      undoPayment,
      updatePayment,
      registerInstallmentPayment,
      undoInstallmentPayment,
      updateInstallmentDueDate,
      addRevenue,
      addExpense,
      dashboardMetrics,
      filteredSales,
      filteredRevenues,
      filteredExpenses,
    }}>
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
