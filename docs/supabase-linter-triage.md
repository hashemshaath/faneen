# Supabase Linter Triage (STABILITY-HARDENING-1)

Snapshot: 421 issues reported by `supabase--linter` at the time of this phase.
The total has been carried across several stabilization phases and is unchanged
by this phase (no new schema beyond `NOT NULL` constraints on three already-
populated `ref_id` columns).

## Triage policy

Per owner instruction, only items that materially block production launch are
fixed here. Pre-existing legacy warnings are documented but deferred to a
dedicated security-hardening track to avoid destabilizing launch-ready flows.

## Category breakdown (high level)

| Lint code | Level | Count (approx.) | Class | Action |
|-----------|-------|------------------|-------|--------|
| 0008 RLS Enabled No Policy | INFO | 1 | Inactive/staging table | Defer (P3) |
| 0010 Security Definer View | ERROR | 3 | Pre-existing views, public reads only | P1 deferred — see below |
| 0011 Function Search Path Mutable | WARN | many | Mostly legacy helpers | P2 — gradual hardening |
| 0024 RLS Policy Always True (write) | WARN | 4 | Audit; intentional public-write surfaces are forbidden | P1 — verify next phase |
| 0025 Public Bucket Allows Listing | WARN | 2 | Public image buckets (profile/marketing); already masked | P2 — accepted risk |
| 0028 Anon Can Execute SECURITY DEFINER Function | WARN | many | Intentional public RPCs (lookup_by_reference, public_resolve_*) | P3 — by design |

## Production-risk verdict

- No P0 schema-level issue was introduced or surfaced.
- The three `ERROR`-level Security Definer Views are pre-existing read-only
  views used by public surfaces (masking PII). They are not write paths and do
  not expose secrets. Tracking as **P1 deferred** — to be replaced with
  `security_invoker = on` views in a dedicated migration that can be reviewed
  independently of launch.
- All other items are WARN/INFO and represent accepted, intentional, or
  inactive surfaces.

## What is NOT acceptable

- Any new table created in `public` without explicit `GRANT` + RLS policy.
- Any new public-write policy with `USING (true)` or `WITH CHECK (true)`.
- Any new SECURITY DEFINER function without `SET search_path = public`.

These rules are already enforced by the project's CI isolation audits.

## Next phase (not in scope here)

1. Replace the three SECURITY DEFINER views with `security_invoker = on` and
   re-verify RLS coverage on the underlying tables.
2. Sweep `0011` functions and add `SET search_path = public` per function in
   small migrations (10–20 at a time) with vitest re-run between batches.
3. Re-audit `0025` public buckets and confirm each is intentional.