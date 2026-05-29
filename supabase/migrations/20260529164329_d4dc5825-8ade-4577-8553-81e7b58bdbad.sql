-- ============================================================================
-- CUSTOMER-EXPERIENCE-3 — Closure, Evidence, Feedback, NPS, Warranty
-- ============================================================================
-- Adds the formal project-closure workflow on top of CUSTOMER-EXPERIENCE-2.
-- All customer actions are gated by the existing customer_tracking_links
-- token (sha-256 hash, never raw token persisted). Provider tables are
-- staff-only (RLS + GRANTs). Snapshot RPC is extended with closure,
-- warranty, customer-visible evidence and submission flags only.
-- ============================================================================

-- ---------- Sequences ------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.seq_project_closure          START WITH 1000001;
CREATE SEQUENCE IF NOT EXISTS public.seq_project_delivery_evidence START WITH 1000001;
CREATE SEQUENCE IF NOT EXISTS public.seq_customer_feedback        START WITH 1000001;
CREATE SEQUENCE IF NOT EXISTS public.seq_work_order_warranty      START WITH 1000001;

-- ============================================================================
-- project_closures
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE
    DEFAULT ('CLS-' || lpad(nextval('public.seq_project_closure')::text, 7, '0')),
  business_id uuid NOT NULL,
  work_order_id uuid NOT NULL UNIQUE REFERENCES public.work_orders(id) ON DELETE CASCADE,
  closure_status text NOT NULL DEFAULT 'pending_customer_confirmation'
    CHECK (closure_status IN (
      'pending_customer_confirmation',
      'issue_reported',
      'customer_confirmed',
      'warranty_started',
      'closed'
    )),
  completion_date date NOT NULL DEFAULT CURRENT_DATE,
  confirmed_at timestamptz NULL,
  issue_reported_at timestamptz NULL,
  issue_text text NULL,
  warranty_start_date date NULL,
  warranty_end_date date NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (issue_text IS NULL OR length(issue_text) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_cls_business ON public.project_closures(business_id, closure_status);
CREATE INDEX IF NOT EXISTS idx_cls_wo ON public.project_closures(work_order_id);

GRANT SELECT, INSERT, UPDATE ON public.project_closures TO authenticated;
GRANT ALL ON public.project_closures TO service_role;

ALTER TABLE public.project_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cls_owner_select" ON public.project_closures
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = project_closures.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), project_closures.business_id)
  );

CREATE POLICY "cls_owner_insert" ON public.project_closures
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = project_closures.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), project_closures.business_id)
  );

CREATE POLICY "cls_owner_update" ON public.project_closures
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = project_closures.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), project_closures.business_id)
  );

CREATE TRIGGER trg_cls_updated_at
BEFORE UPDATE ON public.project_closures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- project_delivery_evidence
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_delivery_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE
    DEFAULT ('PDE-' || lpad(nextval('public.seq_project_delivery_evidence')::text, 7, '0')),
  closure_id uuid NOT NULL REFERENCES public.project_closures(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  attachment_id uuid NULL REFERENCES public.work_order_attachments(id) ON DELETE SET NULL,
  public_image_url text NULL,
  caption_ar text NULL,
  caption_en text NULL,
  is_customer_visible boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (caption_ar IS NULL OR length(caption_ar) <= 500),
  CHECK (caption_en IS NULL OR length(caption_en) <= 500),
  CHECK (public_image_url IS NULL OR length(public_image_url) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_pde_closure ON public.project_delivery_evidence(closure_id);
CREATE INDEX IF NOT EXISTS idx_pde_business ON public.project_delivery_evidence(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_delivery_evidence TO authenticated;
GRANT ALL ON public.project_delivery_evidence TO service_role;

ALTER TABLE public.project_delivery_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pde_owner_select" ON public.project_delivery_evidence
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = project_delivery_evidence.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), project_delivery_evidence.business_id)
  );

CREATE POLICY "pde_owner_write" ON public.project_delivery_evidence
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = project_delivery_evidence.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), project_delivery_evidence.business_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = project_delivery_evidence.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), project_delivery_evidence.business_id)
  );

