import { supabase } from './supabase';
import type {
  ProductModel,
  ProductVariant,
  Customer,
  Employee,
  Sale,
  StockMovement,
  Revenue,
  Expense,
  Supplier,
  PurchaseEntry,
  Installment,
  PaymentRecord,
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
        description: row.description || '',
        basePrice: Number(row.base_price) || 0,
        baseCost: Number(row.base_cost) || 0,
        gender: row.gender,
        status: row.status,
        imageUrl: row.image_url || '',
        imagePath: row.image_path || '',
        availableColors: row.available_colors || undefined,
        availableSizes: row.available_sizes || undefined,
        createdAt: row.created_at ? row.created_at.split('T')[0] : '',
      }));
    } catch (err) {
      console.warn('[Supabase] fetchModels exception:', err);
      return null;
    }
  },

  async insertModel(model: ProductModel, variants: ProductVariant[]): Promise<boolean> {
    try {
      const modelPayload: Record<string, any> = {
        id: model.id,
        name: model.name,
        category: model.category,
        description: model.description,
        base_price: model.basePrice,
        base_cost: model.baseCost,
        gender: model.gender,
        status: model.status,
        image_url: model.imageUrl || null,
        image_path: model.imagePath || null,
      };

      if (model.availableColors) modelPayload.available_colors = model.availableColors;
      if (model.availableSizes) modelPayload.available_sizes = model.availableSizes;

      const { error: modelError } = await supabase.from('models').insert(modelPayload);

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
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.gender !== undefined) payload.gender = updates.gender;
      if (updates.basePrice !== undefined) payload.base_price = updates.basePrice;
      if (updates.baseCost !== undefined) payload.base_cost = updates.baseCost;
      if (updates.status !== undefined) {
        payload.status = updates.status;
        payload.is_active = updates.status !== 'Inativo' && updates.status !== 'Arquivado';
      }
      if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
      if (updates.imagePath !== undefined) payload.image_path = updates.imagePath;
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
      // 1. Fetch variant IDs for this model
      const { data: vars } = await supabase.from('variants').select('id').eq('model_id', id);
      const varIds = (vars || []).map((v: any) => v.id);

      if (varIds.length > 0) {
        // Safe cleanup of child records linked to these variants
        await supabase.from('stock_movements').delete().in('variant_id', varIds);
        await supabase.from('inventory').delete().in('variant_id', varIds);
        await supabase.from('sale_items').delete().in('variant_id', varIds);
        await supabase.from('variants').delete().eq('model_id', id);
      }

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

  async insertVariant(variant: ProductVariant): Promise<boolean> {
    try {
      const { error } = await supabase.from('variants').insert({
        id: variant.id,
        model_id: variant.modelId,
        sku: variant.sku,
        color_name: variant.colorName,
        color_hex: variant.colorHex,
        size: variant.size,
        current_stock: variant.currentStock,
        min_stock: variant.minStock,
      });

      if (error) {
        console.error('[Supabase] insertVariant error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] insertVariant exception:', err);
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
      // Safe cleanup of dependent rows before deleting variant
      await supabase.from('stock_movements').delete().eq('variant_id', id);
      await supabase.from('inventory').delete().eq('variant_id', id);
      await supabase.from('sale_items').delete().eq('variant_id', id);
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
  // EMPLOYEES (FUNCIONÁRIOS / VENDEDORES)
  // ==========================================
  async fetchEmployees(): Promise<Employee[] | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] fetchEmployees warning:', error.message);
        return null;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        jobTitle: row.job_title,
        isSeller: Boolean(row.is_seller),
        phone: row.phone || '',
        email: row.email || '',
        notes: row.notes || '',
        status: row.status,
        userId: row.user_id || undefined,
        createdAt: row.created_at ? row.created_at.split('T')[0] : '',
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        archivedAt: row.archived_at,
      }));
    } catch (err) {
      console.warn('[Supabase] fetchEmployees exception:', err);
      return null;
    }
  },

  async insertEmployee(employee: Employee): Promise<boolean> {
    try {
      const { error } = await supabase.from('employees').insert({
        id: employee.id,
        name: employee.name,
        job_title: employee.jobTitle,
        is_seller: employee.isSeller,
        phone: employee.phone || null,
        email: employee.email || null,
        notes: employee.notes || null,
        status: employee.status,
        user_id: employee.userId || null,
        created_by: employee.createdBy || null,
      });

      if (error) {
        console.error('[Supabase] insertEmployee error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] insertEmployee exception:', err);
      return false;
    }
  },

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.jobTitle !== undefined) payload.job_title = updates.jobTitle;
      if (updates.isSeller !== undefined) payload.is_seller = updates.isSeller;
      if (updates.phone !== undefined) payload.phone = updates.phone || null;
      if (updates.email !== undefined) payload.email = updates.email || null;
      if (updates.notes !== undefined) payload.notes = updates.notes || null;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.userId !== undefined) payload.user_id = updates.userId || null;
      if (updates.archivedAt !== undefined) payload.archived_at = updates.archivedAt;
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase.from('employees').update(payload).eq('id', id);
      if (error) {
        console.error('[Supabase] updateEmployee error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] updateEmployee exception:', err);
      return false;
    }
  },

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) {
        console.error('[Supabase] deleteEmployee error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] deleteEmployee exception:', err);
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
        saleNumber: row.sale_number || row.id,
        date: row.date || row.sale_date || (row.created_at ? row.created_at.replace('T', ' ').slice(0, 16) : ''),
        saleDate: row.sale_date || (row.date ? row.date.split(' ')[0] : undefined),
        occurredAt: row.occurred_at || row.created_at,
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerEmail: row.customer_email || '',
        sellerId: row.seller_id || undefined,
        sellerName: row.seller_name || undefined,
        subtotal: Number(row.subtotal) || 0,
        discount: Number(row.discount) || 0,
        discountType: row.discount_type || 'FIXED',
        discountValue: Number(row.discount_value) || 0,
        discountAmount: Number(row.discount_amount) || Number(row.discount) || 0,
        discountNote: row.discount_note || '',
        hasReferral: Boolean(row.has_referral),
        referralName: row.referral_name || '',
        referralNote: row.referral_note || '',
        shipping: Number(row.shipping) || 0,
        total: Number(row.total) || 0,
        totalCost: Number(row.total_cost) || 0,
        estimatedProfit: Number(row.estimated_profit) || 0,
        paymentMethod: row.payment_method,
        status: row.status,
        notes: row.notes || '',
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
        sale_number: sale.saleNumber || sale.id,
        date: sale.date,
        sale_date: sale.saleDate || (sale.date ? sale.date.split(' ')[0] : new Date().toISOString().split('T')[0]),
        occurred_at: sale.occurredAt || (sale.date ? new Date(sale.date.replace(' ', 'T')).toISOString() : new Date().toISOString()),
        customer_id: sale.customerId,
        customer_name: sale.customerName,
        customer_email: sale.customerEmail || null,
        seller_id: sale.sellerId || null,
        seller_name: sale.sellerName || null,
        subtotal: sale.subtotal,
        discount: sale.discount,
        discount_type: sale.discountType || 'FIXED',
        discount_value: sale.discountValue || 0,
        discount_amount: sale.discountAmount || sale.discount || 0,
        discount_note: sale.discountNote || null,
        has_referral: sale.hasReferral || false,
        referral_name: sale.referralName || null,
        referral_note: sale.referralNote || null,
        shipping: sale.shipping,
        total: sale.total,
        total_cost: sale.totalCost,
        estimated_profit: sale.estimatedProfit,
        paymentMethod: sale.paymentMethod,
        payment_method: sale.paymentMethod,
        status: sale.status,
        notes: sale.notes || null,
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
        date: sale.date,
        sale_date: sale.saleDate || (sale.date ? sale.date.split(' ')[0] : undefined),
        occurred_at: sale.occurredAt || (sale.date ? new Date(sale.date.replace(' ', 'T')).toISOString() : undefined),
        customer_id: sale.customerId,
        customer_name: sale.customerName,
        customer_email: sale.customerEmail || null,
        seller_id: sale.sellerId || null,
        seller_name: sale.sellerName || null,
        subtotal: sale.subtotal,
        discount: sale.discount,
        discount_type: sale.discountType || 'FIXED',
        discount_value: sale.discountValue || 0,
        discount_amount: sale.discountAmount || sale.discount || 0,
        discount_note: sale.discountNote || null,
        has_referral: sale.hasReferral || false,
        referral_name: sale.referralName || null,
        referral_note: sale.referralNote || null,
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

  // ==========================================
  // COMPANY SETTINGS (CONFIGURAÇÕES DA EMPRESA)
  // ==========================================
  async fetchCompanySettings(): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (error) {
        console.warn('[Supabase] fetchCompanySettings warning:', error.message);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        tradeName: data.trade_name || '',
        legalName: data.legal_name || '',
        taxId: data.tax_id || '',
        commercialAddress: data.commercial_address || '',
        corporateEmail: data.corporate_email || '',
        defaultMinStock: data.default_min_stock ?? 5,
        enableLowStockAlert: data.enable_low_stock_alert ?? true,
        updatedAt: data.updated_at,
        updatedBy: data.updated_by,
      };
    } catch (err) {
      console.warn('[Supabase] fetchCompanySettings exception:', err);
      return null;
    }
  },

  async saveCompanySettings(settings: {
    tradeName?: string;
    legalName?: string;
    taxId?: string;
    commercialAddress?: string;
    corporateEmail?: string;
    defaultMinStock?: number;
    enableLowStockAlert?: boolean;
    updatedBy?: string;
  }): Promise<boolean> {
    try {
      const payload = {
        id: 'default',
        trade_name: settings.tradeName?.trim() || null,
        legal_name: settings.legalName?.trim() || null,
        tax_id: settings.taxId?.trim() || null,
        commercial_address: settings.commercialAddress?.trim() || null,
        corporate_email: settings.corporateEmail?.trim() || null,
        default_min_stock: settings.defaultMinStock ?? 5,
        enable_low_stock_alert: settings.enableLowStockAlert ?? true,
        updated_at: new Date().toISOString(),
        updated_by: settings.updatedBy || null,
      };

      const { error } = await supabase
        .from('company_settings')
        .upsert(payload);

      if (error) {
        console.error('[Supabase] saveCompanySettings error:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Supabase] saveCompanySettings exception:', err);
      return false;
    }
  },

  // ==========================================
  // EXCLUSÃO TOTAL E REVERSÃO DE VENDAS
  // ==========================================
  async deleteSaleCompletely(saleId: string): Promise<boolean> {
    try {
      // 1. Tentar chamar RPC caso exista no banco
      const { error: rpcError } = await supabase.rpc('fn_delete_sale_completely', {
        p_sale_id: saleId,
        p_actor_id: 'admin',
        p_actor_name: 'Administrador',
        p_reason: 'Exclusão definitiva solicitada'
      });

      if (!rpcError) {
        return true;
      }

      // Se RPC não existir ainda, realizar exclusão em cadeia das tabelas
      // 1. Remover pagamentos de parcelas
      const { data: insts } = await supabase.from('installments').select('id').eq('sale_id', saleId);
      if (insts && insts.length > 0) {
        const instIds = insts.map((i: any) => i.id);
        await supabase.from('installment_payments').delete().in('installment_id', instIds);
      }
      await supabase.from('installments').delete().eq('sale_id', saleId);
      await supabase.from('receivables').delete().eq('sale_id', saleId);

      // 2. Remover receitas vinculadas
      await supabase.from('revenues').delete().or(`sale_id.eq.${saleId},reference_id.eq.${saleId}`);

      // 3. Remover movimentações de estoque vinculadas
      await supabase.from('stock_movements').delete().or(`sale_id.eq.${saleId},reason.ilike.%${saleId}%`);

      // 4. Remover itens da venda e a venda
      await supabase.from('sale_items').delete().eq('sale_id', saleId);
      const { error: saleErr } = await supabase.from('sales').delete().eq('id', saleId);

      if (saleErr) {
        console.error('[Supabase] deleteSale error:', saleErr);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Supabase] deleteSale exception:', err);
      return false;
    }
  },

  // ==========================================
  // FORNECEDORES (SUPPLIERS)
  // ==========================================
  async fetchSuppliers(): Promise<Supplier[] | null> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback local se a tabela ainda não tiver sido criada no Supabase
        const local = localStorage.getItem('uze_suppliers');
        return local ? JSON.parse(local) : [];
      }

      const list: Supplier[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        email: row.email || '',
        notes: row.notes || '',
        status: row.status || 'Ativo',
        createdAt: row.created_at ? row.created_at.split('T')[0] : '',
        updatedAt: row.updated_at,
      }));

      localStorage.setItem('uze_suppliers', JSON.stringify(list));
      return list;
    } catch {
      const local = localStorage.getItem('uze_suppliers');
      return local ? JSON.parse(local) : [];
    }
  },

  async insertSupplier(supplier: Supplier): Promise<boolean> {
    try {
      // Grava no localStorage imediatamente
      const local = localStorage.getItem('uze_suppliers');
      const list: Supplier[] = local ? JSON.parse(local) : [];
      list.unshift(supplier);
      localStorage.setItem('uze_suppliers', JSON.stringify(list));

      const { error } = await supabase.from('suppliers').insert({
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone || null,
        email: supplier.email || null,
        notes: supplier.notes || null,
        status: supplier.status || 'Ativo',
      });

      if (error) {
        console.warn('[Supabase] insertSupplier (usando cache local):', error.message);
      }
      return true;
    } catch {
      return true;
    }
  },

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<boolean> {
    try {
      const local = localStorage.getItem('uze_suppliers');
      if (local) {
        const list: Supplier[] = JSON.parse(local);
        const updated = list.map(s => s.id === id ? { ...s, ...updates } : s);
        localStorage.setItem('uze_suppliers', JSON.stringify(updated));
      }

      await supabase.from('suppliers').update({
        ...updates,
        updated_at: new Date().toISOString()
      }).eq('id', id);

      return true;
    } catch {
      return true;
    }
  },

  async deleteSupplier(id: string): Promise<boolean> {
    try {
      const local = localStorage.getItem('uze_suppliers');
      if (local) {
        const list: Supplier[] = JSON.parse(local);
        localStorage.setItem('uze_suppliers', JSON.stringify(list.filter(s => s.id !== id)));
      }

      await supabase.from('suppliers').delete().eq('id', id);
      return true;
    } catch {
      return true;
    }
  },

  // ==========================================
  // ENTRADAS / COMPRAS (PURCHASES)
  // ==========================================
  async fetchPurchases(): Promise<PurchaseEntry[] | null> {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const local = localStorage.getItem('uze_purchases');
        return local ? JSON.parse(local) : [];
      }

      const list: PurchaseEntry[] = (data || []).map((row: any) => ({
        id: row.id,
        entryNumber: row.entry_number || row.id,
        supplierId: row.supplier_id || undefined,
        supplierName: row.supplier_name || 'Fábrica / Fornecedor Geral',
        date: row.date || (row.created_at ? row.created_at.split('T')[0] : ''),
        items: row.items || [],
        subtotal: Number(row.subtotal) || 0,
        discount: Number(row.discount) || 0,
        shipping: Number(row.shipping) || 0,
        total: Number(row.total) || 0,
        notes: row.notes || '',
        status: row.status || 'Concluído',
        createdBy: row.created_by,
        createdAt: row.created_at ? row.created_at.replace('T', ' ').slice(0, 16) : '',
        updatedAt: row.updated_at,
      }));

      localStorage.setItem('uze_purchases', JSON.stringify(list));
      return list;
    } catch {
      const local = localStorage.getItem('uze_purchases');
      return local ? JSON.parse(local) : [];
    }
  },

  async insertPurchase(purchase: PurchaseEntry): Promise<boolean> {
    try {
      const local = localStorage.getItem('uze_purchases');
      const list: PurchaseEntry[] = local ? JSON.parse(local) : [];
      list.unshift(purchase);
      localStorage.setItem('uze_purchases', JSON.stringify(list));

      const { error } = await supabase.from('purchases').insert({
        id: purchase.id,
        entry_number: purchase.entryNumber,
        supplier_id: purchase.supplierId || null,
        supplier_name: purchase.supplierName,
        date: purchase.date,
        subtotal: purchase.subtotal,
        discount: purchase.discount,
        shipping: purchase.shipping,
        total: purchase.total,
        notes: purchase.notes || null,
        status: purchase.status,
        items: purchase.items,
        created_by: purchase.createdBy || null,
      });

      if (error) {
        console.warn('[Supabase] insertPurchase (usando cache local):', error.message);
      }
      return true;
    } catch {
      return true;
    }
  },

  async updatePurchase(purchase: PurchaseEntry): Promise<boolean> {
    try {
      const local = localStorage.getItem('uze_purchases');
      if (local) {
        const list: PurchaseEntry[] = JSON.parse(local);
        const updated = list.map(p => p.id === purchase.id ? purchase : p);
        localStorage.setItem('uze_purchases', JSON.stringify(updated));
      }

      await supabase.from('purchases').update({
        supplier_id: purchase.supplierId || null,
        supplier_name: purchase.supplierName,
        date: purchase.date,
        subtotal: purchase.subtotal,
        discount: purchase.discount,
        shipping: purchase.shipping,
        total: purchase.total,
        notes: purchase.notes || null,
        items: purchase.items,
        status: purchase.status,
        updated_at: new Date().toISOString(),
      }).eq('id', purchase.id);

      return true;
    } catch {
      return true;
    }
  },

  async deletePurchase(id: string): Promise<boolean> {
    try {
      const local = localStorage.getItem('uze_purchases');
      if (local) {
        const list: PurchaseEntry[] = JSON.parse(local);
        localStorage.setItem('uze_purchases', JSON.stringify(list.filter(p => p.id !== id)));
      }

      await supabase.from('purchases').delete().eq('id', id);
      return true;
    } catch {
      return true;
    }
  },

  // ==========================================
  // PARCELAS / CARNÊ / RECEBÍVEIS (INSTALLMENTS)
  // ==========================================
  async fetchInstallments(): Promise<Installment[] | null> {
    try {
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) {
        const local = localStorage.getItem('uze_installments');
        return local ? JSON.parse(local) : [];
      }

      const list: Installment[] = (data || []).map((row: any) => ({
        id: row.id,
        receivableId: row.receivable_id || undefined,
        saleId: row.sale_id,
        customerId: row.customer_id,
        customerName: row.customer_name || '',
        installmentNumber: Number(row.installment_number) || 1,
        totalInstallments: Number(row.total_installments) || 1,
        amount: Number(row.amount) || 0,
        dueDate: row.due_date,
        status: row.status,
        paidAmount: Number(row.paid_amount) || 0,
        remainingAmount: Number(row.amount) - (Number(row.paid_amount) || 0),
        paymentDate: row.payment_date || undefined,
        paymentMethod: row.payment_method || 'PIX',
        payments: row.payments || [],
        notes: row.notes || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      localStorage.setItem('uze_installments', JSON.stringify(list));
      return list;
    } catch {
      const local = localStorage.getItem('uze_installments');
      return local ? JSON.parse(local) : [];
    }
  },

  async insertInstallments(installments: Installment[]): Promise<boolean> {
    try {
      const local = localStorage.getItem('uze_installments');
      const list: Installment[] = local ? JSON.parse(local) : [];
      list.push(...installments);
      localStorage.setItem('uze_installments', JSON.stringify(list));

      const rows = installments.map(i => ({
        id: i.id,
        receivable_id: i.receivableId || null,
        sale_id: i.saleId,
        customer_id: i.customerId,
        customer_name: i.customerName || null,
        installment_number: i.installmentNumber,
        total_installments: i.totalInstallments,
        amount: i.amount,
        due_date: i.dueDate,
        status: i.status,
        paid_amount: i.paidAmount,
        payment_date: i.paymentDate || null,
        payment_method: i.paymentMethod || 'PIX',
        notes: i.notes || null,
      }));

      const { error } = await supabase.from('installments').insert(rows);
      if (error) {
        console.warn('[Supabase] insertInstallments (usando cache local):', error.message);
      }
      return true;
    } catch {
      return true;
    }
  },

  async updateInstallment(id: string, updates: Partial<Installment>): Promise<boolean> {
    try {
      const local = localStorage.getItem('uze_installments');
      if (local) {
        const list: Installment[] = JSON.parse(local);
        const updated = list.map(i => i.id === id ? { ...i, ...updates } : i);
        localStorage.setItem('uze_installments', JSON.stringify(updated));
      }

      await supabase.from('installments').update({
        ...updates,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      return true;
    } catch {
      return true;
    }
  },

  async deleteInstallmentsBySale(saleId: string): Promise<boolean> {
    try {
      const local = localStorage.getItem('uze_installments');
      if (local) {
        const list: Installment[] = JSON.parse(local);
        localStorage.setItem('uze_installments', JSON.stringify(list.filter(i => i.saleId !== saleId)));
      }

      await supabase.from('installments').delete().eq('sale_id', saleId);
      return true;
    } catch {
      return true;
    }
  },

  // ==========================================
  // PAYMENTS & ALLOCATIONS (RECEBIMENTOS & RATEIO)
  // ==========================================
  async fetchPayments(): Promise<PaymentRecord[] | null> {
    try {
      const local = localStorage.getItem('uze_payments');
      if (local) {
        return JSON.parse(local);
      }
      const { data, error } = await supabase.from('payments').select('*');
      if (error || !data) return null;
      return data.map((r: any) => ({
        id: r.id,
        saleId: r.sale_id,
        customerId: r.customer_id,
        amount: Number(r.amount),
        paymentDate: r.payment_date,
        paymentMethod: r.payment_method,
        notes: r.notes || '',
        createdBy: r.created_by,
        createdAt: r.created_at,
        allocations: r.allocations || [],
      }));
    } catch {
      return null;
    }
  },

  async insertPayment(payment: PaymentRecord): Promise<boolean> {
    try {
      // Atualizar cache local
      const local = localStorage.getItem('uze_payments');
      const list: PaymentRecord[] = local ? JSON.parse(local) : [];
      localStorage.setItem('uze_payments', JSON.stringify([payment, ...list]));

      // Salvar payment no Supabase
      await supabase.from('payments').insert({
        id: payment.id,
        sale_id: payment.saleId,
        customer_id: payment.customerId,
        amount: payment.amount,
        payment_date: payment.paymentDate,
        payment_method: payment.paymentMethod,
        notes: payment.notes,
        created_by: payment.createdBy,
        created_at: payment.createdAt,
      });

      // Salvar allocations
      if (payment.allocations && payment.allocations.length > 0) {
        const allocRows = payment.allocations.map(a => ({
          id: a.id,
          payment_id: payment.id,
          installment_id: a.installmentId,
          amount: a.amount,
          created_at: a.createdAt,
        }));
        await supabase.from('payment_allocations').insert(allocRows);
      }

      return true;
    } catch {
      return true;
    }
  },

  async deletePayment(paymentId: string): Promise<boolean> {
    try {
      const local = localStorage.getItem('uze_payments');
      if (local) {
        const list: PaymentRecord[] = JSON.parse(local);
        localStorage.setItem('uze_payments', JSON.stringify(list.filter(p => p.id !== paymentId)));
      }

      await supabase.from('payment_allocations').delete().eq('payment_id', paymentId);
      await supabase.from('payments').delete().eq('id', paymentId);
      return true;
    } catch {
      return true;
    }
  },

  async updatePayment(paymentId: string, updates: Partial<PaymentRecord>): Promise<boolean> {
    try {
      const local = localStorage.getItem('uze_payments');
      if (local) {
        const list: PaymentRecord[] = JSON.parse(local);
        const updated = list.map(p => p.id === paymentId ? { ...p, ...updates } : p);
        localStorage.setItem('uze_payments', JSON.stringify(updated));
      }

      const dbUpdates: any = {};
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('payments').update(dbUpdates).eq('id', paymentId);
      }

      return true;
    } catch {
      return true;
    }
  },
};
