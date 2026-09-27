-- Migration 004: Functions, Triggers, and Atomic RPCs

-- 1. Automatic updated_at trigger
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- 2. Synchronize variant stock with inventory
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

-- 3. Atomic Finalize Sale (Validates stock, decrements, logs movements, creates sale and revenue)
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

-- 4. Atomic Cancel Sale (Reverses stock, logs refund movements, cancels revenue)
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
