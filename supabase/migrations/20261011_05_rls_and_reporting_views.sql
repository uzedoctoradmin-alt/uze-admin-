-- ============================================================================
-- MIGRATION: 20261011_05_rls_and_reporting_views.sql
-- UZE DOCTOR: Políticas de Segurança RLS e Views de Relatório Financeiro/Carnê
-- ============================================================================

-- 1. Habilitar RLS nas novas tabelas
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

-- 2. Políticas RLS para Suppliers
DROP POLICY IF EXISTS "Suppliers: Leitura para autenticados" ON public.suppliers;
CREATE POLICY "Suppliers: Leitura para autenticados" 
  ON public.suppliers FOR SELECT 
  TO authenticated, anon 
  USING (true);

DROP POLICY IF EXISTS "Suppliers: Operações para autenticados" ON public.suppliers;
CREATE POLICY "Suppliers: Operações para autenticados" 
  ON public.suppliers FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 3. Políticas RLS para Purchases
DROP POLICY IF EXISTS "Purchases: Leitura para autenticados" ON public.purchases;
CREATE POLICY "Purchases: Leitura para autenticados" 
  ON public.purchases FOR SELECT 
  TO authenticated, anon 
  USING (true);

DROP POLICY IF EXISTS "Purchases: Operações para autenticados" ON public.purchases;
CREATE POLICY "Purchases: Operações para autenticados" 
  ON public.purchases FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 4. Políticas RLS para Installments & Payments
DROP POLICY IF EXISTS "Installments: Leitura para autenticados" ON public.installments;
CREATE POLICY "Installments: Leitura para autenticados" 
  ON public.installments FOR SELECT 
  TO authenticated, anon 
  USING (true);

DROP POLICY IF EXISTS "Installments: Operações para autenticados" ON public.installments;
CREATE POLICY "Installments: Operações para autenticados" 
  ON public.installments FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Installment Payments: Leitura para autenticados" ON public.installment_payments;
CREATE POLICY "Installment Payments: Leitura para autenticados" 
  ON public.installment_payments FOR SELECT 
  TO authenticated, anon 
  USING (true);

DROP POLICY IF EXISTS "Installment Payments: Operações para autenticados" ON public.installment_payments;
CREATE POLICY "Installment Payments: Operações para autenticados" 
  ON public.installment_payments FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 5. View de Resumo Financeiro & Cobrança (v_financial_summary)
CREATE OR REPLACE VIEW public.v_financial_summary AS
SELECT
  -- Faturamento comercial bruto de pedidos concluídos
  COALESCE((
    SELECT SUM(total) 
    FROM public.sales 
    WHERE status NOT IN ('Cancelado', 'Orçamento')
  ), 0.00) AS total_faturado,

  -- Dinheiro efetivamente entrado no caixa (receitas confirmadas)
  COALESCE((
    SELECT SUM(amount) 
    FROM public.revenues 
    WHERE status = 'Pago'
  ), 0.00) AS total_recebido_caixa,

  -- Saldo devedor total em aberto em carnês/parcelas
  COALESCE((
    SELECT SUM(remaining_amount) 
    FROM public.installments 
    WHERE status NOT IN ('Pago', 'Cancelado')
  ), 0.00) AS total_a_receber,

  -- Saldo de parcelas vencidas e não quitadas
  COALESCE((
    SELECT SUM(remaining_amount) 
    FROM public.installments 
    WHERE status NOT IN ('Pago', 'Cancelado') 
      AND due_date < CURRENT_DATE
  ), 0.00) AS total_em_atraso;

-- 6. View de Extrato e Dívida por Cliente (v_customer_debt_summary)
CREATE OR REPLACE VIEW public.v_customer_debt_summary AS
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  c.phone AS customer_phone,
  c.email AS customer_email,
  c.total_spent AS total_comprado,
  COALESCE(SUM(i.paid_amount), 0.00) AS total_pago_parcelas,
  COALESCE(SUM(i.remaining_amount), 0.00) AS total_a_receber,
  COUNT(CASE WHEN i.remaining_amount > 0 AND i.due_date < CURRENT_DATE THEN 1 END) AS parcelas_atrasadas_count
FROM public.customers c
LEFT JOIN public.installments i ON i.customer_id = c.id AND i.status != 'Cancelado'
GROUP BY c.id, c.name, c.phone, c.email, c.total_spent;

GRANT SELECT ON public.v_financial_summary TO authenticated, anon;
GRANT SELECT ON public.v_customer_debt_summary TO authenticated, anon;
