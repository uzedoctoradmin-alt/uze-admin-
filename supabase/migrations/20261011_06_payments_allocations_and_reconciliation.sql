-- ============================================================================
-- MIGRATION: 20261011_06_payments_allocations_and_reconciliation.sql
-- UZE DOCTOR: Módulo de Pagamentos, Rateio Automático Sequencial e Reconciliação
-- ============================================================================

-- 1. Tabela de Pagamentos Recebidos (Payments)
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Alocações/Rateio do Pagamento por Parcela (Payment Allocations)
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payment_id TEXT NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  installment_id TEXT NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON public.payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_installment_id ON public.payment_allocations(installment_id);

-- 4. Função Transacional: Registrar Pagamento com Rateio Automático e Concorrência Segura
CREATE OR REPLACE FUNCTION public.fn_register_sale_payment_with_allocation(
  p_sale_id TEXT,
  p_amount NUMERIC,
  p_payment_date DATE,
  p_payment_method TEXT DEFAULT 'PIX',
  p_notes TEXT DEFAULT '',
  p_actor_name TEXT DEFAULT 'Operador ERP'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale RECORD;
  v_current_paid NUMERIC(12,2);
  v_remaining_debt NUMERIC(12,2);
  v_payment_id TEXT;
  v_unallocated NUMERIC(12,2);
  v_inst RECORD;
  v_inst_rem NUMERIC(12,2);
  v_alloc NUMERIC(12,2);
  v_new_paid NUMERIC(12,2);
  v_new_rem NUMERIC(12,2);
  v_new_status TEXT;
BEGIN
  -- 1. Validar valor
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'O valor do pagamento deve ser superior a zero.');
  END IF;

  -- 2. Bloquear venda para evitar race conditions (concorrência)
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Venda não encontrada.');
  END IF;

  -- 3. Calcular saldo devedor atual
  SELECT COALESCE(SUM(amount), 0.00) INTO v_current_paid 
  FROM public.payments 
  WHERE sale_id = p_sale_id;

  v_remaining_debt := GREATEST(0.00, v_sale.total - v_current_paid);

  IF p_amount > (v_remaining_debt + 0.001) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'O pagamento informado (R$ ' || p_amount || ') excede o saldo devedor em R$ ' || (p_amount - v_remaining_debt) || '.'
    );
  END IF;

  -- 4. Criar o registro de pagamento
  v_payment_id := 'pay-' || floor(extract(epoch from now()) * 1000)::text;
  
  INSERT INTO public.payments (
    id, sale_id, customer_id, amount, payment_date, payment_method, notes, created_by
  ) VALUES (
    v_payment_id, p_sale_id, v_sale.customer_id, p_amount, p_payment_date, p_payment_method, p_notes, p_actor_name
  );

  -- 5. Rateio automático sequencial por ordem de parcela
  v_unallocated := p_amount;

  FOR v_inst IN (
    SELECT * 
    FROM public.installments 
    WHERE sale_id = p_sale_id AND status != 'Cancelado'
    ORDER BY installment_number ASC 
    FOR UPDATE
  )
  LOOP
    EXIT WHEN v_unallocated <= 0.0001;

    v_inst_rem := GREATEST(0.00, v_inst.amount - v_inst.paid_amount);
    IF v_inst_rem > 0.0001 THEN
      v_alloc := LEAST(v_unallocated, v_inst_rem);

      -- Inserir alocação
      INSERT INTO public.payment_allocations (
        payment_id, installment_id, amount
      ) VALUES (
        v_payment_id, v_inst.id, v_alloc
      );

      v_new_paid := v_inst.paid_amount + v_alloc;
      v_new_rem := GREATEST(0.00, v_inst.amount - v_new_paid);

      IF v_new_rem <= 0.001 THEN
        v_new_status := 'Pago';
      ELSIF v_new_paid > 0 THEN
        v_new_status := 'Parcial';
      ELSIF v_inst.due_date < CURRENT_DATE THEN
        v_new_status := 'Atrasado';
      ELSE
        v_new_status := 'Pendente';
      END IF;

      -- Atualizar parcela
      UPDATE public.installments 
      SET 
        paid_amount = v_new_paid,
        remaining_amount = v_new_rem,
        status = v_new_status,
        updated_at = now()
      WHERE id = v_inst.id;

      v_unallocated := v_unallocated - v_alloc;
    END IF;
  END LOOP;

  -- 6. Inserir receita de caixa correspondente
  INSERT INTO public.revenues (
    id, date, source, reference_id, category, amount, payment_method, status
  ) VALUES (
    'rev-' || v_payment_id,
    to_char(p_payment_date, 'YYYY-MM-DD'),
    'Recebimento Venda ' || p_sale_id,
    p_sale_id,
    'Vendas Diretas',
    p_amount,
    p_payment_method,
    'Pago'
  );

  -- 7. Registrar auditoria administrativa
  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_email, action, target_id, target_name, details
  ) VALUES (
    'system',
    p_actor_name,
    'sistema@uzedoctor.com.br',
    'PAYMENT_CREATED',
    v_payment_id,
    'Pagamento Venda ' || p_sale_id,
    jsonb_build_object(
      'amount', p_amount,
      'saleId', p_sale_id,
      'paymentMethod', p_payment_method,
      'date', p_payment_date
    )
  );

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
END;
$$;

