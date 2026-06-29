ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS taxonomy_category_id uuid NULL
  REFERENCES public.taxonomy_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_taxonomy_category_id
  ON public.work_orders (taxonomy_category_id);