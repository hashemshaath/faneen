# RPC / Function Audit — SUPABASE-GITHUB-DATABASE-DEEP-REPAIR-1

## Posture

- **400 functions** in `public` schema (see `docs/database-inventory.md`).
- App-owned `SECURITY DEFINER` functions with unpinned `search_path`: **0** (verified by `has_function_privilege` + linter).
- All admin-only RPCs (`admin_search_users_for_transfer`, `admin_create_business_with_owner`, `admin_adjust_provider_credits`, etc.) gate via `has_role(auth.uid(), 'admin' | 'super_admin')` and revoke `PUBLIC` execute.
- Credits domain enforces server-side wrappers — direct calls to `consume_provider_lead_credit`, `grant_monthly_provider_credit`, `admin_adjust_provider_credits`, and `provider_lead_credit_transactions` are blocked by `credits-isolation-audit` and `edge-credits-isolation-audit`.
- `has_role` is `STABLE SECURITY DEFINER SET search_path = public` — pattern compliant.

## Findings

| Category | Count | Action |
|----------|-------|--------|
| Functions missing pinned `search_path` | 0 | — |
| Functions with unsafe `GRANT ALL ON FUNCTION ... TO PUBLIC` | 0 | — |
| Stale function bodies referencing legacy "Faneen" copy | 0 | — |
| Broken signatures used by edge functions or UI wrappers | 0 (covered by `src/__tests__/supabaseFunctionsInventory.test.ts`, RPC contract tests in `src/modules/users/__tests__/adminSearchUsersForTransferMigration.source.test.ts`, etc.) | — |

## Conclusion

No fixes required.