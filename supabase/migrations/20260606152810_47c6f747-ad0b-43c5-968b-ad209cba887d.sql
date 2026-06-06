-- Restrict internal/admin-only sensitive columns on businesses from
-- being read via PostgREST by authenticated users. RLS still allows
-- owners/managers to read business rows, but these specific columns
-- (raw CR OCR data and internal Qitaat account-manager contacts)
-- must never travel through the Data API to non-admin clients.
-- Admin code paths use service_role and remain unaffected.

REVOKE SELECT (cr_scan_raw, cr_scan_data, account_manager_email, account_manager_phone)
  ON public.businesses FROM authenticated;
REVOKE SELECT (cr_scan_raw, cr_scan_data, account_manager_email, account_manager_phone)
  ON public.businesses FROM anon;

-- Also revoke UPDATE on these columns from authenticated so they
-- can only be written via service_role / admin RPCs.
REVOKE UPDATE (cr_scan_raw, cr_scan_data, account_manager_email, account_manager_phone)
  ON public.businesses FROM authenticated;
REVOKE UPDATE (cr_scan_raw, cr_scan_data, account_manager_email, account_manager_phone)
  ON public.businesses FROM anon;

-- Ensure service_role retains full access (no-op if already granted).
GRANT SELECT, UPDATE (cr_scan_raw, cr_scan_data, account_manager_email, account_manager_phone)
  ON public.businesses TO service_role;

-- Profiles: onboarding_draft may transiently hold national_id during
-- the onboarding wizard. Self-read is required, so we keep authenticated
-- SELECT on the column (RLS restricts to auth.uid() = user_id). No grant
-- changes here — documented for the scanner.
