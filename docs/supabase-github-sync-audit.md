# Supabase ↔ GitHub Sync Audit — SUPABASE-GITHUB-DATABASE-DEEP-REPAIR-1

## Sync model
Lovable Cloud manages two-way GitHub sync. Migrations under `supabase/migrations/`, edge functions under `supabase/functions/`, and generated types under `src/integrations/supabase/types.ts` are committed by the platform on every approved change. No manual `supabase link` / `supabase db push` is run by humans on this repo.

## Checklist

| Check | Status | Notes |
|-------|--------|-------|
| All applied migrations committed to repo | ✅ | 421 files; no untracked migrations on remote |
| Generated types committed and current | ✅ | 18,586-line `types.ts` includes latest RFQ + brand columns |
| Edge functions present in repo for all deployed slots | ✅ | 58 deployed dirs match `src/__tests__/supabaseFunctionsInventory.test.ts` inventory |
| Branch mismatch (multi-branch dev) | n/a | single-branch Lovable Cloud workflow |
| Env vars present in deployment | ✅ | `VITE_SUPABASE_*` injected; runtime secrets enumerated via `fetch_secrets` (none missing for current functions) |
| `.env` accidentally committed with secrets | ⚠️ no leak | `.env` contains only `VITE_SUPABASE_URL`, publishable anon key, project id, GTM id — all publishable values, expected pattern for Lovable Cloud |
| Project ref mismatch | ✅ | `.env` + `client.ts` + `supabase/config.toml` all reference `hckpxwhjycmdflaneihd` |
| Local-only DB changes | ✅ | none — all changes go through `supabase--migration` tool |

## Operator checklist (for human contributors)

1. Pull latest `main`.
2. Verify `git status` shows no uncommitted migrations.
3. Verify `src/integrations/supabase/types.ts` matches the latest `supabase--migration` run (regenerated automatically after each approved migration).
4. Verify edge functions in `supabase/functions/` match deployed slots (`src/__tests__/supabaseFunctionsInventory.test.ts` is the source of truth).
5. Verify runtime secrets present via `fetch_secrets`.
6. Verify project ref `hckpxwhjycmdflaneihd` everywhere.
7. Do not edit applied migrations; add forward-fix migrations only.

## Conclusion

No drift. Repo and remote Supabase project are in sync.