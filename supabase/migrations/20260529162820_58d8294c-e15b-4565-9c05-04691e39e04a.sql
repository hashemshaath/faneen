-- ============================================================================
-- CUSTOMER-EXPERIENCE-2 — Installation Scheduling & Appointment Confirmation
-- ============================================================================
-- Adds installation_appointments + provider/customer RPCs. Extends the
-- customer snapshot to surface a safe `installation` block. Strict RLS:
-- internal_note never leaves the staff-only surface. Anon customer
-- actions are authenticated via the tracking-link token only.
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.seq_installation_appointment START WITH 1000001;

CREATE TABLE IF NOT EXISTS public.installation_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE
    DEFAULT ('APT-' || lpad(nextval('public.seq_installation_appointment')::text, 7, '0')),
  business_id uuid NOT NULL,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  customer_tracking_link_id uuid NULL REFERENCES public.customer_tracking_links(id) ON DELETE SET NULL,
  scheduled_date date NOT NULL,
  time_window text NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','confirmed','reschedule_requested','completed','cancelled')),
  customer_confirmation_status text NOT NULL DEFAULT 'pending'
    CHECK (customer_confirmation_status IN ('pending','confirmed','reschedule_requested')),
  customer_note text NULL,
  internal_note text NULL,
  confirmed_at timestamptz NULL,
  completed_at timestamptz NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (customer_note IS NULL OR length(customer_note) <= 1000),
  CHECK (internal_note IS NULL OR length(internal_note) <= 2000)
);

-- One active appointment per work order
CREATE UNIQUE INDEX IF NOT EXISTS uniq_apt_active_per_wo
  ON public.installation_appointments(work_order_id)
  WHERE status NOT IN ('cancelled','completed');

CREATE INDEX IF NOT EXISTS idx_apt_business
  ON public.installation_appointments(business_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_apt_wo
  ON public.installation_appointments(work_order_id);

GRANT SELECT, INSERT, UPDATE ON public.installation_appointments TO authenticated;
GRANT ALL ON public.installation_appointments TO service_role;

ALTER TABLE public.installation_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apt_owner_select"
  ON public.installation_appointments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = installation_appointments.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), installation_appointments.business_id)
  );

CREATE POLICY "apt_owner_insert"
  ON public.installation_appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = installation_appointments.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), installation_appointments.business_id)
  );

CREATE POLICY "apt_owner_update"
  ON public.installation_appointments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = installation_appointments.business_id AND b.user_id = auth.uid())
    OR public.is_business_staff(auth.uid(), installation_appointments.business_id)
  );

CREATE TRIGGER trg_apt_updated_at
BEFORE UPDATE ON public.installation_appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Provider RPCs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_installation_appointment(
  _work_order_id uuid,
  _scheduled_date date,
  _time_window text DEFAULT NULL,
  _internal_note text DEFAULT NULL,
  _customer_tracking_link_id uuid DEFAULT NULL
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF _scheduled_date IS NULL THEN
    RAISE EXCEPTION 'missing_scheduled_date' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_wo FROM public.work_orders
   WHERE id = _work_order_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b
             WHERE b.id = v_wo.business_id AND b.user_id = v_uid)
    OR public.is_business_staff(v_uid, v_wo.business_id)
  ) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.installation_appointments (
    business_id, work_order_id, customer_tracking_link_id,
    scheduled_date, time_window, internal_note, created_by
  ) VALUES (
    v_wo.business_id, _work_order_id, _customer_tracking_link_id,
    _scheduled_date, NULLIF(_time_window,''), NULLIF(_internal_note,''), v_uid
  )
  RETURNING id, ref_id INTO v_id, v_ref;

  RETURN jsonb_build_object('id', v_id, 'ref_id', v_ref);
END;
$$;