-- ============================================================================
-- customer_feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE
    DEFAULT ('FDB-' || lpad(nextval('public.seq_customer_feedback')::text, 7, '0')),
  business_id uuid NOT NULL,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  closure_id uuid NOT NULL UNIQUE REFERENCES public.project_closures(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text text NULL,
  would_recommend boolean NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (feedback_text IS NULL OR length(feedback_text) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_fdb_business ON public.customer_feedback(business_id, rating);

GRANT SELECT, INSERT ON public.customer_feedback TO authenticated;
GRANT ALL ON public.customer_feedback TO service_role;

ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fdb_owner_select" ON public.customer_feedback
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = customer_feedback.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), customer_feedback.business_id)
  );

-- ============================================================================
-- customer_nps_responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customer_nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  closure_id uuid NULL REFERENCES public.project_closures(id) ON DELETE SET NULL,
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nps_business ON public.customer_nps_responses(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_nps_per_closure
  ON public.customer_nps_responses(closure_id)
  WHERE closure_id IS NOT NULL;

GRANT SELECT, INSERT ON public.customer_nps_responses TO authenticated;
GRANT ALL ON public.customer_nps_responses TO service_role;

ALTER TABLE public.customer_nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nps_owner_select" ON public.customer_nps_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = customer_nps_responses.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), customer_nps_responses.business_id)
  );

-- ============================================================================
-- work_order_warranties
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.work_order_warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE
    DEFAULT ('WAR-' || lpad(nextval('public.seq_work_order_warranty')::text, 7, '0')),
  business_id uuid NOT NULL,
  work_order_id uuid NOT NULL UNIQUE REFERENCES public.work_orders(id) ON DELETE CASCADE,
  closure_id uuid NULL REFERENCES public.project_closures(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  warranty_type text NOT NULL DEFAULT 'standard',
  notes text NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (notes IS NULL OR length(notes) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_war_business ON public.work_order_warranties(business_id, status);
CREATE INDEX IF NOT EXISTS idx_war_end ON public.work_order_warranties(end_date);

GRANT SELECT, INSERT, UPDATE ON public.work_order_warranties TO authenticated;
GRANT ALL ON public.work_order_warranties TO service_role;

ALTER TABLE public.work_order_warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "war_owner_select" ON public.work_order_warranties
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = work_order_warranties.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), work_order_warranties.business_id)
  );

CREATE POLICY "war_owner_write" ON public.work_order_warranties
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = work_order_warranties.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), work_order_warranties.business_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = work_order_warranties.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), work_order_warranties.business_id)
  );

CREATE TRIGGER trg_war_updated_at
BEFORE UPDATE ON public.work_order_warranties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Provider RPCs
-- ============================================================================

-- Create a closure for a completed work order (one per WO).
CREATE OR REPLACE FUNCTION public.create_project_closure(
  _work_order_id uuid,
  _completion_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_wo  public.work_orders%ROWTYPE;
  v_id  uuid;
  v_ref text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_wo FROM public.work_orders
   WHERE id = _work_order_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_wo.business_id AND b.user_id = v_uid)
    OR public.is_business_staff(v_uid, v_wo.business_id)
  ) THEN RAISE EXCEPTION 'access_denied' USING ERRCODE='42501'; END IF;
  IF v_wo.status <> 'completed' AND COALESCE(v_wo.pipeline_stage,'') <> 'completed' THEN
    RAISE EXCEPTION 'work_order_not_completed' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.project_closures (
    business_id, work_order_id, completion_date, created_by
  ) VALUES (
    v_wo.business_id, _work_order_id,
    COALESCE(_completion_date, CURRENT_DATE), v_uid
  )
  RETURNING id, ref_id INTO v_id, v_ref;
  RETURN jsonb_build_object('id', v_id, 'ref_id', v_ref);
