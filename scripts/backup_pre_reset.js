// Script de Backup Pré-Reset - UZE DOCTOR
// Exporta todos os dados das tabelas operacionais e administrativas
const SUPABASE_URL = 'https://xpjlixvifoytxgplesnq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7_giSIHoHNZ6CeuVDo5sFQ_BpTvyE_D';

import fs from 'fs';
import path from 'path';

const tables = [
  'profiles',
  'users',
  'employees',
  'customers',
  'models',
  'variants',
  'inventory',
  'stock_movements',
  'sales',
  'sale_items',
  'installments',
  'installment_payments',
  'payments',
  'payment_allocations',
  'revenues',
  'expenses',
  'suppliers',
  'purchases',
  'audit_logs',
  'financial_categories',
  'company_settings'
];

async function runBackup() {
  console.log('Iniciando extração do backup pré-produção...');
  const backupData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      environment: 'pre-production',
      description: 'Backup completo do estado pré-reset de teste da UZE DOCTOR',
      supabaseProjectId: 'xpjlixvifoytxgplesnq',
    },
    tables: {}
  };

  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const rows = await res.json();
        backupData.tables[table] = rows;
        console.log(`[OK] Tabela ${table}: ${rows.length} registros extraídos.`);
      } else {
        console.warn(`[WARN] Tabela ${table}: ${res.statusText}`);
        backupData.tables[table] = [];
      }
    } catch (e) {
      console.error(`[ERRO] Tabela ${table}:`, e.message);
      backupData.tables[table] = [];
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const fileName = `uze-doctor-pre-producao-backup-${today}.json`;
  const filePath = path.join(process.cwd(), 'backups', fileName);

  if (!fs.existsSync(path.join(process.cwd(), 'backups'))) {
    fs.mkdirSync(path.join(process.cwd(), 'backups'), { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`\n======================================================`);
  console.log(`Backup salvo com sucesso em:\n${filePath}`);
  console.log(`Tamanho do arquivo: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
  console.log(`======================================================\n`);
}

runBackup();
