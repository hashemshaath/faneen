-- Revert view back to security_invoker (linter flagged DEFINER views)
ALTER VIEW public.private_sectors_public SET (security_invoker = true);

-- Re-create the public read RLS so anon/authenticated can still read approved rows
-- via the safe view (which executes as the caller).
CREATE POLICY ps_public_read_approved
  ON public.private_sectors
  FOR SELECT
  USING (status = 'approved'::private_sector_status);

-- Column-level PII lockdown for anonymous callers — the previous finding.
-- Authenticated users (owners, admins, etc.) keep their existing access via
-- the ps_owner_read policy; this only narrows the anonymous surface.
REVOKE SELECT (contact_phone, contact_email) ON public.private_sectors FROM anon;