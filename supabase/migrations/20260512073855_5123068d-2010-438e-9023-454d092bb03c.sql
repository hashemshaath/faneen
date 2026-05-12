
-- ============================================================
-- C6.4b-S — Contract Lock Security Hardening Cleanup
-- ============================================================

-- ---------- Part A: drop legacy financial lock trigger/function ----------
DROP TRIGGER IF EXISTS trg_contracts_financial_lock ON public.contracts;
DROP FUNCTION IF EXISTS public.contracts_financial_lock();

-- ---------- Part B: contract_amendment_audit — admin-only raw, party-safe view ----------
DROP POLICY IF EXISTS "Parties and admin can view amendment audit" ON public.contract_amendment_audit;

CREATE POLICY "Admins read amendment audit"
ON public.contract_amendment_audit
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Party-safe timeline view (no actor_id, no metadata jsonb)
CREATE OR REPLACE VIEW public.contract_amendment_audit_safe
WITH (security_invoker = false) AS
SELECT
  au.id,
  au.amendment_id,
  au.action,
  au.old_status,
  au.new_status,
  au.created_at
FROM public.contract_amendment_audit au
WHERE
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1
      FROM public.contract_amendments a
      JOIN public.contracts c ON c.id = a.contract_id
     WHERE a.id = au.amendment_id
       AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  );

GRANT SELECT ON public.contract_amendment_audit_safe TO authenticated;
REVOKE ALL ON public.contract_amendment_audit_safe FROM anon, PUBLIC;

-- ---------- Part C: contract_amendment_approvals — admin-only raw, scoped safe view ----------
DROP POLICY IF EXISTS "parties read approvals for own contracts" ON public.contract_amendment_approvals;

-- Recreate the safe view as definer-scoped: bypasses underlying RLS but restricts rows.
DROP VIEW IF EXISTS public.contract_amendment_approvals_safe;
CREATE VIEW public.contract_amendment_approvals_safe
WITH (security_invoker = false) AS
SELECT
  ap.id,
  ap.amendment_id,
  ap.contract_id,
  ap.approver_role,
  ap.approval_method,
  ap.approved_at,
  ap.amendment_hash,
  ap.contract_hash_at_approval,
  ap.created_at
FROM public.contract_amendment_approvals ap
WHERE
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.contracts c
     WHERE c.id = ap.contract_id
       AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  );

GRANT SELECT ON public.contract_amendment_approvals_safe TO authenticated;
REVOKE ALL ON public.contract_amendment_approvals_safe FROM anon, PUBLIC;
