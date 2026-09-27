-- Migration 001: Extensions and Enums
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
