
-- ════════════════════════════════════════════════════════════════════
-- C5C-pre — Contract Amendment Safety Hardening
-- ════════════════════════════════════════════════════════════════════

-- 1. New columns
ALTER TABLE public.contract_amendments
  ADD COLUMN IF NOT EXISTS old_total numeric,
  ADD COLUMN IF NOT EXISTS amount_delta numeric,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS applied_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS reason text;

-- Status CHECK constraint
DO $$ BEGIN
  ALTER TABLE public.contract_amendments
    ADD CONSTRAINT contract_amendments_status_check
    CHECK (status IN ('pending','approved','rejected','applied','cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Audit table
CREATE TABLE IF NOT EXISTS public.contract_amendment_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amendment_id uuid NOT NULL REFERENCES public.contract_amendments(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  old_status text,
  new_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_caa_amendment ON public.contract_amendment_audit(amendment_id);
ALTER TABLE public.contract_amendment_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties and admin can view amendment audit" ON public.contract_amendment_audit;
CREATE POLICY "Parties and admin can view amendment audit"
  ON public.contract_amendment_audit FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.contract_amendments a
      JOIN public.contracts c ON c.id = a.contract_id
      WHERE a.id = contract_amendment_audit.amendment_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );
-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER funcs can write.

-- 3. Amendment safety trigger
CREATE OR REPLACE FUNCTION public.contract_amendments_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_client uuid;
  v_provider uuid;
  v_bypass boolean := COALESCE(current_setting('app.amendment_apply', true) = 'true', false);
BEGIN
  -- Immutable forever
  IF NEW.contract_id <> OLD.contract_id
     OR NEW.requested_by <> OLD.requested_by
     OR NEW.created_at  <> OLD.created_at THEN
    RAISE EXCEPTION 'amendment_immutable_fields';
  END IF;

  SELECT client_id, provider_id INTO v_client, v_provider
  FROM public.contracts WHERE id = NEW.contract_id;

  -- Request-side fields editable only while pending and only by requester
  IF (NEW.new_amount IS DISTINCT FROM OLD.new_amount
      OR NEW.new_end_date IS DISTINCT FROM OLD.new_end_date
      OR NEW.amendment_type IS DISTINCT FROM OLD.amendment_type
      OR NEW.title_ar IS DISTINCT FROM OLD.title_ar
      OR NEW.title_en IS DISTINCT FROM OLD.title_en
      OR NEW.description_ar IS DISTINCT FROM OLD.description_ar
      OR NEW.description_en IS DISTINCT FROM OLD.description_en
      OR NEW.reason IS DISTINCT FROM OLD.reason)
     AND NOT v_bypass THEN
    IF OLD.status <> 'pending' OR v_uid IS DISTINCT FROM OLD.requested_by THEN
      RAISE EXCEPTION 'amendment_request_fields_locked';
    END IF;
  END IF;

  -- client_approved_at: write-once, only by client, never by requester
  IF NEW.client_approved_at IS DISTINCT FROM OLD.client_approved_at AND NOT v_bypass THEN
    IF OLD.client_approved_at IS NOT NULL THEN
      RAISE EXCEPTION 'amendment_client_approval_immutable';
    END IF;
    IF v_uid IS DISTINCT FROM v_client THEN
      RAISE EXCEPTION 'amendment_client_approval_forbidden';
    END IF;
    IF v_uid = OLD.requested_by THEN
      RAISE EXCEPTION 'amendment_self_approval_forbidden';
    END IF;
  END IF;

  -- provider_approved_at: same rules, mirrored
  IF NEW.provider_approved_at IS DISTINCT FROM OLD.provider_approved_at AND NOT v_bypass THEN
    IF OLD.provider_approved_at IS NOT NULL THEN
      RAISE EXCEPTION 'amendment_provider_approval_immutable';
    END IF;
    IF v_uid IS DISTINCT FROM v_provider THEN
      RAISE EXCEPTION 'amendment_provider_approval_forbidden';
    END IF;
    IF v_uid = OLD.requested_by THEN
      RAISE EXCEPTION 'amendment_self_approval_forbidden';
    END IF;
  END IF;

  -- Status transitions
  IF NEW.status <> OLD.status THEN
    IF OLD.status IN ('rejected','applied','cancelled') THEN
      RAISE EXCEPTION 'amendment_status_terminal';
    END IF;
    IF OLD.status = 'pending' AND NEW.status NOT IN ('approved','rejected','cancelled','pending') THEN
      RAISE EXCEPTION 'amendment_invalid_transition_from_pending';
    END IF;
    IF OLD.status = 'approved' AND NEW.status NOT IN ('applied','cancelled','approved') THEN
      RAISE EXCEPTION 'amendment_invalid_transition_from_approved';
    END IF;
    IF NEW.status = 'rejected' AND (NEW.rejected_by IS NULL OR NEW.rejection_reason IS NULL) THEN
      RAISE EXCEPTION 'amendment_rejection_requires_reason';
    END IF;
    IF NEW.status = 'applied' AND (NEW.applied_at IS NULL OR NEW.applied_by IS NULL) THEN
      RAISE EXCEPTION 'amendment_apply_requires_metadata';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_amendments_guard ON public.contract_amendments;
CREATE TRIGGER trg_contract_amendments_guard
  BEFORE UPDATE ON public.contract_amendments
  FOR EACH ROW EXECUTE FUNCTION public.contract_amendments_guard();

-- 4. Tighten RLS on contract_amendments
DROP POLICY IF EXISTS "Contract parties can update amendments" ON public.contract_amendments;
DROP POLICY IF EXISTS "Contract parties can view amendments" ON public.contract_amendments;
DROP POLICY IF EXISTS "Contract parties can create amendments" ON public.contract_amendments;

CREATE POLICY "Parties or admin can view amendments"
  ON public.contract_amendments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_amendments.contract_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

CREATE POLICY "Parties can create amendments"
  ON public.contract_amendments FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_amendments.contract_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

CREATE POLICY "Parties or admin can update non-terminal amendments"
  ON public.contract_amendments FOR UPDATE
  USING (
    status IN ('pending','approved')
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = contract_amendments.contract_id
          AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
      )
    )
  );
