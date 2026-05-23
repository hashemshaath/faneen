-- =============================================================================
-- tests_helpers.sql
--
-- Test-only helpers for impersonating Supabase JWT roles inside a
-- transaction-wrapped pgTAP suite. Lives under supabase/seed-tests/ so it is
-- NEVER auto-applied to production (Supabase only auto-runs supabase/migrations).
--
-- These helpers must be loaded explicitly at the top of each test file via
--   \i supabase/seed-tests/tests_helpers.sql
-- They are created in a dedicated schema and dropped on ROLLBACK.
--
-- Auth simulation method (documented per R4E-TESTS-APPLY-2 plan):
--   - We rely on the Supabase RLS recipe of setting both `role` and
--     `request.jwt.claims` via `set_config(..., true)` (transaction-scoped).
--   - `auth.uid()` reads `request.jwt.claims ->> 'sub'`, so impersonation is
--     consistent for any RLS policy that uses `auth.uid()`.
--   - `tests_helpers.become_service()` switches back to a superuser-equivalent
--     role for seed/teardown blocks only — never used to assert RLS behaviour.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS tests_helpers;

CREATE OR REPLACE FUNCTION tests_helpers.become(_uid uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', _uid::text, 'role', 'authenticated')::text,
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION tests_helpers.become_anon() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
END;
$$;

CREATE OR REPLACE FUNCTION tests_helpers.become_service() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  -- Used only for seed/teardown blocks (bypasses RLS as table owner).
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
END;
$$;