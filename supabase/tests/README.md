# Supabase server-side tests (pgTAP)

This directory holds **transaction-wrapped** SQL/pgTAP regression suites that
cover RLS, triggers, and policy interactions which cannot be exercised from
the anon-only Vitest harness in `src/__tests__/security/`.

## Running locally

```bash
supabase start          # boots local Postgres + applies migrations
supabase test db        # discovers every *.test.sql in this directory
```

Each test file:
- Begins with `BEGIN;` and ends with `ROLLBACK;` so no rows persist.
- Loads `\i supabase/seed-tests/tests_helpers.sql` to get
  `tests_helpers.become(uuid)`, `become_anon()`, `become_service()`.
- Calls `SELECT plan(N)` and `SELECT * FROM finish()` from `pgtap`.

## CI

pgTAP is **not** wired into `.github/workflows/code-audit.yml` yet. The
harness is checked in so the documented `TODO_GAP_*` markers in
`businesses_sensitive_rls.test.sql` are visible and runnable on demand by any
developer. The required-in-CI flip happens in phase **R4E-TESTS-APPLY-2B**
after the gap-closure migrations (R4E-TESTS-APPLY-2C) land.

## Documented gaps tracked here

| ID | File | Description |
|----|------|-------------|
| G1 | `businesses_sensitive_rls.test.sql` T12 | Bulk admin mutation has no DB-level `admin_activity_log` trigger. |
| G2 | T10 | Sole-owner `business_staff` delete is guarded only in React. |
| G3 | T11e, T13 | `businesses.membership_tier` writes are not gated by `provider_subscriptions` state. |
| G4 | T1, T3, T4 | Owner can self-write `is_verified`, `is_demo`, `approval_status` due to missing column-level grants on `Users can update their own business`. |
| G5 | T5b | Owner can re-key own `businesses.user_id` (ownership-transfer guard missing). |

Each gap is wrapped in `todo_start(...)` / `todo_end()` so pgTAP records them
as **expected failures** rather than hard failures while the policy/trigger
migrations are designed.