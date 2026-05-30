-- RFQ-BRAND-PICKER-1A — Additive brand-aware columns
-- All columns nullable, no behavior change for existing rows.

-- 1) Customer RFQ header-level brand preference
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS preferred_brand_ids uuid[],
  ADD COLUMN IF NOT EXISTS brand_preference_mode text,
  ADD COLUMN IF NOT EXISTS brand_notes text;

ALTER TABLE public.quote_requests
  DROP CONSTRAINT IF EXISTS quote_requests_brand_preference_mode_check;
ALTER TABLE public.quote_requests
  ADD CONSTRAINT quote_requests_brand_preference_mode_check
  CHECK (brand_preference_mode IS NULL OR brand_preference_mode IN ('exact','preferred','flexible'));

-- 2) BOQ item-level brand
ALTER TABLE public.work_order_boq_items
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brand_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand_lock text;

ALTER TABLE public.work_order_boq_items
  DROP CONSTRAINT IF EXISTS work_order_boq_items_brand_lock_check;
ALTER TABLE public.work_order_boq_items
  ADD CONSTRAINT work_order_boq_items_brand_lock_check
  CHECK (brand_lock IS NULL OR brand_lock IN ('exact','preferred','flexible'));

CREATE INDEX IF NOT EXISTS idx_work_order_boq_items_brand_id
  ON public.work_order_boq_items(brand_id) WHERE brand_id IS NOT NULL;

-- 3) Procurement RFQ item-level brand
ALTER TABLE public.procurement_rfq_items
  ADD COLUMN IF NOT EXISTS requested_brand_id uuid REFERENCES public.brand_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand_lock text;

ALTER TABLE public.procurement_rfq_items
  DROP CONSTRAINT IF EXISTS procurement_rfq_items_brand_lock_check;
ALTER TABLE public.procurement_rfq_items
  ADD CONSTRAINT procurement_rfq_items_brand_lock_check
  CHECK (brand_lock IS NULL OR brand_lock IN ('exact','preferred','flexible'));

CREATE INDEX IF NOT EXISTS idx_procurement_rfq_items_requested_brand_id
  ON public.procurement_rfq_items(requested_brand_id) WHERE requested_brand_id IS NOT NULL;

-- 4) Supplier proposed brand + equivalence
ALTER TABLE public.procurement_supplier_quote_items
  ADD COLUMN IF NOT EXISTS proposed_brand_id uuid REFERENCES public.brand_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_equivalent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS equivalence_notes text;

CREATE INDEX IF NOT EXISTS idx_procurement_supplier_quote_items_proposed_brand_id
  ON public.procurement_supplier_quote_items(proposed_brand_id) WHERE proposed_brand_id IS NOT NULL;

-- 5) Approved-brand validation function (shared across all four surfaces)
CREATE OR REPLACE FUNCTION public.validate_brand_id_approved(_brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brand_catalog
    WHERE id = _brand_id
      AND status = 'approved'
      AND COALESCE(is_active, true) = true
      AND merged_into_brand_id IS NULL
  );
$$;

-- 5a) quote_requests trigger: every id in preferred_brand_ids must be approved
CREATE OR REPLACE FUNCTION public.tg_quote_requests_validate_brands()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bid uuid;
BEGIN
  IF NEW.preferred_brand_ids IS NOT NULL THEN
    FOREACH bid IN ARRAY NEW.preferred_brand_ids LOOP
      IF NOT public.validate_brand_id_approved(bid) THEN
        RAISE EXCEPTION 'Brand % is not approved/active', bid USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_requests_validate_brands ON public.quote_requests;
CREATE TRIGGER trg_quote_requests_validate_brands
BEFORE INSERT OR UPDATE OF preferred_brand_ids ON public.quote_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_quote_requests_validate_brands();

-- 5b) Generic single-brand-column trigger used by the three item tables
CREATE OR REPLACE FUNCTION public.tg_validate_single_brand_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  col text := TG_ARGV[0];
  bid uuid;
BEGIN
  EXECUTE format('SELECT ($1).%I', col) INTO bid USING NEW;
  IF bid IS NOT NULL AND NOT public.validate_brand_id_approved(bid) THEN
    RAISE EXCEPTION 'Brand % is not approved/active', bid USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_boq_items_validate_brand ON public.work_order_boq_items;
CREATE TRIGGER trg_boq_items_validate_brand
BEFORE INSERT OR UPDATE OF brand_id ON public.work_order_boq_items
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_single_brand_column('brand_id');

DROP TRIGGER IF EXISTS trg_proc_rfq_items_validate_brand ON public.procurement_rfq_items;
CREATE TRIGGER trg_proc_rfq_items_validate_brand
BEFORE INSERT OR UPDATE OF requested_brand_id ON public.procurement_rfq_items
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_single_brand_column('requested_brand_id');

DROP TRIGGER IF EXISTS trg_proc_supplier_quote_items_validate_brand ON public.procurement_supplier_quote_items;
CREATE TRIGGER trg_proc_supplier_quote_items_validate_brand
BEFORE INSERT OR UPDATE OF proposed_brand_id ON public.procurement_supplier_quote_items
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_single_brand_column('proposed_brand_id');