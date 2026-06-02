-- The masked public views were defined with security_invoker=on, which made the
-- underlying businesses RLS (authenticated-only) apply to anon callers and returned
-- empty rows. Switching to security_invoker=off lets PostgREST serve the view's
-- pre-filtered rows publicly; PII columns remain excluded from the view definition.
ALTER VIEW public.businesses_public SET (security_invoker = off);
ALTER VIEW public.business_branches_public SET (security_invoker = off);