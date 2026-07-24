
-- Drop the weaker, unvalidated insert policies on access_violation_log.
-- The strict *_guarded policies remain and enforce field validation.
-- Additionally, tighten avl_insert_auth_guarded to require the caller
-- owns the user_id (matching prior behavior of the dropped policy).
DROP POLICY IF EXISTS "Anon can insert violations" ON public.access_violation_log;
DROP POLICY IF EXISTS "Authenticated users can insert violations" ON public.access_violation_log;

DROP POLICY IF EXISTS avl_insert_auth_guarded ON public.access_violation_log;
CREATE POLICY avl_insert_auth_guarded
ON public.access_violation_log
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND ((ip_address IS NULL) OR (length(ip_address) <= 64))
  AND ((route IS NULL) OR (length(route) <= 512))
  AND (violation_type = ANY (ARRAY['unauthorized_access','forbidden_route','rate_limit','invalid_token','suspicious_activity','rls_denied','other']))
  AND ((details IS NULL) OR (pg_column_size(details) <= 4096))
);
