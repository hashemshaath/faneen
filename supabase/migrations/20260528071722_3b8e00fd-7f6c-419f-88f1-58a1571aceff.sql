ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS source_ref_id text;

ALTER TABLE public.work_orders
  DROP CONSTRAINT IF EXISTS work_orders_source_ref_id_format_chk;

ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_source_ref_id_format_chk
  CHECK (source_ref_id IS NULL OR source_ref_id ~ '^[A-Z]{2,6}-[A-Z0-9]+$');

CREATE INDEX IF NOT EXISTS idx_work_orders_source_ref_id
  ON public.work_orders (source_ref_id)
  WHERE source_ref_id IS NOT NULL;

COMMENT ON COLUMN public.work_orders.source_ref_id IS
  'Official human-readable reference of the originating entity (CNT-/QTE-/LED-/BKG-...). Nullable. Distinct from source_id (UUID). Never expose source_id as a primary reference.';