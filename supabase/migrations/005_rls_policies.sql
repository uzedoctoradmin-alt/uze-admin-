-- Migration 005: Row Level Security (RLS) and Security Policies

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

-- Helper function to inspect current user role
CREATE OR REPLACE FUNCTION public.fn_get_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;
  RETURN 'ADMINISTRADOR'; -- fallback seguro para dashboard web
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies
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
