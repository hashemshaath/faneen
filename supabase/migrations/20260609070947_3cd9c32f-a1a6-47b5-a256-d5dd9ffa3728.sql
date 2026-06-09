-- 1) lead_requests.internal_notes: column-level lockdown for non-service roles
REVOKE SELECT (internal_notes) ON public.lead_requests FROM anon, authenticated;
-- service_role retains full access via GRANT ALL elsewhere; admin tooling that
-- needs internal_notes must use the service role or a SECURITY DEFINER RPC.

-- 2) private_sectors: remove public RLS that exposed contact_phone/contact_email.
DROP POLICY IF EXISTS ps_public_read_approved ON public.private_sectors;

-- Public reads now flow only through the safe view (no PII columns).
-- Switch the view to SECURITY DEFINER so it can read approved rows even though
-- the base table no longer grants anon/authenticated direct SELECT.
ALTER VIEW public.private_sectors_public SET (security_invoker = false);

-- Ensure anon/authenticated can read the safe view.
GRANT SELECT ON public.private_sectors_public TO anon, authenticated;