-- 1) contact_messages: drop submitter SELECT (admin AI/triage fields exposure)
DROP POLICY IF EXISTS "Users can view own contact messages" ON public.contact_messages;

-- 2) lead_requests: revoke column-level SELECT on internal_notes from client roles.
--    Admin/business-owner reads go through the SECURITY DEFINER RPC get_lead_internal_notes.
REVOKE SELECT (internal_notes) ON public.lead_requests FROM authenticated;
REVOKE SELECT (internal_notes) ON public.lead_requests FROM anon;