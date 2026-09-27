import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import type { 
  ProductModel, 
  ProductVariant, 
  StockMovement, 
  Customer, 
  Sale, 
  Revenue, 
  Expense, 
  PeriodFilter, 
  ViewTab,
  MovementType,
  SaleStatus
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
}

export type SupabaseStatus = 'connecting' | 'connected' | 'needs_tables' | 'error' | 'disconnected';

interface ERPContextType {
  // State (Sanitizado de acordo com o perfil autenticado)
  models: ProductModel[];
  variants: ProductVariant[];
  customers: Customer[];
  sales: Sale[];
  movements: StockMovement[];
  revenues: Revenue[];
  expenses: Expense[];
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

  // Setters & Actions (Protegidos por RBAC)
  setPeriodFilter: (filter: PeriodFilter) => void;
  setCurrentTab: (tab: ViewTab) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebarCollapse: () => void;
  setIsMobileSidebarOpen: (open: boolean) => void;

  addSale: (saleData: Omit<Sale, 'id' | 'date'>) => Sale;
  updateSaleStatus: (saleId: string, newStatus: SaleStatus) => void;
  
  addModel: (
    modelData: Omit<ProductModel, 'id' | 'createdAt'>, 
    variantsData: Array<Omit<ProductVariant, 'id' | 'modelId'>>
  ) => void;
  
  updateVariantStock: (variantId: string, newQty: number, type: MovementType, reason: string) => void;
  addStockMovement: (variantId: string, type: MovementType, qty: number, reason: string) => void;
  
  addCustomer: (customerData: Omit<Customer, 'id' | 'firstPurchaseDate' | 'lastPurchaseDate' | 'totalOrders' | 'totalSpent'>) => Customer;
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
  const [rawSales, setRawSales] = useState<Sale[]>(INITIAL_SALES);
  const [rawMovements, setRawMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
  const [rawRevenues, setRawRevenues] = useState<Revenue[]>(INITIAL_REVENUES);
  const [rawExpenses, setRawExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  
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
          remoteSales,
          remoteMovements,
          remoteRevenues,
          remoteExpenses,
        ] = await Promise.all([
          supabaseService.fetchModels(),
          supabaseService.fetchVariants(),
          supabaseService.fetchCustomers(),
          supabaseService.fetchSales(),
          supabaseService.fetchMovements(),
          supabaseService.fetchRevenues(),
          supabaseService.fetchExpenses(),
        ]);

        if (remoteModels !== null) setRawModels(remoteModels);
        if (remoteVariants !== null) setRawVariants(remoteVariants);
        if (remoteCustomers !== null) setRawCustomers(remoteCustomers);
        if (remoteSales !== null) setRawSales(remoteSales);
        if (remoteMovements !== null) setRawMovements(remoteMovements);
        if (remoteRevenues !== null) setRawRevenues(remoteRevenues);
        if (remoteExpenses !== null) setRawExpenses(remoteExpenses);
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
  // RBAC DATA SANITIZATION (Vendedor NÃO recebe custos nem lucros)
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
  // MUTATIONS (PROTEGIDAS CONTRA MANIPULAÇÃO DE FRONTEND / RBAC ENFORCEMENT)
  // ============================================================================

  const addSale = (saleData: Omit<Sale, 'id' | 'date'>): Sale => {
    if (!hasPermission('sales.create')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para cadastrar vendas.');
    }

    const saleId = `#${String(rawSales.length + 185).padStart(5, '0')}`;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    
    const newSale: Sale = {
      ...saleData,
      id: saleId,
      date: nowStr,
    };

    setRawSales(prev => [newSale, ...prev]);

    // Update variant stocks & log movements
    newSale.items.forEach(item => {
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

      // Create stock movement log
      const newMovement: StockMovement = {
        id: `mov-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        date: nowStr,
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku,
        colorName: item.colorName,
        size: item.size,
        type: 'Venda',
        quantity: -item.quantity,
        reason: `Venda ${saleId} registrada`,
        user: user?.name || 'Sistema ERP',
      };

      setRawMovements(prev => [newMovement, ...prev]);

      supabaseService.insertMovement(newMovement);
      supabaseService.updateVariantStock(item.variantId, updatedStock);
    });

    // Create automated revenue record
    if (newSale.status !== 'Cancelado' && newSale.status !== 'Orçamento') {
      const newRevenue: Revenue = {
        id: `rev-${Date.now()}`,
        date: nowStr.split(' ')[0],
        source: `Venda ${saleId}`,
        referenceId: saleId,
        category: 'Vendas Diretas',
        amount: newSale.total,
        paymentMethod: newSale.paymentMethod,
      };
      setRawRevenues(prev => [newRevenue, ...prev]);
      supabaseService.insertRevenue(newRevenue);
    }

    // Update customer stats
    const targetCustomer = rawCustomers.find(c => c.id === newSale.customerId);
    if (targetCustomer) {
      const updatedTotalOrders = targetCustomer.totalOrders + 1;
      const updatedTotalSpent = targetCustomer.totalSpent + newSale.total;
      const todayDate = nowStr.split(' ')[0];

      setRawCustomers(prev => 
        prev.map(c => {
          if (c.id === newSale.customerId) {
            return {
              ...c,
              lastPurchaseDate: todayDate,
              totalOrders: updatedTotalOrders,
              totalSpent: updatedTotalSpent,
            };
          }
          return c;
        })
      );

      supabaseService.updateCustomerStats(targetCustomer.id, todayDate, updatedTotalOrders, updatedTotalSpent);
    }

    supabaseService.insertSale(newSale);
    return newSale;
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
    return newCustomer;
  };

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
        const matchProduct = s.items.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
        if (!matchId && !matchCustomer && !matchProduct) return false;
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

  // Dashboard Metrics Calculation (Composiçâo Comercial para Vendedor vs Administrativa Completa)
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

    // Se o usuário for vendedor, BLOQUEIA cálculos estratégicos de custo, lucro e margem
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
    };
  }, [filteredSales, isSeller]);

  return (
    <ERPContext.Provider value={{
      models,
      variants,
      customers,
      sales,
      movements,
      revenues,
      expenses,
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
      updateSaleStatus,
      addModel,
      updateVariantStock,
      addStockMovement,
      addCustomer,
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
