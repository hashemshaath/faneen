
-- Revoke column-level SELECT from the anonymous role on sensitive fields.
-- The table-level SELECT grant to `anon` (needed for public directory browsing)
-- remains in place for the non-sensitive columns. PostgREST honors column-level
-- grants, so anon queries that request these columns will be rejected and
-- queries that omit them continue to work. Authenticated/owner/staff/admin
-- access flows through existing RLS policies + their own grants and is unaffected.

-- businesses: internal onboarding / CRM fields
REVOKE SELECT (
  national_id,
  cr_owner_name,
  cr_scan_raw,
  cr_scan_data,
  cr_document_url,
  account_manager_name,
  account_manager_email,
  account_manager_phone,
  approval_notes,
  vat_number
) ON public.businesses FROM anon;

-- business_branches: contact PII
REVOKE SELECT (
  email,
  phone,
  mobile,
  customer_service_phone,
  contact_person
) ON public.business_branches FROM anon;
