
-- SECURITY HARDENING PASS 1 (items 1 partial, 4 residual)
-- 1) phone_otps: explicit deny-all SELECT so no future policy can accidentally
--    expose codes. Verification is service_role only (edge function).
DROP POLICY IF EXISTS "phone_otps_deny_select" ON public.phone_otps;
CREATE POLICY "phone_otps_deny_select"
  ON public.phone_otps
  FOR SELECT
  TO authenticated, anon
  USING (false);

-- Also revoke SELECT on the hash column from client roles as belt-and-suspenders.
REVOKE SELECT (otp_code_hash) ON public.phone_otps FROM authenticated, anon;

-- 2) client_sites: enforce column-level revoke on national-ID / tax columns
--    that the frontend already treats as sensitive (accessed via secure RPC).
--    owner_id_number and tax_number are already routed through the sensitive
--    RPC in DashboardSites.tsx, so revoking here is a no-op for the UI but
--    closes the loophole where any authenticated user could SELECT them.
REVOKE SELECT (owner_id_number, tax_number) ON public.client_sites FROM authenticated, anon;

-- Ensure service_role and admins can still read via the sensitive RPC path.
GRANT SELECT (owner_id_number, tax_number) ON public.client_sites TO service_role;
