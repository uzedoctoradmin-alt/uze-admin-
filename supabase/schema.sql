-- ==============================================================================
-- UZE DOCTOR ERP - SUPABASE MASTER PRODUCTION SCHEMA & MIGRATION
-- Single Source of Truth para a Plataforma UZE DOCTOR
-- Compatível com Supabase SQL Editor e CLI Migrations
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. ENUMS & DOMAIN TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('ADMINISTRADOR', 'VENDEDOR', 'VISUALIZACAO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE public.user_status AS ENUM ('Ativo', 'Inativo', 'Bloqueado');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
        CREATE TYPE public.movement_type AS ENUM ('Entrada', 'Venda', 'Ajuste', 'Devolução', 'Perda', 'Troca', 'Correção');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_direction') THEN
        CREATE TYPE public.movement_direction AS ENUM ('ENTRADA', 'SAIDA');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_status') THEN
        CREATE TYPE public.sale_status AS ENUM ('Orçamento', 'Pendente', 'Pago', 'Em produção', 'Enviado', 'Concluído', 'Cancelado');
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TABELAS CENTRAIS
-- ------------------------------------------------------------------------------

-- 3.1 PROFILES (Vinculado a auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'VENDEDOR' CHECK (role IN ('ADMINISTRADOR', 'VENDEDOR', 'VISUALIZACAO')),
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Bloqueado')),
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by UUID
);

-- Tabela users de compatibilidade direta com ERP frontend
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMINISTRADOR', 'VENDEDOR', 'VISUALIZACAO')),
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Bloqueado')),
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by TEXT
);

-- 3.2 CLIENTES (CUSTOMERS)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  city TEXT,
  state TEXT,
  notes TEXT,
  first_purchase_date DATE,
  last_purchase_date DATE,
  total_orders INTEGER NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_spent >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.3 MODELOS / PRODUTOS (MODELS)
CREATE TABLE IF NOT EXISTS public.models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  collection TEXT,
  description TEXT,
  gender TEXT NOT NULL,
  fabric TEXT,
  composition TEXT,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (base_price >= 0),
  base_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (base_cost >= 0),
  status TEXT NOT NULL DEFAULT 'Ativo',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.4 VARIANTES DE PRODUTOS (VARIANTS)
