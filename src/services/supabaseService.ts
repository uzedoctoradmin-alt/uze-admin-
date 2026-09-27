import { supabase } from './supabase';
import type {
  ProductModel,
  ProductVariant,
  Customer,
  Sale,
  StockMovement,
  Revenue,
  Expense,
} from '../types';

export const supabaseService = {
  // ==========================================
  // MODELS & VARIANTS
  // ==========================================
  async fetchModels(): Promise<ProductModel[] | null> {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] fetchModels warning:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        collection: row.collection || '',
        description: row.description || '',
        basePrice: Number(row.base_price) || 0,
        baseCost: Number(row.base_cost) || 0,
        gender: row.gender,
        status: row.status,
        imageUrl: row.image_url || '',
        createdAt: row.created_at ? row.created_at.split('T')[0] : '',
      }));
    } catch (err) {
      console.warn('[Supabase] fetchModels exception:', err);
      return null;
    }
  },

  async insertModel(model: ProductModel, variants: ProductVariant[]): Promise<boolean> {
    try {
      const { error: modelError } = await supabase.from('models').insert({
        id: model.id,
        name: model.name,
        category: model.category,
        collection: model.collection,
        description: model.description,
        base_price: model.basePrice,
        base_cost: model.baseCost,
        gender: model.gender,
        status: model.status,
        image_url: model.imageUrl,
      });

      if (modelError) {
        console.error('[Supabase] insertModel error:', modelError);
        return false;
      }

      if (variants.length > 0) {
        const variantRows = variants.map(v => ({
          id: v.id,
          model_id: v.modelId,
          sku: v.sku,
          color_name: v.colorName,
          color_hex: v.colorHex,
          size: v.size,
          current_stock: v.currentStock,
          min_stock: v.minStock,
        }));

        const { error: varError } = await supabase.from('variants').insert(variantRows);
        if (varError) {
          console.error('[Supabase] insertVariants error:', varError);
        }
      }

      return true;
    } catch (err) {
      console.error('[Supabase] insertModel exception:', err);
      return false;
    }
  },

  async fetchVariants(): Promise<ProductVariant[] | null> {
    try {
      const { data, error } = await supabase.from('variants').select('*');
      if (error) {
        console.warn('[Supabase] fetchVariants warning:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        modelId: row.model_id,
        sku: row.sku,
        colorName: row.color_name,
        colorHex: row.color_hex,
        size: row.size,
        currentStock: Number(row.current_stock) || 0,
        minStock: Number(row.min_stock) || 5,
      }));
    } catch (err) {
      console.warn('[Supabase] fetchVariants exception:', err);
      return null;
    }
  },

  async updateVariantStock(variantId: string, newStock: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('variants')
        .update({ current_stock: newStock })
        .eq('id', variantId);

      if (error) {
        console.error('[Supabase] updateVariantStock error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] updateVariantStock exception:', err);
      return false;
    }
  },

  // ==========================================
  // CUSTOMERS
  // ==========================================
  async fetchCustomers(): Promise<Customer[] | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] fetchCustomers warning:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email || '',
        phone: row.phone || '',
        document: row.document || '',
        city: row.city || '',
        state: row.state || '',
        firstPurchaseDate: row.first_purchase_date || '',
        lastPurchaseDate: row.last_purchase_date || '',
        totalOrders: Number(row.total_orders) || 0,
        totalSpent: Number(row.total_spent) || 0,
      }));
    } catch (err) {
      console.warn('[Supabase] fetchCustomers exception:', err);
      return null;
    }
  },

  async insertCustomer(customer: Customer): Promise<boolean> {
    try {
      const { error } = await supabase.from('customers').insert({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        document: customer.document,
        city: customer.city,
        state: customer.state,
        first_purchase_date: customer.firstPurchaseDate || null,
        last_purchase_date: customer.lastPurchaseDate || null,
        total_orders: customer.totalOrders,
        total_spent: customer.totalSpent,
      });

      if (error) {
        console.error('[Supabase] insertCustomer error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] insertCustomer exception:', err);
      return false;
    }
  },

  async updateCustomerStats(
    customerId: string,
    lastPurchaseDate: string,
    totalOrders: number,
    totalSpent: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          last_purchase_date: lastPurchaseDate,
          total_orders: totalOrders,
          total_spent: totalSpent,
        })
        .eq('id', customerId);

      if (error) {
        console.error('[Supabase] updateCustomerStats error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] updateCustomerStats exception:', err);
      return false;
    }
  },

  // ==========================================
  // SALES
  // ==========================================
  async fetchSales(): Promise<Sale[] | null> {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] fetchSales warning:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerEmail: row.customer_email || '',
        subtotal: Number(row.subtotal) || 0,
        discount: Number(row.discount) || 0,
        shipping: Number(row.shipping) || 0,
        total: Number(row.total) || 0,
        totalCost: Number(row.total_cost) || 0,
        estimatedProfit: Number(row.estimated_profit) || 0,
        paymentMethod: row.payment_method,
        status: row.status,
        items: row.items || [],
      }));
    } catch (err) {
      console.warn('[Supabase] fetchSales exception:', err);
      return null;
    }
  },

  async insertSale(sale: Sale): Promise<boolean> {
    try {
      const { error } = await supabase.from('sales').insert({
        id: sale.id,
        date: sale.date,
        customer_id: sale.customerId,
        customer_name: sale.customerName,
        customer_email: sale.customerEmail,
        subtotal: sale.subtotal,
        discount: sale.discount,
        shipping: sale.shipping,
        total: sale.total,
        total_cost: sale.totalCost,
        estimated_profit: sale.estimatedProfit,
        payment_method: sale.paymentMethod,
        status: sale.status,
        items: sale.items,
      });

      if (error) {
        console.error('[Supabase] insertSale error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] insertSale exception:', err);
      return false;
    }
  },

  async updateSaleStatus(saleId: string, newStatus: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ status: newStatus })
        .eq('id', saleId);

      if (error) {
        console.error('[Supabase] updateSaleStatus error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] updateSaleStatus exception:', err);
      return false;
    }
  },

  // ==========================================
  // STOCK MOVEMENTS
  // ==========================================
  async fetchMovements(): Promise<StockMovement[] | null> {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] fetchMovements warning:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        variantId: row.variant_id,
        productName: row.product_name,
        sku: row.sku,
        colorName: row.color_name || '',
        size: row.size || '',
        type: row.type,
        quantity: Number(row.quantity) || 0,
        reason: row.reason || '',
        user: row.operator || 'Operador ERP',
      }));
    } catch (err) {
      console.warn('[Supabase] fetchMovements exception:', err);
      return null;
    }
  },

  async insertMovement(movement: StockMovement): Promise<boolean> {
    try {
      const { error } = await supabase.from('stock_movements').insert({
        id: movement.id,
        date: movement.date,
        variant_id: movement.variantId,
        product_name: movement.productName,
        sku: movement.sku,
        color_name: movement.colorName,
        size: movement.size,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        operator: movement.user,
      });

      if (error) {
        console.error('[Supabase] insertMovement error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] insertMovement exception:', err);
      return false;
    }
  },

  // ==========================================
  // REVENUES & EXPENSES
  // ==========================================
  async fetchRevenues(): Promise<Revenue[] | null> {
    try {
      const { data, error } = await supabase
        .from('revenues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] fetchRevenues warning:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        source: row.source,
        referenceId: row.reference_id,
        category: row.category,
        amount: Number(row.amount) || 0,
        paymentMethod: row.payment_method,
      }));
    } catch (err) {
      console.warn('[Supabase] fetchRevenues exception:', err);
      return null;
    }
  },

  async insertRevenue(revenue: Revenue): Promise<boolean> {
    try {
      const { error } = await supabase.from('revenues').insert({
        id: revenue.id,
        date: revenue.date,
        source: revenue.source,
        reference_id: revenue.referenceId,
        category: revenue.category,
        amount: revenue.amount,
        payment_method: revenue.paymentMethod,
      });

      if (error) {
        console.error('[Supabase] insertRevenue error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] insertRevenue exception:', err);
      return false;
    }
  },

  async fetchExpenses(): Promise<Expense[] | null> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] fetchExpenses warning:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        description: row.description,
        category: row.category,
        amount: Number(row.amount) || 0,
        paymentMethod: row.payment_method,
        notes: row.notes,
      }));
    } catch (err) {
      console.warn('[Supabase] fetchExpenses exception:', err);
      return null;
    }
  },

  async insertExpense(expense: Expense): Promise<boolean> {
    try {
      const { error } = await supabase.from('expenses').insert({
        id: expense.id,
        date: expense.date,
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        payment_method: expense.paymentMethod,
        notes: expense.notes,
      });

      if (error) {
        console.error('[Supabase] insertExpense error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] insertExpense exception:', err);
      return false;
    }
  },
};
