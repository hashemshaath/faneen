-- ============================================================
-- C6.4b — Active Contract Lock Guard
-- ============================================================

-- Part C: Backfill locked_at for already-locked-status contracts
UPDATE public.contracts
   SET locked_at = COALESCE(
       locked_at,
       GREATEST(client_accepted_at, provider_accepted_at),
       client_accepted_at,
       provider_accepted_at,
       updated_at,
       now()
   )
 WHERE status IN ('active','completed','cancelled','disputed')
   AND locked_at IS NULL;

-- Part A: lock guard trigger function
CREATE OR REPLACE FUNCTION public.contracts_lock_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_bypass text;
  v_locked boolean;
  v_changed jsonb := '[]'::jsonb;
  v_detail jsonb;
BEGIN
  -- Determine if OLD row is locked
  v_locked := (OLD.status IN ('active','completed','cancelled','disputed'))
              OR (OLD.locked_at IS NOT NULL);

  IF NOT v_locked THEN
    RETURN NEW;
  END IF;

  -- Read per-transaction bypass token (must match this contract id)
  BEGIN
    v_bypass := current_setting('app.contract_bypass_lock', true);
  EXCEPTION WHEN OTHERS THEN v_bypass := NULL;
  END;

  IF v_bypass IS NOT NULL AND v_bypass = OLD.id::text THEN
    RETURN NEW;
  END IF;

  -- Status change check (independent of protected fields)
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'CONTRACT_STATUS_LOCKED'
      USING ERRCODE = 'P0001',
            DETAIL  = jsonb_build_object('contract_id', OLD.id, 'old_status', OLD.status, 'new_status', NEW.status)::text;
  END IF;

  -- Protected fields: collect any that changed
  IF NEW.client_id              IS DISTINCT FROM OLD.client_id              THEN v_changed := v_changed || '"client_id"'::jsonb;              END IF;
  IF NEW.provider_id            IS DISTINCT FROM OLD.provider_id            THEN v_changed := v_changed || '"provider_id"'::jsonb;            END IF;
  IF NEW.business_id            IS DISTINCT FROM OLD.business_id            THEN v_changed := v_changed || '"business_id"'::jsonb;            END IF;
  IF NEW.total_amount           IS DISTINCT FROM OLD.total_amount           THEN v_changed := v_changed || '"total_amount"'::jsonb;           END IF;
  IF NEW.currency_code          IS DISTINCT FROM OLD.currency_code          THEN v_changed := v_changed || '"currency_code"'::jsonb;          END IF;
  IF NEW.vat_rate               IS DISTINCT FROM OLD.vat_rate               THEN v_changed := v_changed || '"vat_rate"'::jsonb;               END IF;
  IF NEW.vat_inclusive          IS DISTINCT FROM OLD.vat_inclusive          THEN v_changed := v_changed || '"vat_inclusive"'::jsonb;          END IF;
  IF NEW.start_date             IS DISTINCT FROM OLD.start_date             THEN v_changed := v_changed || '"start_date"'::jsonb;             END IF;
  IF NEW.end_date               IS DISTINCT FROM OLD.end_date               THEN v_changed := v_changed || '"end_date"'::jsonb;               END IF;
  IF NEW.title_ar               IS DISTINCT FROM OLD.title_ar               THEN v_changed := v_changed || '"title_ar"'::jsonb;               END IF;
  IF NEW.title_en               IS DISTINCT FROM OLD.title_en               THEN v_changed := v_changed || '"title_en"'::jsonb;               END IF;
  IF NEW.description_ar         IS DISTINCT FROM OLD.description_ar         THEN v_changed := v_changed || '"description_ar"'::jsonb;         END IF;
  IF NEW.description_en         IS DISTINCT FROM OLD.description_en         THEN v_changed := v_changed || '"description_en"'::jsonb;         END IF;
  IF NEW.terms_ar               IS DISTINCT FROM OLD.terms_ar               THEN v_changed := v_changed || '"terms_ar"'::jsonb;               END IF;
  IF NEW.terms_en               IS DISTINCT FROM OLD.terms_en               THEN v_changed := v_changed || '"terms_en"'::jsonb;               END IF;
  IF NEW.contract_version       IS DISTINCT FROM OLD.contract_version       THEN v_changed := v_changed || '"contract_version"'::jsonb;       END IF;
  IF NEW.official_version_number IS DISTINCT FROM OLD.official_version_number THEN v_changed := v_changed || '"official_version_number"'::jsonb; END IF;
  IF NEW.document_hash          IS DISTINCT FROM OLD.document_hash          THEN v_changed := v_changed || '"document_hash"'::jsonb;          END IF;
  IF NEW.last_pdf_snapshot_id   IS DISTINCT FROM OLD.last_pdf_snapshot_id   THEN v_changed := v_changed || '"last_pdf_snapshot_id"'::jsonb;   END IF;
  IF NEW.locked_at              IS DISTINCT FROM OLD.locked_at              THEN v_changed := v_changed || '"locked_at"'::jsonb;              END IF;

  IF jsonb_array_length(v_changed) > 0 THEN
    v_detail := jsonb_build_object('contract_id', OLD.id, 'changed_fields', v_changed);
    RAISE EXCEPTION 'CONTRACT_LOCKED'
      USING ERRCODE = 'P0001',
            DETAIL  = v_detail::text;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_lock_guard ON public.contracts;
