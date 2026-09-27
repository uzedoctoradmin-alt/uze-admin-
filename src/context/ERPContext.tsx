import React, { createContext, useContext, useState, useMemo } from 'react';
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
}

interface ERPContextType {
  // State
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

  // Setters & Actions
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
  const [models, setModels] = useState<ProductModel[]>(INITIAL_MODELS);
  const [variants, setVariants] = useState<ProductVariant[]>(INITIAL_VARIANTS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [movements, setMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
  const [revenues, setRevenues] = useState<Revenue[]>(INITIAL_REVENUES);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('Este mês');
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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

  // Add Sale Workflow: automatically adjusts stock, creates logs & revenue
  const addSale = (saleData: Omit<Sale, 'id' | 'date'>): Sale => {
    const saleId = `#${String(sales.length + 185).padStart(5, '0')}`;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    
    const newSale: Sale = {
      ...saleData,
      id: saleId,
      date: nowStr,
    };

    setSales(prev => [newSale, ...prev]);

    // Update variant stocks & log movements
    newSale.items.forEach(item => {
      setVariants(prevVariants => 
        prevVariants.map(v => {
          if (v.id === item.variantId) {
            const updatedStock = Math.max(0, v.currentStock - item.quantity);
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
        user: 'Sistema ERP',
      };

      setMovements(prev => [newMovement, ...prev]);
    });

    // Create automated revenue record if payment is made/pending
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
      setRevenues(prev => [newRevenue, ...prev]);
    }

    // Update customer stats
    setCustomers(prev => 
      prev.map(c => {
        if (c.id === newSale.customerId) {
          return {
            ...c,
            lastPurchaseDate: nowStr.split(' ')[0],
            totalOrders: c.totalOrders + 1,
            totalSpent: c.totalSpent + newSale.total,
          };
        }
        return c;
      })
    );

    return newSale;
  };

  const updateSaleStatus = (saleId: string, newStatus: SaleStatus) => {
    setSales(prev => 
      prev.map(s => s.id === saleId ? { ...s, status: newStatus } : s)
    );
  };

  const addModel = (
    modelData: Omit<ProductModel, 'id' | 'createdAt'>, 
    variantsData: Array<Omit<ProductVariant, 'id' | 'modelId'>>
  ) => {
    const modelId = `mod-${String(models.length + 1).padStart(3, '0')}`;
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

    setModels(prev => [...prev, newModel]);
    setVariants(prev => [...prev, ...newVariants]);
  };

  const updateVariantStock = (variantId: string, newQty: number, type: MovementType, reason: string) => {
    const targetVariant = variants.find(v => v.id === variantId);
    if (!targetVariant) return;

    const diff = newQty - targetVariant.currentStock;
    const model = models.find(m => m.id === targetVariant.modelId);

    setVariants(prev => 
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
      user: 'Operador ERP',
    };

    setMovements(prev => [newMovement, ...prev]);
  };

  const addStockMovement = (variantId: string, type: MovementType, qty: number, reason: string) => {
    const targetVariant = variants.find(v => v.id === variantId);
    if (!targetVariant) return;

    const delta = (type === 'Venda' || type === 'Perda') ? -Math.abs(qty) : Math.abs(qty);
    const newStock = Math.max(0, targetVariant.currentStock + delta);
    const model = models.find(m => m.id === targetVariant.modelId);

    setVariants(prev => 
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
      user: 'Operador ERP',
    };

    setMovements(prev => [newMovement, ...prev]);
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'firstPurchaseDate' | 'lastPurchaseDate' | 'totalOrders' | 'totalSpent'>): Customer => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${String(customers.length + 1).padStart(3, '0')}`,
      firstPurchaseDate: todayStr,
      lastPurchaseDate: todayStr,
      totalOrders: 0,
      totalSpent: 0,
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };

  const addRevenue = (revenueData: Omit<Revenue, 'id'>): Revenue => {
    const newRev: Revenue = {
      ...revenueData,
      id: `rev-${Date.now()}`,
    };
    setRevenues(prev => [newRev, ...prev]);
    return newRev;
  };

  const addExpense = (expenseData: Omit<Expense, 'id'>): Expense => {
    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses(prev => [newExp, ...prev]);
    return newExp;
  };

  // Filter Sales according to selected PeriodFilter
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

  // Dashboard Metrics Calculation
  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    const completedSales = filteredSales.filter(s => s.status !== 'Cancelado');
    const faturamento = completedSales.reduce((acc, s) => acc + s.total, 0);
    const custoTotalVendas = completedSales.reduce((acc, s) => acc + s.totalCost, 0);
    const lucroEstimado = faturamento - custoTotalVendas;
    const margemMedia = faturamento > 0 ? (lucroEstimado / faturamento) * 100 : 0;
    const vendasCount = completedSales.length;
    const ticketMedio = vendasCount > 0 ? faturamento / vendasCount : 0;
    const produtosVendidos = completedSales.reduce((acc, s) => 
      acc + s.items.reduce((sum, item) => sum + item.quantity, 0), 0
    );

    // Mock comparison values for period-over-period visualization
    const faturamentoPrevious = faturamento * 0.88;
    const vendasPreviousCount = Math.round(vendasCount * 0.9);

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
    };
  }, [filteredSales]);

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
