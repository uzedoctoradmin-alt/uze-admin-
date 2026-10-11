-- ============================================================================
-- MIGRATION: 20261011_01_simplify_products_and_variants.sql
-- UZE DOCTOR: Reestruturação de Produtos, Remoção de Coleção e Desbloqueio de FKs
-- ============================================================================

-- 1. Dropar views dependentes antes de remover a coluna 'collection'
DROP VIEW IF EXISTS public.view_commercial_models CASCADE;

-- 2. Remoção segura do campo 'collection' da tabela 'models' com CASCADE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'models' 
      AND column_name = 'collection'
  ) THEN
    ALTER TABLE public.models DROP COLUMN collection CASCADE;
  END IF;
END $$;

-- 3. Adicionar suporte a cores e tamanhos selecionados diretamente no modelo/produto
ALTER TABLE public.models 
  ADD COLUMN IF NOT EXISTS available_colors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS available_sizes TEXT[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS image_path TEXT;

-- 4. Recriar a view comercial segura sem 'collection' e com os novos campos
CREATE OR REPLACE VIEW public.view_commercial_models AS
SELECT
  id,
  name,
  category,
  description,
  gender,
  fabric,
  composition,
  base_price,
  status,
  image_url,
  image_path,
  is_active,
  available_colors,
  available_sizes,
  created_at
FROM public.models;

GRANT SELECT ON public.view_commercial_models TO authenticated, anon;

-- 5. Desbloqueio das Foreign Keys excessivamente restritivas que impediam exclusão de testes
-- Ajuste da FK em stock_movements (trocar ON DELETE RESTRICT por ON DELETE CASCADE)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stock_movements'
  ) THEN
    -- Remover constraint antiga se existir
    IF EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'stock_movements_variant_id_fkey'
    ) THEN
      ALTER TABLE public.stock_movements DROP CONSTRAINT stock_movements_variant_id_fkey;
    END IF;

    -- Recriar com ON DELETE CASCADE para permitir remoção limpa de variantes/modelos de teste
    ALTER TABLE public.stock_movements 
      ADD CONSTRAINT stock_movements_variant_id_fkey 
      FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ajuste da FK em sale_items (trocar ON DELETE RESTRICT por ON DELETE CASCADE)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sale_items'
  ) THEN
    IF EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'sale_items_variant_id_fkey'
    ) THEN
      ALTER TABLE public.sale_items DROP CONSTRAINT sale_items_variant_id_fkey;
    END IF;

    ALTER TABLE public.sale_items 
      ADD CONSTRAINT sale_items_variant_id_fkey 
      FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Garantir índices para alta performance de consulta nas variantes
CREATE INDEX IF NOT EXISTS idx_variants_model_id ON public.variants(model_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.variants(sku);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stock_movements'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_stock_movements_variant_id ON public.stock_movements(variant_id);
  END IF;
END $$;