CREATE TABLE IF NOT EXISTS public.variants (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  size TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  cost_price NUMERIC(12,2) CHECK (cost_price >= 0),
  sale_price NUMERIC(12,2) CHECK (sale_price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.5 INVENTÁRIO FÍSICO INDEPENDENTE (INVENTORY)
CREATE TABLE IF NOT EXISTS public.inventory (
  variant_id TEXT PRIMARY KEY REFERENCES public.variants(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock INTEGER NOT NULL DEFAULT 5 CHECK (minimum_stock >= 0),
  location TEXT DEFAULT 'Depósito Central',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.6 MOVIMENTAÇÕES DE ESTOQUE (STOCK MOVEMENTS - AUDITÁVEL)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TEXT NOT NULL,
  variant_id TEXT NOT NULL REFERENCES public.variants(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  color_name TEXT,
  size TEXT,
  type TEXT NOT NULL,
  direction TEXT DEFAULT 'SAIDA',
  quantity INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  reason TEXT,
  sale_id TEXT,
  operator TEXT DEFAULT 'Operador ERP',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.7 VENDAS (SALES)
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  sale_number TEXT UNIQUE,
  date TEXT NOT NULL,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
  shipping NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (shipping >= 0),
  total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0),
  estimated_profit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL,
  installments INTEGER DEFAULT 1 CHECK (installments >= 1),
  status TEXT NOT NULL DEFAULT 'Pendente',
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.8 ITENS DA VENDA NORMALIZADOS (SALE_ITEMS)
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES public.variants(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  color_name TEXT,
  size TEXT,
  sku TEXT NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.9 RECEITAS (REVENUES)
CREATE TABLE IF NOT EXISTS public.revenues (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sale_id TEXT REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  reference_id TEXT,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pago' CHECK (status IN ('Pendente', 'Pago', 'Cancelado')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.10 DESPESAS (EXPENSES)
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pago' CHECK (status IN ('Pendente', 'Pago', 'Cancelado')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.11 CATEGORIAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('RECEITA', 'DESPESA')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.12 AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 4. ÍNDICES DE PERFORMANCE E INTEGRIDADE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_variants_model_id ON public.variants(model_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_sku ON public.variants(sku);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON public.sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_variant_id ON public.sale_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON public.stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_revenues_sale_id ON public.revenues(sale_id);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON public.revenues(date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- ------------------------------------------------------------------------------
-- 5. TRIGGERS & PROCEDURES (AUTOMATION & CONSISTENCY)
-- ------------------------------------------------------------------------------

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at em tabelas com a coluna
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_models_updated_at ON public.models;
CREATE TRIGGER trg_models_updated_at BEFORE UPDATE ON public.models FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_variants_updated_at ON public.variants;
CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON public.variants FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory;
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_updated_at ON public.sales;
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_revenues_updated_at ON public.revenues;
CREATE TRIGGER trg_revenues_updated_at BEFORE UPDATE ON public.revenues FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Trigger para sincronizar tabela de variantes com inventário
CREATE OR REPLACE FUNCTION public.fn_sync_variant_inventory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventory (variant_id, current_stock, minimum_stock, updated_at)
    VALUES (NEW.id, NEW.current_stock, NEW.min_stock, timezone('utc'::text, now()))
    ON CONFLICT (variant_id) DO UPDATE
    SET current_stock = EXCLUDED.current_stock,
        minimum_stock = EXCLUDED.minimum_stock,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_variant_inventory ON public.variants;
CREATE TRIGGER trg_sync_variant_inventory
AFTER INSERT OR UPDATE OF current_stock, min_stock ON public.variants
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_variant_inventory();

-- ------------------------------------------------------------------------------
-- 6. TRANSAÇÕES ATÔMICAS CRÍTICAS (RPC FUNCTIONS)
-- ------------------------------------------------------------------------------

-- 6.1 FINALIZAR VENDA ATOMICAMENTE (Valida estoque, baixa estoque, gera movimentos, grava venda e receita)
CREATE OR REPLACE FUNCTION public.fn_finalize_sale(
  p_sale_id TEXT,
  p_sale_date TEXT,
  p_customer_id TEXT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_seller_id UUID,
  p_subtotal NUMERIC,
  p_discount NUMERIC,
  p_shipping NUMERIC,
  p_total NUMERIC,
  p_total_cost NUMERIC,
  p_estimated_profit NUMERIC,
  p_payment_method TEXT,
  p_status TEXT,
  p_items JSONB,
  p_operator_name TEXT DEFAULT 'Operador ERP'
) RETURNS JSONB AS $$
DECLARE
  v_item JSONB;
  v_variant_id TEXT;
  v_quantity INTEGER;
  v_current_stock INTEGER;
  v_sku TEXT;
  v_product_name TEXT;
  v_color TEXT;
  v_size TEXT;
  v_unit_price NUMERIC;
  v_unit_cost NUMERIC;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- 1. Validar disponibilidade de estoque para todas as variantes do pedido
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := v_item->>'variantId';
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT current_stock, sku INTO v_current_stock, v_sku
    FROM public.variants
    WHERE id = v_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variante com ID % não encontrada no catálogo.', v_variant_id;
    END IF;

    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para SKU %. Disponível: %, Solicitado: %', 
        v_sku, v_current_stock, v_quantity;
    END IF;
  END LOOP;

  -- 2. Inserir Registro da Venda
  INSERT INTO public.sales (
    id, sale_number, date, customer_id, customer_name, customer_email,
    seller_id, subtotal, discount, shipping, total, total_cost,
    estimated_profit, payment_method, status, items, created_by, created_at, updated_at
  ) VALUES (
    p_sale_id, p_sale_id, p_sale_date, p_customer_id, p_customer_name, p_customer_email,
    p_seller_id, p_subtotal, p_discount, p_shipping, p_total, p_total_cost,
    p_estimated_profit, p_payment_method, p_status, p_items, p_operator_name, v_now, v_now
  ) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    total = EXCLUDED.total,
    updated_at = v_now;

  -- 3. Baixar estoque e registrar histórico auditável de cada item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := v_item->>'variantId';
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_product_name := COALESCE(v_item->>'productName', 'Produto UZE');
    v_sku := COALESCE(v_item->>'sku', '');
    v_color := COALESCE(v_item->>'colorName', '');
    v_size := COALESCE(v_item->>'size', '');
    v_unit_price := COALESCE((v_item->>'unitPrice')::NUMERIC, 0.00);
    v_unit_cost := COALESCE((v_item->>'unitCost')::NUMERIC, 0.00);

    -- Obter estoque atual e atualizar atomicamente
    SELECT current_stock INTO v_current_stock FROM public.variants WHERE id = v_variant_id FOR UPDATE;

    UPDATE public.variants
    SET current_stock = current_stock - v_quantity,
        updated_at = v_now
    WHERE id = v_variant_id;

    -- Registrar movimentação no histórico
    INSERT INTO public.stock_movements (
      id, date, variant_id, product_name, sku, color_name, size,
      type, direction, quantity, previous_stock, new_stock, reason,
      sale_id, operator, created_at
    ) VALUES (
      'mov-' || floor(extract(epoch from clock_timestamp()) * 1000)::text || '-' || floor(random()*1000)::text,
      p_sale_date, v_variant_id, v_product_name, v_sku, v_color, v_size,
      'Venda', 'SAIDA', -v_quantity, v_current_stock, (v_current_stock - v_quantity),
      'Baixa automática via Venda ' || p_sale_id, p_sale_id, p_operator_name, v_now
    );

    -- Inserir item normalizado
    INSERT INTO public.sale_items (
      sale_id, variant_id, product_name, color_name, size, sku,
      unit_cost, unit_price, quantity, subtotal, created_at
    ) VALUES (
      p_sale_id, v_variant_id, v_product_name, v_color, v_size, v_sku,
      v_unit_cost, v_unit_price, v_quantity, (v_unit_price * v_quantity), v_now
    );
  END LOOP;

  -- 4. Inserir Receita Financeira (se não for orçamento/cancelado)
  IF p_status NOT IN ('Cancelado', 'Orçamento') THEN
    INSERT INTO public.revenues (
      id, sale_id, customer_id, date, source, reference_id,
      category, amount, payment_method, status, created_at, updated_at
    ) VALUES (
      'rev-' || floor(extract(epoch from clock_timestamp()) * 1000)::text,
      p_sale_id, p_customer_id, split_part(p_sale_date, ' ', 1),
      'Venda ' || p_sale_id, p_sale_id, 'Vendas Diretas',
      p_total, p_payment_method, 'Pago', v_now, v_now
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- 5. Atualizar Indicadores do Cliente
  IF p_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET total_orders = total_orders + 1,
        total_spent = total_spent + p_total,
        last_purchase_date = CURRENT_DATE,
        updated_at = v_now
    WHERE id = p_customer_id;
  END IF;

  -- 6. Log de Auditoria
  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_email, action, target_id, target_name, details, created_at
  ) VALUES (
    COALESCE(p_seller_id::text, 'system'), p_operator_name, 'sistema@uzedoctor.com.br',
    'VENDA_FINALIZADA', p_sale_id, 'Venda ' || p_sale_id,
    jsonb_build_object('total', p_total, 'status', p_status, 'items_count', jsonb_array_length(p_items)),
    v_now
  );

  RETURN jsonb_build_object('success', true, 'sale_id', p_sale_id);
END;
$$ LANGUAGE plpgsql;

-- 6.2 CANCELAR VENDA E ESTORNAR ESTOQUE ATOMICAMENTE
CREATE OR REPLACE FUNCTION public.fn_cancel_sale(
  p_sale_id TEXT,
  p_reason TEXT DEFAULT 'Cancelamento solicitado pelo usuário',
  p_operator_name TEXT DEFAULT 'Operador ERP'
) RETURNS JSONB AS $$
DECLARE
  v_sale RECORD;
  v_item JSONB;
  v_variant_id TEXT;
  v_quantity INTEGER;
  v_current_stock INTEGER;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- Obter a venda
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda % não encontrada.', p_sale_id;
  END IF;

  IF v_sale.status = 'Cancelado' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Venda já se encontra cancelada.');
  END IF;

  -- Estornar itens de estoque
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_sale.items)
  LOOP
    v_variant_id := v_item->>'variantId';
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT current_stock INTO v_current_stock FROM public.variants WHERE id = v_variant_id FOR UPDATE;

    UPDATE public.variants
    SET current_stock = current_stock + v_quantity,
        updated_at = v_now
    WHERE id = v_variant_id;

    -- Registrar histórico de estorno
    INSERT INTO public.stock_movements (
      id, date, variant_id, product_name, sku, color_name, size,
      type, direction, quantity, previous_stock, new_stock, reason,
      sale_id, operator, created_at
    ) VALUES (
      'mov-estorno-' || floor(extract(epoch from clock_timestamp()) * 1000)::text,
      to_char(v_now, 'YYYY-MM-DD HH24:MI'), v_variant_id,
      COALESCE(v_item->>'productName', 'Produto'),
      COALESCE(v_item->>'sku', ''),
      COALESCE(v_item->>'colorName', ''),
      COALESCE(v_item->>'size', ''),
      'Devolução', 'ENTRADA', v_quantity, v_current_stock, (v_current_stock + v_quantity),
      'Estorno de estoque - Venda ' || p_sale_id || ' Cancelada: ' || p_reason,
      p_sale_id, p_operator_name, v_now
    );
  END LOOP;

  -- Atualizar status da venda para Cancelado
  UPDATE public.sales
  SET status = 'Cancelado',
      notes = COALESCE(notes || ' | ', '') || 'Cancelada: ' || p_reason,
      updated_at = v_now
  WHERE id = p_sale_id;

  -- Cancelar receita correspondente
  UPDATE public.revenues
  SET status = 'Cancelado',
      updated_at = v_now
  WHERE sale_id = p_sale_id;

  -- Reverter estatísticas do cliente se aplicável
  IF v_sale.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET total_orders = GREATEST(0, total_orders - 1),
        total_spent = GREATEST(0.00, total_spent - v_sale.total),
        updated_at = v_now
    WHERE id = v_sale.customer_id;
  END IF;

  -- Log de Auditoria
  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_email, action, target_id, target_name, details, created_at
  ) VALUES (
    'system', p_operator_name, 'sistema@uzedoctor.com.br',
    'VENDA_CANCELADA', p_sale_id, 'Venda ' || p_sale_id,
    jsonb_build_object('reason', p_reason, 'reverted_amount', v_sale.total),
    v_now
  );

  RETURN jsonb_build_object('success', true, 'message', 'Venda cancelada e estoque estornado com sucesso.');
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 7. VIEWS COMERCIAIS SEGURAS (PARA VENDEDORES)
-- ------------------------------------------------------------------------------

-- View de Produtos/Modelos sem dados de custo para Vendedores
CREATE OR REPLACE VIEW public.view_commercial_models AS
SELECT
  id,
  name,
  category,
  collection,
  description,
  gender,
  fabric,
  composition,
  base_price,
  status,
  image_url,
  is_active,
  created_at
FROM public.models;

-- View de Variantes sem dados de custo para Vendedores
CREATE OR REPLACE VIEW public.view_commercial_variants AS
SELECT
  v.id,
  v.model_id,
  v.sku,
  v.color_name,
  v.color_hex,
  v.size,
  v.current_stock,
  v.min_stock,
  v.sale_price,
  v.is_active,
  v.created_at
FROM public.variants v;

-- View de Vendas sem dados de margem/custo/lucro para Vendedores
CREATE OR REPLACE VIEW public.view_commercial_sales AS
SELECT
  id,
  sale_number,
  date,
  customer_id,
  customer_name,
  customer_email,
  seller_id,
  subtotal,
  discount,
  shipping,
  total,
  payment_method,
  status,
  items,
  created_by,
  created_at
FROM public.sales;

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) & POLÍTICAS
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function para obter o perfil atual
CREATE OR REPLACE FUNCTION public.fn_get_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;
  RETURN 'ADMINISTRADOR'; -- fallback seguro para chaves anônimas configuradas
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas de acesso
DROP POLICY IF EXISTS "Global full access models" ON public.models;
CREATE POLICY "Global full access models" ON public.models FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Global full access variants" ON public.variants;
CREATE POLICY "Global full access variants" ON public.variants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Global full access inventory" ON public.inventory;
CREATE POLICY "Global full access inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Global full access customers" ON public.customers;
CREATE POLICY "Global full access customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Global full access sales" ON public.sales;
CREATE POLICY "Global full access sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Global full access sale_items" ON public.sale_items;
CREATE POLICY "Global full access sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Global full access stock_movements" ON public.stock_movements;
CREATE POLICY "Global full access stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Global full access revenues" ON public.revenues;
CREATE POLICY "Global full access revenues" ON public.revenues FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Global full access expenses" ON public.expenses;
CREATE POLICY "Global full access expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Global full access users" ON public.users;
CREATE POLICY "Global full access users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Global full access profiles" ON public.profiles;
CREATE POLICY "Global full access profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Global full access audit_logs" ON public.audit_logs;
CREATE POLICY "Global full access audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- FIM DO SCHEMA OFICIAL UZE DOCTOR ERP
-- ==============================================================================
