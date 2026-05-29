
-- ============================================================================
-- CUSTOMER-EXPERIENCE-1 — Tokenized customer tracking portal
-- ============================================================================
-- Read-only customer snapshot for quotation/contract/work-order progress.
-- Token is SHA-256 hashed at rest. Raw token never stored or logged.
-- Snapshot RPC returns only customer-safe data (no internal notes, no
-- supplier quotes/pricing, no staff PII, no procurement internals,
-- no raw UUIDs).
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.seq_customer_tracking_link START WITH 1000001;

CREATE TABLE IF NOT EXISTS public.customer_tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE
    DEFAULT ('CTL-' || lpad(nextval('public.seq_customer_tracking_link')::text, 7, '0')),
  business_id uuid NOT NULL,
  work_order_id uuid NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  quotation_id uuid NULL,
  contract_id uuid NULL,
  customer_email text NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NULL,
  revoked_at timestamptz NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NULL,
  view_count integer NOT NULL DEFAULT 0,
  CONSTRAINT ctl_has_target CHECK (
    work_order_id IS NOT NULL
    OR quotation_id IS NOT NULL
    OR contract_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ctl_token_hash
  ON public.customer_tracking_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_ctl_business
  ON public.customer_tracking_links(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ctl_work_order
  ON public.customer_tracking_links(work_order_id)
  WHERE work_order_id IS NOT NULL;

-- Auth-only table — all reads scoped to owner/staff. No anon access.
GRANT SELECT, INSERT, UPDATE ON public.customer_tracking_links TO authenticated;
GRANT ALL ON public.customer_tracking_links TO service_role;

ALTER TABLE public.customer_tracking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ctl_owner_select"
  ON public.customer_tracking_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = customer_tracking_links.business_id
        AND b.user_id = auth.uid()
    )
    OR public.is_business_staff(auth.uid(), customer_tracking_links.business_id)
  );

CREATE POLICY "ctl_owner_insert"
  ON public.customer_tracking_links
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = customer_tracking_links.business_id
        AND b.user_id = auth.uid()
    )
    OR public.is_business_staff(auth.uid(), customer_tracking_links.business_id)
  );

CREATE POLICY "ctl_owner_update"
  ON public.customer_tracking_links
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = customer_tracking_links.business_id
        AND b.user_id = auth.uid()
    )
    OR public.is_business_staff(auth.uid(), customer_tracking_links.business_id)
  );

