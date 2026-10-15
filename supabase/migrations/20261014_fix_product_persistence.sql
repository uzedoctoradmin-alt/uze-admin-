-- ============================================================================
-- MIGRATION: 20261014_fix_product_persistence.sql
-- UZE DOCTOR: Auditoria e Correção Definitiva de Persistência, Tabela Colors,
--             Variantes Físicas, Sincronização de Inventário e Políticas RLS
-- ============================================================================

-- 1. TABELA DE CORES (COLORS / PALETA DE CORES REUTILIZÁVEIS)
CREATE TABLE IF NOT EXISTS public.colors (
  id TEXT PRIMARY KEY DEFAULT ('col-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  name TEXT NOT NULL,
  hex_code TEXT NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garantir que o valor padrão utilize gen_random_uuid() mesmo se a tabela já tiver sido criada antes
ALTER TABLE public.colors ALTER COLUMN id SET DEFAULT ('col-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));

-- Índices e restrições de integridade
CREATE UNIQUE INDEX IF NOT EXISTS idx_colors_lower_name ON public.colors(LOWER(TRIM(name)));
CREATE INDEX IF NOT EXISTS idx_colors_is_favorite ON public.colors(is_favorite);
CREATE INDEX IF NOT EXISTS idx_colors_is_active ON public.colors(is_active);

-- 2. POLÍTICAS DE RLS PARA TABELA COLORS
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Colors: Leitura pública para autenticados e anon" ON public.colors;
CREATE POLICY "Colors: Leitura pública para autenticados e anon" 
  ON public.colors FOR SELECT 
  TO authenticated, anon 
  USING (true);

DROP POLICY IF EXISTS "Colors: Operações para autenticados e anon" ON public.colors;
CREATE POLICY "Colors: Operações para autenticados e anon" 
  ON public.colors FOR ALL 
  TO authenticated, anon 
  USING (true) 
  WITH CHECK (true);

-- 3. SEEDING DE CORES PADRÃO DA UZE DOCTOR (COM IDs DETERMINÍSTICOS E FAVORITAS)
INSERT INTO public.colors (id, name, hex_code, is_favorite, is_active)
VALUES
  ('col-branco', 'Branco', '#FFFFFF', true, true),
  ('col-preto', 'Preto', '#111827', true, true),
  ('col-azul-marinho', 'Azul-marinho', '#0F284C', true, true),
  ('col-vinho', 'Vinho / Bordô', '#831843', true, true),
  ('col-verde-cirurgico', 'Verde Cirúrgico', '#0D9488', true, true),
  ('col-azul-claro', 'Azul Claro', '#38BDF8', false, true),
  ('col-cinza-chumbo', 'Cinza Chumbo', '#4B5563', false, true),
  ('col-rosa-quartzo', 'Rosa Quartzo', '#F472B6', false, true),
  ('col-lavanda', 'Lavanda', '#B009B3', false, true),
  ('col-verde-agua', 'Verde Água', '#0BD085', false, true),
  ('col-verde-menta', 'Verde Menta', '#058F5A', false, true),
  ('col-marrom', 'Marrom', '#734D17', false, true),
  ('col-coral', 'Coral', '#F08080', false, true)
ON CONFLICT ((LOWER(TRIM(name)))) DO UPDATE 
SET 
  hex_code = EXCLUDED.hex_code,
  is_favorite = EXCLUDED.is_favorite;

-- 4. MIGRAÇÃO DE CORES EXISTENTES NOS MODELOS E VARIANTES PARA A TABELA COLORS
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  -- Migrar cores que já estão cadastradas nas variantes existentes
  FOR v_rec IN 
    SELECT DISTINCT TRIM(color_name) AS cname, TRIM(color_hex) AS chex 
    FROM public.variants 
    WHERE color_name IS NOT NULL AND TRIM(color_name) <> ''
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.colors WHERE LOWER(TRIM(name)) = LOWER(v_rec.cname)
    ) THEN
      INSERT INTO public.colors (id, name, hex_code, is_favorite, is_active)
      VALUES (
        'col-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
        v_rec.cname, 
        COALESCE(v_rec.chex, '#173E75'), 
        false, 
        true
      );
    END IF;
  END LOOP;
END $$;

-- 5. VINCULAR color_id NA TABELA VARIANTS
ALTER TABLE public.variants 
  ADD COLUMN IF NOT EXISTS color_id TEXT;

-- Adicionar Foreign Key segura para a tabela colors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'variants_color_id_fkey'
  ) THEN
    ALTER TABLE public.variants 
      ADD CONSTRAINT variants_color_id_fkey 
      FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_variants_color_id ON public.variants(color_id);

-- Atualizar color_id das variantes existentes com base no nome da cor
UPDATE public.variants v
SET color_id = c.id
FROM public.colors c
WHERE LOWER(TRIM(v.color_name)) = LOWER(TRIM(c.name))
  AND (v.color_id IS NULL OR v.color_id = '');

-- 6. GARANTIR FONTE ÚNICA DE ESTOQUE: TABELA INVENTORY
-- Garantir que todo variant possui um registro correspondente em inventory
INSERT INTO public.inventory (variant_id, current_stock, minimum_stock, location, updated_at)
SELECT 
  v.id, 
  COALESCE(v.current_stock, 0), 
  COALESCE(v.min_stock, 5), 
  'Depósito Central',
  now()
FROM public.variants v
ON CONFLICT (variant_id) DO UPDATE 
SET 
  current_stock = EXCLUDED.current_stock,
  minimum_stock = EXCLUDED.minimum_stock,
  updated_at = now();

-- 7. TRIGGER AUTOMÁTICO: SINCRONIZAR VARIANTS COM INVENTORY
CREATE OR REPLACE FUNCTION public.fn_sync_variant_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Ao inserir ou atualizar uma variante, sincronizar imediatamente a tabela inventory
  INSERT INTO public.inventory (variant_id, current_stock, minimum_stock, location, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.current_stock, 0),
    COALESCE(NEW.min_stock, 5),
    'Depósito Central',
    now()
  )
  ON CONFLICT (variant_id) DO UPDATE 
  SET 
    current_stock = EXCLUDED.current_stock,
    minimum_stock = EXCLUDED.minimum_stock,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_variant_inventory ON public.variants;
