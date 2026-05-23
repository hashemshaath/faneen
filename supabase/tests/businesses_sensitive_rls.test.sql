-- =============================================================================
-- businesses_sensitive_rls.test.sql  (R4E-TESTS-APPLY-2A)
--
-- Server-side RLS regression coverage for sensitive businesses /
-- business_staff mutations that the anon-client Vitest suite
-- (src/__tests__/security/businesses-sensitive-mutations.regression.test.ts)
-- cannot exercise — owner / stranger / admin scenarios.
--
-- Execution:
--   supabase start              # local
--   supabase test db            # runs every *.test.sql under supabase/tests/
--
-- NOTE: This file is wrapped in BEGIN/ROLLBACK and creates NO persistent rows.
--       It does NOT modify production schema or RLS. Known current gaps are
--       wrapped with pgTAP `todo_start` / `todo_end` so the suite documents
--       them without failing CI while the gap-closure migrations are designed.
--
-- TODO_GAP markers (see R4E dry runs):
--   G1 — CLOSED by R4E-2C-3 (trg_businesses_sensitive_audit): admin bulk
--        mutation writes one admin_activity_log row per affected business
--   G2 — CLOSED by R4E-2C-2 (trg_business_staff_last_owner_guard)
--   G3 — businesses.membership_tier writes bypass provider_subscriptions state
--   G4 — CLOSED by R4E-2C-1 (trg_businesses_sensitive_guard): owner cannot
--        self-write is_verified / approval_status / is_demo / is_active
--   G5 — CLOSED by R4E-2C-1: owner cannot re-key own businesses.user_id
--   G3 — CLOSED by R4E-2C-4-PHASE-4 (trg_businesses_membership_tier_guard):
--        direct businesses.membership_tier writes are blocked unless the
--        membership-owned RPC marker app.membership_rpc='1' is set.
-- =============================================================================

BEGIN;

\i supabase/seed-tests/tests_helpers.sql

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(35);

-- ---------------------------------------------------------------------------
-- SEED (as superuser; RLS bypassed for table owners)
-- ---------------------------------------------------------------------------
SELECT tests_helpers.become_service();

-- auth.users
INSERT INTO auth.users (id, email)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'stranger@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.local')
ON CONFLICT (id) DO NOTHING;

-- profiles (best-effort: profiles table is FK'd by user_id in some installs)
INSERT INTO public.profiles (user_id, email)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'stranger@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.local')
ON CONFLICT DO NOTHING;

-- admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('33333333-3333-3333-3333-333333333333', 'admin')
ON CONFLICT DO NOTHING;

-- owner businesses
INSERT INTO public.businesses (id, user_id, name_ar, is_active, approval_status, is_demo, is_verified, membership_tier)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'Biz A', true, 'draft', false, false, 'free'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '11111111-1111-1111-1111-111111111111',
   'Biz B', true, 'draft', false, false, 'free');
-- (trg_auto_add_business_owner is expected to insert business_staff owner rows)

-- ---------------------------------------------------------------------------
-- T1 — owner cannot self-set is_verified=true                  [TODO_GAP_G4]
-- ---------------------------------------------------------------------------
SELECT tests_helpers.become('11111111-1111-1111-1111-111111111111');

SELECT throws_ok(
  $$ UPDATE public.businesses SET is_verified = true
     WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501', NULL,
  'T1 owner cannot self-set is_verified=true (R4E-2C-1 trigger)'
);

-- ---------------------------------------------------------------------------
-- T2 — stranger cannot flip is_active on owner business
-- ---------------------------------------------------------------------------
SELECT tests_helpers.become('22222222-2222-2222-2222-222222222222');
SELECT is_empty(
  $$ UPDATE public.businesses SET is_active = false
     WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING id $$,
  'T2 stranger cannot flip is_active'
);

-- ---------------------------------------------------------------------------
-- T3 — owner cannot set is_demo=true                            [TODO_GAP_G4]
-- ---------------------------------------------------------------------------
SELECT tests_helpers.become('11111111-1111-1111-1111-111111111111');
SELECT throws_ok(
  $$ UPDATE public.businesses SET is_demo = true
     WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501', NULL,
  'T3 owner cannot self-set is_demo=true (R4E-2C-1 trigger)'
);

-- ---------------------------------------------------------------------------
-- T4 — owner cannot self-approve                                 [TODO_GAP_G4]
-- ---------------------------------------------------------------------------
SELECT throws_ok(
  $$ UPDATE public.businesses SET approval_status = 'approved'
     WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501', NULL,
  'T4 owner cannot self-set approval_status=approved (R4E-2C-1 trigger)'
);

-- ---------------------------------------------------------------------------
-- T5 — stranger cannot update businesses.user_id
-- ---------------------------------------------------------------------------
SELECT tests_helpers.become('22222222-2222-2222-2222-222222222222');
SELECT is_empty(
  $$ UPDATE public.businesses
     SET user_id = '22222222-2222-2222-2222-222222222222'
     WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING id $$,
  'T5 stranger cannot re-key businesses.user_id'
);