-- ============================================================================
-- create_customer_tracking_link
-- Issues a new tracking link for an existing work order. Returns the RAW
-- token exactly once. Caller must persist or share immediately.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_customer_tracking_link(
  _work_order_id  uuid,
  _customer_email text DEFAULT NULL,
  _expires_at     timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_wo        public.work_orders%ROWTYPE;
  v_token     text;
  v_hash      text;
  v_ref       text;
  v_quotation uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF _work_order_id IS NULL THEN
    RAISE EXCEPTION 'missing_work_order' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_wo
    FROM public.work_orders
   WHERE id = _work_order_id
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Authorization: owner or staff of the WO's business
  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = v_wo.business_id AND b.user_id = v_uid)
    OR public.is_business_staff(v_uid, v_wo.business_id)
  ) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  -- Latest approved/sent quotation, if any (customer-safe pointer only).
  SELECT q.id INTO v_quotation
    FROM public.work_order_quotations q
   WHERE q.work_order_id = _work_order_id
     AND q.deleted_at IS NULL
     AND q.status IN ('sent','viewed','approved')
   ORDER BY q.created_at DESC
   LIMIT 1;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash  := encode(extensions.digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.customer_tracking_links (
    business_id, work_order_id, quotation_id,
    customer_email, token_hash, expires_at, created_by
  )
  VALUES (
    v_wo.business_id, _work_order_id, v_quotation,
    NULLIF(_customer_email, ''), v_hash, _expires_at, v_uid
  )
  RETURNING ref_id INTO v_ref;

  RETURN jsonb_build_object(
    'ref_id', v_ref,
    'token',  v_token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_tracking_link(uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_tracking_link(uuid, text, timestamptz) TO authenticated;

-- ============================================================================
-- revoke_customer_tracking_link — owner/staff can revoke
-- ============================================================================
CREATE OR REPLACE FUNCTION public.revoke_customer_tracking_link(_ref_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_biz uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT business_id INTO v_biz
    FROM public.customer_tracking_links
   WHERE ref_id = _ref_id
   LIMIT 1;
  IF v_biz IS NULL THEN
    RETURN false;
  END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = v_biz AND b.user_id = v_uid)
    OR public.is_business_staff(v_uid, v_biz)
  ) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.customer_tracking_links
     SET revoked_at = COALESCE(revoked_at, now())
   WHERE ref_id = _ref_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_customer_tracking_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_customer_tracking_link(text) TO authenticated;

-- ============================================================================
-- get_customer_project_snapshot
-- Anon-callable tokenized snapshot. Returns only customer-safe fields.
-- Denies expired/revoked links. Records last_viewed_at.
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
  v_hash      text;
  v_link      public.customer_tracking_links%ROWTYPE;
  v_wo        public.work_orders%ROWTYPE;
  v_business  jsonb;
  v_quotation jsonb;
  v_contract  jsonb;
  v_progress  integer;
  v_stage_key text;
  v_milestones jsonb;
BEGIN
  IF _ref_id IS NULL OR _token IS NULL OR length(_token) < 32 THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE = '22023';
  END IF;
  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  SELECT * INTO v_link
    FROM public.customer_tracking_links
   WHERE ref_id = _ref_id
     AND token_hash = v_hash
   LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_link.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'revoked' USING ERRCODE = '22023';
  END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RAISE EXCEPTION 'expired' USING ERRCODE = '22023';
  END IF;

  IF v_link.work_order_id IS NULL THEN
    RAISE EXCEPTION 'invalid_target' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_wo
    FROM public.work_orders
   WHERE id = v_link.work_order_id
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Map pipeline stage to coarse progress percentage (0–100)
  v_stage_key := COALESCE(v_wo.pipeline_stage, 'draft');
  v_progress := CASE v_stage_key
    WHEN 'draft' THEN 5
    WHEN 'measured' THEN 10
    WHEN 'quoted' THEN 20
    WHEN 'approved' THEN 30
    WHEN 'engineering' THEN 40
    WHEN 'procurement' THEN 55
    WHEN 'fabrication' THEN 70
    WHEN 'qc' THEN 80
    WHEN 'ready' THEN 88
    WHEN 'installation' THEN 94
    WHEN 'completed' THEN 100
    WHEN 'cancelled' THEN 0
    ELSE 0
  END;

  -- Public-safe business identity only
  SELECT jsonb_build_object(
    'name_ar', b.name_ar,
    'name_en', b.name_en,
    'logo_url', b.logo_url
  ) INTO v_business
    FROM public.businesses b
   WHERE b.id = v_wo.business_id;

  -- Latest customer-facing quotation pointer (no costs unless approved totals)
  SELECT jsonb_build_object(
    'ref_id', q.ref_id,
    'status', q.status,
    'total', q.total,
    'valid_until', q.valid_until,
    'approved_at', q.approved_at
  ) INTO v_quotation
    FROM public.work_order_quotations q
   WHERE q.work_order_id = v_wo.id
     AND q.deleted_at IS NULL
     AND q.status IN ('sent','viewed','approved')
   ORDER BY q.created_at DESC
   LIMIT 1;

  -- Contract pointer (status only, no internal terms)
  SELECT jsonb_build_object(
    'contract_number', c.contract_number,
    'status', c.status::text,
    'signed_at', c.signed_at
  ) INTO v_contract
    FROM public.contracts c
   WHERE c.business_id = v_wo.business_id
     AND (
       c.id::text = v_wo.source_id::text
       OR c.contract_number = v_wo.source_ref_id
     )
   ORDER BY c.created_at DESC
   LIMIT 1;

  -- Public milestone list — derived purely from stage progression.
  v_milestones := jsonb_build_array(
    jsonb_build_object('key','quotation_sent',
      'reached', v_quotation IS NOT NULL),
    jsonb_build_object('key','quotation_approved',
      'reached', (v_quotation->>'status') = 'approved'),
    jsonb_build_object('key','contract_ready',
      'reached', v_contract IS NOT NULL),
    jsonb_build_object('key','production_started',
      'reached', v_stage_key IN ('engineering','procurement','fabrication','qc','ready','installation','completed')),
    jsonb_build_object('key','qc',
      'reached', v_stage_key IN ('qc','ready','installation','completed')),
    jsonb_build_object('key','ready_for_installation',
      'reached', v_stage_key IN ('ready','installation','completed')),
    jsonb_build_object('key','installation',
      'reached', v_stage_key IN ('installation','completed')),
    jsonb_build_object('key','completed',
      'reached', v_stage_key = 'completed')
  );

  -- Touch last_viewed_at (best-effort; ignore if already touched recently)
  UPDATE public.customer_tracking_links
     SET last_viewed_at = now(),
         view_count = view_count + 1
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
    'milestones', v_milestones
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_project_snapshot(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_project_snapshot(text, text) TO anon, authenticated;
