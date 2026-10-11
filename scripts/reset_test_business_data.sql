-- ==============================================================================
-- SCRIPT DE RESET ADMINISTRATIVO MANUAL: DADOS DE TESTE — UZE DOCTOR
-- ATENÇÃO: ESTE SCRIPT É DESTRUTIVO E DEVE SER EXECUTADO EXCLUSIVAMENTE DE FORMA MANUAL
-- NÃO INCLUIR ESTE SCRIPT EM MIGRATIONS AUTOMÁTICAS DE DEPLOY!
-- ==============================================================================
-- 
-- FINALIDADE:
-- Limpar todos os dados empresariais operacionais gerados durante a fase de testes:
--  - Vendas, itens, parcelas, recebíveis, pagamentos e rateios
--  - Clientes e seus históricos de compras
--  - Modelos, produtos de catálogo, variantes e saldos de inventário
--  - Movimentações de estoque e compras/entradas de mercadoria
--  - Lançamentos financeiros de receitas e despesas de teste
--  - Vendedores/funcionários de teste sem conta de login (user_id IS NULL)
--
-- PRESERVAÇÃO OBRIGATÓRIA (NÃO APAGADOS):
--  - auth.users (Todos os usuários, senhas e logins reais)
--  - public.profiles (Perfis, papéis de acesso ADMINISTRADOR/VENDEDOR e permissões)
--  - public.users (Tabela legada/espelho de autenticação do ERP)
--  - public.employees vinculados a contas de login (user_id IS NOT NULL)
--  - public.financial_categories (Categorias financeiras estruturais do sistema)
--  - public.company_settings (Configurações da empresa UZE DOCTOR)
--  - Estrutura de tabelas, triggers, views, RLS policies e storage buckets
--
-- ==============================================================================

DO $$
DECLARE
  -- ============================================================================
  -- TRAVA DE SEGURANÇA:
  -- Para confirmar e autorizar a execução, altere a variável abaixo para TRUE:
  -- ============================================================================
  v_confirm_reset BOOLEAN := TRUE; -- << Defina como TRUE para executar

  -- Contadores para auditoria
  v_count_allocations INTEGER := 0;
  v_count_inst_payments INTEGER := 0;
  v_count_installments INTEGER := 0;
  v_count_payments INTEGER := 0;
  v_count_sale_items INTEGER := 0;
  v_count_movements INTEGER := 0;
  v_count_revenues INTEGER := 0;
  v_count_sales INTEGER := 0;
  v_count_inventory INTEGER := 0;
  v_count_purchases INTEGER := 0;
  v_count_suppliers INTEGER := 0;
  v_count_variants INTEGER := 0;
  v_count_models INTEGER := 0;
  v_count_customers INTEGER := 0;
  v_count_expenses INTEGER := 0;
  v_count_test_employees INTEGER := 0;

  v_preserved_profiles INTEGER := 0;
  v_preserved_auth_users INTEGER := 0;
  v_preserved_users INTEGER := 0;
