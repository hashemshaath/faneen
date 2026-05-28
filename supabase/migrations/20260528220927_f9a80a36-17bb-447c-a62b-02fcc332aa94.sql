-- BUSINESS-WORKFLOW-5C: Bill of Quantities (BOQ) from Work Order measurements.
-- Two tables: header (work_order_boqs) + line items (work_order_boq_items).
-- Pricing is editable on draft BOQs only; finalized BOQs become read-only.
-- No payments, contracts, invoices, accounting, or notifications are involved.

-- Sequences for human-readable refs
CREATE SEQUENCE IF NOT EXISTS public.work_order_boqs_ref_seq START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS public.work_order_boq_items_ref_seq START WITH 1000;

-- ─────────────────────────────────────────────────────────────────────────────
-- work_order_boqs (header)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.work_order_boqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','finalized')),
  notes text NULL,
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_by uuid NOT NULL,
  finalized_at timestamptz NULL,
  finalized_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CHECK (char_length(title) BETWEEN 1 AND 200)
);

CREATE INDEX idx_wo_boqs_wo ON public.work_order_boqs (work_order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wo_boqs_business ON public.work_order_boqs (business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wo_boqs_status ON public.work_order_boqs (status) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_boqs TO authenticated;
GRANT ALL ON public.work_order_boqs TO service_role;

ALTER TABLE public.work_order_boqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_boqs_select_member" ON public.work_order_boqs
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.deleted_at IS NULL
      AND public.is_work_order_member(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_boqs_insert_manager" ON public.work_order_boqs
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND status = 'draft'
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.deleted_at IS NULL
      AND w.business_id = work_order_boqs.business_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_boqs_update_manager_draft" ON public.work_order_boqs
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_boqs_delete_manager_draft" ON public.work_order_boqs
FOR DELETE TO authenticated
USING (
  status = 'draft'
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

-- Trigger: ref id + updated_at + finalized lock (status cannot go back to draft)
CREATE OR REPLACE FUNCTION public.trg_work_order_boqs_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ref_id IS NULL THEN
      NEW.ref_id := 'BOQ-' || nextval('public.work_order_boqs_ref_seq')::text;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Cannot revert a finalized BOQ to draft
    IF OLD.status = 'finalized' AND NEW.status = 'draft' THEN
      RAISE EXCEPTION 'boq_finalized_locked';
    END IF;
    -- Finalized BOQ: only allow finalized_at / finalized_by transition; freeze numeric/title/notes/status
    IF OLD.status = 'finalized' THEN
      IF NEW.title IS DISTINCT FROM OLD.title
        OR NEW.notes IS DISTINCT FROM OLD.notes
        OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
        OR NEW.tax IS DISTINCT FROM OLD.tax
        OR NEW.total IS DISTINCT FROM OLD.total THEN
        RAISE EXCEPTION 'boq_finalized_locked';
      END IF;
    END IF;
    IF NEW.status = 'finalized' AND OLD.status = 'draft' THEN
      NEW.finalized_at := now();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_boqs_defaults
BEFORE INSERT OR UPDATE ON public.work_order_boqs
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_boqs_defaults();

-- ─────────────────────────────────────────────────────────────────────────────
-- work_order_boq_items (line items)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.work_order_boq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  boq_id uuid NOT NULL REFERENCES public.work_order_boqs(id) ON DELETE CASCADE,
  measurement_id uuid NULL REFERENCES public.work_order_measurements(id) ON DELETE SET NULL,
  item_type text NOT NULL DEFAULT 'material'
    CHECK (item_type IN ('material','labor','service','fabrication')),
  title_ar text NOT NULL,
  title_en text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text NOT NULL DEFAULT 'pcs'
    CHECK (char_length(unit) BETWEEN 1 AND 20),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total_price numeric NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CHECK (char_length(title_ar) BETWEEN 1 AND 200),
  CHECK (char_length(title_en) BETWEEN 1 AND 200),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX idx_wo_boqi_boq ON public.work_order_boq_items (boq_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wo_boqi_measurement ON public.work_order_boq_items (measurement_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wo_boqi_sort ON public.work_order_boq_items (boq_id, sort_order) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_boq_items TO authenticated;
GRANT ALL ON public.work_order_boq_items TO service_role;

ALTER TABLE public.work_order_boq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_boqi_select_member" ON public.work_order_boq_items
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.work_order_boqs b
    JOIN public.work_orders w ON w.id = b.work_order_id
    WHERE b.id = boq_id
      AND b.deleted_at IS NULL
      AND w.deleted_at IS NULL
      AND public.is_work_order_member(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_boqi_insert_manager_draft" ON public.work_order_boq_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_order_boqs b
    JOIN public.work_orders w ON w.id = b.work_order_id
    WHERE b.id = boq_id
      AND b.deleted_at IS NULL
      AND b.status = 'draft'
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_boqi_update_manager_draft" ON public.work_order_boq_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_order_boqs b
    JOIN public.work_orders w ON w.id = b.work_order_id
    WHERE b.id = boq_id
      AND b.status = 'draft'
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_order_boqs b
    JOIN public.work_orders w ON w.id = b.work_order_id
    WHERE b.id = boq_id
      AND b.status = 'draft'
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_boqi_delete_manager_draft" ON public.work_order_boq_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_order_boqs b
    JOIN public.work_orders w ON w.id = b.work_order_id
    WHERE b.id = boq_id
      AND b.status = 'draft'
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE OR REPLACE FUNCTION public.trg_work_order_boq_items_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.ref_id IS NULL THEN
    NEW.ref_id := 'BOQI-' || nextval('public.work_order_boq_items_ref_seq')::text;
  END IF;
  -- Auto-compute total_price = quantity * unit_price (rounded to 2dp)
  NEW.total_price := round(coalesce(NEW.quantity, 0) * coalesce(NEW.unit_price, 0), 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_boq_items_defaults
BEFORE INSERT OR UPDATE ON public.work_order_boq_items
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_boq_items_defaults();