END;
$$;
REVOKE ALL ON FUNCTION public.create_project_closure(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_project_closure(uuid, date) TO authenticated;

-- Add a delivery evidence item.
CREATE OR REPLACE FUNCTION public.add_project_delivery_evidence(
  _closure_id uuid,
  _attachment_id uuid DEFAULT NULL,
  _public_image_url text DEFAULT NULL,
  _caption_ar text DEFAULT NULL,
  _caption_en text DEFAULT NULL,
  _is_customer_visible boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cls public.project_closures%ROWTYPE;
  v_id  uuid;
  v_ref text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF _attachment_id IS NULL AND (_public_image_url IS NULL OR length(_public_image_url) = 0) THEN
    RAISE EXCEPTION 'missing_image_source' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_cls FROM public.project_closures WHERE id = _closure_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_cls.business_id AND b.user_id = v_uid)
    OR public.is_business_staff(v_uid, v_cls.business_id)
  ) THEN RAISE EXCEPTION 'access_denied' USING ERRCODE='42501'; END IF;
  INSERT INTO public.project_delivery_evidence (
    closure_id, business_id, attachment_id, public_image_url,
    caption_ar, caption_en, is_customer_visible, created_by
  ) VALUES (
    _closure_id, v_cls.business_id, _attachment_id,
    NULLIF(_public_image_url,''),
    NULLIF(_caption_ar,''), NULLIF(_caption_en,''),
    COALESCE(_is_customer_visible, true), v_uid
  )
  RETURNING id, ref_id INTO v_id, v_ref;
  RETURN jsonb_build_object('id', v_id, 'ref_id', v_ref);
END;
$$;
REVOKE ALL ON FUNCTION public.add_project_delivery_evidence(uuid, uuid, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_project_delivery_evidence(uuid, uuid, text, text, text, boolean) TO authenticated;

-- Provider can manually start/extend warranty (auto-started on customer confirm).
CREATE OR REPLACE FUNCTION public.start_work_order_warranty(
  _closure_id uuid,
  _months integer DEFAULT 12,
  _warranty_type text DEFAULT 'standard',
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cls public.project_closures%ROWTYPE;
  v_start date := CURRENT_DATE;
  v_end   date;
  v_id    uuid;
  v_ref   text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF _months IS NULL OR _months <= 0 THEN _months := 12; END IF;
  SELECT * INTO v_cls FROM public.project_closures WHERE id = _closure_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_cls.business_id AND b.user_id = v_uid)
    OR public.is_business_staff(v_uid, v_cls.business_id)
  ) THEN RAISE EXCEPTION 'access_denied' USING ERRCODE='42501'; END IF;
  v_end := v_start + (_months || ' months')::interval;
  INSERT INTO public.work_order_warranties (
    business_id, work_order_id, closure_id, start_date, end_date, warranty_type, notes
  ) VALUES (
    v_cls.business_id, v_cls.work_order_id, v_cls.id, v_start, v_end,
    COALESCE(NULLIF(_warranty_type,''),'standard'), NULLIF(_notes,'')
  )
  ON CONFLICT (work_order_id) DO UPDATE
    SET start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        warranty_type = EXCLUDED.warranty_type,
        notes = COALESCE(EXCLUDED.notes, public.work_order_warranties.notes),
        status = 'active'
  RETURNING id, ref_id INTO v_id, v_ref;
  UPDATE public.project_closures
     SET warranty_start_date = v_start,
         warranty_end_date = v_end,
         closure_status = CASE WHEN closure_status IN ('customer_confirmed','warranty_started','closed')
                                 THEN 'warranty_started' ELSE closure_status END
   WHERE id = v_cls.id;
  RETURN jsonb_build_object('id', v_id, 'ref_id', v_ref,
                            'start_date', v_start, 'end_date', v_end);