-- T5b — owner cannot re-key own business.user_id                [TODO_GAP_G5]
SELECT tests_helpers.become('11111111-1111-1111-1111-111111111111');
SELECT throws_ok(
  $$ UPDATE public.businesses
     SET user_id = '22222222-2222-2222-2222-222222222222'
     WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501', NULL,
  'T5b owner cannot transfer own businesses.user_id (R4E-2C-1 trigger)'
);

-- ---------------------------------------------------------------------------
-- T6 — stranger cannot insert business_staff
-- ---------------------------------------------------------------------------
SELECT tests_helpers.become('22222222-2222-2222-2222-222222222222');
SELECT throws_ok(
  $$ INSERT INTO public.business_staff(business_id, user_id, role, is_active)
     VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
             '22222222-2222-2222-2222-222222222222',
             'manager', true) $$,
  NULL, NULL,
  'T6 stranger insert business_staff rejected'
);

-- ---------------------------------------------------------------------------
-- T7 — stranger cannot update business_staff.role
-- ---------------------------------------------------------------------------
SELECT is_empty(
  $$ UPDATE public.business_staff SET role = 'owner'
     WHERE business_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING id $$,
  'T7 stranger cannot update business_staff.role'
);

-- ---------------------------------------------------------------------------
-- T8 — stranger cannot update business_staff.is_active
-- ---------------------------------------------------------------------------
SELECT is_empty(
  $$ UPDATE public.business_staff SET is_active = false
     WHERE business_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING id $$,
  'T8 stranger cannot update business_staff.is_active'
);

-- ---------------------------------------------------------------------------
-- T9 — stranger cannot delete business_staff row
-- ---------------------------------------------------------------------------
SELECT is_empty(
  $$ DELETE FROM public.business_staff
     WHERE business_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' RETURNING id $$,
  'T9 stranger cannot delete business_staff row'
);

-- ---------------------------------------------------------------------------
-- T10 — sole-owner business_staff guard (R4E-2C-2)
-- ---------------------------------------------------------------------------
SELECT tests_helpers.become('11111111-1111-1111-1111-111111111111');

-- T10a: DELETE sole owner → reject (23514)
SELECT throws_ok(
  $$ DELETE FROM public.business_staff
     WHERE business_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
       AND role = 'owner' $$,
  '23514', NULL,
  'T10a sole-owner DELETE rejected (R4E-2C-2 trigger)'
);

-- T10b: deactivate sole owner → reject (23514)
SELECT throws_ok(
  $$ UPDATE public.business_staff SET is_active = false
     WHERE business_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
       AND role = 'owner' $$,
  '23514', NULL,
  'T10b sole-owner deactivate rejected (R4E-2C-2 trigger)'
);

-- T10c: demote sole owner → reject (23514)
SELECT throws_ok(
  $$ UPDATE public.business_staff SET role = 'manager'
     WHERE business_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
       AND role = 'owner' $$,
  '23514', NULL,
  'T10c sole-owner demote rejected (R4E-2C-2 trigger)'
);

-- T10d: with a second active owner present, removing the original owner is allowed.
INSERT INTO public.business_staff(business_id, user_id, role, is_active)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '33333333-3333-3333-3333-333333333333', 'owner', true);

SELECT lives_ok(
  $$ DELETE FROM public.business_staff
     WHERE business_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
       AND user_id = '11111111-1111-1111-1111-111111111111'
       AND role = 'owner' $$,
  'T10d second active owner present → original owner DELETE allowed'
);

-- ---------------------------------------------------------------------------
-- T11 — admin baseline: allowed sensitive operations
-- ---------------------------------------------------------------------------
SELECT tests_helpers.become('33333333-3333-3333-3333-333333333333');

SELECT isnt_empty(
  $$ UPDATE public.businesses SET is_verified = true
     WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING id $$,
  'T11a admin can set is_verified=true');
SELECT isnt_empty(
  $$ UPDATE public.businesses SET approval_status = 'approved'
     WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING id $$,
  'T11b admin can set approval_status=approved');
SELECT isnt_empty(
  $$ UPDATE public.businesses SET is_demo = true
     WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING id $$,
  'T11c admin can set is_demo=true');
SELECT isnt_empty(
  $$ UPDATE public.businesses SET is_active = false
     WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING id $$,
  'T11d admin can set is_active=false');
-- T11e — direct admin write of membership_tier WITHOUT marker is now rejected
-- by trg_businesses_membership_tier_guard (R4E-2C-4-PHASE-4 closes G3).
SELECT throws_ok(
  $$ UPDATE public.businesses SET membership_tier = 'platinum'
     WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  '42501', NULL,
  'T11e admin direct membership_tier write rejected without app.membership_rpc marker (G3 closed)');

-- ---------------------------------------------------------------------------
-- T12 — bulk admin mutation writes one admin_activity_log per business   [G1]
-- ---------------------------------------------------------------------------
-- Reset both businesses then bulk-flip is_active and count log rows.
UPDATE public.businesses SET is_active = true
 WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- T12a — bulk admin update writes exactly one admin_activity_log row per row,
