
-- C6.3: Contract Amendment Approval Evidence

CREATE OR REPLACE FUNCTION public.amendment_canonical_safe_payload(_amendment_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'amendment_number',   a.amendment_number,
    'contract_id',        a.contract_id,
    'amendment_type',     a.amendment_type,
    'title_ar',           a.title_ar,
    'title_en',           a.title_en,
    'public_reason',      a.public_reason,
    'old_total',          a.old_total,
    'new_amount',         a.new_amount,
    'amount_delta',       a.amount_delta,
    'old_end_date',       a.old_end_date,
    'new_end_date',       a.new_end_date,
    'old_scope_summary',  a.old_scope_summary,
    'new_scope_summary',  a.new_scope_summary,
    'status',             a.status,
    'created_at',         a.created_at
  )
  FROM public.contract_amendments a
  WHERE a.id = _amendment_id;
$$;

CREATE OR REPLACE FUNCTION public.amendment_safe_hash(_amendment_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT encode(extensions.digest((public.amendment_canonical_safe_payload(_amendment_id))::text, 'sha256'), 'hex');
$$;

REVOKE ALL ON FUNCTION public.amendment_canonical_safe_payload(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.amendment_safe_hash(uuid)              FROM PUBLIC, anon, authenticated;

CREATE TABLE public.contract_amendment_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amendment_id uuid NOT NULL REFERENCES public.contract_amendments(id) ON DELETE CASCADE,
  contract_id  uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  approver_id  uuid NOT NULL,
  approver_role text NOT NULL CHECK (approver_role IN ('client','provider','admin_override')),
  approval_method text NOT NULL DEFAULT 'in_app' CHECK (approval_method IN ('in_app','email_link','admin_override')),
  approved_at timestamptz NOT NULL DEFAULT now(),
  amendment_hash text,
  contract_hash_at_approval text,
  ip_hash text,
  user_agent_hash text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_amendment_approvals_role
  ON public.contract_amendment_approvals(amendment_id, approver_role);
CREATE INDEX idx_amendment_approvals_amendment ON public.contract_amendment_approvals(amendment_id);
CREATE INDEX idx_amendment_approvals_contract  ON public.contract_amendment_approvals(contract_id);
CREATE INDEX idx_amendment_approvals_approver  ON public.contract_amendment_approvals(approver_id);
CREATE INDEX idx_amendment_approvals_at        ON public.contract_amendment_approvals(approved_at);

ALTER TABLE public.contract_amendment_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read all amendment approvals"
  ON public.contract_amendment_approvals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "parties read approvals for own contracts"
  ON public.contract_amendment_approvals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

REVOKE ALL ON public.contract_amendment_approvals FROM anon, authenticated;
GRANT SELECT (
  id, amendment_id, contract_id, approver_role, approval_method,
  approved_at, amendment_hash, contract_hash_at_approval, created_at
) ON public.contract_amendment_approvals TO authenticated;

CREATE OR REPLACE VIEW public.contract_amendment_approvals_safe
WITH (security_invoker = true) AS
SELECT
  id, amendment_id, contract_id, approver_role, approval_method,
  approved_at, amendment_hash, contract_hash_at_approval, created_at
FROM public.contract_amendment_approvals;

GRANT SELECT ON public.contract_amendment_approvals_safe TO authenticated;

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
  v_contract_hash text;
  v_amend_hash text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO a FROM public.contract_amendments WHERE id = _amendment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF a.status NOT IN ('pending') THEN RAISE EXCEPTION 'amendment_not_pending'; END IF;

  SELECT client_id, provider_id, document_hash
    INTO v_client, v_provider, v_contract_hash
    FROM public.contracts WHERE id = a.contract_id;

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

  v_amend_hash := public.amendment_safe_hash(_amendment_id);
  INSERT INTO public.contract_amendment_approvals(
    amendment_id, contract_id, approver_id, approver_role, approval_method,
    amendment_hash, contract_hash_at_approval
  )
  VALUES (
    _amendment_id, a.contract_id, v_uid, v_role, 'in_app',
    v_amend_hash, v_contract_hash
  )
  ON CONFLICT (amendment_id, approver_role) DO NOTHING;

  INSERT INTO public.contract_amendment_audit(amendment_id, actor_id, action, old_status, new_status, metadata)
  VALUES (_amendment_id, v_uid,
          CASE WHEN v_role = 'client' THEN 'approved_client' ELSE 'approved_provider' END,
          'pending', a.status, jsonb_build_object('both', v_both));
  RETURN a;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_contract_amendment(uuid) TO authenticated;
