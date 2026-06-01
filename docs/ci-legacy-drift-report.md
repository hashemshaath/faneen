# CI Legacy Drift Report — CI-LEGACY-DRIFT-REPAIR-1

Date: 2026-06-01
Status: **PASS** — all CI checks green, no remaining drift.

## Failure inventory (re-run of all CI scripts)

| Check | Result | Classification |
|---|---|---|
| `npm ci` | ✅ pass | lockfile in sync (regenerated in prior phase) |
| `npx tsc --noEmit` | ✅ pass | — |
| `npx vitest run` | ✅ 5839/5839 | — |
| `jsonld-snapshot-audit.mjs` | ✅ 62/62 checks | stale `TopProvidersSection.tsx` fixture already pruned |
| `sitemap-integrity-audit.mjs` | ✅ pass | `help` sub-sitemap added to `public/sitemap.xml` in prior phase |
| `robots-sitemap-sync-audit.mjs` | ✅ pass | — |
| `broken-links-audit.mjs` | ✅ 0/85 | — |
| `brand-audit.mjs` (Faneen/فنيين) | ✅ pass | only allowed allow-listed references remain (cleanup code in `main.tsx`, audit script itself, guard tests) |

## Residual legacy references — all intentional

| Reference | Location | Why retained |
|---|---|---|
| `cleanupLegacyFaneenStorage()` | `src/main.tsx` | One-time `localStorage` cleanup for migrated users — must remain until flag `qitaat_legacy_cleanup_v1_done` saturates. |
| `Faneen` / `فنيين` patterns | `scripts/brand-audit.mjs`, `src/tests/supabaseDatabaseDeepRepair1.test.ts` | The audit + its guard test must literally contain the strings they forbid. |
| `TopProvidersSection.tsx` mention | `src/modules/businesses/services/__tests__/publicReadWrappers.test.ts`, `src/__tests__/homeDeadCodeCleanup.test.ts`, source-comment in `listTopPublicProviders.ts` | Tests already handle missing file (`if (src === null) return`); the dead-code test asserts removal. No fixture restoration required. |
| `/dashboard/business` | `useVisibleModules`, `HelpLauncherFloating`, `nextBestAction` | Current route — `/dashboard/business` and `/dashboard/business-edit` both exist as live routes. |

## Repairs applied in this phase

- Documentation: this report + `docs/ci-audit-fixture-ownership.md`.
- Guard test: `src/tests/ciLegacyDriftRepair1.test.ts` to prevent regression of the fixes shipped in the prior phase (lockfile xlsx entries, sitemap `help` type, fixture-ownership doc presence, fixtures-exist invariant).

No source code, no audit logic, no SEO checks were weakened.

## CI status

GitHub CI should now pass. The Node 20 deprecation warning on `actions/upload-artifact@v3` remains backlogged (non-blocking).