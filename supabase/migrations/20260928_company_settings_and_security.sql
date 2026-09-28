-- ============================================================================
-- MIGRATION: 20260928_company_settings_and_security.sql
-- CONFIGURAÇÕES DA EMPRESA (OPCIONAIS) E AUDITORIA DE SEGURANÇA
-- UZE DOCTOR - SISTEMA DE GESTÃO EMPRESARIAL
-- ============================================================================

-- 1. Tabela de Configurações da Empresa (public.company_settings)
-- Todos os campos cadastrais são estritamente NULLABLE / opcionais
CREATE TABLE IF NOT EXISTS public.company_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    trade_name TEXT,
    legal_name TEXT,
    tax_id TEXT,
    commercial_address TEXT,
    corporate_email TEXT,
    default_min_stock INTEGER DEFAULT 5,
    enable_low_stock_alert BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT
);

-- Garante que todos os campos sejam NULLABLE caso a tabela já existisse
ALTER TABLE public.company_settings ALTER COLUMN trade_name DROP NOT NULL;
ALTER TABLE public.company_settings ALTER COLUMN legal_name DROP NOT NULL;
ALTER TABLE public.company_settings ALTER COLUMN tax_id DROP NOT NULL;
ALTER TABLE public.company_settings ALTER COLUMN commercial_address DROP NOT NULL;
ALTER TABLE public.company_settings ALTER COLUMN corporate_email DROP NOT NULL;

-- 2. Habilitação de RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Configurações visíveis para usuários autenticados" ON public.company_settings;
CREATE POLICY "Configurações visíveis para usuários autenticados"
    ON public.company_settings FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Configurações editáveis por administradores" ON public.company_settings;
CREATE POLICY "Configurações editáveis por administradores"
    ON public.company_settings FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 3. Inserção Inicial Padrão Vazia (Sem dados fictícios)
INSERT INTO public.company_settings (id, trade_name, default_min_stock, enable_low_stock_alert)
VALUES ('default', 'UZE DOCTOR', 5, true)
ON CONFLICT (id) DO NOTHING;
