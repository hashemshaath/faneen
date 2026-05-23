-- Revoke SELECT on sensitive PII / financial columns from the anonymous role
-- so unauthenticated PostgREST callers can no longer retrieve them from the
-- base tables. Authenticated reads remain unaffected; owner/staff/admin
-- access is still gated by existing RLS policies.

REVOKE SELECT (
  national_id,
  vat_number,
  account_manager_email,
  account_manager_phone,
  account_manager_name,
  cr_owner_name,
  cr_scan_data,
  cr_scan_raw,
  mobile,
  contact_person,
  customer_service_phone
) ON public.businesses FROM anon;

REVOKE SELECT (
  national_id,
  mobile,
  email,
  customer_service_phone,
  phone,
  contact_person
) ON public.business_branches FROM anon;
