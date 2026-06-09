-- Security hotfix: prevent submitters (and any non-admin authenticated user)
-- from reading lead_requests.internal_notes. This column is intended for
-- admin/business-manager use only and was leaking via the
-- "Submitter can view own lead" RLS policy which granted full-row SELECT.
--
-- Strategy: column-level REVOKE for anon/authenticated. Admin and
-- business-manager reads of internal_notes continue via the existing
-- SECURITY DEFINER RPC public.get_lead_internal_notes(_lead_id uuid),
-- which bypasses column privileges. RLS policies on the table are
-- untouched so submitters keep reading their own non-sensitive columns.

REVOKE SELECT (internal_notes) ON public.lead_requests FROM anon;
REVOKE SELECT (internal_notes) ON public.lead_requests FROM authenticated;
REVOKE SELECT (internal_notes) ON public.lead_requests FROM PUBLIC;

-- Service role keeps full access (it bypasses column privileges anyway,
-- but make it explicit for clarity).
GRANT SELECT (internal_notes) ON public.lead_requests TO service_role;

-- Harden the admin reader: require caller to be admin or the business
-- owner/manager for that lead. (Defense-in-depth; the RPC is the only
-- supported path to read internal_notes now.)
CREATE OR REPLACE FUNCTION public.get_lead_internal_notes(_lead_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_notes text;
BEGIN
  SELECT business_id, internal_notes
    INTO v_business_id, v_notes
    FROM public.lead_requests
   WHERE id = _lead_id;

  IF v_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF public.has_admin_access(auth.uid())
     OR public.is_business_owner_or_manager(auth.uid(), v_business_id) THEN
    RETURN v_notes;
  END IF;

  RAISE EXCEPTION 'not authorized to read internal notes'
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.get_lead_internal_notes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lead_internal_notes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_internal_notes(uuid) TO service_role;