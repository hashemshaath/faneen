# Supabase Migration Chain Audit — SUPABASE-GITHUB-DATABASE-DEEP-REPAIR-1

## Method
- Enumerated all 421 migrations under `supabase/migrations/`.
- Checked timestamps for duplicates and ordering.
- Scanned for unsafe drops, RLS disabling, legacy naming.

## Results

| Check | Result | Severity |
|-------|--------|----------|
| Duplicate timestamps | **0** | — |
| Out-of-order filenames | **0** | — |
| `DROP TABLE` without `IF EXISTS` against app tables | **0** | — |
| `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` on `public.*` | **0** | — |
| `DELETE FROM auth.*` | **0** | — |
| Legacy `faniyeen` / `fanyeen` / `faneyeen` strings | **0** | — |
| Legacy `faneen` strings (historical-only) | **4** (`localStorage_faneen_to_qitaat` migration keys + a marketing brand-name blocklist row) | historical only |
| Legacy Arabic `فنيين` strings | **0** | — |
| Repeated enum creation without `IF NOT EXISTS`/guard | **0** flagged at audit time |
| Functions redefined via `CREATE OR REPLACE` | expected (idempotent forward fixes) | — |

## Findings (classified)

1. **`faneen` references in migrations** — _historical only_.
   - Three migrations reference the `localStorage_faneen_to_qitaat` migration-key string used by the one-time client-side cleanup. Removing these would break the audit trail.
   - One marketing brand-name blocklist row (`('faneen','brand')`) intentionally prevents the old brand from being re-registered.
   - **Action: keep as-is.**

2. **No critical or high findings.** All 622 Supabase linter warnings are tracked in `docs/supabase-linter-triage.md`; none indicate a broken migration chain.

## Allowed repairs applied

None required. Migration chain is already clean and forward-only.

## Disallowed actions explicitly avoided

- Did not edit any applied migration.
- Did not delete any migration.
- Did not reset the database.