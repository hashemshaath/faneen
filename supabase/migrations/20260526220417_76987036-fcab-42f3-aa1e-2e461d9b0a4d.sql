-- SUPABASE-LINTER-HARDENING-2 (Batch 1)
-- Pin search_path on the only two public-schema functions still flagged by
-- linter 0011. Both reference only built-ins (pg_catalog), so pinning to
-- `public` does not alter behavior. Bodies are not modified.

ALTER FUNCTION public.jsonb_diff(jsonb, jsonb) SET search_path = public;
ALTER FUNCTION public.tg_sanitize_visit_log_metadata() SET search_path = public;