REVOKE ALL ON FUNCTION public.create_installation_appointment(uuid, date, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_installation_appointment(uuid, date, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_installation_appointment(
  _ref_id text,
  _scheduled_date date DEFAULT NULL,
  _time_window text DEFAULT NULL,
  _internal_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_apt public.installation_appointments%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_apt FROM public.installation_appointments WHERE ref_id = _ref_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_apt.business_id AND b.user_id = v_uid)
    OR public.is_business_staff(v_uid, v_apt.business_id)
  ) THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE='42501';
  END IF;
  IF v_apt.status IN ('cancelled','completed') THEN
    RAISE EXCEPTION 'appointment_locked' USING ERRCODE='22023';
  END IF;

  UPDATE public.installation_appointments
     SET scheduled_date = COALESCE(_scheduled_date, scheduled_date),
         time_window = COALESCE(NULLIF(_time_window,''), time_window),
         internal_note = COALESCE(NULLIF(_internal_note,''), internal_note),
         -- If date changed, reset customer confirmation
         customer_confirmation_status = CASE
           WHEN _scheduled_date IS NOT NULL AND _scheduled_date <> scheduled_date
             THEN 'pending'
           ELSE customer_confirmation_status END,
         status = CASE
           WHEN _scheduled_date IS NOT NULL AND _scheduled_date <> scheduled_date
             THEN 'scheduled'
           ELSE status END,
         confirmed_at = CASE
           WHEN _scheduled_date IS NOT NULL AND _scheduled_date <> scheduled_date
             THEN NULL ELSE confirmed_at END
   WHERE ref_id = _ref_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_installation_appointment(text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_installation_appointment(text, date, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_installation_appointment(_ref_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_apt public.installation_appointments%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_apt FROM public.installation_appointments WHERE ref_id = _ref_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_apt.business_id AND b.user_id = v_uid)
    OR public.is_business_staff(v_uid, v_apt.business_id)
  ) THEN RAISE EXCEPTION 'access_denied' USING ERRCODE='42501'; END IF;
  UPDATE public.installation_appointments
     SET status = 'cancelled'
   WHERE ref_id = _ref_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_installation_appointment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_installation_appointment(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_installation_appointment(_ref_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_apt public.installation_appointments%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_apt FROM public.installation_appointments WHERE ref_id = _ref_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF v_apt.status = 'cancelled' THEN
    RAISE EXCEPTION 'appointment_cancelled' USING ERRCODE='22023';
  END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = v_apt.business_id AND b.user_id = v_uid)
    OR public.is_business_staff(v_uid, v_apt.business_id)
  ) THEN RAISE EXCEPTION 'access_denied' USING ERRCODE='42501'; END IF;
  UPDATE public.installation_appointments
     SET status = 'completed',
         completed_at = COALESCE(completed_at, now())
   WHERE ref_id = _ref_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_installation_appointment(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_installation_appointment(text) TO authenticated;

-- ============================================================================
-- Customer (anon) RPCs — gated entirely by tracking link token
-- ============================================================================
CREATE OR REPLACE FUNCTION public.customer_confirm_appointment(
  _tracking_ref text,
  _token text,
  _apt_ref text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_link public.customer_tracking_links%ROWTYPE;
  v_apt  public.installation_appointments%ROWTYPE;
BEGIN
  IF _tracking_ref IS NULL OR _token IS NULL OR length(_token) < 32 OR _apt_ref IS NULL THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE='22023';
  END IF;
  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  SELECT * INTO v_link FROM public.customer_tracking_links
   WHERE ref_id = _tracking_ref AND token_hash = v_hash LIMIT 1;
  IF NOT FOUND OR v_link.revoked_at IS NOT NULL
     OR (v_link.expires_at IS NOT NULL AND v_link.expires_at < now()) THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_apt FROM public.installation_appointments
   WHERE ref_id = _apt_ref AND work_order_id = v_link.work_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF v_apt.status = 'cancelled' THEN
    RAISE EXCEPTION 'appointment_cancelled' USING ERRCODE='22023';
  END IF;
  IF v_apt.status = 'completed' THEN
    RAISE EXCEPTION 'appointment_completed' USING ERRCODE='22023';
  END IF;
  UPDATE public.installation_appointments
     SET status = 'confirmed',
         customer_confirmation_status = 'confirmed',
         confirmed_at = COALESCE(confirmed_at, now())
   WHERE id = v_apt.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.customer_confirm_appointment(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_confirm_appointment(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.customer_request_appointment_reschedule(
  _tracking_ref text,
  _token text,
  _apt_ref text,
  _note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_link public.customer_tracking_links%ROWTYPE;
  v_apt  public.installation_appointments%ROWTYPE;
  v_note text;
BEGIN
  IF _tracking_ref IS NULL OR _token IS NULL OR length(_token) < 32 OR _apt_ref IS NULL THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE='22023';
  END IF;
  v_note := NULLIF(left(coalesce(_note,''), 1000), '');
  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  SELECT * INTO v_link FROM public.customer_tracking_links
   WHERE ref_id = _tracking_ref AND token_hash = v_hash LIMIT 1;
  IF NOT FOUND OR v_link.revoked_at IS NOT NULL
     OR (v_link.expires_at IS NOT NULL AND v_link.expires_at < now()) THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_apt FROM public.installation_appointments
   WHERE ref_id = _apt_ref AND work_order_id = v_link.work_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF v_apt.status IN ('cancelled','completed') THEN
    RAISE EXCEPTION 'appointment_locked' USING ERRCODE='22023';
  END IF;
  UPDATE public.installation_appointments
     SET status = 'reschedule_requested',
         customer_confirmation_status = 'reschedule_requested',
         customer_note = v_note
   WHERE id = v_apt.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.customer_request_appointment_reschedule(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_request_appointment_reschedule(text, text, text, text) TO anon, authenticated;

-- ============================================================================
-- Extend get_customer_project_snapshot to expose a safe `installation` block.
-- Only public-safe fields: appointment_ref, date, time_window, status,
-- confirmation_status, customer_note (the customer's own note).
-- Never internal_note, never created_by, never staff identity.
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
  v_installation jsonb;
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
   WHERE ref_id = _ref_id AND token_hash = v_hash
   LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
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

  -- Customer-safe installation block (no internal_note, no staff identity)
  SELECT jsonb_build_object(
    'appointment_ref', a.ref_id,
    'date', a.scheduled_date,
    'time_window', a.time_window,
    'status', a.status,
    'confirmation_status', a.customer_confirmation_status,
    'customer_note', a.customer_note
  ) INTO v_installation
    FROM public.installation_appointments a
   WHERE a.work_order_id = v_wo.id
     AND a.status NOT IN ('cancelled')
   ORDER BY a.created_at DESC LIMIT 1;

  v_milestones := jsonb_build_array(
    jsonb_build_object('key','quotation_sent',  'reached', v_quotation IS NOT NULL),
    jsonb_build_object('key','quotation_approved','reached', (v_quotation->>'status') = 'approved'),
    jsonb_build_object('key','contract_ready',  'reached', v_contract IS NOT NULL),
    jsonb_build_object('key','production_started','reached', v_stage_key IN ('engineering','procurement','fabrication','qc','ready','installation','completed')),
    jsonb_build_object('key','qc',              'reached', v_stage_key IN ('qc','ready','installation','completed')),
    jsonb_build_object('key','ready_for_installation','reached', v_stage_key IN ('ready','installation','completed')),
    jsonb_build_object('key','installation',    'reached', v_stage_key IN ('installation','completed') OR (v_installation->>'status') IN ('confirmed','completed')),
    jsonb_build_object('key','completed',       'reached', v_stage_key = 'completed' OR (v_installation->>'status') = 'completed')
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
    'milestones', v_milestones
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_project_snapshot(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_project_snapshot(text, text) TO anon, authenticated;