ALTER TABLE public.work_order_boqs
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'work_order_boqs_review_status_chk'
      AND conrelid = 'public.work_order_boqs'::regclass
  ) THEN
    ALTER TABLE public.work_order_boqs
      ADD CONSTRAINT work_order_boqs_review_status_chk
      CHECK (review_status IN ('draft', 'submitted', 'needs_changes', 'accepted'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_wo_boqs_review_status
  ON public.work_order_boqs (review_status)
  WHERE deleted_at IS NULL;