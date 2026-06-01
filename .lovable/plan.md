
# SERVICE-ACTIVATION-GOVERNANCE-1 — Audit & Phased Plan

You asked me to audit before implementing. Here is what exists today, the canonical model I recommend, and a phased migration. Nothing has been changed yet — please confirm scope before I proceed.

---

## 1) Audit findings (live DB + code scan)

### Existing tables
- `business_services` — provider's **catalog items** (name_ar/en, price_from/to, currency, `is_active`, `category_id`, `source_sub_service_id`, `sort_order`, `is_demo`). This is the closest thing to a provider↔service relation, but it is shaped as a **price catalog**, not an activation row. No `provider_status`, `admin_status`, `membership_gate_status`, `effective_status`, `reviewed_by`, `requires_admin_review`, `is_premium_service`, etc.
- `service_addition_requests` — taxonomy-expansion requests (provider asks for a new sub-service). Has `status`, `reviewed_by`, `reviewed_at`, `reject_reason`, `approved_sub_service_id`. Already wired to `AdminServiceRequests.tsx`.
- `business_service_areas`, `business_service_brands`, `business_service_countries` — adjuncts to `business_services`.
- `membership_plans` — has `features` jsonb + `limits` jsonb (canonical entitlement source — already used by `useMembershipLimits` / `has_membership_feature` RPC).
- `membership_subscriptions`, `provider_subscriptions`, `provider_plans` — active subscription state (canonical).
- No `provider_services`, no `service_activation`, no `enabled_services`, no `entitlements`, no `feature_flags` tables. Good — no duplicate taxonomy.

### Existing code surfaces touching service activation
- `src/pages/dashboard/DashboardServices.tsx` — provider's services page (canonical UI candidate).
- `src/pages/dashboard/DashboardBusinessEdit.tsx` — also edits services (duplicate control).
- `src/pages/admin/AdminBusinesses.tsx` — admin touches `business_services`.
- `src/pages/admin/AdminServiceRequests.tsx` — taxonomy request review.
- `src/modules/catalog/services/services/{reads,mutations,admin}.ts` — service layer already exists (canonical for reads/writes). Direct Supabase calls from pages should funnel here.
- `src/components/search/BusinessCard.tsx`, `SearchFilters.tsx`, `SearchResults*`, `useSearch.ts`, `Compare.tsx`, `business-profile.data.ts` — read-only consumers (fine).
- `src/hooks/useFeatureGate.ts` + `src/modules/memberships` — canonical gate (use as-is).

### Duplicated / scattered controls
- Service activation is split between **DashboardServices** and **DashboardBusinessEdit**.
- No central resolver for `effective_status` — each surface reads `is_active` directly.
- `business_services.is_active` is the only status flag → no way to distinguish provider-paused vs admin-suspended vs upgrade-required vs pending review.
- No admin page to suspend a single provider's service (only taxonomy requests and full-business admin exist).

### Conflicts / gaps
- No `effective_status` resolver → search, profile, dashboard each decide visibility independently.
- Membership `limits` jsonb has plan limits, but nothing enforces "downgrade locks excess services" — extra rows just stay `is_active=true`.
- `service_addition_requests` is a **taxonomy** flow, not a **provider activation review** flow — keep separate.

---

## 2) Canonical model (proposed)

| Concern | Canonical source |
|---|---|
| Service taxonomy | existing `reference_lookup` / sub_services (admin-managed, untouched) |
| Provider↔service relation | **extend `business_services`** (do not create parallel table) |
| Taxonomy expansion requests | `service_addition_requests` (untouched) |
| Membership entitlements | `membership_plans.limits` jsonb + `has_membership_feature` RPC |
| Active subscription | `membership_subscriptions` / `provider_subscriptions` |
| Resolver | new `src/modules/providerServices/resolveServiceEntitlement.ts` |
| Provider UI | `/dashboard/services` (rebuild `DashboardServices.tsx`) |
| Admin UI | new tab inside `AdminMembershipsHub` or `AdminTaxonomyHub` → `/admin/service-activations` |

### Status model (4 independent + 1 derived)
- `provider_status`: `active | paused`
- `admin_status`: `allowed | suspended | rejected | pending_review`
- `membership_gate_status`: `available | upgrade_required | quota_exceeded | not_in_plan` *(derived, not stored)*
- `effective_status`: `active | paused | hidden | disabled | upgrade_required | pending_review` *(derived by resolver)*

---

## 3) Phased plan

