# Supabase Linter Triage

Snapshot history:
- STABILITY-HARDENING-1: 421 issues.
- SUPABASE-LINTER-HARDENING-1: **418 issues** (−3 ERROR fixes; see below).

## Triage policy

Per owner instruction, only items that materially block production launch are
fixed here. Pre-existing legacy warnings are documented but deferred to a
dedicated security-hardening track to avoid destabilizing launch-ready flows.

## Category breakdown (high level)

| Lint code | Level | Count (approx.) | Class | Action |
|-----------|-------|------------------|-------|--------|
| 0008 RLS Enabled No Policy | INFO | 1 | Inactive/staging table | Defer (P3) |
| 0010 Security Definer View | ERROR | 0 | Fixed in SUPABASE-LINTER-HARDENING-1 | Resolved |
| 0011 Function Search Path Mutable | WARN | many | Mostly legacy helpers | P2 — gradual hardening |
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

## What is NOT acceptable

- Any new table created in `public` without explicit `GRANT` + RLS policy.
- Any new public-write policy with `USING (true)` or `WITH CHECK (true)`.
- Any new SECURITY DEFINER function without `SET search_path = public`.

These rules are already enforced by the project's CI isolation audits.

## Next phases (not in scope here)

1. Sweep `0011` functions and add `SET search_path = public` per function in
   small migrations (10–20 at a time), starting with anon-callable
   SECURITY DEFINER functions, with vitest re-run between batches.
2. Re-audit `0025` public buckets and decide whether to scope listing per
   folder for brand-assets / showcase (low value, low risk).
3. Annual review of 0028 RPCs against the actual `/r/:refId` and contact
   flows to confirm anon exposure is still required.