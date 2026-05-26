-- SUPABASE-LINTER-HARDENING-1: Convert 3 public read-only views from
-- SECURITY DEFINER to security_invoker=on. The underlying tables already
-- have RLS policies whose SELECT filters match each view's WHERE clause,
-- so the visible row set is unchanged for anon/authenticated/admin/staff.
--
-- Resolves linter 0010 (Security Definer View) for these views.
-- No grants or policies are modified.

ALTER VIEW public.businesses_public SET (security_invoker = on);
ALTER VIEW public.business_branches_public SET (security_invoker = on);
ALTER VIEW public.category_public_counts SET (security_invoker = on);
