
-- Phase 2.QA-Fix — Tighten submit_site_interest grants
-- Revoke anon/PUBLIC execute; keep authenticated + service_role only.

REVOKE EXECUTE ON FUNCTION public.submit_site_interest(
  text, uuid, text, text, numeric, numeric
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.submit_site_interest(
  text, uuid, text, text, numeric, numeric
) FROM anon;

GRANT EXECUTE ON FUNCTION public.submit_site_interest(
  text, uuid, text, text, numeric, numeric
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_site_interest(
  text, uuid, text, text, numeric, numeric
) TO service_role;
