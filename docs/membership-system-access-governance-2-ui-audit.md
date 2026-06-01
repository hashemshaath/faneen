# MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-2-UI — Audit Report

## Decision: PASS (UI for existing governance, no DB/RLS changes)

## Audit

| Surface | State before | State after |
|---|---|---|
| `/admin/memberships` (`AdminMembershipsHub`) | Tabs: plans, providers, payments, events, rejections. No plan→module matrix. | New tab **"مصفوفة الخدمات / Plan Modules Matrix"** added. |
| `/admin/system-access` (`AdminSystemAccess`) | View tabs: manage / audit. Per-business overrides used `admin_set_module_override` only. | Adds super-admin-only **"Business Overrides"** view tab using the new RPC with mandatory reason. |
| `src/modules/systemAccess/index.ts` | Exposes `superAdminSetBusinessModuleOverride`, `superAdminSetMembershipPlanModule`, `listMembershipPlanModules`, `listSystemModules`, `listAuditLog`. | Unchanged — all needed wrappers already exist; no new read wrappers required. |
| Role gating | `isSuperAdmin` already exposed on `useAuth`. | Reused for tab visibility + submit guards. |

## Plan × Module matrix

- **Location:** `src/pages/admin/AdminMembershipPlanModules.tsx`, hub key `modules`.
- **Rows:** active modules (from `list_membership_plan_modules` for the first plan; identical across plans).
- **Columns:** active membership plans (`listAdminMembershipPlans`, filtered to `is_active !== false`).
- **Cells:** `<Switch>` calling `superAdminSetMembershipPlanModule`. Core modules render a locked indicator (`Lock` icon, "أساسي ولا يمكن تعطيله") and ignore writes client-side; server also rejects.
- **Super Admin:** can toggle. Admin/other: switches `disabled`. Non-admin: warning banner.
- **Invalidations:** `membership-plan-modules-matrix`, `system-modules`, `effective-business-access`, `visible-modules`.
- **No direct writes** — RPC only.

## Business override panel

- **Location:** `src/components/admin/system-access/SuperAdminBusinessOverridePanel.tsx`, mounted as a new view tab `super_override` in `AdminSystemAccess`, **only when `isSuperAdmin`**.
- **Selector:** business search (`businesses` table, name/ref_id) + module `<select>` from active `system_modules`.
- **Reason:** `<Textarea>`, required (`reason.trim().length > 0`) before submit; RPC re-validates server-side.
- **Core modules:** Switch disabled, error toast if attempted.
- **RPC:** `super_admin_set_business_module_override(business_id, module_key, enabled, reason)`.
- **Audit display:** last 20 entries from `listAuditLog()` shown beneath the form (action, module, scope, prev→new, reason, actor timestamp).
- **Invalidations:** `system-module-overrides`, `system-module-audit-recent`, plus `useBusinessAccessInvalidation()` for the targeted business.

## Audit log display

- **Implemented** via existing `listAuditLog()` reader — no new wrapper needed.
- Displayed inline in the override panel; full audit tab `AuditLogPanel` remains untouched.

## Files

**Created**
- `src/pages/admin/AdminMembershipPlanModules.tsx`
- `src/components/admin/system-access/SuperAdminBusinessOverridePanel.tsx`
- `src/tests/membershipSystemAccessGovernance2Ui.test.ts`
- `docs/membership-system-access-governance-2-ui-audit.md`

**Modified**
- `src/pages/admin/AdminMembershipsHub.tsx` — added "Plan Modules Matrix" tab.
- `src/pages/admin/AdminSystemAccess.tsx` — added super-admin-only "Business Overrides" view tab.

## Tests

| Suite | Result |
|---|---|
| `membershipSystemAccessGovernance2Ui` (new, 4) | ✅ |
| `membershipSystemAccessGovernance1` (regression, 8) | ✅ |

## Remaining debt

- Effective per-business module preview (resolveEffectiveBusinessAccess panel) — deferred.
- Bulk edits across plans/modules — deferred.
- Override expiry — not in scope.
- Audit detail modal — basic inline list only.
- Public `/membership` redesign — separate phase.

## Recommended next phase

`MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-3` — effective-access preview + per-business override list/expiry + audit detail drawer.