END;
$$;
REVOKE ALL ON FUNCTION public.start_work_order_warranty(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_work_order_warranty(uuid, integer, text, text) TO authenticated;

-- ============================================================================
-- Customer (anon) RPCs — gated by tracking link token
-- ============================================================================

-- Shared token verifier (returns the resolved tracking link, raises otherwise).
CREATE OR REPLACE FUNCTION public._resolve_customer_tracking_link(
  _tracking_ref text,
  _token text
)
RETURNS public.customer_tracking_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_link public.customer_tracking_links%ROWTYPE;
BEGIN
  IF _tracking_ref IS NULL OR _token IS NULL OR length(_token) < 32 THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE='22023';
  END IF;
  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  SELECT * INTO v_link FROM public.customer_tracking_links
   WHERE ref_id = _tracking_ref AND token_hash = v_hash LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token' USING ERRCODE='22023'; END IF;
  IF v_link.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'revoked' USING ERRCODE='22023'; END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RAISE EXCEPTION 'expired' USING ERRCODE='22023';
  END IF;
  IF v_link.work_order_id IS NULL THEN
    RAISE EXCEPTION 'invalid_target' USING ERRCODE='22023';
  END IF;
  RETURN v_link;
END;
$$;
REVOKE ALL ON FUNCTION public._resolve_customer_tracking_link(text, text) FROM PUBLIC;
-- Helper is not exposed; only used internally by other security-definer functions.

-- Customer confirms project completion → auto-start warranty (12 months default).
CREATE OR REPLACE FUNCTION public.customer_confirm_project_completion(
  _tracking_ref text,
  _token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link public.customer_tracking_links%ROWTYPE;
  v_cls  public.project_closures%ROWTYPE;
  v_start date := CURRENT_DATE;
  v_end date;
BEGIN
  v_link := public._resolve_customer_tracking_link(_tracking_ref, _token);
  SELECT * INTO v_cls FROM public.project_closures
   WHERE work_order_id = v_link.work_order_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'closure_not_found' USING ERRCODE='P0002'; END IF;
  IF v_cls.closure_status = 'closed' THEN
    RAISE EXCEPTION 'closure_locked' USING ERRCODE='22023';
  END IF;
  v_end := v_start + interval '12 months';
  UPDATE public.project_closures
     SET closure_status = 'warranty_started',
         confirmed_at = COALESCE(confirmed_at, now()),
         warranty_start_date = COALESCE(warranty_start_date, v_start),
         warranty_end_date = COALESCE(warranty_end_date, v_end::date)
   WHERE id = v_cls.id;
  INSERT INTO public.work_order_warranties (
    business_id, work_order_id, closure_id, start_date, end_date, warranty_type
  ) VALUES (
    v_cls.business_id, v_cls.work_order_id, v_cls.id,
    v_start, v_end::date, 'standard'
  )
  ON CONFLICT (work_order_id) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.customer_confirm_project_completion(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_confirm_project_completion(text, text) TO anon, authenticated;

-- Customer reports an issue (text only).
CREATE OR REPLACE FUNCTION public.customer_report_project_issue(
  _tracking_ref text,
  _token text,
  _text text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link public.customer_tracking_links%ROWTYPE;
  v_cls  public.project_closures%ROWTYPE;
  v_text text;
BEGIN
  v_link := public._resolve_customer_tracking_link(_tracking_ref, _token);
  v_text := NULLIF(left(coalesce(_text,''), 2000), '');
  IF v_text IS NULL THEN RAISE EXCEPTION 'missing_text' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_cls FROM public.project_closures
   WHERE work_order_id = v_link.work_order_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'closure_not_found' USING ERRCODE='P0002'; END IF;
  IF v_cls.closure_status IN ('warranty_started','closed') THEN
    RAISE EXCEPTION 'closure_locked' USING ERRCODE='22023';
  END IF;
  UPDATE public.project_closures
     SET closure_status = 'issue_reported',
         issue_reported_at = now(),
         issue_text = v_text
   WHERE id = v_cls.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.customer_report_project_issue(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_report_project_issue(text, text, text) TO anon, authenticated;

-- Customer submits one rating per closure.
CREATE OR REPLACE FUNCTION public.customer_submit_feedback(
  _tracking_ref text,
  _token text,
  _rating integer,
  _text text DEFAULT NULL,
  _would_recommend boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link public.customer_tracking_links%ROWTYPE;
  v_cls  public.project_closures%ROWTYPE;
  v_id   uuid;
  v_ref  text;
BEGIN
  v_link := public._resolve_customer_tracking_link(_tracking_ref, _token);
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'invalid_rating' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_cls FROM public.project_closures
   WHERE work_order_id = v_link.work_order_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'closure_not_found' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.customer_feedback (
    business_id, work_order_id, closure_id, rating, feedback_text, would_recommend
  ) VALUES (
    v_cls.business_id, v_cls.work_order_id, v_cls.id,
    _rating::smallint, NULLIF(left(coalesce(_text,''), 2000),''),
    _would_recommend
  )
  RETURNING id, ref_id INTO v_id, v_ref;
  RETURN jsonb_build_object('id', v_id, 'ref_id', v_ref);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'already_submitted' USING ERRCODE='23505';
END;
$$;
REVOKE ALL ON FUNCTION public.customer_submit_feedback(text, text, integer, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_submit_feedback(text, text, integer, text, boolean) TO anon, authenticated;

-- Customer submits one NPS score per closure.
CREATE OR REPLACE FUNCTION public.customer_submit_nps(
  _tracking_ref text,
  _token text,
  _score integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link public.customer_tracking_links%ROWTYPE;
  v_cls  public.project_closures%ROWTYPE;
BEGIN
  v_link := public._resolve_customer_tracking_link(_tracking_ref, _token);
  IF _score IS NULL OR _score < 0 OR _score > 10 THEN
    RAISE EXCEPTION 'invalid_score' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_cls FROM public.project_closures
   WHERE work_order_id = v_link.work_order_id LIMIT 1;
  INSERT INTO public.customer_nps_responses (
    business_id, work_order_id, closure_id, score
  ) VALUES (
    COALESCE(v_cls.business_id,
             (SELECT business_id FROM public.work_orders WHERE id = v_link.work_order_id)),
    v_link.work_order_id, v_cls.id, _score::smallint
  );
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'already_submitted' USING ERRCODE='23505';
END;
$$;
REVOKE ALL ON FUNCTION public.customer_submit_nps(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_submit_nps(text, text, integer) TO anon, authenticated;

-- ============================================================================
-- Snapshot RPC — extended with closure, evidence (customer-visible only),
-- warranty and submission flags. Never returns internal_note, staff identity,
-- supplier data, raw UUIDs, or raw tokens.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_customer_project_snapshot(
  _ref_id text,
  _token  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash       text;
  v_link       public.customer_tracking_links%ROWTYPE;
  v_wo         public.work_orders%ROWTYPE;
  v_business   jsonb;
  v_quotation  jsonb;
  v_contract   jsonb;
  v_installation jsonb;
  v_closure    jsonb;
  v_warranty   jsonb;
  v_evidence   jsonb;
  v_feedback_done boolean := false;
  v_nps_done   boolean := false;
  v_progress   integer;
  v_stage_key  text;
  v_milestones jsonb;
BEGIN
  IF _ref_id IS NULL OR _token IS NULL OR length(_token) < 32 THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE = '22023';
  END IF;
  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  SELECT * INTO v_link FROM public.customer_tracking_links
   WHERE ref_id = _ref_id AND token_hash = v_hash LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_link.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'revoked' USING ERRCODE = '22023'; END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RAISE EXCEPTION 'expired' USING ERRCODE = '22023';
  END IF;
  IF v_link.work_order_id IS NULL THEN
    RAISE EXCEPTION 'invalid_target' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_wo FROM public.work_orders
   WHERE id = v_link.work_order_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;

  v_stage_key := COALESCE(v_wo.pipeline_stage, 'draft');
  v_progress := CASE v_stage_key
    WHEN 'draft' THEN 5 WHEN 'measured' THEN 10 WHEN 'quoted' THEN 20
    WHEN 'approved' THEN 30 WHEN 'engineering' THEN 40 WHEN 'procurement' THEN 55
    WHEN 'fabrication' THEN 70 WHEN 'qc' THEN 80 WHEN 'ready' THEN 88
    WHEN 'installation' THEN 94 WHEN 'completed' THEN 100
    WHEN 'cancelled' THEN 0 ELSE 0 END;

  SELECT jsonb_build_object(
    'name_ar', b.name_ar, 'name_en', b.name_en, 'logo_url', b.logo_url
  ) INTO v_business FROM public.businesses b WHERE b.id = v_wo.business_id;

  SELECT jsonb_build_object(
    'ref_id', q.ref_id, 'status', q.status, 'total', q.total,
    'valid_until', q.valid_until, 'approved_at', q.approved_at
  ) INTO v_quotation
    FROM public.work_order_quotations q
   WHERE q.work_order_id = v_wo.id AND q.deleted_at IS NULL
     AND q.status IN ('sent','viewed','approved')
   ORDER BY q.created_at DESC LIMIT 1;

  SELECT jsonb_build_object(
    'contract_number', c.contract_number, 'status', c.status::text,
    'signed_at', c.signed_at
  ) INTO v_contract
    FROM public.contracts c
   WHERE c.business_id = v_wo.business_id
     AND (c.id::text = v_wo.source_id::text OR c.contract_number = v_wo.source_ref_id)
   ORDER BY c.created_at DESC LIMIT 1;

  SELECT jsonb_build_object(
    'appointment_ref', a.ref_id,
    'date', a.scheduled_date,
    'time_window', a.time_window,
    'status', a.status,
    'confirmation_status', a.customer_confirmation_status,
    'customer_note', a.customer_note
  ) INTO v_installation
    FROM public.installation_appointments a
   WHERE a.work_order_id = v_wo.id AND a.status NOT IN ('cancelled')
   ORDER BY a.created_at DESC LIMIT 1;

  -- Customer-safe closure: ref_id + status + dates + safe issue text only.
  SELECT jsonb_build_object(
    'ref_id', cl.ref_id,
    'status', cl.closure_status,
    'completion_date', cl.completion_date,
    'confirmed_at', cl.confirmed_at,
    'issue_reported_at', cl.issue_reported_at,
    'issue_text', cl.issue_text
  ) INTO v_closure
    FROM public.project_closures cl
   WHERE cl.work_order_id = v_wo.id LIMIT 1;

  -- Customer-safe warranty.
  SELECT jsonb_build_object(
    'ref_id', w.ref_id,
    'start_date', w.start_date,
    'end_date', w.end_date,
    'warranty_type', w.warranty_type,
    'status', w.status
  ) INTO v_warranty
    FROM public.work_order_warranties w
   WHERE w.work_order_id = v_wo.id LIMIT 1;

  -- Customer-visible delivery evidence only (image URL + captions; no UUIDs).
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ref_id', e.ref_id,
      'image_url', COALESCE(e.public_image_url, ''),
      'caption_ar', e.caption_ar,
      'caption_en', e.caption_en
    ) ORDER BY e.created_at ASC
  ), '[]'::jsonb)
  INTO v_evidence
  FROM public.project_delivery_evidence e
  JOIN public.project_closures cl ON cl.id = e.closure_id
  WHERE cl.work_order_id = v_wo.id AND e.is_customer_visible IS TRUE;

  -- Submission flags (boolean only, no PII).
  SELECT EXISTS (
    SELECT 1 FROM public.customer_feedback f
    JOIN public.project_closures cl ON cl.id = f.closure_id
    WHERE cl.work_order_id = v_wo.id
  ) INTO v_feedback_done;
  SELECT EXISTS (
    SELECT 1 FROM public.customer_nps_responses n
    WHERE n.work_order_id = v_wo.id
  ) INTO v_nps_done;

  v_milestones := jsonb_build_array(
    jsonb_build_object('key','quotation_sent',  'reached', v_quotation IS NOT NULL),
    jsonb_build_object('key','quotation_approved','reached', (v_quotation->>'status') = 'approved'),
    jsonb_build_object('key','contract_ready',  'reached', v_contract IS NOT NULL),
    jsonb_build_object('key','production_started','reached', v_stage_key IN ('engineering','procurement','fabrication','qc','ready','installation','completed')),
    jsonb_build_object('key','qc',              'reached', v_stage_key IN ('qc','ready','installation','completed')),
    jsonb_build_object('key','ready_for_installation','reached', v_stage_key IN ('ready','installation','completed')),
    jsonb_build_object('key','installation',    'reached', v_stage_key IN ('installation','completed') OR (v_installation->>'status') IN ('confirmed','completed')),
    jsonb_build_object('key','completed',       'reached', v_stage_key = 'completed' OR (v_installation->>'status') = 'completed' OR v_closure IS NOT NULL)
  );

  UPDATE public.customer_tracking_links
     SET last_viewed_at = now(), view_count = view_count + 1
   WHERE id = v_link.id;

  RETURN jsonb_build_object(
    'tracking_ref', v_link.ref_id,
    'project_ref', v_wo.ref_id,
    'project_title', v_wo.title,
    'status', v_wo.status,
    'stage_key', v_stage_key,
    'progress', v_progress,
    'due_at', v_wo.due_at,
    'completed_at', v_wo.completed_at,
    'updated_at', v_wo.updated_at,
    'business', coalesce(v_business, '{}'::jsonb),
    'quotation', v_quotation,
    'contract', v_contract,
    'installation', v_installation,
    'closure', v_closure,
    'warranty', v_warranty,
    'delivery_evidence', v_evidence,
    'feedback_submitted', v_feedback_done,
    'nps_submitted', v_nps_done,
    'milestones', v_milestones
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_project_snapshot(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_project_snapshot(text, text) TO anon, authenticated;