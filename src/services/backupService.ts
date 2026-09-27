/**
 * UZE DOCTOR - SISTEMA DE BACKUP E RESTAURAÇÃO
 * Opera diretamente sobre os dados centrais com preservação relacional e versionamento de schema.
 */

import type { ProductModel, ProductVariant, Customer, Sale, StockMovement, Revenue, Expense } from '../types';

export const BACKUP_SCHEMA_VERSION = 1;

export interface UzeDoctorBackupMetadata {
  app: 'UZE DOCTOR';
  backup_schema_version: number;
  created_at: string;
  created_by: string;
  backup_type: 'completo' | 'seletivo';
  modules_included: string[];
  total_records: number;
}

export interface UzeDoctorBackupData {
  models?: ProductModel[];
  variants?: ProductVariant[];
  customers?: Customer[];
  sales?: Sale[];
  movements?: StockMovement[];
  revenues?: Revenue[];
  expenses?: Expense[];
}

export interface UzeDoctorBackupPackage {
  metadata: UzeDoctorBackupMetadata;
  data: UzeDoctorBackupData;
}

export interface BackupValidationResult {
  valid: boolean;
  version: number;
  createdAt?: string;
  createdBy?: string;
  modules: string[];
  counts: {
    models: number;
    variants: number;
    customers: number;
    sales: number;
    movements: number;
    revenues: number;
    expenses: number;
  };
  error?: string;
}

export const backupService = {
  /**
   * Gera o arquivo de snapshot seguro em formato JSON versionado
   */
  createBackupPackage(
    selectedModules: string[],
    data: {
      models: ProductModel[];
      variants: ProductVariant[];
      customers: Customer[];
      sales: Sale[];
      movements: StockMovement[];
      revenues: Revenue[];
      expenses: Expense[];
    },
    operatorName: string
  ): UzeDoctorBackupPackage {
    const isFull = selectedModules.includes('all');
    const included = isFull 
      ? ['produtos', 'estoque', 'clientes', 'vendas', 'financeiro'] 
      : selectedModules;

    const backupData: UzeDoctorBackupData = {};
    let totalCount = 0;

    if (isFull || included.includes('produtos') || included.includes('estoque')) {
      backupData.models = data.models;
      backupData.variants = data.variants;
      totalCount += data.models.length + data.variants.length;
    }

    if (isFull || included.includes('clientes')) {
      backupData.customers = data.customers;
      totalCount += data.customers.length;
    }

    if (isFull || included.includes('vendas')) {
      backupData.sales = data.sales;
      totalCount += data.sales.length;
    }

    if (isFull || included.includes('estoque')) {
      backupData.movements = data.movements;
      totalCount += data.movements.length;
    }

    if (isFull || included.includes('financeiro')) {
      backupData.revenues = data.revenues;
      backupData.expenses = data.expenses;
      totalCount += data.revenues.length + data.expenses.length;
    }

    const pkg: UzeDoctorBackupPackage = {
      metadata: {
        app: 'UZE DOCTOR',
        backup_schema_version: BACKUP_SCHEMA_VERSION,
        created_at: new Date().toISOString(),
        created_by: operatorName || 'Administrador',
        backup_type: isFull ? 'completo' : 'seletivo',
        modules_included: included,
        total_records: totalCount,
      },
      data: backupData,
    };

    return pkg;
  },

  /**
   * Realiza o download seguro do arquivo de backup no navegador
   */
  downloadBackup(backupPackage: UzeDoctorBackupPackage, prefix = 'completo'): string {
    const jsonStr = JSON.stringify(backupPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const filename = `uze-doctor-backup-${prefix}-${nowStr}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return filename;
  },

  /**
   * Valida o conteúdo de um arquivo de backup antes de permitir a restauração
   */
  validateBackupContent(rawText: string): BackupValidationResult {
    try {
      const parsed = JSON.parse(rawText) as UzeDoctorBackupPackage;

      if (!parsed || typeof parsed !== 'object') {
        return { valid: false, version: 0, modules: [], counts: this.emptyCounts(), error: 'Arquivo inválido ou corrompido.' };
      }

      if (parsed.metadata?.app !== 'UZE DOCTOR') {
        return { valid: false, version: 0, modules: [], counts: this.emptyCounts(), error: 'O arquivo informado não é um backup oficial da UZE DOCTOR.' };
      }

      const version = parsed.metadata?.backup_schema_version || 0;
      if (version > BACKUP_SCHEMA_VERSION) {
        return { 
          valid: false, 
          version, 
          modules: [], 
          counts: this.emptyCounts(), 
          error: `Versão do schema de backup (${version}) é mais recente do que o suportado pelo sistema (${BACKUP_SCHEMA_VERSION}).` 
        };
      }

      const d = parsed.data || {};
      const counts = {
        models: Array.isArray(d.models) ? d.models.length : 0,
        variants: Array.isArray(d.variants) ? d.variants.length : 0,
        customers: Array.isArray(d.customers) ? d.customers.length : 0,
        sales: Array.isArray(d.sales) ? d.sales.length : 0,
        movements: Array.isArray(d.movements) ? d.movements.length : 0,
        revenues: Array.isArray(d.revenues) ? d.revenues.length : 0,
        expenses: Array.isArray(d.expenses) ? d.expenses.length : 0,
      };

      return {
        valid: true,
        version,
        createdAt: parsed.metadata?.created_at,
        createdBy: parsed.metadata?.created_by,
        modules: parsed.metadata?.modules_included || [],
        counts,
      };
    } catch {
      return { valid: false, version: 0, modules: [], counts: this.emptyCounts(), error: 'Erro de leitura sintática (JSON corrompido).' };
    }
  },

  emptyCounts() {
    return {
      models: 0,
      variants: 0,
      customers: 0,
      sales: 0,
      movements: 0,
      revenues: 0,
      expenses: 0,
    };
  }
};
