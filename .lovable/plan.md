# SYSTEM-ACCESS-MODULE-COVERAGE-2 — Plan

## Scope
Bring 5 modules under the same control surface used by other gated systems:
`analytics`, `operations_log`, `private_sectors`, `installments`, `staff_management`.

No RLS changes. No new business domains. No service-role in client. No scope creep into inventory/accounting/supplier-payments.

## Approach (incremental, behind existing infrastructure)

### 1. Audit doc
- Create `docs/system-access-module-coverage-2-audit.md` with per-module inventory (routes, sidebar entries, quick actions, command palette, feature gates, membership dep, gaps).

### 2. Module registry (DB)
- Migration: ensure the 5 keys exist in `public.system_modules` with bilingual labels, group/category, route, default policy, and (where applicable) a membership feature key column.
- Use idempotent `INSERT ... ON CONFLICT (key) DO UPDATE` so re-running is safe.
- Groups: `operations` (operations_log), `insights` (analytics), `business` (private_sectors), `finance` (installments), `workspace` (staff_management).

### 3. Access resolution
- `resolveEffectiveBusinessAccess()` already returns `{allowed, disabled, reasons, sources, version}` per module — verify the 5 keys flow through and add explicit unit coverage. No structural changes unless test exposes a gap.

### 4. Admin UI (`/admin/system-access`)
- Surface the 5 modules under the existing grouped layout (Arabic group headings as specified). Reuse existing membership-blocked state, synced indicator, last-updated, save feedback. No popups, RTL-safe.

### 5. Sidebar / nav / command palette / quick create / dashboard widgets
- `useVisibleModules` already maps the 5 keys to their routes (added previously). Extend to additional aliases discovered in the audit (e.g. reports, BNPL, audit-log routes).
- Verify `useCommandPalette`, dashboard quick-create, and dashboard cards consume `useEffectiveBusinessAccess` / `useVisibleModules`; add filters where missing.

### 6. Route guards
- Wrap the 5 module routes with the existing FeatureGate / protected pattern. When disabled, render bilingual blocked panel:
  - AR: "هذا النظام غير مفعل لمنشأتك."
  - EN: "This module is not enabled for your organization."
  - Includes link to dashboard + help article when registered.

### 7. Help center
- Register article keys `dashboard.analytics`, `dashboard.operations-log`, `dashboard.private-sectors`, `dashboard.installments`, `dashboard.staff-management`, `admin.system-access`. If bodies missing, add to `docs/deferred-backlog.md`.

### 8. Audit / observability
- Admin write path already records `system_module_audit_log` via RPC + `console.info('[observability] system_access.updated', …)` via `updateBusinessSystemAccess`. No changes needed beyond verifying metadata fields (business ref, modules changed count) for bulk operations.

### 9. Immediate sync
- `useBusinessAccessInvalidation` already covers the required query keys. Verify admin UI calls it after every write for the new modules.

### 10. Tests
- `src/tests/systemAccessModuleCoverage2.test.ts`:
  - registry contains 5 keys (migration SQL fixture or seed assertion)
  - admin UI source references all 5 keys
  - `resolveEffectiveBusinessAccess` returns entries for all 5
  - membership-blocked branch returns bilingual reason
  - `useVisibleModules` aliases cover the 5 modules' routes
  - command palette / quick create filter by visibility
  - route guard components import FeatureGate for the 5 routes
  - invalidation hook covers required keys
  - audit/observability text present in `updateBusinessSystemAccess`
  - no RLS edits, no service-role import in client, no inventory/accounting/supplier-payments scope creep

### 11. Validation
- `npx tsc --noEmit`
- Focused vitest on new test file + related (`systemAccessMembershipSync1`, `systemAccessModuleAliases`, `accessGovernanceFinal1`)
- Existing audits: identity, business-staff, membership, credits, broken-links, RTL
- Repair narrow fallout only.

## Files (expected)

Created:
- `docs/system-access-module-coverage-2-audit.md`
- `supabase/migrations/<ts>_system_access_module_coverage_2.sql`
- `src/tests/systemAccessModuleCoverage2.test.ts`
- (possibly) `src/components/access/ModuleDisabledPanel.tsx`

Modified:
- `src/pages/admin/AdminSystemAccess.tsx` (grouped sections for the 5 modules)
- `src/hooks/useVisibleModules.ts` (additional aliases if audit finds them)
- Route wrappers for the 5 module routes (FeatureGate)
- Command palette / quick create consumers (filter by visibility) — only if audit shows they bypass the hook
- `docs/deferred-backlog.md` (help bodies if missing)

## Non-goals
- Schema/RLS changes to `system_modules`/`system_module_overrides`/`system_module_audit_log`
- Changes to membership plan definitions
- New routes or features
