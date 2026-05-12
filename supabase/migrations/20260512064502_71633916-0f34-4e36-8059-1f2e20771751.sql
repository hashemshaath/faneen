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
  -- C6.1 versioning locals
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
    v_milestone_date_warn := true;
  END IF;

  IF v_vat_inclusive THEN
    v_old_vat := round(COALESCE(v_old_total, 0) * v_vat_rate / NULLIF(100 + v_vat_rate, 0), 2);
    v_new_vat := round(COALESCE(v_new_total, 0) * v_vat_rate / NULLIF(100 + v_vat_rate, 0), 2);
  ELSE
    v_old_vat := round(COALESCE(v_old_total, 0) * v_vat_rate / 100, 2);
    v_new_vat := round(COALESCE(v_new_total, 0) * v_vat_rate / 100, 2);
  END IF;

  UPDATE public.contract_amendments
     SET status = 'applied',
         applied_at = now(),
         applied_by = v_uid,
         old_total = v_old_total,
         amount_delta = CASE WHEN a.new_amount IS NULL THEN NULL ELSE round(v_new_total - v_old_total, 2) END
   WHERE id = _amendment_id
   RETURNING * INTO a;

  -- ── C6.1: create immutable contract version row (idempotent) ──
  SELECT id INTO v_new_version_id
    FROM public.contract_versions
   WHERE amendment_id = _amendment_id AND kind = 'amendment_apply'
   LIMIT 1;

  IF v_new_version_id IS NULL THEN
    SELECT id, version_number, document_hash
      INTO v_prev_version_id, v_prev_version_no, v_prev_hash
      FROM public.contract_versions
     WHERE contract_id = a.contract_id
     ORDER BY version_number DESC
     LIMIT 1
     FOR UPDATE;

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
    'version_id', v_new_version_id
  );

  INSERT INTO public.contract_amendment_audit(amendment_id, actor_id, action, old_status, new_status, metadata)
  VALUES (_amendment_id, v_uid, 'applied', 'approved', 'applied', v_metadata);

  RETURN a;
END;
$function$;