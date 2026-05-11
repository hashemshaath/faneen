ALTER TABLE public.installment_payments
  ADD COLUMN IF NOT EXISTS milestone_id uuid NULL
  REFERENCES public.contract_milestones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_installment_payments_milestone_id
  ON public.installment_payments(milestone_id);

COMMENT ON COLUMN public.installment_payments.milestone_id IS
  'C3A: Optional link to a contract milestone. NULL = unlinked. Read-only in UI for now.';