-- RFQ-BRAND-PICKER-1E — Supplier proposed brand + equivalence review.
-- Additive only. RLS untouched (existing psqi_* policies cover all columns).

ALTER TABLE public.procurement_supplier_quote_items
  ADD COLUMN IF NOT EXISTS proposed_brand_name text,
  ADD COLUMN IF NOT EXISTS brand_match_status text,
  ADD COLUMN IF NOT EXISTS brand_review_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS brand_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS brand_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS brand_review_note text;

-- Domain CHECK constraints (immutable enums — safe to use CHECK here).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'psqi_brand_match_status_chk'
  ) THEN
    ALTER TABLE public.procurement_supplier_quote_items
      ADD CONSTRAINT psqi_brand_match_status_chk CHECK (
        brand_match_status IS NULL OR brand_match_status IN (
          'exact_match',
          'proposed_equivalent',
          'no_brand',
          'mismatch',
          'pending_review',
          'approved_equivalent',
          'rejected_equivalent'
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'psqi_brand_review_status_chk'
  ) THEN
    ALTER TABLE public.procurement_supplier_quote_items
      ADD CONSTRAINT psqi_brand_review_status_chk CHECK (
        brand_review_status IN ('not_required','pending','approved','rejected')
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'psqi_proposed_brand_name_len_chk'
  ) THEN
    ALTER TABLE public.procurement_supplier_quote_items
      ADD CONSTRAINT psqi_proposed_brand_name_len_chk CHECK (
        proposed_brand_name IS NULL OR char_length(proposed_brand_name) <= 120
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'psqi_brand_review_note_len_chk'
  ) THEN
    ALTER TABLE public.procurement_supplier_quote_items
      ADD CONSTRAINT psqi_brand_review_note_len_chk CHECK (
        brand_review_note IS NULL OR char_length(brand_review_note) <= 1000
      );
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_psqi_brand_review_status
  ON public.procurement_supplier_quote_items(brand_review_status)
  WHERE brand_review_status IN ('pending','approved','rejected');

-- Guard review-state transitions: only pending → approved/rejected.
-- Once approved/rejected, can only revert to pending (explicit override).
CREATE OR REPLACE FUNCTION public.tg_psqi_validate_brand_review_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.brand_review_status IS DISTINCT FROM OLD.brand_review_status THEN
    -- Allowed graph:
    --   not_required → pending
    --   pending → approved | rejected | not_required
    --   approved → pending  (override)
    --   rejected → pending  (override)
    IF NOT (
      (OLD.brand_review_status = 'not_required' AND NEW.brand_review_status = 'pending')
      OR (OLD.brand_review_status = 'pending' AND NEW.brand_review_status IN ('approved','rejected','not_required'))
      OR (OLD.brand_review_status IN ('approved','rejected') AND NEW.brand_review_status = 'pending')
    ) THEN
      RAISE EXCEPTION 'Invalid brand_review_status transition: % → %',
        OLD.brand_review_status, NEW.brand_review_status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_psqi_validate_brand_review_transition
  ON public.procurement_supplier_quote_items;
CREATE TRIGGER trg_psqi_validate_brand_review_transition
BEFORE UPDATE OF brand_review_status ON public.procurement_supplier_quote_items
FOR EACH ROW EXECUTE FUNCTION public.tg_psqi_validate_brand_review_transition();