CREATE TRIGGER trg_sync_variant_inventory
AFTER INSERT OR UPDATE OF current_stock, min_stock ON public.variants
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_variant_inventory();

-- 8. REVISÃO E DESBLOQUEIO DE TODAS AS POLÍTICAS RLS (EVITAR ERROS SILENCIOSOS)
DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'colors', 'models', 'variants', 'inventory', 'customers', 'sales', 
    'sale_items', 'stock_movements', 'revenues', 'expenses', 
    'suppliers', 'purchases', 'installments', 'installment_payments', 
    'payments', 'payment_allocations', 'employees', 'company_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- Garantir RLS habilitado
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    
    -- Recriar política irrestrita para SELECT
    EXECUTE format('DROP POLICY IF EXISTS "Public select policy %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Public select policy %I" ON public.%I FOR SELECT TO authenticated, anon USING (true);', t, t);
    
    -- Recriar política irrestrita para INSERT, UPDATE, DELETE
    EXECUTE format('DROP POLICY IF EXISTS "Public write policy %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Public write policy %I" ON public.%I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;

-- 9. VIEW COMPLETA DE VARIANTES COM INVENTORY E CORES
CREATE OR REPLACE VIEW public.view_product_variants_complete AS
SELECT
  v.id AS variant_id,
  v.model_id,
  m.name AS product_name,
  m.category AS product_category,
  m.image_url AS product_image_url,
  v.sku,
  v.color_name,
  v.color_hex,
  v.size,
  v.color_id,
  COALESCE(i.current_stock, v.current_stock, 0) AS current_stock,
  COALESCE(i.minimum_stock, v.min_stock, 5) AS minimum_stock,
  CASE
    WHEN COALESCE(i.current_stock, v.current_stock, 0) = 0 THEN 'Sem estoque'
    WHEN COALESCE(i.current_stock, v.current_stock, 0) <= COALESCE(i.minimum_stock, v.min_stock, 5) THEN 'Estoque baixo'
    ELSE 'Disponível'
  END AS stock_status,
  v.cost_price,
  v.sale_price,
  v.is_active,
  v.created_at,
  v.updated_at
FROM public.variants v
LEFT JOIN public.models m ON m.id = v.model_id
LEFT JOIN public.inventory i ON i.variant_id = v.id;

GRANT SELECT ON public.view_product_variants_complete TO authenticated, anon;
