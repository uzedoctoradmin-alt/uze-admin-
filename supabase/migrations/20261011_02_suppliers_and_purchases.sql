-- ============================================================================
-- MIGRATION: 20261011_02_suppliers_and_purchases.sql
-- UZE DOCTOR: Módulo de Fornecedores e Entradas/Compras da Fábrica
-- ============================================================================

-- 1. Tabela de Fornecedores (Suppliers)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Entradas / Compras da Fábrica (Purchases / Stock Entries)
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entry_number TEXT NOT NULL UNIQUE,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Concluído' CHECK (status IN ('Concluído', 'Cancelado', 'Pendente')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
  shipping NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (shipping >= 0),
  total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_entry_date ON public.purchases(entry_date);
CREATE INDEX IF NOT EXISTS idx_purchases_entry_number ON public.purchases(entry_number);