CREATE TRIGGER trg_contracts_lock_guard
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.contracts_lock_guard();

-- Part B.1: apply_contract_amendment — set bypass for this txn
CREATE OR REPLACE FUNCTION public.apply_contract_amendment(_amendment_id uuid)
RETURNS contract_amendments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  a public.contract_amendments;
  v_uid uuid := auth.uid();
  v_provider uuid;
  v_currency text;
  v_vat_rate numeric;
  v_vat_inclusive boolean;
  v_old_total numeric;
  v_old_end_date date;
  v_new_total numeric;
  v_amount_delta numeric;
  v_old_vat numeric;
  v_new_vat numeric;
  v_paid_total numeric := 0;
  v_pending_before numeric := 0;
  v_pending_after numeric := 0;
  v_new_remaining numeric;
  v_pending_count int := 0;
  v_rows_adjusted int := 0;
  v_schedule_adjusted boolean := false;
  v_manual_schedule boolean := false;
  v_milestone_date_warn boolean := false;
  v_documentation_only boolean := false;
  v_skip_reconcile boolean := false;
  v_factor numeric;
  v_running numeric := 0;
  v_idx int := 0;
  v_next numeric;
  v_tol constant numeric := 0.01;
  v_metadata jsonb;
  r record;
  v_prev_version_id uuid;
  v_prev_version_no int;
  v_prev_hash text;
  v_new_version_id uuid;
  v_new_version_no int;
  v_snapshot jsonb;
  v_new_hash text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;

  SELECT * INTO a FROM public.contract_amendments WHERE id = _amendment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF a.status <> 'approved' THEN RAISE EXCEPTION 'amendment_not_approved'; END IF;

  -- C6.4b: bypass lock for legitimate amendment-driven contract update
  PERFORM set_config('app.contract_bypass_lock', a.contract_id::text, true);

  SELECT provider_id, total_amount, currency_code, COALESCE(vat_rate, 15), COALESCE(vat_inclusive, true), end_date
    INTO v_provider, v_old_total, v_currency, v_vat_rate, v_vat_inclusive, v_old_end_date
  FROM public.contracts WHERE id = a.contract_id FOR UPDATE;

  IF NOT (public.has_role(v_uid, 'admin'::app_role) OR v_uid = v_provider) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  BEGIN
    v_skip_reconcile := COALESCE(current_setting('app.amendment_skip_reconcile', true), 'false') = 'true';
  EXCEPTION WHEN OTHERS THEN v_skip_reconcile := false;
  END;

  PERFORM set_config('app.amendment_apply', 'true', true);

  IF a.amendment_type = 'measurement_change' THEN
    v_documentation_only := true;
    v_new_total := v_old_total;
    v_amount_delta := 0;
  ELSE
    IF a.new_amount IS NOT NULL THEN
      IF a.new_amount <= 0 THEN RAISE EXCEPTION 'invalid_new_amount'; END IF;
      v_new_total := round(a.new_amount::numeric, 2);
    ELSE
      v_new_total := v_old_total;
    END IF;
    v_amount_delta := round(v_new_total - v_old_total, 2);

    SELECT
      COALESCE(SUM(CASE WHEN ip.status IN ('paid','completed','settled') THEN ip.amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ip.status NOT IN ('paid','completed','settled') THEN ip.amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN ip.status NOT IN ('paid','completed','settled') THEN 1 ELSE 0 END), 0)
    INTO v_paid_total, v_pending_before, v_pending_count
    FROM public.installment_payments ip
    JOIN public.installment_plans pl ON pl.id = ip.plan_id
    WHERE pl.contract_id = a.contract_id;

    v_paid_total     := round(COALESCE(v_paid_total, 0), 2);
    v_pending_before := round(COALESCE(v_pending_before, 0), 2);
    v_new_remaining  := round(v_new_total - v_paid_total, 2);

    IF v_new_remaining < -v_tol THEN
      RAISE EXCEPTION 'overpaid_refund_required';
    END IF;

    IF v_pending_count = 0 THEN
      IF v_new_remaining > v_tol THEN v_manual_schedule := true; END IF;
    ELSIF v_skip_reconcile THEN
      v_manual_schedule := true;
    ELSIF abs(v_new_remaining - v_pending_before) <= v_tol THEN
      v_pending_after := v_pending_before;
    ELSE
      v_factor := CASE WHEN v_pending_before > 0 THEN v_new_remaining / v_pending_before ELSE 0 END;
      v_running := 0;
      v_idx := 0;
      FOR r IN
        SELECT ip.id, ip.amount
        FROM public.installment_payments ip
        JOIN public.installment_plans pl ON pl.id = ip.plan_id
        WHERE pl.contract_id = a.contract_id
          AND ip.status NOT IN ('paid','completed','settled')
        ORDER BY ip.installment_number NULLS LAST, ip.due_date NULLS LAST, ip.id
        FOR UPDATE
      LOOP
        v_idx := v_idx + 1;
        IF v_idx < v_pending_count THEN
          v_next := round(GREATEST(0, COALESCE(r.amount, 0) * v_factor), 2);
          v_running := v_running + v_next;
        ELSE
          v_next := round(GREATEST(0, v_new_remaining - v_running), 2);
        END IF;
        IF abs(COALESCE(r.amount, 0) - v_next) > v_tol THEN
          UPDATE public.installment_payments SET amount = v_next WHERE id = r.id;
          v_rows_adjusted := v_rows_adjusted + 1;
        END IF;
        v_pending_after := round(v_pending_after + v_next, 2);
      END LOOP;
      v_schedule_adjusted := v_rows_adjusted > 0;
    END IF;

    IF v_pending_count > 0 AND v_pending_after = 0 THEN
      v_pending_after := v_pending_before;
    END IF;

    IF a.new_amount IS NOT NULL AND abs(v_new_total - v_old_total) > v_tol THEN
      UPDATE public.contracts SET total_amount = v_new_total WHERE id = a.contract_id;
    END IF;
  END IF;

  IF a.new_end_date IS NOT NULL AND a.new_end_date IS DISTINCT FROM v_old_end_date THEN
    UPDATE public.contracts SET end_date = a.new_end_date WHERE id = a.contract_id;
  END IF;

  IF v_vat_inclusive THEN
    v_old_vat := round(COALESCE(v_old_total, 0) * v_vat_rate / NULLIF(100 + v_vat_rate, 0), 2);
    v_new_vat := round(COALESCE(v_new_total, 0) * v_vat_rate / NULLIF(100 + v_vat_rate, 0), 2);
  ELSE
    v_old_vat := round(COALESCE(v_old_total, 0) * v_vat_rate / 100, 2);
    v_new_vat := round(COALESCE(v_new_total, 0) * v_vat_rate / 100, 2);
  END IF;

  SELECT id, version_number, document_hash
    INTO v_prev_version_id, v_prev_version_no, v_prev_hash
    FROM public.contract_versions
   WHERE contract_id = a.contract_id
   ORDER BY version_number DESC
   LIMIT 1
   FOR UPDATE;

  UPDATE public.contract_amendments
     SET status = 'applied',
         applied_at = now(),
         applied_by = v_uid,
         old_total = COALESCE(old_total, v_old_total),
         old_end_date = COALESCE(old_end_date, v_old_end_date),
         amount_delta = CASE WHEN a.new_amount IS NULL THEN NULL ELSE round(v_new_total - v_old_total, 2) END
   WHERE id = _amendment_id
   RETURNING * INTO a;

  SELECT id INTO v_new_version_id
    FROM public.contract_versions
   WHERE amendment_id = _amendment_id AND kind = 'amendment_apply'
   LIMIT 1;

  IF v_new_version_id IS NULL THEN
    v_new_version_no := COALESCE(v_prev_version_no, 0) + 1;
    v_snapshot := public.contract_canonical_snapshot(a.contract_id);
    v_new_hash := public.contract_snapshot_hash(v_snapshot);

    INSERT INTO public.contract_versions(
      contract_id, version_number, kind, amendment_id, snapshot,
      document_hash, prev_version_id, prev_document_hash, created_by
    ) VALUES (
      a.contract_id, v_new_version_no, 'amendment_apply', _amendment_id, v_snapshot,
      v_new_hash, v_prev_version_id, v_prev_hash, v_uid
    )
    RETURNING id INTO v_new_version_id;

    UPDATE public.contracts
       SET contract_version        = v_new_version_no,
           official_version_number = v_new_version_no,
           document_hash           = v_new_hash,
           last_pdf_snapshot_id    = v_new_version_id
     WHERE id = a.contract_id;
  END IF;

  UPDATE public.contract_amendments
     SET before_snapshot_id = COALESCE(before_snapshot_id, v_prev_version_id),
         after_snapshot_id  = COALESCE(after_snapshot_id,  v_new_version_id)
   WHERE id = _amendment_id;

  v_metadata := jsonb_build_object(
    'type', a.amendment_type,
    'old_total', v_old_total,
    'new_total', v_new_total,
    'amount_delta', v_amount_delta,
    'currency_code', v_currency,
    'vat_rate', v_vat_rate,
    'vat_inclusive', v_vat_inclusive,
    'old_vat_amount', v_old_vat,
    'new_vat_amount', v_new_vat,
    'paid_total', v_paid_total,
    'pending_total_before', v_pending_before,
    'pending_total_after', v_pending_after,
    'new_remaining', v_new_remaining,
    'schedule_adjusted', v_schedule_adjusted,
    'rows_adjusted', v_rows_adjusted,
    'refund_needed', false,
    'manual_schedule_required', v_manual_schedule,
    'old_end_date', v_old_end_date,
    'new_end_date', a.new_end_date,
    'milestone_dates_not_shifted', v_milestone_date_warn,
    'documentation_only', v_documentation_only,
    'skip_reconcile', v_skip_reconcile,
    'version_id', v_new_version_id,
    'before_snapshot_id', v_prev_version_id,
    'after_snapshot_id', v_new_version_id
  );

  INSERT INTO public.contract_amendment_audit(amendment_id, actor_id, action, old_status, new_status, metadata)
  VALUES (_amendment_id, v_uid, 'applied', 'approved', 'applied', v_metadata);

  RETURN a;
