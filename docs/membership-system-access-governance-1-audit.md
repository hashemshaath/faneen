# MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-1 — Audit & Implementation Report

## Decision: PARTIAL PASS (governance layer landed; admin UI deferred)

## 1. Current sources of truth (audit)

| Concern | Source | Notes |
|---|---|---|
| Module catalog | `public.system_modules` | active flag, `is_core`, `default_enabled` |
| Module visibility overrides | `public.system_module_overrides` (scope: `global_default` / `account_type` / `entity` / `user`) | trigger `fn_log_system_module_override` writes audit |
| Module audit | `public.system_module_audit_log` | actor, scope, prev/new, reason |
| Effective per-business access | `resolveEffectiveBusinessAccess()` + `useEffectiveBusinessAccess()` | merges business status → admin overrides → membership features |
| Membership plans | `public.membership_plans` (`features` jsonb, `limits` jsonb) | NO link to `system_modules` (gap closed) |
| Roles | `public.user_roles` + `has_role()` / `is_super_admin()` | super_admin distinct from admin |
| Membership UI visibility | `useMembershipVisibility()` | governs CTA + route guard |
| Service activation | `resolveServiceEntitlement` (`required_plan_tier`, `admin_status`) | unchanged |

## 2. Authority model (now enforced)

1. **Super Admin** — only role allowed to call `super_admin_set_business_module_override` and `super_admin_set_membership_plan_module`. Reason mandatory for per-business override.
2. **Admin** — retains existing `admin_set_module_override` (global / account-type / entity / user) but **cannot** mutate plan-level module matrix.
3. **Membership entitlement** — `membership_plan_modules` + existing `features`/`limits` jsonb.
4. **Business owner** — `owner_set_module_override` (existing) limited to `entity` and `user` scopes for owned business.
5. **System module visibility** — `system_modules.is_active` / `default_enabled`.

## 3. Synchronization (membership plan ↔ system access)

- New table `membership_plan_modules (plan_id, module_key, enabled)` with `UNIQUE(plan_id, module_key)`.
- RPC `list_membership_plan_modules(plan_id)` returns every active module with its effective enabled flag (defaults to `is_core OR default_enabled` when unset).
- Writes flow through `super_admin_set_membership_plan_module` only; the table has **no INSERT/UPDATE/DELETE policy** — all mutations require the SECURITY DEFINER RPC.
- Each plan/module mutation writes one row to `system_module_audit_log` with `scope_type='account_type'`, `scope_value='plan:<uuid>'` so the existing audit UI surfaces it automatically.
- Realtime invalidation: callers that already invalidate `['system-access', ...]` and `['membership-plans']` continue to work. Add `['membership-plan-modules', planId]` keys when admin UI lands.

## 4. Super-admin override

| Capability | RPC | Audit |
|---|---|---|
| Activate/deactivate a module for one business | `super_admin_set_business_module_override(_business_id, _module_key, _enabled, _reason)` | `system_module_audit_log` via existing trigger (scope=`entity`) |
| Include/exclude a module from a plan | `super_admin_set_membership_plan_module(_plan_id, _module_key, _enabled)` | explicit insert into `system_module_audit_log` |

Safety constraints enforced server-side:
- Reason required and non-empty for per-business override.
- `is_core` modules cannot be disabled.
- Unknown module / plan / business → exception.
- EXECUTE revoked from `public`; granted to `authenticated` (RPC body still gates on `is_super_admin`).

## 5. Audit log

Reuses existing `system_module_audit_log`. Fields: `action`, `module_key`, `scope_type`, `scope_value`, `previous_enabled`, `new_enabled`, `reason`, `actor`, `created_at`. No new audit table created (avoids duplication).

## 6. Files

**Created**
- `supabase/migrations/<ts>_membership_system_access_governance_1.sql`
- `src/tests/membershipSystemAccessGovernance1.test.ts`
- `docs/membership-system-access-governance-1-audit.md`

**Modified**
- `src/modules/systemAccess/index.ts` — three new helpers (`superAdminSetBusinessModuleOverride`, `superAdminSetMembershipPlanModule`, `listMembershipPlanModules`).

## 7. Tests

`src/tests/membershipSystemAccessGovernance1.test.ts` — 8 static guards covering: matrix table + RLS, super-admin override RPC + reason requirement, plan/module RPC + audit insert, core-module protection, read helper, client-side reason guard, plan-matrix helpers exposed, no direct write policies on the matrix table.

## 8. Remaining debt (next phase)

- Admin UI on `/admin/memberships` (per-plan module matrix editor) and `/admin/system-access` (per-business override panel) — intentionally deferred (governance/data-flow phase only).
- Plan numeric limits unchanged (not invented).
- Override expiry (not in scope; deferred).
- React Query key for `membership-plan-modules` to be wired when UI lands.
- Feature-gate fallback message when access blocked by `super-admin override` (separate `source` discriminator already exists in `resolveEffectiveBusinessAccess`).

## 9. Recommended next phase

`MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-2-UI` — admin UI for plan/module matrix + per-business override panel on `/admin/system-access` reusing the helpers shipped here.