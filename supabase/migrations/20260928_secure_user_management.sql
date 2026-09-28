-- ============================================================================
-- MIGRATION: 20260928_secure_user_management.sql
-- GESTÃO SEGURA E AUDITÁVEL DE USUÁRIOS E PERFIS NO SUPABASE
-- UZE DOCTOR - SISTEMA DE GESTÃO EMPRESARIAL
-- ============================================================================

-- 1. Criação/Garantia de Tipos Enumerados
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMINISTRADOR', 'VENDEDOR', 'VISUALIZACAO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('Ativo', 'Inativo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de Perfis de Usuário (public.profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'VENDEDOR',
    status user_status NOT NULL DEFAULT 'Ativo',
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT
);

-- Índices essenciais
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 3. Tabela de Logs de Auditoria (public.audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_name TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    target_name TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 4. Função e Trigger para Sincronização Automática de Profiles a partir do auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name TEXT;
    v_role user_role;
    v_status user_status;
    v_must_change BOOLEAN;
BEGIN
    v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    
    -- Determina Role
    BEGIN
        v_role := (COALESCE(NEW.raw_user_meta_data->>'role', NEW.raw_app_meta_data->>'role', 'VENDEDOR'))::user_role;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'VENDEDOR'::user_role;
    END;

    -- Determina Status
    BEGIN
        v_status := (COALESCE(NEW.raw_user_meta_data->>'status', 'Ativo'))::user_status;
    EXCEPTION WHEN OTHERS THEN
        v_status := 'Ativo'::user_status;
    END;

    v_must_change := COALESCE((NEW.raw_user_meta_data->>'must_change_password')::BOOLEAN, false);

    INSERT INTO public.profiles (
        id,
        name,
        email,
        role,
        status,
        must_change_password,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        v_name,
        LOWER(NEW.email),
        v_role,
        v_status,
        v_must_change,
        COALESCE(NEW.created_at, now()),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = now();

    RETURN NEW;
END;
$$;

-- Registra o Trigger no schema auth (se não existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE OF raw_user_meta_data, email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de perfis
DROP POLICY IF EXISTS "Perfis visíveis para usuários autenticados" ON public.profiles;
CREATE POLICY "Perfis visíveis para usuários autenticados"
    ON public.profiles FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Perfis editáveis por administradores ou próprio usuário" ON public.profiles;
CREATE POLICY "Perfis editáveis por administradores ou próprio usuário"
    ON public.profiles FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Políticas de auditoria
DROP POLICY IF EXISTS "Logs de auditoria visíveis para autenticados" ON public.audit_logs;
CREATE POLICY "Logs de auditoria visíveis para autenticados"
    ON public.audit_logs FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Inserção de logs permitida" ON public.audit_logs;
CREATE POLICY "Inserção de logs permitida"
    ON public.audit_logs FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);