END;
$function$;

-- Part B.2: complete_contract — bypass lock for status active → completed
CREATE OR REPLACE FUNCTION public.complete_contract(_contract_id uuid)
RETURNS public.contracts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contracts;
  perms record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  SELECT * INTO c FROM public.contracts WHERE id = _contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO perms FROM public.contract_caller_can_act(_contract_id);
  IF NOT (perms.is_provider OR perms.is_admin) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF c.status NOT IN ('active') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION' USING ERRCODE = 'P0001';
  END IF;
  PERFORM set_config('app.contract_bypass_lock', _contract_id::text, true);
  UPDATE public.contracts
     SET status = 'completed', completed_at = now(), updated_at = now()
   WHERE id = _contract_id
   RETURNING * INTO c;
  RETURN c;
END;
$$;

-- Part B.3: cancel_contract — bypass lock for status → cancelled
CREATE OR REPLACE FUNCTION public.cancel_contract(_contract_id uuid, _reason text DEFAULT NULL)
RETURNS public.contracts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contracts;
  perms record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  SELECT * INTO c FROM public.contracts WHERE id = _contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO perms FROM public.contract_caller_can_act(_contract_id);
  IF NOT (perms.is_client OR perms.is_provider OR perms.is_admin) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF c.status IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION' USING ERRCODE = 'P0001';
  END IF;
  PERFORM set_config('app.contract_bypass_lock', _contract_id::text, true);
  UPDATE public.contracts
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = COALESCE(_reason, cancellation_reason),
         updated_at = now()
   WHERE id = _contract_id
   RETURNING * INTO c;
  RETURN c;
