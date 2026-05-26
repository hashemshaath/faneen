# Supabase Linter Triage

Snapshot history:
- STABILITY-HARDENING-1: 421 issues.
- SUPABASE-LINTER-HARDENING-1: **418 issues** (−3 ERROR fixes; see below).
- SUPABASE-LINTER-HARDENING-2: **416 issues** (−2 `public.*` search_path pinned).
- SUPABASE-LINTER-HARDENING-4: **415 issues** (−1 0008 sealed-table policy added).

## Triage policy

Per owner instruction, only items that materially block production launch are
fixed here. Pre-existing legacy warnings are documented but deferred to a
dedicated security-hardening track to avoid destabilizing launch-ready flows.

## Category breakdown (high level)

| Lint code | Level | Count (approx.) | Class | Action |
|-----------|-------|------------------|-------|--------|
| 0008 RLS Enabled No Policy | INFO | 0 | Fixed in SUPABASE-LINTER-HARDENING-4 (explicit deny-all on `auth_temporary_login_codes`) | Resolved |
| 0010 Security Definer View | ERROR | 0 | Fixed in SUPABASE-LINTER-HARDENING-1 | Resolved |
| 0011 Function Search Path Mutable | WARN | ~150 in reserved schemas, 0 in `public` | All remaining are in `extensions`, `pgmq`, `storage`, `realtime`, `net`, `cron`, `auth`, `vault`, `graphql_public` — owned by Supabase, must not be modified per project rules | Accepted |
| 0024 RLS Policy Always True (write) | WARN | 4 | Verified: anon telemetry inserts only (badge_clicks/impressions/conversions, provider_landing_metrics) | Accepted |
| 0025 Public Bucket Allows Listing | WARN | 2 | Public image buckets (profile/marketing); already masked | P2 — accepted risk |
| 0028 Anon Can Execute SECURITY DEFINER Function | WARN | many | Intentional public RPCs (lookup_by_reference, public_resolve_*) | P3 — by design |

## Production-risk verdict

- All `ERROR`-level findings are resolved.
- 0024 findings audited and confirmed as intentional anonymous telemetry
  inserts; tables hold no PII and are append-only counters.
- 0025 buckets are intentionally public (logos, covers, portfolio, blog,
  showcase, brand-assets); listing is acceptable since the served content is
  meant to be discoverable.
- 0028 findings cover public RPCs required by `/r/:refId`, contact form,
  quote submission, barcode resolve, and onboarding — revoking anon would
  break public flows.
- 0011 sweep deferred to a dedicated batch track to avoid touching
  trigger-bound legacy helpers without per-function review.

## SUPABASE-LINTER-HARDENING-1 changes

| Object | Action | Reason it is safe |
|--------|--------|-------------------|
| `public.businesses_public` | `security_invoker = on` | Underlying `businesses` policy "Public can read published active businesses" matches the view's `is_active AND published AND NOT is_demo` filter for anon and additionally grants owner/staff/admin rows. |
| `public.business_branches_public` | `security_invoker = on` | Underlying `business_branches` policy "Active branches are publicly readable" allows `is_active = true OR admin OR staff`, matching the view's filter. |
| `public.category_public_counts` | `security_invoker = on` | View aggregates over `businesses_public` + `business_services` + `categories`, all of which have public SELECT policies. |

No grants, policies, or column lists were changed. Visible row sets are
identical to before for every role.

## SUPABASE-LINTER-HARDENING-2 changes (Batch 1)

| Function | Callable by | Risk | Action | Why safe | Test coverage |
|----------|-------------|------|--------|----------|---------------|
| `public.jsonb_diff(jsonb, jsonb)` | anon, authenticated (SECURITY INVOKER) | Mutable search_path on a SQL helper that touches only `pg_catalog` built-ins (`jsonb_each`, `jsonb_object_agg`, `jsonb_build_object`) | `ALTER FUNCTION … SET search_path = public` | No table references in the body; `pg_catalog` is always implicitly on the search_path; pinning to `public` does not change name resolution. | `supabaseLinterHardening2.searchPath.test.ts` + existing audit triggers that call it. |
| `public.tg_sanitize_visit_log_metadata()` | trigger (BEFORE INSERT/UPDATE on visit logs) | Mutable search_path on a trigger that validates `NEW.metadata` JSON keys against a hardcoded banned list | `ALTER FUNCTION … SET search_path = public` | Body uses only built-in `jsonb_typeof`, ARRAY/FOREACH, RAISE — no schema-qualified references. Behavior is purely validation, no DML. | Same regression test + existing visit-log insert tests that exercise the trigger path. |

All other 0011 findings live in Supabase-reserved schemas. Per project rules,
those schemas must not be modified by the app. They are tracked as **Accepted
(out of scope)**.

## SUPABASE-LINTER-HARDENING-4 changes

| Object | Action | Reason it is safe |
|--------|--------|-------------------|
| `public.auth_temporary_login_codes` | Added `CREATE POLICY … FOR ALL TO public USING (false) WITH CHECK (false)` | Table stores hashed one-time login codes; original migration already `REVOKE ALL … FROM PUBLIC, anon, authenticated`. All access goes through SECURITY DEFINER RPCs which bypass RLS as the function owner. The new policy makes the sealed intent explicit and clears linter 0008 without changing behavior. |

No grants, columns, or RPC bodies were touched. PostgREST cannot reach the
table (no grant); a hypothetical privileged-role direct query now hits an
explicit `false` predicate instead of the implicit RLS deny.

## What is NOT acceptable

- Any new table created in `public` without explicit `GRANT` + RLS policy.
- Any new public-write policy with `USING (true)` or `WITH CHECK (true)`.
- Any new SECURITY DEFINER function without `SET search_path = public`.

These rules are already enforced by the project's CI isolation audits.

## Next phases (not in scope here)

1. Re-audit `0025` public buckets and decide whether to scope listing per
   folder for brand-assets / showcase (low value, low risk).
2. Annual review of 0028 RPCs against the actual `/r/:refId` and contact
   flows to confirm anon exposure is still required.
3. Re-evaluate the single 0008 inactive-table finding and either add a policy
   or drop the table.