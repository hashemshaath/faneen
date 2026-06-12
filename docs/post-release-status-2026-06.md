# Post-Release Status — Qitaat (2026-06)

_Internal status snapshot covering Phase B closeout, the production release,
and the post-release cleanup audit._

## Closed gates

- `PHASE B FULL CLOSEOUT PASS` — full suite `598/598` test files,
  `6801/6801` tests, `tsc --noEmit` clean.
- `PRODUCTION RELEASE GATE PASS` — release-ready after Phase B verification.
- `DEPLOYMENT ENV CHECK PASS — PUBLISH NOW` — required production secrets
  present (presence-only verification; values were never read or printed).
- `QITAAT PRODUCTION RELEASED` — apex, `www`, and `qitaat.lovable.app` all
  serving 200 with current deployment id.
- `POST-PUBLISH PRODUCTION SMOKE PASS WITH NOTES` — all public/admin smoke
  routes 200; `businesses_public.user_id` leak guard active; sitemap edge
  function index lists 13 child sitemaps including `type=rentals` after
  redeploy.
- `POST-PUBLISH SITEMAP EDGE RENTALS HOTFIX PASS` — `supabase/functions/sitemap`
  redeployed; production XML cached up to `s-maxage=86400` and auto-refreshes.
- `POST-RELEASE FULL CLEANUP & DECOMMISSION AUDIT COMPLETE — NO DELETE YET`
  — no safe-delete production code identified, no DROP candidate approved,
  all deletes deferred to Phase C4/C5 after `pg_depend` review and backup.

## Current project counters (snapshot)

- Migrations under `supabase/migrations/`: **566**
- Edge function directories under `supabase/functions/`: **80** (1 = `_shared`,
  **79** deployed)
- Storage buckets: **11** (see `docs/database-inventory.md`)

These counters supersede the older `421 / 58` snapshots that still appear in
earlier audit documents — those documents have been annotated to mark the
older numbers as historical.

## Do-not-remove list (until Phase C4/C5)

The following items were re-confirmed during the cleanup audit as still
required for guards, public contracts, or audit reasons. They look "legacy"
by name but must not be deleted in C1–C3:

- `src/pages/admin/AdminLegacyTaxonomyReplaced.tsx` — renders the
  replacement notice for retired `/admin/categories` and `/admin/tags`
  routes. Removing the file breaks the redirect-style notice.
- `src/components/home/v2/HomeV2.tsx` and the `home/v2` data tree —
  actively rendered home surface.
- `src/pages/BrandDetailLegacy.tsx` — still routed for backward-compatible
  brand detail URLs.
- `taxonomy_legacy_mappings` table — required by taxonomy migration guards.
- `businesses_public` view — public-data masking contract, covered by the
  user-id leak regression guard.
- Any `qitaat_legacy_*` localStorage flag (e.g.
  `qitaat_legacy_cleanup_v1_done`, `qitaat_legacy_accent_cleanup_v1_done`)
  — they gate one-time client cleanups; renaming them re-fires the cleanup
  for every user.
- `legacy`-named constants/exports referenced by tests or guards (renaming
  any of these breaks the regression suite).

## Next phases

| Phase | Scope | Status |
|---|---|---|
| C1 | Documentation + comment cleanup, zero behaviour change | **in progress** (this document) |
| C2 | Safe dead test/source cleanup after grep + guard review | not started |
| C3 | Wrapper consolidation (e.g. `<AdminRoute>` migration) | not started |
| C4 | DB deprecation plan (rename → wait → drop) with `pg_depend` review | not started |
| C5 | Migration/drop execution after verified backup | not started |
| C6 | Post-cleanup production smoke | not started |

## Outstanding operator confirmations (non-blocking)

- Moyasar keys: live vs test mode confirmation.
- `GOOGLE_MAPS_API_KEY` edge secret: provisioning confirmation.

Neither blocks the current release — both are tracked here so a future
rotation or environment check can pick them up.