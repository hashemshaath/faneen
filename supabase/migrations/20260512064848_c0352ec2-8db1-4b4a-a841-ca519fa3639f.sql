-- ============================================================
-- C6.2 — Amendment metadata split + official numbering
-- ============================================================

-- Part A: schema additions (additive, nullable)
ALTER TABLE public.contract_amendments
  ADD COLUMN IF NOT EXISTS amendment_number     integer,
  ADD COLUMN IF NOT EXISTS public_reason        text,
  ADD COLUMN IF NOT EXISTS internal_note        text,
  ADD COLUMN IF NOT EXISTS old_end_date         date,
  ADD COLUMN IF NOT EXISTS old_scope_summary    text,
  ADD COLUMN IF NOT EXISTS new_scope_summary    text,
  ADD COLUMN IF NOT EXISTS before_snapshot_id   uuid REFERENCES public.contract_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS after_snapshot_id    uuid REFERENCES public.contract_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS superseded_by        uuid REFERENCES public.contract_amendments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contract_amendments_contract_number
  ON public.contract_amendments(contract_id, amendment_number);

-- Privacy: hide internal_note from clients/providers at the column level.
-- Admins read via service_role / SECURITY DEFINER paths; PostgREST honors
-- column-level grants when projecting columns.
REVOKE SELECT (internal_note) ON public.contract_amendments FROM authenticated, anon;

-- Part B: backfill
-- B.1 amendment_number per contract (chronological)
WITH ordered AS (
  SELECT id,
         row_number() OVER (PARTITION BY contract_id ORDER BY created_at, id) AS n
  FROM public.contract_amendments
  WHERE amendment_number IS NULL
)
UPDATE public.contract_amendments a
   SET amendment_number = o.n
  FROM ordered o
 WHERE a.id = o.id;

-- B.2 copy reason -> public_reason
UPDATE public.contract_amendments
   SET public_reason = reason
 WHERE public_reason IS NULL AND reason IS NOT NULL;

-- B.3 snapshot old_end_date for amendments where new_end_date is set but old wasn't captured
UPDATE public.contract_amendments a
   SET old_end_date = c.end_date
  FROM public.contracts c
 WHERE a.contract_id = c.id
   AND a.old_end_date IS NULL
   AND a.new_end_date IS NOT NULL;

-- B.4 link applied amendments to their after_snapshot (created in C6.1 path)
UPDATE public.contract_amendments a
   SET after_snapshot_id = v.id
  FROM public.contract_versions v
 WHERE v.amendment_id = a.id
   AND v.kind = 'amendment_apply'
   AND a.after_snapshot_id IS NULL;

-- B.5 best-effort before_snapshot: previous version of same contract
UPDATE public.contract_amendments a
   SET before_snapshot_id = prev.id
  FROM public.contract_versions cur
  JOIN LATERAL (
    SELECT v.id FROM public.contract_versions v
     WHERE v.contract_id = cur.contract_id
       AND v.version_number = cur.version_number - 1
     LIMIT 1
  ) prev ON true
 WHERE cur.id = a.after_snapshot_id
   AND a.before_snapshot_id IS NULL;

-- Part C: creation trigger — assign number, copy reason, snapshot old values
CREATE OR REPLACE FUNCTION public.contract_amendments_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next int;
  v_total numeric;
  v_end date;
BEGIN
  IF NEW.amendment_number IS NULL THEN
    SELECT COALESCE(MAX(amendment_number), 0) + 1
      INTO v_next
      FROM public.contract_amendments
     WHERE contract_id = NEW.contract_id;
    NEW.amendment_number := v_next;
  END IF;

  IF NEW.public_reason IS NULL AND NEW.reason IS NOT NULL THEN
    NEW.public_reason := NEW.reason;
  END IF;

  -- Snapshot current contract figures so the amendment carries the "before" view.
  IF NEW.old_total IS NULL OR (NEW.new_end_date IS NOT NULL AND NEW.old_end_date IS NULL) THEN
    SELECT total_amount, end_date INTO v_total, v_end
      FROM public.contracts WHERE id = NEW.contract_id;
    IF NEW.old_total IS NULL THEN NEW.old_total := v_total; END IF;
    IF NEW.new_end_date IS NOT NULL AND NEW.old_end_date IS NULL THEN
      NEW.old_end_date := v_end;
    END IF;
  END IF;

  -- Safety: clients/providers must not write internal_note at create time.
  -- Admins/service_role bypass RLS and may set it through admin tooling.
  IF NEW.internal_note IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    NEW.internal_note := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_amendments_before_insert ON public.contract_amendments;
CREATE TRIGGER trg_contract_amendments_before_insert
BEFORE INSERT ON public.contract_amendments
FOR EACH ROW EXECUTE FUNCTION public.contract_amendments_before_insert();

-- Part D: apply flow — link before/after snapshot ids onto the amendment row.
-- The apply RPC already creates the new contract_versions row (C6.1).
-- We extend it to capture before/after snapshot pointers atomically.
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

  -- Capture previous version BEFORE inserting the new one (for before_snapshot_id).
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

  -- C6.1: idempotent version creation
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

  -- C6.2: link before/after snapshots onto the amendment row.
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