### Phase A — DB migration (additive, safe)
Extend `business_services`:
- `provider_status text default 'active'` (check: active|paused)
- `admin_status text default 'allowed'` (check: allowed|suspended|rejected|pending_review)
- `requires_admin_review boolean default false`
- `is_premium_service boolean default false`
- `required_plan_tier text null` (free|growth|pro|enterprise — uses existing `app_membership_tier` enum if present)
- `admin_note text`, `provider_note text`, `rejection_reason text`
- `reviewed_by uuid`, `reviewed_at timestamptz`
- `updated_at timestamptz default now()` + trigger
- Indexes on `(business_id, admin_status)`, `(business_id, provider_status)`
- Backfill: `provider_status = case when is_active then 'active' else 'paused' end`
- Keep `is_active` for now (b/w compatibility); deprecate in Phase E.
- RLS: extend existing policies; admin-only columns (`admin_status`, `admin_note`, `reviewed_by`) protected by `has_role(auth.uid(), 'admin')` on UPDATE.

### Phase B — Resolver + service layer
- New module `src/modules/providerServices/` with:
  - `resolveServiceEntitlement.ts` (pure function, fully unit-tested)
  - `services/reads.ts` — `listProviderServices`, `resolveProviderServicesForDisplay`
  - `services/mutations.ts` — `activate`, `pause`, `requestActivation`, `bulkUpdate`
  - `services/admin.ts` — `adminSuspend`, `adminRestore`, `adminApprove`, `adminReject`, `adminSetPremiumGate`
- Resolver priority (matches your spec):
  1. taxonomy disabled → `hidden`
  2. admin suspended/rejected → `disabled`
  3. pending_review → `pending_review`
  4. required_plan_tier > current tier → `upgrade_required`
  5. active count > plan limit → `quota_exceeded`
  6. provider_status=paused → `paused`
  7. else → `active`
- Guard test (like `credits-isolation-audit`): block direct Supabase writes to status fields outside the module.

### Phase C — Provider UI rebuild
- Rebuild `DashboardServices.tsx`:
  - 4 summary cards (active / paused / upgrade-required / pending-review)
  - Search + filter (sector, status)
  - Service rows with effective status badge, provider action menu, upgrade CTA → `/membership`, locked/suspended/pending reasons
  - Empty states (Arabic copy as specified)
- Inline-form pattern (no popups — matches your UX constraint).
- Remove service-activation controls from `DashboardBusinessEdit.tsx`; replace with read-only summary card linking to `/dashboard/services`.
- Onboarding keeps initial selection only.

### Phase D — Admin UI
- Add tab `service-activations` inside existing `AdminMembershipsHub` (or new `AdminServiceGovernanceHub`):
  - Filterable table (provider, service, sector, plan, effective_status)
  - Approve / reject / suspend / restore / set-premium with reason
  - Link to provider profile + membership
- Keep `AdminServiceRequests.tsx` for **taxonomy** requests (different concern).

### Phase E — Notifications + ops
- Use existing `notifications` table with new template keys:
  - `provider_service_activation_requested|approved|rejected`
  - `provider_service_suspended_by_admin|restored_by_admin`
  - `provider_service_requires_upgrade`, `membership_change_affected_services`
- Add counts to operations center if it surfaces queues.

### Phase F — Tests + validation
- Resolver: 7 priority cases + edge cases
- Mutation services: activate/pause/admin-suspend/membership-gate
- Guard test for direct Supabase writes
- E2E smoke: `/dashboard/services` renders, upgrade badge appears, admin suspend hides public listing
- `npx tsc --noEmit` + `vitest run` after each phase

---

## 4) Scope estimate
This is **6 phases**, roughly **25–35 file changes + 1 migration + 1 admin page + 1 rebuilt provider page**. It is a multi-session effort.

## 5) What I need from you before coding

1. **Confirm canonical decision**: extend `business_services` (recommended) vs create new `provider_service_activations`?
2. **Admin UI placement**: new tab in `AdminMembershipsHub`, new tab in `AdminTaxonomyHub`, or standalone `/admin/service-activations`?
3. **Execution mode**: should I ship **all phases in one go** (long, risky) or **Phase A + B + C first** (DB + resolver + provider page), then review before D/E/F?
4. **Required plan tiers per service**: do you want me to add a default mapping in the migration (e.g., all services default to `free` tier), or leave `required_plan_tier` nullable and let admin set it later?

Once you answer (especially #3), I will start with the migration and the resolver, run the typecheck/tests, then move forward.
