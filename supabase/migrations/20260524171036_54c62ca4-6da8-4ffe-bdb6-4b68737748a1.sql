-- 1. Revoke column-level SELECT on PII fields from anon and the public role
REVOKE SELECT (email, phone, mobile, customer_service_phone, account_manager_email, account_manager_phone)
  ON public.businesses FROM anon;
REVOKE SELECT (email, phone, mobile, customer_service_phone, account_manager_email, account_manager_phone)
  ON public.businesses FROM PUBLIC;

REVOKE SELECT (email, phone, mobile, customer_service_phone, contact_person)
  ON public.business_branches FROM anon;
REVOKE SELECT (email, phone, mobile, customer_service_phone, contact_person)
  ON public.business_branches FROM PUBLIC;

-- 2. Make the masked public views run with definer privileges so anon reads
--    via the view continue to work even though the base columns are revoked.
ALTER VIEW public.businesses_public        SET (security_invoker = false);
ALTER VIEW public.business_branches_public SET (security_invoker = false);

COMMENT ON VIEW public.businesses_public IS
  'Public anon-facing view of businesses. Excludes PII (email, phone, account_manager_*). Runs with definer privileges; this is the only anon read surface for businesses.';
COMMENT ON VIEW public.business_branches_public IS
  'Public anon-facing view of business_branches. Excludes PII (email, phone, contact_person). Runs with definer privileges; this is the only anon read surface for branches.';