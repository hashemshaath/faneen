-- BUSINESS-WORKFLOW-2: enforce single active work order per (source_type, source_id)
-- Verified no existing duplicates at time of migration. Partial index ignores
-- soft-deleted rows and unsourced (manual) work orders.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_work_orders_source_pair_active
  ON public.work_orders (source_type, source_id)
  WHERE source_type IS NOT NULL
    AND source_id IS NOT NULL
    AND deleted_at IS NULL;