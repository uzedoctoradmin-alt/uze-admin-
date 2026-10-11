-- ============================================================================
-- MIGRATION: 20261011_03_receivables_installments_payments.sql
-- UZE DOCTOR: Módulo de Contas a Receber, Parcelamento PIX e Carnês
-- ============================================================================

-- 1. Tabela de Parcelas (Installments / Carnê)
CREATE TABLE IF NOT EXISTS public.installments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  installment_number INTEGER NOT NULL CHECK (installment_number >= 1),
  total_installments INTEGER NOT NULL CHECK (total_installments >= 1),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Atrasado', 'Cancelado')),
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (remaining_amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Pagamentos Individuais das Parcelas (Installment Payments / Auditoria de Quitação)
CREATE TABLE IF NOT EXISTS public.installment_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  installment_id TEXT NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Índices de Otimização
CREATE INDEX IF NOT EXISTS idx_installments_sale_id ON public.installments(sale_id);
CREATE INDEX IF NOT EXISTS idx_installments_customer_id ON public.installments(customer_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON public.installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_status ON public.installments(status);
CREATE INDEX IF NOT EXISTS idx_installment_payments_installment_id ON public.installment_payments(installment_id);