-- 5. Função Transacional: Desfazer Pagamento
CREATE OR REPLACE FUNCTION public.fn_undo_sale_payment(
  p_payment_id TEXT,
  p_actor_name TEXT DEFAULT 'Operador ERP'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment RECORD;
  v_alloc RECORD;
  v_inst RECORD;
  v_new_paid NUMERIC(12,2);
  v_new_rem NUMERIC(12,2);
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pagamento não encontrado.');
  END IF;

  -- Reverter alocações nas parcelas
  FOR v_alloc IN SELECT * FROM public.payment_allocations WHERE payment_id = p_payment_id
  LOOP
    SELECT * INTO v_inst FROM public.installments WHERE id = v_alloc.installment_id FOR UPDATE;
    IF FOUND THEN
      v_new_paid := GREATEST(0.00, v_inst.paid_amount - v_alloc.amount);
      v_new_rem := GREATEST(0.00, v_inst.amount - v_new_paid);

      IF v_new_rem <= 0.001 AND v_new_paid > 0 THEN
        v_new_status := 'Pago';
      ELSIF v_new_paid > 0 THEN
        v_new_status := 'Parcial';
      ELSIF v_inst.due_date < CURRENT_DATE THEN
        v_new_status := 'Atrasado';
      ELSE
        v_new_status := 'Pendente';
      END IF;

      UPDATE public.installments 
      SET 
        paid_amount = v_new_paid,
        remaining_amount = v_new_rem,
        status = v_new_status,
        updated_at = now()
      WHERE id = v_inst.id;
    END IF;
  END LOOP;

  -- Deletar alocações e pagamento
  DELETE FROM public.payment_allocations WHERE payment_id = p_payment_id;
  DELETE FROM public.payments WHERE id = p_payment_id;
  DELETE FROM public.revenues WHERE id = 'rev-' || p_payment_id;

  -- Auditoria
  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_email, action, target_id, target_name, details
  ) VALUES (
    'system',
    p_actor_name,
    'sistema@uzedoctor.com.br',
    'PAYMENT_REVERSED',
    p_payment_id,
    'Estorno Pagamento ' || p_payment_id,
    jsonb_build_object('amount', v_payment.amount, 'saleId', v_payment.sale_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Habilitar RLS e Políticas
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payments: Leitura para autenticados" ON public.payments;
CREATE POLICY "Payments: Leitura para autenticados" 
  ON public.payments FOR SELECT 
  TO authenticated, anon 
  USING (true);

DROP POLICY IF EXISTS "Payments: Operações para autenticados" ON public.payments;
CREATE POLICY "Payments: Operações para autenticados" 
  ON public.payments FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Payment Allocations: Leitura para autenticados" ON public.payment_allocations;
CREATE POLICY "Payment Allocations: Leitura para autenticados" 
  ON public.payment_allocations FOR SELECT 
  TO authenticated, anon 
  USING (true);

DROP POLICY IF EXISTS "Payment Allocations: Operações para autenticados" ON public.payment_allocations;
CREATE POLICY "Payment Allocations: Operações para autenticados" 
  ON public.payment_allocations FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 7. View de Reconciliação Financeira Estrita (Fonte Única da Verdade)
CREATE OR REPLACE VIEW public.v_sales_financial_reconciliation AS
SELECT
  s.id AS sale_id,
  s.sale_number,
  s.date AS sale_date,
  s.customer_id,
  s.customer_name,
  s.total AS total_venda,
  COALESCE(SUM(p.amount), 0.00) AS total_pago,
  GREATEST(0.00, s.total - COALESCE(SUM(p.amount), 0.00)) AS total_a_receber,
  COUNT(DISTINCT i.id) AS total_parcelas,
  COUNT(DISTINCT CASE WHEN i.remaining_amount <= 0.001 THEN i.id END) AS parcelas_quitadas,
  COUNT(DISTINCT CASE WHEN i.remaining_amount > 0.001 AND i.due_date < CURRENT_DATE THEN i.id END) AS parcelas_em_atraso
FROM public.sales s
LEFT JOIN public.payments p ON p.sale_id = s.id
LEFT JOIN public.installments i ON i.sale_id = s.id AND i.status != 'Cancelado'
WHERE s.status != 'Cancelado'
GROUP BY s.id, s.sale_number, s.date, s.customer_id, s.customer_name, s.total;

GRANT SELECT ON public.v_sales_financial_reconciliation TO authenticated, anon;
