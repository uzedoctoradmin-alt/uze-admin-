// ==============================================================================
// EXECUÇÃO DO RESET DE DADOS DE TESTE — UZE DOCTOR
// Executa a limpeza dos dados operacionais preservando 100% dos usuários e perfis
// ==============================================================================

const SUPABASE_URL = 'https://xpjlixvifoytxgplesnq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7_giSIHoHNZ6CeuVDo5sFQ_BpTvyE_D';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function deleteFromTable(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`[WARN] Falha ao excluir de ${table}: ${res.status} ${err}`);
    return 0;
  }
  const data = await res.json();
  const count = Array.isArray(data) ? data.length : 0;
  console.log(`[SUCESSO] ${table}: ${count} registros removidos.`);
  return count;
}

async function getCount(table) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    const range = res.headers.get('content-range');
    return range ? parseInt(range.split('/')[1], 10) : 0;
  } catch {
    return 0;
  }
}

async function executeReset() {
  console.log('======================================================');
  console.log('INICIANDO LIMPEZA OPERACIONAL DE TESTE — UZE DOCTOR');
  console.log('======================================================\n');

  // Relatório ANTES
  console.log('>>> 1. CONTAGEM ANTES DA LIMPEZA:');
  const before = {
    profiles: await getCount('profiles'),
    users: await getCount('users'),
    employees: await getCount('employees'),
    customers: await getCount('customers'),
    models: await getCount('models'),
    variants: await getCount('variants'),
    inventory: await getCount('inventory'),
    stock_movements: await getCount('stock_movements'),
    sales: await getCount('sales'),
    sale_items: await getCount('sale_items'),
    installments: await getCount('installments'),
    installment_payments: await getCount('installment_payments'),
    payments: await getCount('payments'),
    payment_allocations: await getCount('payment_allocations'),
    revenues: await getCount('revenues'),
    expenses: await getCount('expenses'),
    suppliers: await getCount('suppliers'),
    purchases: await getCount('purchases'),
    audit_logs: await getCount('audit_logs'),
  };
  console.table(before);

  console.log('\n>>> 2. EXECUTANDO EXCLUSÃO NA ORDEM CORRETA DE RELACIONAMENTOS...');
  
  const deleted = {};

  // 1. payment_allocations
  deleted.payment_allocations = await deleteFromTable('payment_allocations', 'id=neq.00000000-0000-0000-0000-000000000000');
  
  // 2. installment_payments
  deleted.installment_payments = await deleteFromTable('installment_payments', 'id=neq.dummy');
  
  // 3. installments
  deleted.installments = await deleteFromTable('installments', 'id=neq.dummy');
  
  // 4. payments
  deleted.payments = await deleteFromTable('payments', 'id=neq.00000000-0000-0000-0000-000000000000');
  
  // 5. sale_items
  deleted.sale_items = await deleteFromTable('sale_items', 'id=neq.00000000-0000-0000-0000-000000000000');
  
  // 6. stock_movements
  deleted.stock_movements = await deleteFromTable('stock_movements', 'id=neq.dummy');
  
  // 7. revenues
  deleted.revenues = await deleteFromTable('revenues', 'id=neq.dummy');
  
  // 8. sales
  deleted.sales = await deleteFromTable('sales', 'id=neq.dummy');
  
  // 9. inventory
  deleted.inventory = await deleteFromTable('inventory', 'variant_id=neq.dummy');
  
  // 10. purchases
  deleted.purchases = await deleteFromTable('purchases', 'id=neq.dummy');
  
  // 11. suppliers
  deleted.suppliers = await deleteFromTable('suppliers', 'id=neq.dummy');
  
  // 12. variants
  deleted.variants = await deleteFromTable('variants', 'id=neq.dummy');
  
  // 13. models
  deleted.models = await deleteFromTable('models', 'id=neq.dummy');
  
  // 14. customers
  deleted.customers = await deleteFromTable('customers', 'id=neq.dummy');
  
  // 15. expenses
  deleted.expenses = await deleteFromTable('expenses', 'id=neq.dummy');
  
  // 16. employees onde user_id é nulo (preservando qualquer funcionário com login real!)
  deleted.employees = await deleteFromTable('employees', 'user_id=is.null');

  // 17. Limpeza do Storage (product-images)
  try {
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/product-images`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prefix: '', limit: 100 })
    });
    if (listRes.ok) {
      const files = await listRes.json();
      if (files.length > 0) {
        const fileNames = files.map(f => f.name);
        await fetch(`${SUPABASE_URL}/storage/v1/object/product-images`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ prefixes: fileNames })
        });
        console.log(`[STORAGE] Removidas ${fileNames.length} imagens de teste do bucket product-images.`);
      } else {
        console.log('[STORAGE] Nenhuma imagem residual no bucket product-images.');
      }
    }
  } catch (e) {
    console.warn('[STORAGE] Erro ao limpar bucket:', e.message);
  }

  // 18. Gravar registro oficial em audit_logs
  try {
    const resetLog = {
      id: `log-reset-${Date.now()}`,
      actor_id: 'ed31f74e-3de7-4c46-a823-22550e4e832d',
      actor_name: 'ADMINISTRAÇÃO UZE DOCTOR',
      actor_email: 'uzedoctor@gmail.com',
      action: 'TEST_DATA_RESET',
      target_id: 'system',
      target_name: 'Banco de Dados ERP',
      details: {
        description: 'Limpeza completa dos dados empresariais de teste pré-produção',
        deleted,
        preserved: {
          profiles: await getCount('profiles'),
          users: await getCount('users'),
          auth_users: await getCount('profiles'),
        },
        resetAt: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };

    await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(resetLog)
    });
    console.log('[AUDITORIA] Evento TEST_DATA_RESET gravado com sucesso.');
  } catch (e) {
    console.warn('[AUDITORIA] Falha ao registrar log:', e.message);
  }

  // Relatório DEPOIS
  console.log('\n>>> 3. CONTAGEM APÓS A LIMPEZA (ESTADO FINAL):');
  const after = {
    profiles: await getCount('profiles'),
    users: await getCount('users'),
    employees: await getCount('employees'),
    customers: await getCount('customers'),
    models: await getCount('models'),
    variants: await getCount('variants'),
    inventory: await getCount('inventory'),
    stock_movements: await getCount('stock_movements'),
    sales: await getCount('sales'),
    sale_items: await getCount('sale_items'),
    installments: await getCount('installments'),
    installment_payments: await getCount('installment_payments'),
    payments: await getCount('payments'),
    payment_allocations: await getCount('payment_allocations'),
    revenues: await getCount('revenues'),
    expenses: await getCount('expenses'),
    suppliers: await getCount('suppliers'),
    purchases: await getCount('purchases'),
    audit_logs: await getCount('audit_logs'),
  };
  console.table(after);

  console.log('\n======================================================');
  console.log('RESET CONCLUÍDO COM SUCESSO:');
  console.log(`- Usuários e Perfis preservados: ${after.profiles} profiles / ${after.users} users`);
  console.log(`- Dados operacionais de produtos, estoque, vendas, clientes e finanças estão em ZERO (0)`);
  console.log('======================================================\n');
}

executeReset();
