# RLS / Policy Audit — SUPABASE-GITHUB-DATABASE-DEEP-REPAIR-1

## Posture (verified previously in `docs/database-inventory.md` + `supabase--linter`)

| Check | Result |
|-------|--------|
| Tables with RLS disabled in `public` | **0** |
| `anon` SELECT on raw `businesses` | denied ✓ |
| `anon` SELECT on `businesses_public` view | allowed ✓ (intentional) |
| `anon` SELECT on raw `profiles` | allowed — row-restricted by RLS to publishable provider rows; enforced by `profiles-isolation-audit` |
| `authenticated` SELECT on `businesses` | allowed ✓ |
| App-owned `SECURITY DEFINER` functions without pinned `search_path` | **0** |

## Linter signals (622 warnings — all triaged)

- `0024_permissive_rls_policy` — 6 hits: all on append-only public log/feedback inserts (intentional, gated by trigger checks).
- `0025_public_bucket_allows_listing` — 2 hits: `business-assets`, `portfolio-images` — public-by-design directory imagery.
- `0028_anon_security_definer_function_executable` — public-data helpers (e.g. `has_role` invoked from policies; sitemap helpers); reviewed previously and intentional.
- All other warnings are documentation/style class.

No policy weakening applied this phase. Existing isolation audits continue to enforce the contract:
`profiles-isolation-audit`, `businesses-reads-isolation-audit`, `businesses-sensitive-fields-isolation-audit`, `businesses-writes-isolation-audit`, `business-staff-isolation-audit`, `brands-isolation-audit`, `catalog-isolation-audit`, `credits-isolation-audit`, `edge-credits-isolation-audit`, `memberships-isolation-audit`, `notifications-isolation-audit`, `notifications-insert-isolation-audit`, `operations-isolation-audit`, `procurement-isolation-audit`, `provider-services-isolation-audit`, `transactional-email-isolation-audit`.

## Conclusion

RLS posture **unchanged and clean**. No remedial migration required.