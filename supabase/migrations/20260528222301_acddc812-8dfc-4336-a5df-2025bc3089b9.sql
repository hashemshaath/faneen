-- BUSINESS-WORKFLOW-5D: Quotations from finalized BOQ + client approval flow.
-- Two tables: header (work_order_quotations) + frozen items (work_order_quotation_items).
-- Immutable after leaving draft. Approval token stored only as SHA-256 hash.
-- No payments, contracts, invoices, accounting, signed URLs, or notifications.

CREATE SEQUENCE IF NOT EXISTS public.work_order_quotations_ref_seq START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS public.work_order_quotation_items_ref_seq START WITH 1000;

-- ─────────────────────────────────────────────────────────────────────────────
-- work_order_quotations (header / snapshot)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.work_order_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  boq_id uuid NOT NULL REFERENCES public.work_order_boqs(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','viewed','approved','rejected','expired')),
  quotation_number text NOT NULL,
  title text NOT NULL,
  notes text NULL,
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax numeric NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  currency text NOT NULL DEFAULT 'SAR'
    CHECK (char_length(currency) BETWEEN 3 AND 8),
  valid_until timestamptz NULL,
  sent_at timestamptz NULL,
  viewed_at timestamptz NULL,
  approved_at timestamptz NULL,
  rejected_at timestamptz NULL,
  rejection_reason text NULL,
  approval_token_hash text NULL,
  pdf_attachment_id uuid NULL REFERENCES public.work_order_attachments(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CHECK (char_length(title) BETWEEN 1 AND 200),
  CHECK (char_length(quotation_number) BETWEEN 1 AND 64),
  CHECK (approval_token_hash IS NULL OR char_length(approval_token_hash) = 64)
);

CREATE INDEX idx_wo_quotations_wo ON public.work_order_quotations (work_order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wo_quotations_boq ON public.work_order_quotations (boq_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wo_quotations_business ON public.work_order_quotations (business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wo_quotations_status ON public.work_order_quotations (status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_wo_quotations_token_hash ON public.work_order_quotations (approval_token_hash) WHERE approval_token_hash IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_quotations TO authenticated;
GRANT ALL ON public.work_order_quotations TO service_role;

ALTER TABLE public.work_order_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_quotations_select_member" ON public.work_order_quotations
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

CREATE POLICY "wo_quotations_insert_manager" ON public.work_order_quotations
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND status = 'draft'
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND w.deleted_at IS NULL
      AND w.business_id = work_order_quotations.business_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_quotations_update_manager" ON public.work_order_quotations
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

CREATE POLICY "wo_quotations_delete_manager_draft" ON public.work_order_quotations
FOR DELETE TO authenticated
USING (
  status = 'draft'
  AND EXISTS (
    SELECT 1 FROM public.work_orders w
    WHERE w.id = work_order_id
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

-- Trigger: ref id, default quotation_number, immutability after leaving draft.
CREATE OR REPLACE FUNCTION public.trg_work_order_quotations_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ref_id IS NULL THEN
      NEW.ref_id := 'WOQ-' || nextval('public.work_order_quotations_ref_seq')::text;
    END IF;
    IF NEW.quotation_number IS NULL OR length(trim(NEW.quotation_number)) = 0 THEN
      NEW.quotation_number := coalesce(NEW.ref_id, 'WOQ-DRAFT');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Allowed status transitions from draft are governed by the app.
    -- Once status is approved/rejected/expired, the quotation is locked.
    IF OLD.status IN ('approved','rejected','expired')
       AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'quotation_locked';
    END IF;
    -- Once status leaves 'draft', snapshot fields are frozen.
    IF OLD.status <> 'draft' THEN
      IF NEW.title IS DISTINCT FROM OLD.title
        OR NEW.notes IS DISTINCT FROM OLD.notes
        OR NEW.quotation_number IS DISTINCT FROM OLD.quotation_number
        OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
        OR NEW.tax IS DISTINCT FROM OLD.tax
        OR NEW.total IS DISTINCT FROM OLD.total
        OR NEW.currency IS DISTINCT FROM OLD.currency
        OR NEW.boq_id IS DISTINCT FROM OLD.boq_id
        OR NEW.work_order_id IS DISTINCT FROM OLD.work_order_id
        OR NEW.business_id IS DISTINCT FROM OLD.business_id THEN
        RAISE EXCEPTION 'quotation_snapshot_locked';
      END IF;
    END IF;
    IF NEW.status = 'sent' AND OLD.status = 'draft' AND NEW.sent_at IS NULL THEN
      NEW.sent_at := now();
    END IF;
    IF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN
      NEW.approved_at := now();
    END IF;
    IF NEW.status = 'rejected' AND NEW.rejected_at IS NULL THEN
      NEW.rejected_at := now();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_quotations_defaults
BEFORE INSERT OR UPDATE ON public.work_order_quotations
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_quotations_defaults();

-- ─────────────────────────────────────────────────────────────────────────────
-- work_order_quotation_items (frozen snapshot)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.work_order_quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  quotation_id uuid NOT NULL REFERENCES public.work_order_quotations(id) ON DELETE CASCADE,
  boq_item_id uuid NULL REFERENCES public.work_order_boq_items(id) ON DELETE SET NULL,
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

CREATE INDEX idx_wo_quoi_quotation ON public.work_order_quotation_items (quotation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wo_quoi_sort ON public.work_order_quotation_items (quotation_id, sort_order) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_quotation_items TO authenticated;
GRANT ALL ON public.work_order_quotation_items TO service_role;

ALTER TABLE public.work_order_quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_quoi_select_member" ON public.work_order_quotation_items
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.work_order_quotations q
    JOIN public.work_orders w ON w.id = q.work_order_id
    WHERE q.id = quotation_id
      AND q.deleted_at IS NULL
      AND w.deleted_at IS NULL
      AND public.is_work_order_member(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_quoi_insert_manager_draft" ON public.work_order_quotation_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_order_quotations q
    JOIN public.work_orders w ON w.id = q.work_order_id
    WHERE q.id = quotation_id
      AND q.deleted_at IS NULL
      AND q.status = 'draft'
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_quoi_update_manager_draft" ON public.work_order_quotation_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_order_quotations q
    JOIN public.work_orders w ON w.id = q.work_order_id
    WHERE q.id = quotation_id
      AND q.status = 'draft'
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_order_quotations q
    JOIN public.work_orders w ON w.id = q.work_order_id
    WHERE q.id = quotation_id
      AND q.status = 'draft'
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE POLICY "wo_quoi_delete_manager_draft" ON public.work_order_quotation_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_order_quotations q
    JOIN public.work_orders w ON w.id = q.work_order_id
    WHERE q.id = quotation_id
      AND q.status = 'draft'
      AND public.is_business_owner_or_manager(auth.uid(), w.business_id)
  )
);

CREATE OR REPLACE FUNCTION public.trg_work_order_quotation_items_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.ref_id IS NULL THEN
    NEW.ref_id := 'WOQI-' || nextval('public.work_order_quotation_items_ref_seq')::text;
  END IF;
  NEW.total_price := round(coalesce(NEW.quantity, 0) * coalesce(NEW.unit_price, 0), 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_quotation_items_defaults
BEFORE INSERT OR UPDATE ON public.work_order_quotation_items
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_quotation_items_defaults();

-- ─────────────────────────────────────────────────────────────────────────────
-- Public tokenized RPCs for client viewer.
-- Tokens are SHA-256 hashed at rest; raw token is never logged or returned.
-- ─────────────────────────────────────────────────────────────────────────────

-- Public-facing view payload (header + items) for tokenized access.
CREATE OR REPLACE FUNCTION public.get_quotation_by_token(
  _ref_id text,
  _token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_quotation public.work_order_quotations%ROWTYPE;
  v_items jsonb;
  v_business jsonb;
BEGIN
  IF _ref_id IS NULL OR _token IS NULL OR length(_token) < 32 THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE = '22023';
  END IF;
  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  SELECT * INTO v_quotation
    FROM public.work_order_quotations
   WHERE ref_id = _ref_id
     AND approval_token_hash = v_hash
     AND deleted_at IS NULL
   LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_quotation.status = 'draft' THEN
    RAISE EXCEPTION 'not_sent' USING ERRCODE = '22023';
  END IF;
  IF v_quotation.valid_until IS NOT NULL AND v_quotation.valid_until < now()
     AND v_quotation.status NOT IN ('approved','rejected','expired') THEN
    UPDATE public.work_order_quotations
       SET status = 'expired'
     WHERE id = v_quotation.id;
    v_quotation.status := 'expired';
  END IF;

  IF v_quotation.status = 'sent' THEN
    UPDATE public.work_order_quotations
       SET status = 'viewed', viewed_at = now()
     WHERE id = v_quotation.id AND status = 'sent';
    v_quotation.status := 'viewed';
    v_quotation.viewed_at := now();
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'ref_id', i.ref_id,
      'item_type', i.item_type,
      'title_ar', i.title_ar,
      'title_en', i.title_en,
      'quantity', i.quantity,
      'unit', i.unit,
      'unit_price', i.unit_price,
      'total_price', i.total_price,
      'sort_order', i.sort_order
    ) ORDER BY i.sort_order, i.created_at
  ) INTO v_items
    FROM public.work_order_quotation_items i
   WHERE i.quotation_id = v_quotation.id AND i.deleted_at IS NULL;

  SELECT jsonb_build_object(
    'name', b.name,
    'name_en', b.name_en,
    'logo_url', b.logo_url
  ) INTO v_business
    FROM public.businesses b
   WHERE b.id = v_quotation.business_id;

  RETURN jsonb_build_object(
    'ref_id', v_quotation.ref_id,
    'status', v_quotation.status,
    'quotation_number', v_quotation.quotation_number,
    'title', v_quotation.title,
    'notes', v_quotation.notes,
    'subtotal', v_quotation.subtotal,
    'tax', v_quotation.tax,
    'total', v_quotation.total,
    'currency', v_quotation.currency,
    'valid_until', v_quotation.valid_until,
    'sent_at', v_quotation.sent_at,
    'viewed_at', v_quotation.viewed_at,
    'approved_at', v_quotation.approved_at,
    'rejected_at', v_quotation.rejected_at,
    'rejection_reason', v_quotation.rejection_reason,
    'items', coalesce(v_items, '[]'::jsonb),
    'business', coalesce(v_business, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_quotation_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quotation_by_token(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.approve_quotation_by_token(
  _ref_id text,
  _token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_q public.work_order_quotations%ROWTYPE;
BEGIN
  IF _ref_id IS NULL OR _token IS NULL OR length(_token) < 32 THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE = '22023';
  END IF;
  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  SELECT * INTO v_q
    FROM public.work_order_quotations
   WHERE ref_id = _ref_id
     AND approval_token_hash = v_hash
     AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_q.status NOT IN ('sent','viewed') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;
  IF v_q.valid_until IS NOT NULL AND v_q.valid_until < now() THEN
    UPDATE public.work_order_quotations SET status='expired' WHERE id = v_q.id;
    RAISE EXCEPTION 'expired' USING ERRCODE = '22023';
  END IF;

  UPDATE public.work_order_quotations
     SET status = 'approved', approved_at = now()
   WHERE id = v_q.id;

  INSERT INTO public.business_audit_log (business_id, actor_id, entity_type, entity_id, action, metadata)
  VALUES (v_q.business_id, NULL, 'work_order', v_q.work_order_id, 'work_order.quotation_approved',
    jsonb_build_object('quotation_id', v_q.id, 'ref_id', v_q.ref_id));

  RETURN jsonb_build_object('status','approved','ref_id', v_q.ref_id);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_quotation_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_quotation_by_token(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.reject_quotation_by_token(
  _ref_id text,
  _token text,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_q public.work_order_quotations%ROWTYPE;
  v_reason text;
BEGIN
  IF _ref_id IS NULL OR _token IS NULL OR length(_token) < 32 THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE = '22023';
  END IF;
  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  v_reason := nullif(trim(coalesce(_reason, '')), '');
  IF v_reason IS NOT NULL AND char_length(v_reason) > 2000 THEN
    v_reason := substring(v_reason, 1, 2000);
  END IF;

  SELECT * INTO v_q
    FROM public.work_order_quotations
   WHERE ref_id = _ref_id
     AND approval_token_hash = v_hash
     AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_q.status NOT IN ('sent','viewed') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.work_order_quotations
     SET status = 'rejected', rejected_at = now(), rejection_reason = v_reason
   WHERE id = v_q.id;

  INSERT INTO public.business_audit_log (business_id, actor_id, entity_type, entity_id, action, metadata)
  VALUES (v_q.business_id, NULL, 'work_order', v_q.work_order_id, 'work_order.quotation_rejected',
    jsonb_build_object('quotation_id', v_q.id, 'ref_id', v_q.ref_id, 'has_reason', v_reason IS NOT NULL));

  RETURN jsonb_build_object('status','rejected','ref_id', v_q.ref_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reject_quotation_by_token(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_quotation_by_token(text, text, text) TO anon, authenticated;