END;
$$;

-- Part B.4: accept_contract — set locked_at when becoming active
CREATE OR REPLACE FUNCTION public.accept_contract(_contract_id uuid)
RETURNS public.contracts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contracts;
  perms record;
  now_ts timestamptz := now();
  new_status public.contract_status;
  new_client_at timestamptz;
  new_provider_at timestamptz;
  other_accepted timestamptz;
  v_new_locked_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  SELECT * INTO c FROM public.contracts WHERE id = _contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO perms FROM public.contract_caller_can_act(_contract_id);
  IF NOT (perms.is_client OR perms.is_provider) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  new_client_at   := c.client_accepted_at;
  new_provider_at := c.provider_accepted_at;

  IF perms.is_client AND new_client_at IS NULL THEN
    new_client_at := now_ts;
    other_accepted := c.provider_accepted_at;
  ELSIF perms.is_provider AND new_provider_at IS NULL THEN
    new_provider_at := now_ts;
    other_accepted := c.client_accepted_at;
  ELSE
    RETURN c;
  END IF;

  IF other_accepted IS NOT NULL THEN
    new_status := 'active';
  ELSIF c.status = 'draft' THEN
    new_status := 'pending_approval';
  ELSE
    new_status := c.status;
  END IF;

  v_new_locked_at := c.locked_at;
  IF new_status = 'active' AND v_new_locked_at IS NULL THEN
    v_new_locked_at := now_ts;
  END IF;

  -- Bypass lock just in case OLD row is somehow already considered locked
  PERFORM set_config('app.contract_bypass_lock', _contract_id::text, true);

  UPDATE public.contracts
     SET client_accepted_at   = new_client_at,
         provider_accepted_at = new_provider_at,
         status               = new_status,
         locked_at            = v_new_locked_at,
         updated_at           = now_ts
   WHERE id = _contract_id
   RETURNING * INTO c;
  RETURN c;