-- No DELETE policy.

-- 5. Contracts lock trigger (financial fields)
CREATE OR REPLACE FUNCTION public.contracts_financial_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_bypass boolean := COALESCE(current_setting('app.amendment_apply', true) = 'true', false);
BEGIN
  IF v_bypass THEN RETURN NEW; END IF;
  IF OLD.status::text NOT IN ('active','completed') THEN RETURN NEW; END IF;

  IF NEW.total_amount   IS DISTINCT FROM OLD.total_amount
   OR NEW.vat_rate      IS DISTINCT FROM OLD.vat_rate
   OR NEW.vat_inclusive IS DISTINCT FROM OLD.vat_inclusive
   OR NEW.currency_code IS DISTINCT FROM OLD.currency_code
   OR NEW.start_date    IS DISTINCT FROM OLD.start_date
   OR NEW.end_date      IS DISTINCT FROM OLD.end_date
   OR NEW.terms_ar      IS DISTINCT FROM OLD.terms_ar
   OR NEW.terms_en      IS DISTINCT FROM OLD.terms_en THEN
    RAISE EXCEPTION 'contract_locked_use_amendment';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_financial_lock ON public.contracts;
CREATE TRIGGER trg_contracts_financial_lock
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.contracts_financial_lock();

-- 6. SECURITY DEFINER RPCs

-- approve
CREATE OR REPLACE FUNCTION public.approve_contract_amendment(_amendment_id uuid)
RETURNS public.contract_amendments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.contract_amendments;
  v_uid uuid := auth.uid();
  v_client uuid; v_provider uuid;
  v_role text;
  v_both boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO a FROM public.contract_amendments WHERE id = _amendment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF a.status NOT IN ('pending') THEN RAISE EXCEPTION 'amendment_not_pending'; END IF;

  SELECT client_id, provider_id INTO v_client, v_provider FROM public.contracts WHERE id = a.contract_id;

  IF v_uid = a.requested_by THEN RAISE EXCEPTION 'requester_cannot_self_approve'; END IF;

  IF v_uid = v_client THEN
    v_role := 'client';
    IF a.client_approved_at IS NOT NULL THEN RAISE EXCEPTION 'already_approved'; END IF;
    UPDATE public.contract_amendments SET client_approved_at = now() WHERE id = _amendment_id;
  ELSIF v_uid = v_provider THEN
    v_role := 'provider';
    IF a.provider_approved_at IS NOT NULL THEN RAISE EXCEPTION 'already_approved'; END IF;
    UPDATE public.contract_amendments SET provider_approved_at = now() WHERE id = _amendment_id;
  ELSE
    RAISE EXCEPTION 'not_a_party';
  END IF;

  SELECT * INTO a FROM public.contract_amendments WHERE id = _amendment_id;
  v_both := a.client_approved_at IS NOT NULL AND a.provider_approved_at IS NOT NULL;
  IF v_both THEN
    UPDATE public.contract_amendments SET status = 'approved' WHERE id = _amendment_id;
    SELECT * INTO a FROM public.contract_amendments WHERE id = _amendment_id;
  END IF;

  INSERT INTO public.contract_amendment_audit(amendment_id, actor_id, action, old_status, new_status, metadata)
  VALUES (_amendment_id, v_uid,
          CASE WHEN v_role = 'client' THEN 'approved_client' ELSE 'approved_provider' END,
          'pending', a.status, jsonb_build_object('both', v_both));
  RETURN a;
