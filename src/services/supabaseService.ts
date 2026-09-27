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

  async updateModel(id: string, updates: Partial<ProductModel>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.collection !== undefined) payload.collection = updates.collection;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.gender !== undefined) payload.gender = updates.gender;
      if (updates.basePrice !== undefined) payload.base_price = updates.basePrice;
      if (updates.baseCost !== undefined) payload.base_cost = updates.baseCost;
      if (updates.status !== undefined) {
        payload.status = updates.status;
        payload.is_active = updates.status !== 'Inativo' && updates.status !== 'Arquivado';
      }
      if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase.from('models').update(payload).eq('id', id);
      if (error) {
        console.error('[Supabase] updateModel error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] updateModel exception:', err);
      return false;
    }
  },

  async deleteModel(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('models').delete().eq('id', id);
      if (error) {
        console.error('[Supabase] deleteModel error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] deleteModel exception:', err);
      return false;
    }
  },

  async updateVariant(id: string, updates: Partial<ProductVariant>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      if (updates.colorName !== undefined) payload.color_name = updates.colorName;
      if (updates.colorHex !== undefined) payload.color_hex = updates.colorHex;
      if (updates.size !== undefined) payload.size = updates.size;
      if (updates.sku !== undefined) payload.sku = updates.sku;
      if (updates.currentStock !== undefined) payload.current_stock = updates.currentStock;
      if (updates.minStock !== undefined) payload.min_stock = updates.minStock;
      if (updates.status !== undefined) {
        payload.is_active = updates.status !== 'Inativo' && updates.status !== 'Arquivado';
      }
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase.from('variants').update(payload).eq('id', id);
      if (error) {
        console.error('[Supabase] updateVariant error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] updateVariant exception:', err);
      return false;
    }
  },

  async deleteVariant(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('variants').delete().eq('id', id);
      if (error) {
        console.error('[Supabase] deleteVariant error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] deleteVariant exception:', err);
      return false;
    }
  },

  async updateVariantStock(variantId: string, newStock: number): Promise<boolean> {
    return this.updateVariant(variantId, { currentStock: newStock });
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
        notes: row.notes || '',
        status: row.is_active === false ? 'Arquivado' : (row.status || 'Ativo'),
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
        email: customer.email || null,
        phone: customer.phone || null,
        document: customer.document || null,
        city: customer.city || null,
        state: customer.state || null,
        notes: customer.notes || null,
        first_purchase_date: customer.firstPurchaseDate || null,
        last_purchase_date: customer.lastPurchaseDate || null,
        total_orders: customer.totalOrders,
        total_spent: customer.totalSpent,
        is_active: customer.status !== 'Arquivado' && customer.status !== 'Inativo',
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

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.email !== undefined) payload.email = updates.email || null;
      if (updates.phone !== undefined) payload.phone = updates.phone || null;
      if (updates.document !== undefined) payload.document = updates.document || null;
      if (updates.city !== undefined) payload.city = updates.city || null;
      if (updates.state !== undefined) payload.state = updates.state || null;
      if (updates.notes !== undefined) payload.notes = updates.notes || null;
      if (updates.status !== undefined) {
        payload.is_active = updates.status !== 'Arquivado' && updates.status !== 'Inativo';
      }
      if (updates.totalOrders !== undefined) payload.total_orders = updates.totalOrders;
      if (updates.totalSpent !== undefined) payload.total_spent = updates.totalSpent;
      if (updates.lastPurchaseDate !== undefined) payload.last_purchase_date = updates.lastPurchaseDate;
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase.from('customers').update(payload).eq('id', id);
      if (error) {
        console.error('[Supabase] updateCustomer error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] updateCustomer exception:', err);
      return false;
    }
  },

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) {
        console.error('[Supabase] deleteCustomer error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] deleteCustomer exception:', err);
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

  async updateSale(sale: Sale): Promise<boolean> {
    try {
      const { error } = await supabase.from('sales').update({
        customer_id: sale.customerId,
        customer_name: sale.customerName,
        customer_email: sale.customerEmail || null,
        subtotal: sale.subtotal,
        discount: sale.discount,
        shipping: sale.shipping,
        total: sale.total,
        total_cost: sale.totalCost,
        estimated_profit: sale.estimatedProfit,
        payment_method: sale.paymentMethod,
        status: sale.status,
        notes: sale.notes || null,
        items: sale.items,
        updated_at: new Date().toISOString(),
      }).eq('id', sale.id);

      if (error) {
        console.error('[Supabase] updateSale error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] updateSale exception:', err);
      return false;
    }
  },

  async updateRevenueByReference(referenceId: string, updates: Partial<Revenue>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
      if (updates.status !== undefined) payload.status = updates.status;
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase.from('revenues').update(payload).eq('reference_id', referenceId);
      if (error) {
        console.error('[Supabase] updateRevenueByReference error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] updateRevenueByReference exception:', err);
      return false;
    }
  },

  async updateSaleStatus(saleId: string, newStatus: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
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
