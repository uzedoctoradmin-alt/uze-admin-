-- ============================================================================
-- MIGRATION: 20261011_04_delete_and_reversal_rpcs.sql
-- UZE DOCTOR: Funções Transacionais para Exclusão de Vendas e Entradas com Reversão de Estoque
-- ============================================================================

-- 1. Excluir Venda com Reversão Transacional Completa de Estoque e Financeiro
CREATE OR REPLACE FUNCTION public.fn_delete_sale_with_reversal(
  p_sale_id TEXT,
  p_actor_name TEXT DEFAULT 'Administrador ERP',
  p_reason TEXT DEFAULT 'Exclusão definitiva de venda'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale RECORD;
  v_item JSONB;
  v_variant_id TEXT;
  v_qty INT;
  v_item_is_custom BOOLEAN;
  v_current_stock INT;
  v_new_stock INT;
BEGIN
  -- 1. Buscar a venda
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Venda não encontrada');
  END IF;

  -- 2. Se a venda não estava cancelada e não era orçamento, reverter estoque físico
  IF v_sale.status NOT IN ('Cancelado', 'Orçamento') THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_sale.items)
    LOOP
      v_item_is_custom := COALESCE((v_item->>'isCustom')::boolean, false);
      v_variant_id := v_item->>'variantId';
      v_qty := COALESCE((v_item->>'quantity')::int, 0);

      IF NOT v_item_is_custom AND v_variant_id IS NOT NULL AND v_qty > 0 THEN
        -- Obter estoque atual da variante
        SELECT current_stock INTO v_current_stock FROM public.variants WHERE id = v_variant_id;
        
        IF FOUND THEN
          v_new_stock := v_current_stock + v_qty;
          
          -- Atualizar saldo na tabela variants
          UPDATE public.variants 
          SET current_stock = v_new_stock, updated_at = now() 
          WHERE id = v_variant_id;

          -- Atualizar saldo na tabela inventory se existir
          UPDATE public.inventory 
          SET current_stock = v_new_stock, updated_at = now() 
          WHERE variant_id = v_variant_id;

          -- Inserir movimentação de devolução/estorno
          INSERT INTO public.stock_movements (
            date, variant_id, product_name, sku, color_name, size,
            type, direction, quantity, previous_stock, new_stock,
            reason, sale_id, operator
          ) VALUES (
            to_char(now(), 'YYYY-MM-DD HH24:MI'),
            v_variant_id,
            COALESCE(v_item->>'productName', 'Produto'),
            COALESCE(v_item->>'sku', 'SKU'),
            v_item->>'colorName',
            v_item->>'size',
            'Devolução',
            'ENTRADA',
            v_qty,
            v_current_stock,
            v_new_stock,
            'Estorno por exclusão definitiva da venda ' || p_sale_id || ': ' || p_reason,
            p_sale_id,
            p_actor_name
          );
        END IF;
      END IF;
    END LOOP;

    -- Atualizar estatísticas do cliente se aplicável
    IF v_sale.customer_id IS NOT NULL THEN
      UPDATE public.customers
      SET 
        total_spent = GREATEST(0, total_spent - v_sale.total),
        total_orders = GREATEST(0, total_orders - 1),
        updated_at = now()
      WHERE id = v_sale.customer_id;
    END IF;
  END IF;

  -- 3. Remover receitas e parcelas associadas
  DELETE FROM public.revenues WHERE sale_id = p_sale_id OR reference_id = p_sale_id OR source = 'Venda ' || p_sale_id;
  DELETE FROM public.installments WHERE sale_id = p_sale_id;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sale_items') THEN
    DELETE FROM public.sale_items WHERE sale_id = p_sale_id;
  END IF;

  -- 4. Excluir a venda
  DELETE FROM public.sales WHERE id = p_sale_id;

  -- 5. Registrar log de auditoria administrativa
  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_email, action, target_id, target_name, details
  ) VALUES (
    'admin',
    p_actor_name,
    'admin@uzedoctor.com.br',
    'SALE_DELETED_PERMANENTLY',
    p_sale_id,
    'Venda ' || p_sale_id,
    jsonb_build_object(
      'total', v_sale.total,
      'customerName', v_sale.customer_name,
      'reason', p_reason,
      'deletedAt', now()
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;


-- 2. Excluir Entrada de Compra com Reversão Segura de Estoque
CREATE OR REPLACE FUNCTION public.fn_delete_purchase_with_reversal(
  p_purchase_id TEXT,
  p_actor_name TEXT DEFAULT 'Administrador ERP',
  p_reason TEXT DEFAULT 'Exclusão de entrada'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchase RECORD;
  v_item JSONB;
  v_variant_id TEXT;
  v_qty INT;
  v_current_stock INT;
  v_new_stock INT;
BEGIN
  SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entrada não encontrada');
  END IF;

  -- 1. Verificar se há estoque suficiente para reverter sem gerar saldo negativo
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_purchase.items)
  LOOP
    v_variant_id := v_item->>'variantId';
    v_qty := COALESCE((v_item->>'quantity')::int, 0);

    IF v_variant_id IS NOT NULL AND v_qty > 0 THEN
      SELECT current_stock INTO v_current_stock FROM public.variants WHERE id = v_variant_id;
      IF FOUND AND (v_current_stock - v_qty) < 0 THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Não é possível excluir esta entrada pois ' || v_qty || ' peças já foram comercializadas e o estoque ficaria negativo.'
        );
      END IF;
    END IF;
  END LOOP;

  -- 2. Aplicar reversão de estoque
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_purchase.items)
  LOOP
    v_variant_id := v_item->>'variantId';
    v_qty := COALESCE((v_item->>'quantity')::int, 0);

    IF v_variant_id IS NOT NULL AND v_qty > 0 THEN
      SELECT current_stock INTO v_current_stock FROM public.variants WHERE id = v_variant_id;
      IF FOUND THEN
        v_new_stock := v_current_stock - v_qty;

        UPDATE public.variants 
        SET current_stock = v_new_stock, updated_at = now() 
        WHERE id = v_variant_id;

        UPDATE public.inventory 
        SET current_stock = v_new_stock, updated_at = now() 
        WHERE variant_id = v_variant_id;

        INSERT INTO public.stock_movements (
          date, variant_id, product_name, sku, color_name, size,
          type, direction, quantity, previous_stock, new_stock,
          reason, operator
        ) VALUES (
          to_char(now(), 'YYYY-MM-DD HH24:MI'),
          v_variant_id,
          COALESCE(v_item->>'productName', 'Produto'),
          COALESCE(v_item->>'sku', 'SKU'),
          v_item->>'colorName',
          v_item->>'size',
          'Ajuste',
          'SAIDA',
          -v_qty,
          v_current_stock,
          v_new_stock,
          'Estorno por exclusão da entrada ' || v_purchase.entry_number || ': ' || p_reason,
          p_actor_name
        );
      END IF;
    END IF;
  END LOOP;

  -- 3. Excluir a entrada
  DELETE FROM public.purchases WHERE id = p_purchase_id;

  -- 4. Registrar auditoria
  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_email, action, target_id, target_name, details
  ) VALUES (
    'admin',
    p_actor_name,
    'admin@uzedoctor.com.br',
    'PURCHASE_ENTRY_DELETED',
    p_purchase_id,
    'Entrada ' || v_purchase.entry_number,
    jsonb_build_object(
      'entryNumber', v_purchase.entry_number,
      'supplier', v_purchase.supplier_name,
      'total', v_purchase.total,
      'reason', p_reason,
      'deletedAt', now()
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