END;
$$;

-- reject
CREATE OR REPLACE FUNCTION public.reject_contract_amendment(_amendment_id uuid, _reason text)
RETURNS public.contract_amendments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.contract_amendments;
  v_uid uuid := auth.uid();
  v_client uuid; v_provider uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _reason IS NULL OR length(btrim(_reason)) = 0 THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT * INTO a FROM public.contract_amendments WHERE id = _amendment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF a.status <> 'pending' THEN RAISE EXCEPTION 'amendment_not_pending'; END IF;

  SELECT client_id, provider_id INTO v_client, v_provider FROM public.contracts WHERE id = a.contract_id;
  IF NOT (public.has_role(v_uid,'admin'::app_role) OR v_uid = v_client OR v_uid = v_provider) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.contract_amendments
     SET status = 'rejected', rejected_by = v_uid, rejection_reason = _reason
   WHERE id = _amendment_id
   RETURNING * INTO a;

  INSERT INTO public.contract_amendment_audit(amendment_id, actor_id, action, old_status, new_status, metadata)
  VALUES (_amendment_id, v_uid, 'rejected', 'pending', 'rejected', '{}'::jsonb);
  RETURN a;
END;
$$;

-- cancel
CREATE OR REPLACE FUNCTION public.cancel_contract_amendment(_amendment_id uuid)
RETURNS public.contract_amendments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.contract_amendments;
  v_uid uuid := auth.uid();
  v_old text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO a FROM public.contract_amendments WHERE id = _amendment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF a.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'amendment_not_cancellable'; END IF;
  IF NOT (public.has_role(v_uid,'admin'::app_role) OR v_uid = a.requested_by) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_old := a.status;
  UPDATE public.contract_amendments
     SET status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid
   WHERE id = _amendment_id
   RETURNING * INTO a;

  INSERT INTO public.contract_amendment_audit(amendment_id, actor_id, action, old_status, new_status, metadata)
  VALUES (_amendment_id, v_uid, 'cancelled', v_old, 'cancelled', '{}'::jsonb);
  RETURN a;
END;
$$;

-- apply (C5C-pre: amount only, no VAT/schedule recompute)
CREATE OR REPLACE FUNCTION public.apply_contract_amendment(_amendment_id uuid)
RETURNS public.contract_amendments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.contract_amendments;
  v_uid uuid := auth.uid();
  v_provider uuid;
  v_old_total numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO a FROM public.contract_amendments WHERE id = _amendment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF a.status <> 'approved' THEN RAISE EXCEPTION 'amendment_not_approved'; END IF;

  SELECT provider_id, total_amount INTO v_provider, v_old_total
  FROM public.contracts WHERE id = a.contract_id;

  IF NOT (public.has_role(v_uid,'admin'::app_role) OR v_uid = v_provider) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  PERFORM set_config('app.amendment_apply', 'true', true);

  IF a.new_amount IS NOT NULL THEN
    UPDATE public.contracts SET total_amount = a.new_amount WHERE id = a.contract_id;
  END IF;

  UPDATE public.contract_amendments
     SET status = 'applied',
         applied_at = now(),
         applied_by = v_uid,
         old_total = v_old_total,
         amount_delta = CASE WHEN a.new_amount IS NULL THEN NULL ELSE a.new_amount - v_old_total END
   WHERE id = _amendment_id
   RETURNING * INTO a;

  INSERT INTO public.contract_amendment_audit(amendment_id, actor_id, action, old_status, new_status, metadata)
  VALUES (_amendment_id, v_uid, 'applied', 'approved', 'applied',
          jsonb_build_object('old_total', v_old_total, 'new_total', a.new_amount, 'amount_delta', a.amount_delta));
  RETURN a;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_contract_amendment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_contract_amendment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_contract_amendment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_contract_amendment(uuid) TO authenticated;
