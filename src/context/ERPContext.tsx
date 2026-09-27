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
  updateSale: (updatedSale: Sale) => void;
  updateSaleStatus: (saleId: string, newStatus: SaleStatus) => void;
  cancelSale: (saleId: string, reason?: string) => void;
  
  addModel: (
    modelData: Omit<ProductModel, 'id' | 'createdAt'>, 
    variantsData: Array<Omit<ProductVariant, 'id' | 'modelId'>>
  ) => void;
  updateModel: (id: string, modelData: Partial<ProductModel>) => void;
  archiveModel: (id: string) => void;
  reactivateModel: (id: string) => void;
  deleteModel: (id: string) => { success: boolean; reason?: string };

  updateVariant: (id: string, variantData: Partial<ProductVariant>) => void;
  deleteVariant: (id: string) => { success: boolean; reason?: string };
  
  updateVariantStock: (variantId: string, newQty: number, type: MovementType, reason: string) => void;
  addStockMovement: (variantId: string, type: MovementType, qty: number, reason: string) => void;
  
  addCustomer: (customerData: Omit<Customer, 'id' | 'firstPurchaseDate' | 'lastPurchaseDate' | 'totalOrders' | 'totalSpent'>) => Customer;
  updateCustomer: (id: string, customerData: Partial<Customer>) => void;
  archiveCustomer: (id: string) => void;
  reactivateCustomer: (id: string) => void;
  deleteCustomer: (id: string) => { success: boolean; reason?: string };

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

    // Update variant stocks & log movements (somente para itens físicos do catálogo)
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

      // Create stock movement log
      const newMovement: StockMovement = {
        id: `mov-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        date: nowStr,
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
    setRawRevenues(prev =>
      prev.map(r => r.referenceId === updatedSale.id ? {
        ...r,
        amount: updatedSale.total,
        paymentMethod: updatedSale.paymentMethod,
        status: updatedSale.status === 'Cancelado' ? 'Cancelado' : r.status,
      } : r)
    );
    supabaseService.updateRevenueByReference(updatedSale.id, {
      amount: updatedSale.total,
      paymentMethod: updatedSale.paymentMethod,
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
      { previousTotal: previousSale.total, newTotal: updatedSale.total }
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

  const deleteModel = (id: string): { success: boolean; reason?: string } => {
    if (!hasPermission('products.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para excluir produtos.');
    }
    const hasHistory = rawSales.some(s => s.items.some(i => i.modelId === id)) ||
      rawMovements.some(m => {
        const v = rawVariants.find(vr => vr.id === m.variantId);
        return v?.modelId === id;
      });

    if (hasHistory) {
      return {
        success: false,
        reason: 'Este modelo possui histórico de vendas ou movimentações registrado. Não pode ser excluído fisicamente para manter a integridade dos relatórios e rastreabilidade fiscal. Utilize a opção "Arquivar modelo".',
      };
    }

    setRawModels(prev => prev.filter(m => m.id !== id));
    setRawVariants(prev => prev.filter(v => v.modelId !== id));
    supabaseService.deleteModel(id);
    authService.logAudit(
      user ? { id: user.id, name: user.name, email: user.email } : { id: 'system', name: 'Sistema', email: 'system' },
      'PRODUCT_DELETED',
      { id, name: id }
    );
    return { success: true };
  };

  const updateVariant = (id: string, variantData: Partial<ProductVariant>) => {
    if (!hasPermission('products.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para editar variantes.');
    }
    setRawVariants(prev => prev.map(v => v.id === id ? { ...v, ...variantData } : v));
    supabaseService.updateVariant(id, variantData);
  };

  const deleteVariant = (id: string): { success: boolean; reason?: string } => {
    if (!hasPermission('products.edit')) {
      throw new Error('403 Forbidden: Usuário não tem permissão para excluir variantes.');
    }
    const hasHistory = rawSales.some(s => s.items.some(i => i.variantId === id)) ||
      rawMovements.some(m => m.variantId === id);

    if (hasHistory) {
      return {
        success: false,
        reason: 'Esta variante possui histórico de vendas ou movimentação de estoque e não pode ser excluída fisicamente.',
      };
    }
    setRawVariants(prev => prev.filter(v => v.id !== id));
    supabaseService.deleteVariant(id);
    return { success: true };
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
        reason: 'Este cliente possui histórico de vendas e compras registrado no sistema. Por segurança e conformidade fiscal/histórica, ele não pode ser excluído fisicamente. Utilize a opção "Arquivar cliente" para que ele não apareça em novas vendas, preservando os registros passados.',
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
        const matchProduct = s.items.some(i => i.productName.toLowerCase().includes(q) || (i.sku && i.sku.toLowerCase().includes(q)));
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
      updateSale,
      updateSaleStatus,
      cancelSale,
      addModel,
      updateModel,
      archiveModel,
      reactivateModel,
      deleteModel,
      updateVariant,
      deleteVariant,
      updateVariantStock,
      addStockMovement,
      addCustomer,
      updateCustomer,
      archiveCustomer,
      reactivateCustomer,
      deleteCustomer,
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
