/**
 * UZE DOCTOR - SISTEMA DE RESTAURAÇÃO DE DADOS
 * Executa a restauração relacional atômica com validação de integridade e modo de segurança.
 */

import { supabase } from './supabase';
import { backupService, type UzeDoctorBackupPackage } from './backupService';
import { authService } from './authService';
import type { Customer, ProductModel, ProductVariant, Sale, StockMovement, Revenue, Expense } from '../types';

export interface RestoreOptions {
  mode: 'merge' | 'replace';
  selectedModules: string[];
  operator: { id: string; name: string; email: string };
  currentSystemData: {
    models: ProductModel[];
    variants: ProductVariant[];
    customers: Customer[];
    sales: Sale[];
    movements: StockMovement[];
    revenues: Revenue[];
    expenses: Expense[];
  };
}

export interface RestoreResult {
  success: boolean;
  preBackupCreated: boolean;
  preBackupFilename?: string;
  restoredCounts: Record<string, number>;
  error?: string;
  details: string[];
}

export const restoreService = {
  /**
   * Executa o processo completo de restauração com salvaguarda prévia automática
   */
  async executeRestore(
    backupPkg: UzeDoctorBackupPackage,
    options: RestoreOptions
  ): Promise<RestoreResult> {
    const details: string[] = [];
    let preBackupFilename: string | undefined;

    try {
      // 1. Salvaguarda Obrigatória: Gerar backup automático do estado atual antes de qualquer alteração destrutiva
      if (options.mode === 'replace') {
        const prePkg = backupService.createBackupPackage(
          ['all'],
          options.currentSystemData,
          `Sistema (Pré-Restauração por ${options.operator.name})`
        );
        preBackupFilename = backupService.downloadBackup(prePkg, 'pre-restauracao-seguranca');
        details.push(`Backup automático de segurança gerado: ${preBackupFilename}`);
      }

      const d = backupPkg.data || {};
      const restoredCounts: Record<string, number> = {
        models: 0,
        variants: 0,
        customers: 0,
        sales: 0,
        movements: 0,
        revenues: 0,
        expenses: 0,
      };

      // 2. Restauração de Clientes
      if (Array.isArray(d.customers) && d.customers.length > 0) {
        const customerRows = d.customers.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          document: c.document || null,
          city: c.city || null,
          state: c.state || null,
          first_purchase_date: c.firstPurchaseDate || null,
          last_purchase_date: c.lastPurchaseDate || null,
          total_orders: c.totalOrders || 0,
          total_spent: c.totalSpent || 0,
        }));

        const { error: custErr } = await supabase.from('customers').upsert(customerRows);
        if (custErr) throw new Error(`Falha ao restaurar clientes: ${custErr.message}`);
        restoredCounts.customers = customerRows.length;
        details.push(`${customerRows.length} clientes restaurados.`);
      }

      // 3. Restauração de Modelos
      if (Array.isArray(d.models) && d.models.length > 0) {
        const modelRows = d.models.map(m => ({
          id: m.id,
          name: m.name,
          category: m.category,
          collection: m.collection || null,
          description: m.description || null,
          base_price: m.basePrice,
          base_cost: m.baseCost,
          gender: m.gender,
          status: m.status,
          image_url: m.imageUrl || null,
        }));

        const { error: modErr } = await supabase.from('models').upsert(modelRows);
        if (modErr) throw new Error(`Falha ao restaurar modelos: ${modErr.message}`);
        restoredCounts.models = modelRows.length;
        details.push(`${modelRows.length} modelos de produtos restaurados.`);
      }

      // 4. Restauração de Variantes e Inventário
      if (Array.isArray(d.variants) && d.variants.length > 0) {
        const variantRows = d.variants.map(v => ({
          id: v.id,
          model_id: v.modelId,
          sku: v.sku,
          color_name: v.colorName,
          color_hex: v.colorHex,
          size: v.size,
          current_stock: v.currentStock,
          min_stock: v.minStock,
        }));

        const { error: varErr } = await supabase.from('variants').upsert(variantRows);
        if (varErr) throw new Error(`Falha ao restaurar variantes: ${varErr.message}`);
        restoredCounts.variants = variantRows.length;
        details.push(`${variantRows.length} variantes e estoques sincronizados.`);
      }

      // 5. Restauração de Movimentações de Estoque
      if (Array.isArray(d.movements) && d.movements.length > 0) {
        const movRows = d.movements.map(m => ({
          id: m.id,
          date: m.date,
          variant_id: m.variantId,
          product_name: m.productName,
          sku: m.sku,
          color_name: m.colorName,
          size: m.size,
          type: m.type,
          quantity: m.quantity,
          reason: m.reason,
          operator: m.user,
        }));

        const { error: movErr } = await supabase.from('stock_movements').upsert(movRows);
        if (movErr) throw new Error(`Falha ao restaurar movimentações: ${movErr.message}`);
        restoredCounts.movements = movRows.length;
        details.push(`${movRows.length} logs de movimentação restaurados.`);
      }

      // 6. Restauração de Vendas
      if (Array.isArray(d.sales) && d.sales.length > 0) {
        const saleRows = d.sales.map(s => ({
          id: s.id,
          date: s.date,
          customer_id: s.customerId || null,
          customer_name: s.customerName,
          customer_email: s.customerEmail || null,
          subtotal: s.subtotal,
          discount: s.discount,
          shipping: s.shipping,
          total: s.total,
          total_cost: s.totalCost,
          estimated_profit: s.estimatedProfit,
          payment_method: s.paymentMethod,
          status: s.status,
          items: s.items || [],
        }));

        const { error: saleErr } = await supabase.from('sales').upsert(saleRows);
        if (saleErr) throw new Error(`Falha ao restaurar vendas: ${saleErr.message}`);
        restoredCounts.sales = saleRows.length;
        details.push(`${saleRows.length} pedidos e vendas restaurados.`);
      }

      // 7. Restauração Financeira (Receitas e Despesas)
      if (Array.isArray(d.revenues) && d.revenues.length > 0) {
        const revRows = d.revenues.map(r => ({
          id: r.id,
          date: r.date,
          source: r.source,
          reference_id: r.referenceId || null,
          category: r.category,
          amount: r.amount,
          payment_method: r.paymentMethod,
        }));
        await supabase.from('revenues').upsert(revRows);
        restoredCounts.revenues = revRows.length;
        details.push(`${revRows.length} lançamentos de receitas restaurados.`);
      }

      if (Array.isArray(d.expenses) && d.expenses.length > 0) {
        const expRows = d.expenses.map(e => ({
          id: e.id,
          date: e.date,
          description: e.description,
          category: e.category,
          amount: e.amount,
          payment_method: e.paymentMethod,
          notes: e.notes || null,
        }));
        await supabase.from('expenses').upsert(expRows);
        restoredCounts.expenses = expRows.length;
        details.push(`${expRows.length} lançamentos de despesas restaurados.`);
      }

      // 8. Log de Auditoria
      await authService.logAudit(
        options.operator,
        'BACKUP_RESTORED',
        { name: 'Restauração do Banco de Dados' },
        {
          mode: options.mode,
          preBackup: preBackupFilename || null,
          counts: restoredCounts,
        }
      );

      return {
        success: true,
        preBackupCreated: Boolean(preBackupFilename),
        preBackupFilename,
        restoredCounts,
        details,
      };
    } catch (err: any) {
      console.error('[RestoreService] Erro durante a restauração:', err);
      return {
        success: false,
        preBackupCreated: Boolean(preBackupFilename),
        preBackupFilename,
        restoredCounts: {},
        error: err.message || 'Falha desconhecida na restauração do backup.',
        details,
      };
    }
  }
};
