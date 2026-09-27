-- Migration 006: Commercial Views for Seller Privacy (Hiding costs, margins, and profit)

-- Commercial Models (without base_cost)
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

-- Commercial Variants (without cost_price)
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

-- Commercial Sales (without total_cost and estimated_profit)
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