END;
$$;

-- Part B.5: recalc_contract_total — block on locked statuses
CREATE OR REPLACE FUNCTION public.recalc_contract_total(_contract_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perms record;
  ms_total numeric := 0;
  li_total numeric := 0;
  grand numeric := 0;
  v_status public.contract_status;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  SELECT * INTO perms FROM public.contract_caller_can_act(_contract_id);
  IF NOT (perms.is_client OR perms.is_provider OR perms.is_admin) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT status INTO v_status FROM public.contracts WHERE id = _contract_id;
  IF v_status IN ('active','completed','cancelled','disputed') THEN
    RAISE EXCEPTION 'CONTRACT_LOCKED' USING ERRCODE = 'P0001',
      DETAIL = jsonb_build_object('contract_id', _contract_id, 'reason', 'recalc_blocked_after_activation')::text;
  END IF;
  SELECT COALESCE(SUM(total_cost), 0) INTO ms_total FROM public.contract_measurements WHERE contract_id = _contract_id;
  SELECT COALESCE(SUM(total_cost), 0) INTO li_total FROM public.contract_line_items WHERE contract_id = _contract_id;
  grand := ms_total + li_total;
  IF grand > 0 THEN
    UPDATE public.contracts SET total_amount = grand, updated_at = now() WHERE id = _contract_id;
  END IF;
  RETURN grand;
END;
$$;

-- Re-grant (signatures unchanged but functions were recreated)
GRANT EXECUTE ON FUNCTION public.apply_contract_amendment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_contract(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_contract_total(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_contract_total(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_contract(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_contract(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_contract(uuid) FROM PUBLIC, anon;