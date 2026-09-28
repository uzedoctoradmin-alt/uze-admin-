-- ==============================================================================
-- UZE DOCTOR ERP - EMPLOYEES, DISCOUNTS, REFERRALS & PRODUCT IMAGES
-- Project: uzedoctoradmin-alt's Project (xpjlixvifoytxgplesnq)
-- Migration: 20260928_add_employees_discounts_referrals_storage.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA DE FUNCIONÁRIOS / EQUIPE (EMPLOYEES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  job_title TEXT NOT NULL DEFAULT 'Vendedor',
  is_seller BOOLEAN NOT NULL DEFAULT true,
  phone TEXT,
  email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para Employees
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_is_seller ON public.employees(is_seller);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON public.employees(created_at);

-- Trigger de updated_at para Employees
DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- RLS para Employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Global full access employees" ON public.employees;
CREATE POLICY "Global full access employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. CAMPOS EXPANDIDOS EM VENDAS (SALES)
-- ------------------------------------------------------------------------------
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sale_date DATE;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'FIXED' CHECK (discount_type IN ('FIXED', 'PERCENTAGE'));
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) DEFAULT 0.00 CHECK (discount_value >= 0);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0.00 CHECK (discount_amount >= 0);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_note TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS has_referral BOOLEAN DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS referral_name TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS referral_note TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_occurred_at ON public.sales(occurred_at);

-- ------------------------------------------------------------------------------
-- 3. CAMPO DE IMAGEM EM MODELOS / PRODUTOS (MODELS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS image_path TEXT;

-- ------------------------------------------------------------------------------
-- 4. STORAGE BUCKET & POLICIES (product-images)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Storage Policies
DROP POLICY IF EXISTS "Public view product images" ON storage.objects;
CREATE POLICY "Public view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;
CREATE POLICY "Authenticated upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated update product images" ON storage.objects;
CREATE POLICY "Authenticated update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated delete product images" ON storage.objects;
CREATE POLICY "Authenticated delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

-- ------------------------------------------------------------------------------
-- 5. SEED INICIAL DE FUNCIONÁRIOS EXEMPLO (OPCIONAL/IDEMPOTENTE)
-- ------------------------------------------------------------------------------
INSERT INTO public.employees (id, name, job_title, is_seller, phone, email, status, notes)
VALUES 
  ('emp-001', 'Maria Silva', 'Vendedora Sênior', true, '(41) 99888-1122', 'maria@uzedoctor.com.br', 'Ativo', 'Especialista em Jalecos Femininos'),
  ('emp-002', 'Carlos Eduardo', 'Consultor Comercial', true, '(41) 99777-3344', 'carlos@uzedoctor.com.br', 'Ativo', 'Atendimento a Clínicas e Hospitais')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- FIM DA MIGRATION
-- ==============================================================================
