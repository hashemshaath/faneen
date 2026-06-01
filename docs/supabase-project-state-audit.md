# Supabase Project State Audit — SUPABASE-GITHUB-DATABASE-DEEP-REPAIR-1

_Read-only audit. No schema changes._

| Item | Value |
|------|-------|
| Project ref | `hckpxwhjycmdflaneihd` (Lovable Cloud, single live env) |
| Linked GitHub repo | yes (Lovable-managed two-way sync) |
| `supabase/config.toml` | present, only `project_id` + per-function `verify_jwt` overrides — no project-level edits |
| Local migration count | **421** files under `supabase/migrations/` |
| Earliest migration | `20260409170333_f84aa15a-bc86-4eb4-82ca-b525040bc9ca.sql` |
| Latest migration | `20260601133047_e987a1b7-b619-4749-b96d-692818a4ec32.sql` |
| Edge functions | **59** directories under `supabase/functions/` (1 = `_shared`, 58 deployed) — classified in `src/__tests__/supabaseFunctionsInventory.test.ts` |
| Generated types | `src/integrations/supabase/types.ts` — **18,586 lines**, includes RFQ brand picker columns, observability, help, brand_*, contracts, procurement, work_orders, memberships |
| Storage buckets | 11 — enumerated in `docs/database-inventory.md` |
| Linter findings | 622 (all triaged in `docs/supabase-linter-triage.md`; no ERROR-level RLS-disabled findings) |

## Drift risk summary

- No duplicate migration timestamps (verified via `awk -F_ '{print $1}' | sort | uniq -d`).
- Migration filenames sort in strict chronological order.
- `src/integrations/supabase/client.ts` matches `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID = hckpxwhjycmdflaneihd`).
- No `SUPABASE_SERVICE_ROLE_KEY` reference in `src/` runtime code (test sources only — assertion strings).
- `supabase/config.toml` contains exactly one `project_id`; no duplicate `config.toml` anywhere else in the tree.

## Conclusion

Project state is **clean**. No drift detected between repo and generated types. No repair migration required.