BEGIN
  IF NOT v_confirm_reset THEN
    RAISE EXCEPTION 'RESET CANCELADO POR SEGURANÇA: Altere v_confirm_reset := TRUE no cabeçalho do script para confirmar a exclusão dos dados de teste.';
  END IF;

  RAISE NOTICE 'Iniciando limpeza seletiva dos dados operacionais de teste...';

  -- 1. Excluir rateios e alocações de pagamentos
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_allocations') THEN
    SELECT count(*) INTO v_count_allocations FROM public.payment_allocations;
    DELETE FROM public.payment_allocations;
  END IF;

  -- 2. Excluir pagamentos individuais das parcelas
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'installment_payments') THEN
    SELECT count(*) INTO v_count_inst_payments FROM public.installment_payments;
    DELETE FROM public.installment_payments;
  END IF;

  -- 3. Excluir parcelas do carnê / recebíveis
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'installments') THEN
    SELECT count(*) INTO v_count_installments FROM public.installments;
    DELETE FROM public.installments;
  END IF;

  -- 4. Excluir pagamentos da venda
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    SELECT count(*) INTO v_count_payments FROM public.payments;
    DELETE FROM public.payments;
  END IF;

  -- 5. Excluir itens das vendas
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sale_items') THEN
    SELECT count(*) INTO v_count_sale_items FROM public.sale_items;
    DELETE FROM public.sale_items;
  END IF;

  -- 6. Excluir movimentações de estoque
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_movements') THEN
    SELECT count(*) INTO v_count_movements FROM public.stock_movements;
    DELETE FROM public.stock_movements;
  END IF;

  -- 7. Excluir receitas operacionais geradas pelos testes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'revenues') THEN
    SELECT count(*) INTO v_count_revenues FROM public.revenues;
    DELETE FROM public.revenues;
  END IF;

  -- 8. Excluir vendas
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales') THEN
    SELECT count(*) INTO v_count_sales FROM public.sales;
    DELETE FROM public.sales;
  END IF;

  -- 9. Excluir saldos de inventário
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory') THEN
    SELECT count(*) INTO v_count_inventory FROM public.inventory;
    DELETE FROM public.inventory;
  END IF;

  -- 10. Excluir entradas / compras de fábrica
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'purchases') THEN
    SELECT count(*) INTO v_count_purchases FROM public.purchases;
    DELETE FROM public.purchases;
  END IF;

  -- 11. Excluir fornecedores de teste
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suppliers') THEN
    SELECT count(*) INTO v_count_suppliers FROM public.suppliers;
    DELETE FROM public.suppliers;
  END IF;

  -- 12. Excluir variantes de produtos
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'variants') THEN
    SELECT count(*) INTO v_count_variants FROM public.variants;
    DELETE FROM public.variants;
  END IF;

  -- 13. Excluir modelos / produtos
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'models') THEN
    SELECT count(*) INTO v_count_models FROM public.models;
    DELETE FROM public.models;
  END IF;

  -- 14. Excluir clientes de teste
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
    SELECT count(*) INTO v_count_customers FROM public.customers;
    DELETE FROM public.customers;
  END IF;

  -- 15. Excluir despesas de teste
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    SELECT count(*) INTO v_count_expenses FROM public.expenses;
    DELETE FROM public.expenses;
  END IF;

  -- 16. Excluir funcionários que NÃO possuem vínculo com conta auth real
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employees') THEN
    SELECT count(*) INTO v_count_test_employees FROM public.employees WHERE user_id IS NULL;
    DELETE FROM public.employees WHERE user_id IS NULL;
  END IF;

  -- Contagem de preservação
  SELECT count(*) INTO v_preserved_profiles FROM public.profiles;
  SELECT count(*) INTO v_preserved_auth_users FROM auth.users;
  SELECT count(*) INTO v_preserved_users FROM public.users;

  -- 17. Registrar evento formal de auditoria
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    INSERT INTO public.audit_logs (
      id,
      actor_id,
      actor_name,
      actor_email,
      action,
      target_id,
      target_name,
      details,
      created_at
    ) VALUES (
      'log-reset-' || floor(extract(epoch from now())),
      'admin-system-reset',
      'Administrador UZE DOCTOR',
      'uzedoctor@gmail.com',
      'TEST_DATA_RESET',
      'system-database',
      'Banco de Dados UZE DOCTOR',
      jsonb_build_object(
        'description', 'Limpeza completa dos dados empresariais de teste pré-produção',
        'deleted', jsonb_build_object(
          'payment_allocations', v_count_allocations,
          'installment_payments', v_count_inst_payments,
          'installments', v_count_installments,
          'payments', v_count_payments,
          'sale_items', v_count_sale_items,
          'stock_movements', v_count_movements,
          'revenues', v_count_revenues,
          'sales', v_count_sales,
          'inventory', v_count_inventory,
          'purchases', v_count_purchases,
          'suppliers', v_count_suppliers,
          'variants', v_count_variants,
          'models', v_count_models,
          'customers', v_count_customers,
          'expenses', v_count_expenses,
          'test_employees_without_auth', v_count_test_employees
        ),
        'preserved', jsonb_build_object(
          'auth_users', v_preserved_auth_users,
          'profiles', v_preserved_profiles,
          'users', v_preserved_users
        ),
        'executed_at', now()
      ),
      now()
    );
  END IF;

  RAISE NOTICE '========================================================';
  RAISE NOTICE 'LIMPEZA CONCLUÍDA COM SUCESSO:';
  RAISE NOTICE ' - Modelos apagados: %', v_count_models;
  RAISE NOTICE ' - Variantes apagadas: %', v_count_variants;
  RAISE NOTICE ' - Clientes apagados: %', v_count_customers;
  RAISE NOTICE ' - Vendas apagadas: %', v_count_sales;
  RAISE NOTICE ' - Receitas apagadas: %', v_count_revenues;
  RAISE NOTICE ' - Despesas apagadas: %', v_count_expenses;
  RAISE NOTICE '--------------------------------------------------------';
  RAISE NOTICE 'DADOS PRESERVADOS INTACTOS:';
  RAISE NOTICE ' - Contas de Usuários (auth.users): %', v_preserved_auth_users;
  RAISE NOTICE ' - Perfis de Usuários (profiles): %', v_preserved_profiles;
  RAISE NOTICE ' - Usuários ERP (users): %', v_preserved_users;
  RAISE NOTICE '========================================================';
END $$;