-- carrying the changed field in details->'changed_fields'.
WITH bulk AS (
  UPDATE public.businesses SET is_verified = true
   WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
   RETURNING id
)
SELECT count(*) FROM bulk;

SELECT results_eq(
  $$ SELECT count(*)::bigint FROM public.admin_activity_log
      WHERE action = 'business_sensitive_update'
        AND entity_type = 'business'
        AND entity_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
        AND details -> 'changed_fields' ? 'is_verified' $$,
  $$ VALUES (2::bigint) $$,
  'T12a bulk admin update writes one audit row per business with is_verified change'
);

-- T12b — UPDATE on a non-tracked field does NOT write an audit row.
UPDATE public.businesses SET name_ar = COALESCE(name_ar, 'biz-a') || ' '
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

SELECT results_eq(
  $$ SELECT count(*)::bigint FROM public.admin_activity_log
      WHERE action = 'business_sensitive_update'
        AND entity_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
        AND details -> 'changed_fields' ? 'name_ar' $$,
  $$ VALUES (0::bigint) $$,
  'T12b non-tracked field update writes no admin_activity_log row'
);

-- T12c — NULL auth.uid() (service-role / migration context) skips the audit
-- insert because admin_activity_log.user_id is NOT NULL and no sentinel is
-- invented.
SELECT tests_helpers.become_service();

UPDATE public.businesses SET is_demo = true
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

SELECT results_eq(
  $$ SELECT count(*)::bigint FROM public.admin_activity_log
      WHERE action = 'business_sensitive_update'
        AND entity_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
        AND details -> 'changed_fields' ? 'is_demo' $$,
  $$ VALUES (0::bigint) $$,
  'T12c service-role / NULL auth.uid() does not insert admin_activity_log'
);

-- Restore admin context for any downstream tests in this file.
SELECT tests_helpers.become('33333333-3333-3333-3333-333333333333');

-- ---------------------------------------------------------------------------
-- T13 — membership_tier enforcement trigger (G3 CLOSED by R4E-2C-4-PHASE-4)
-- ---------------------------------------------------------------------------
-- Direct admin UPDATE of membership_tier without the membership RPC marker is
-- rejected with SQLSTATE 42501. Setting the marker explicitly (the documented
-- migration/service escape hatch) lets the write through. Same-tier writes
-- always pass because the guard only fires on IS DISTINCT FROM changes.

-- T13a — direct admin tier change WITHOUT marker is rejected
SELECT throws_ok(
  $$ UPDATE public.businesses SET membership_tier = 'premium'
     WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '42501', NULL,
  'T13a direct membership_tier change rejected without app.membership_rpc marker'
);

-- T13b — same-tier UPDATE (no actual change) is allowed
SELECT lives_ok(
  $$ UPDATE public.businesses
        SET membership_tier = membership_tier
      WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'T13b same-tier UPDATE passes guard (IS DISTINCT FROM check)'
);

-- T13c — explicit marker (migration/service escape hatch) allows the change
SELECT lives_ok(
  $$ SELECT set_config('app.membership_rpc','1',true);
     UPDATE public.businesses SET membership_tier = 'premium'
      WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'T13c direct UPDATE allowed when app.membership_rpc=1 marker is set'
);

-- ---------------------------------------------------------------------------
-- T14 — businesses_public round-trip (expected PASS today)
-- ---------------------------------------------------------------------------
-- Setup: publish Biz B and confirm anon sees it; then flip each gate.
SELECT tests_helpers.become('33333333-3333-3333-3333-333333333333');
UPDATE public.businesses
   SET is_active = true, is_demo = false, approval_status = 'published'
 WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT tests_helpers.become_anon();
SELECT isnt_empty(
  $$ SELECT 1 FROM public.businesses_public
     WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'T14-baseline anon can see published business');

-- is_active=false hides
SELECT tests_helpers.become('33333333-3333-3333-3333-333333333333');
UPDATE public.businesses SET is_active = false
 WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SELECT tests_helpers.become_anon();
SELECT is_empty(
  $$ SELECT 1 FROM public.businesses_public
     WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'T14a is_active=false hides from businesses_public');

-- is_demo=true hides
SELECT tests_helpers.become('33333333-3333-3333-3333-333333333333');
UPDATE public.businesses SET is_active = true, is_demo = true
 WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SELECT tests_helpers.become_anon();
SELECT is_empty(
  $$ SELECT 1 FROM public.businesses_public
     WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'T14b is_demo=true hides from businesses_public');

-- approval_status<>'published' hides
SELECT tests_helpers.become('33333333-3333-3333-3333-333333333333');
UPDATE public.businesses SET is_demo = false, approval_status = 'draft'
 WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SELECT tests_helpers.become_anon();
SELECT is_empty(
  $$ SELECT 1 FROM public.businesses_public
     WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'T14c approval_status!=published hides from businesses_public');

-- ---------------------------------------------------------------------------
SELECT * FROM finish();
ROLLBACK;