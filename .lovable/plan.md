
# Memberships, Entitlements, Feature Gating & RBAC — Read‑Only Audit

Read-only. No files changed, no migrations run.

---

## 1. Membership data model + lifecycle

### 1a. Tables (verified against live DB)

| Table | Cols | Rows | Notes |
|---|---|---|---|
| `membership_plans` | 15 | **4** | `tier` unique (free/basic/premium/enterprise), `features jsonb`, `limits jsonb`, `price_monthly`, `price_yearly`. No `duration_months` column — billing cycle lives on the subscription (`billing_cycle`). |
| `membership_subscriptions` | 31 | **6** | Status set: `active | pending | past_due | cancelled | expired | replaced`. Payment provider/status columns present. Partial unique index enforces one active + one pending per business. Two triggers: `trg_sync_membership_tier_on_subscription`, `trg_cascade_revoke_keys`. |
| `membership_payment_intents` | 20 | **1** | Moyasar/manual reconciliation surface. |
| `membership_subscription_events` | 11 | **1** | Lifecycle audit stream. |
| `membership_plan_modules` | 7 | – | Per-plan module opt-in used by admin catalog. |
| `membership_upgrade_requests` | 16 | – | Manual upgrade workflow with validation + log triggers. |
| `membership_promo_codes / redemptions / attempts` | – | – | Promo pipeline. |
| `membership_access_keys / invite_keys / redemptions / usage_log` | – | – | Access-key distribution. |
| `membership_payment_webhook_events` | 8 | – | Moyasar webhook idempotency. |

**Live counts summary:** 4 plans, 6 total subs (0 active, 0 expired, 4 cancelled, 1 past_due, 1 replaced), 1 payment intent, 1 event, 5 rows in `user_roles`. **Memberships are effectively unused in production today.**

### Tier catalog (as it exists in DB, not marketing copy)

| Tier | Monthly | Yearly | `limits` jsonb (verbatim) |
|---|---:|---:|---|
| free | 0 | 0 | max_branches 1, max_projects 3, max_services 5, max_promotions 1, profile_badge false, priority_support false, analytics_enabled false |
| basic | 99 | 990 | max_branches 3, max_projects 10, max_services 15, max_promotions 5, analytics_enabled true |
| premium | 249 | 2490 | max_branches 10, max_projects 0 (unlimited), max_services 0, max_promotions 20, profile_badge true, bnpl_enabled, homepage_visibility, suggested_services, priority_support, dedicated_manager, performance_reports |
| enterprise | 499 | 4990 | max_branches 0, max_projects 0, max_services 0, max_promotions 0, profile_badge, priority_support, dedicated_manager, api_access |

Governance note: `docs/membership-plan-limits-source-of-truth.md` already flags `max_contracts`, `max_staff`, `max_featured_ads`, `search_priority`, `max_blog_posts`, `max_bookings_daily` as **deferred / no enforcement / no seed** — i.e. the docs already admit the gap.

### 1b. Lifecycle vs code (evidence-based)

| Transition | Status | Evidence |
|---|---|---|
| Purchase — Moyasar auto | **EXISTS** | `membership-payment-create-intent` → `membership-payment-webhook` → `membership-payment-confirm` + `membership-payment-reconcile` edge functions; `membership_payment_intents` + `membership_payment_webhook_events` back it. |
| Purchase — manual | **EXISTS** | `admin_mark_membership_paid_manually(...)` RPC + `admin_mark_membership_payment_refunded_manually(...)`. |
| Activation → sync tier | **EXISTS** | Trigger `trg_sync_membership_tier_on_subscription` → `sync_business_membership_tier` / `sync_user_profile_membership_tier` writes `businesses.membership_tier` and `profiles.membership_tier`. |
| Expiring reminders | **EXISTS** | `notify_expiring_memberships()` RPC + `membership-lifecycle-dispatcher` edge function scheduled via `20260523225853_...sql` (cron job `membership-lifecycle-dispatcher`). Emits notifications with 7-day dedup. |
| Renewal — auto | **PARTIAL** | `auto_renew`, `last_renewal_attempt_at`, `renewal_failure_count`, `grace_period_until`, `payment_failure_reason` columns exist and lifecycle-dispatcher references a `process_renewal_failures` RPC — but I could not find `process_renewal_failures` in `pg_proc`. Renewal charging logic is not visible in the current DB function set; likely still manual. |
| Expiry / downgrade | **EXISTS** | `process_expired_memberships()` scheduled cron (migration `20260513171658_...sql`). Flips `status='expired'`, writes `businesses.membership_tier` and `profiles.membership_tier` to `downgrade_to_tier` (default `free`), inserts event `expired_downgraded`, sends notification. |
| Grace period | **PARTIAL** | Columns exist (`grace_period_until`, `past_due`) but `process_expired_memberships` runs on `expires_at < now()` with no grace check. Grace UI text mentions it, code path doesn't honor it. |

### 1c. What actually happens today when a provider expires

- `membership_subscriptions.status → 'expired'`, `businesses.membership_tier` and `profiles.membership_tier` reset to `free`.
- Access keys revoked (`trg_cascade_revoke_keys`).
- Notification + email fired.
- **Concrete loss of capability:** *only* the branch limit (`enforce_branch_membership_limit` trigger stops new active branches beyond `max_branches`). Every other capability keeps working — projects, services, promotions, contracts, RFQs, homepage placement, analytics, profile badge, BNPL — because nothing else enforces limits at write time (see §2).

**Honest verdict:** Lifecycle plumbing is real and scheduled. The *consequences* of that lifecycle are largely cosmetic.

---

## 2. Entitlements + feature gating — **the credibility gap**

### 2a. Actual entitlement matrix (feature × tier → gated where?)

Verified by grep + SQL for enforcement points.

| Capability (from `limits`) | Read helper | UI gate | Server enforcement | Truthful status |
|---|---|---|---|---|
| `max_branches` | `get_active_membership_limits` | `MembershipUsageWarning` (soft) | ✅ trigger `enforce_branch_membership_limit` on `business_branches` INSERT/UPDATE, admins bypass | **ENFORCED** (only one) |
| `max_projects` | same | soft banner | ❌ no trigger, no RPC guard | Decorative |
| `max_services` | same | soft banner | ❌ | Decorative |
| `max_promotions` | same | soft banner | ❌ | Decorative |
| `max_contracts` | `get_membership_usage` computes | soft banner | ❌ (docs mark as deferred) | Decorative |
| `max_staff` / `max_blog_posts` / `max_bookings_daily` / `max_featured_ads` | not in seed | none | ❌ | Not modeled |
| `analytics_enabled` | `has_membership_feature` | `FeatureGate` — used in `DashboardProfile`, `DashboardServices`, `ProviderDashboardView` | ❌ analytics tables have no tier check in RLS | UI gate only |
| `bnpl_enabled` | same | some UI | ❌ | UI gate only |
| `homepage_visibility` | same | `listTopPublicProviders`/`listPublicProvidersForAnalytics` reference tier | ❌ RLS on `businesses` does not filter by tier | UI/query hint only |
| `suggested_services` / `performance_reports` / `dedicated_manager` | same | copy only | ❌ | Marketing copy only |
| `priority_support` | same | copy only | ❌ | Marketing copy only |
| `profile_badge` | same | `BusinessProfileHeader` reads flag | ❌ (visual only) | Cosmetic (correct) |
| `api_access` | same | none found | ❌ | Not implemented |

`FeatureGate` / `RequireFeature` (`src/components/membership/FeatureGate.tsx`) and `useFeatureGate` are the single official read helper for booleans — good. `has_membership_feature()` returns `true` for `number > 0` and `true` for `boolean true`. Solid primitive; **the problem is where it's called, not how it works.**

### 2b. Claimed vs enforced (the credibility gap)

Public plan pages (`src/pages/Membership.tsx`, `PlanFeatureMatrix`, `PlanCard`) show these as included benefits per tier. Reality:

| Claimed benefit on plan cards | Actually enforced? |
|---|---|
| "10 branches / 3 branches / 1 branch" | ✅ yes (only enforced quota) |
| "Unlimited projects / 10 projects / 3 projects" | ❌ no |
| "Unlimited services / 15 / 5" | ❌ no |
| "20 promotions / 5 / 1" | ❌ no |
| "Advanced analytics" | ❌ UI-shown, data not gated |
| "BNPL enabled" | ❌ shown, checkout doesn't require tier |
| "Homepage visibility" | ❌ homepage listing not tier-filtered |
| "Suggested services" | ❌ nothing wired |
| "Priority support" | ❌ inbox routing not tier-aware |
| "Dedicated manager" | ❌ no assignment code |
| "Performance reports" | ❌ no scheduled report per tier |
| "API access" (Enterprise) | ❌ no API surface |
| "Profile badge" | ✅ (cosmetic — that's fine) |

That's 11 decorative benefits vs 2 real ones. **The owner's instinct is right.**

### 2c. Quota enforcement — reality

- `get_membership_usage` computes usage for `contracts | services | portfolio | branches | staff | promotions | blog_posts` and returns `near_cap` (≥80%) / `over_limit` flags.
- `MembershipUsageWarning` renders soft banners and literally says *"No automatic blocking yet, but upgrading is recommended for more headroom"* (line 122 of the component). That is the current product truth.
- No CREATE-time guard exists on `contracts`, `business_services`, `promotions`, `portfolio_items`, `projects`, `quote_requests`, `rfq_requests`, `rental_items`. No `raise exception 'quota exceeded'` anywhere.
- No **monthly** counter exists for RFQs received or leads consumed. Provider credits (`provider_lead_credit_transactions`) are a separate mechanism, not tier-driven.
- Result: **the only quota gate in the whole system is one branch trigger.**

### 2d. Visibility / matching priority

- `match_quote_to_providers(p_quote_id)` — I dumped it. Matching uses taxonomy + city coverage only. Score is a hardcoded 80 (coverage match) or 40 (city fallback). **Tier is not referenced anywhere in the RPC.** Premium/Enterprise providers get *identical* priority to Free providers when leads are routed.
- Search ranking (`src/services/search/useSearch.ts`) does not sort by tier.
- `listTopPublicProviders` mentions tier in its filter surface but is used for a specific "top providers" widget, not the main directory search.
- `homepage_visibility` boolean has no home-page consumer that honors it as a filter — verified by grep.

**Honest verdict on 2:** entitlements storage and read helpers are well-designed. Enforcement is missing at every meaningful write path except `business_branches`. This is where the platform loses commercial credibility.

---

## 3. RBAC review

### 3a. Role system

- Platform enum `app_role`: `admin | moderator | user | super_admin`. Stored in `public.user_roles` (separate table — correct, follows the standard pattern in the codebase memory). Read via `has_role(_user_id, _role)` (security definer) and convenience wrappers `has_admin_access`, `has_super_admin_access`.
- 5 rows total in `user_roles` today.
- Business-scoped roles: `business_staff` (12 cols) + `business_staff_permissions` (9 cols) + `business_teams` / `business_team_members`. Helpers: `is_business_owner(user, business)`, `has_business_role(...)`. No generic `is_business_staff(...)` helper on the DB side (the earlier prompt referenced one, it doesn't exist). Owner-vs-staff separation is real, and the permissions table means owners *can* restrict staff — but consumption is inconsistent.
- Extra layers: `delegated_workspace_access` table (11 cols, 3 policies), workspace permission catalog + client-side `usePermissionMatrix` / `hasCapability` (`src/modules/workspace/permissions/*`), route-level guards (`PermissionRouteGuard`), section gates (`PermissionSection`, `WorkspaceCapabilityGate`), and a system-module override system (`system_modules` + `system_module_overrides`) that admins use to hide entire modules.
- Admin surfaces: `useVisibleModules` + `is_route_hidden` derived from `system_modules` catalog is the current admin control. `MembershipVisibility` bridges to it.

### 3b. Inconsistencies

1. **UI capability system and DB RLS are decoupled.** `capabilityMatrix.ts` / `WorkspaceCapabilityGate` is explicitly marked "NOT for authorization." RLS is authoritative but does not import from the same catalog. A missing UI capability + weak RLS policy = silent privilege leak; a strict RLS + generous UI = confusing error toasts. Both risks exist in the current code (e.g. `businesses` has 8 policies but the workspace capability catalog is defined separately in TS).
2. **Two membership-vs-module systems.** `membership_plan_modules` + `super_admin_set_membership_plan_module(...)` (tier→module) coexists with `system_module_overrides` (business/user override). They don't reconcile — the "System Access ↔ Membership Sync" doc admits admin overrides silently bypass plan entitlement. That is now warned but *not* blocked.
3. **`admin` vs `super_admin` conflated.** `has_admin_access` returns true for both. Any admin can toggle module overrides for any business, including super-admin-only settings. No enforcement of `super_admin`-only mutations at the RPC layer.
4. **Staff granularity underused.** `business_staff_permissions` exists but only a few surfaces call `has_business_role`. Most check `is_business_owner` — meaning staff invited by an owner effectively act as owner.
5. **Bypass via `has_admin_access` is universal.** Every enforcement path (including `enforce_branch_membership_limit`) short-circuits for admins. Correct for support work, but combined with (2)+(3), admins can silently install paid features on free-tier accounts. There is no audit read of *why* an admin bypassed.

---

## 4. Workflow review — provider purchase/renewal UX

Traced actual routes and components.

| Step | Where | State |
|---|---|---|
| See plans (public) | `/membership` (`Membership.tsx`), plus `useMembershipVisibility` to hide when disabled | ✅ works |
| See plans (dashboard) | `/dashboard/membership` (`DashboardMembership.tsx`), `ProviderMembership.tsx` | ✅ works |
| Upgrade CTA | `SubscribeStepper` + `PlanCard` → creates payment intent via `membership-payment-create-intent` | ✅ Moyasar path exists |
| Pay | Moyasar hosted form → webhook → confirm → activation | ✅ webhook + reconcile exist |
| Manual upgrade | `membership_upgrade_requests` with validate + log triggers, admin approval RPC | ✅ exists |
| See invoice / receipt | `last_receipt_url` column populated; UI surfaces receipt in DashboardMembership | ✅ partial (no PDF invoice generation for KSA VAT) |
| Renewal warning | `notify_expiring_memberships` + email dispatcher, 7-day window | ✅ works |
| Auto-renewal charge | `auto_renew=true` column set, `renewal_failure_count` incremented — but the RPC `process_renewal_failures` referenced in the dispatcher does not exist in the DB. **Auto-charge on renewal is not wired.** | ❌ missing |
| Grace period | Columns exist, cron doesn't check them before flipping to expired | ❌ dead columns |
| Post-expiry downgrade | Runs, updates tier and cascades key revoke | ✅ works |
| Post-expiry re-purchase | Same purchase flow works | ✅ works |
| Usage meters ("3 من 10 عقود") | `MembershipUsageWarning` shows only near/over-cap banner; no persistent "X of Y" meter on dashboard cards | ⚠ partial |

**Broken/missing steps:**
- No auto-charge on expiry (`process_renewal_failures` missing) — auto_renew is a UI lie.
- Grace period is a UI lie (columns exist, honored nowhere).
- No KSA-compliant invoice PDF at purchase.
- No persistent quota meters on relevant dashboards (contracts/services/promotions). Users only learn about their limit when they hit the soft warning.

---

## 5. Proposal — minimal professional architecture + phased plan

### Design principle

*One entitlements definition, one read path, enforcement at write time, one downgrade job.*

Reuse what's already good: `membership_plans.limits jsonb`, `get_active_membership_limits`, `has_membership_feature`, `get_membership_usage`, `FeatureGate`, `MembershipUsageWarning`. Add SQL enforcement guards + a small `check_membership_quota` helper + tier-aware ranking in matching.

### Target architecture

```text
                 ┌──────────────────────────────────┐
                 │  membership_plans.limits (jsonb) │  single source
                 └────────────────┬─────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
 get_active_             has_membership_          check_membership_
 membership_limits       feature(key)             quota(metric)  ◄── NEW
 (already exists)        (already exists)         raises 42501 on over
        │                         │                         │
        ▼                         ▼                         ▼
   useMembership          useFeatureGate           BEFORE INSERT triggers
   Limits (React)         + FeatureGate            on contracts / services /
                                                    promotions / portfolio /
                                                    projects / rfq_requests
```

### Schema changes (SQL — NOT run)

Additive to `limits` jsonb keys (already documented as deferred): seed real values for the 6 unseeded numeric keys.

```sql
-- M1: seed the deferred numeric quotas so enforcement has values to read.
UPDATE public.membership_plans SET limits = limits || jsonb_build_object(
  'max_contracts',      CASE tier WHEN 'free' THEN 3  WHEN 'basic' THEN 20 WHEN 'premium' THEN 100 WHEN 'enterprise' THEN 0 END,
  'max_staff',          CASE tier WHEN 'free' THEN 1  WHEN 'basic' THEN 5  WHEN 'premium' THEN 25  WHEN 'enterprise' THEN 0 END,
  'max_blog_posts',     CASE tier WHEN 'free' THEN 2  WHEN 'basic' THEN 10 WHEN 'premium' THEN 0   WHEN 'enterprise' THEN 0 END,
  'max_rfqs_monthly',   CASE tier WHEN 'free' THEN 5  WHEN 'basic' THEN 25 WHEN 'premium' THEN 100 WHEN 'enterprise' THEN 0 END,
  'search_priority',    CASE tier WHEN 'free' THEN 0  WHEN 'basic' THEN 1  WHEN 'premium' THEN 2   WHEN 'enterprise' THEN 3 END
);
```

Central quota check RPC:

```sql
CREATE OR REPLACE FUNCTION public.check_membership_quota(
  _metric text,           -- one of the get_membership_usage metrics
  _business_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF public.has_admin_access(auth.uid()) THEN RETURN; END IF;
  SELECT * INTO r FROM public.get_membership_usage(_business_id, _user_id)
   WHERE metric = _metric;
  IF r.limit_value > 0 AND r.used >= r.limit_value THEN
    RAISE EXCEPTION 'Membership quota exceeded for %', _metric USING ERRCODE = '42501';
  END IF;
END $$;
```

Per-table BEFORE INSERT triggers call `check_membership_quota('services'|'contracts'|'promotions'|'portfolio'|'projects'|'blog_posts')`. Same shape as `enforce_branch_membership_limit`. Admin bypass preserved.

Matching tier bump (rewrites `match_quote_to_providers` scoring only):

```sql
-- inside match_quote_to_providers, replace hardcoded 80/40 with
--   base + coalesce((mp.limits->>'search_priority')::int, 0) * 5
-- joined via businesses → active subscription → plan
```

### Phased plan

| Phase | Scope | Effort | Risk |
|---|---|---:|---|
| **M1 — Entitlements source of truth** | Seed the 6 deferred keys in `membership_plans.limits`. Update `docs/membership-plan-limits-source-of-truth.md`. Add `check_membership_quota` RPC (no triggers yet). Extend `useMembershipLimits` to expose the new keys. **No user-visible change**, but the source of truth exists. | S | Low |
| **M2 — Enforcement at the 5 highest-value write points** | BEFORE INSERT triggers on: `business_services`, `contracts`, `promotions`, `portfolio_items` (+`projects`), `rfq_requests` (monthly). Persistent quota meters ("3 من 10") on Dashboard Services / Contracts / Promotions / Blog cards using existing `get_membership_usage`. Trigger raises → app catches → shows "quota reached, upgrade" inline. | M | Medium — must ship with clear UI errors and admin bypass path |
| **M3 — Real lifecycle** | Implement `process_renewal_failures` (charge attempt via Moyasar, increment fail count, respect `grace_period_until` before expiry). Honor `grace_period_until` in `process_expired_memberships`. Add renewal-charge idempotency via `membership_payment_webhook_events`. | M | Medium — payment code path |
| **M4 — Visibility + matching priority** | Rewrite `match_quote_to_providers` scoring to add `search_priority * 5` bonus. Filter homepage/top-providers by `homepage_visibility`. Wire `analytics_enabled` into RLS on analytics reads (or into the RPC surface if RLS is too coarse). | S | Low once entitlements are firm |
| **M5 — UX polish** | KSA VAT invoice PDF at purchase (reuse `contract_pdf_exports` pattern). Plan comparison page rewrite so every claimed benefit maps 1:1 to an enforced entitlement. `MembershipUsageWarning` copy update — remove "no automatic blocking yet" language once M2 lands. | S | Low |
| **M6 — RBAC hardening (optional)** | Split `super_admin`-only mutations from generic admin. Route admin overrides through a single RPC that logs `reason` and refuses to enable a feature the current plan doesn't include (unless super-admin). Wire `business_staff_permissions` into the surfaces that currently only check `is_business_owner`. | M | Medium — touches many admin surfaces |

### Explicit over-engineering flags (honest)

- **Do NOT** introduce a separate `plan_entitlements` table. `membership_plans.limits jsonb` is fine, is already the source of truth, and has admin editing UI. A second table would double the work and split truth.
- **Do NOT** build a per-user credits system on top of tiers just for RFQs — you already have `provider_lead_credit_transactions`. Either tier-driven monthly RFQ quota (proposed above) *or* credits, not both.
- **Do NOT** promise "dedicated manager" / "priority support" in the plan matrix until those actually route somewhere (helpdesk queue). Consider removing those bullets in M5 rather than "implementing" them.
- **Do NOT** build a new capability catalog in TS. Keep `useCan` / `capabilityMatrix.ts` as the UI hint layer, and keep RLS authoritative. Wiring the two together via generated types is a bigger refactor than the owner is asking for and doesn't move the credibility gap.
- **`membership_upgrade_requests` manual approval flow** is fine but adds latency; once M3 auto-charge works, the manual path can become a fallback rather than the default.

### One-sentence honesty check for the owner

*Today, memberships are a beautiful storefront with a working checkout, but the "goods" behind almost every plan bullet are not actually gated — only the branch limit is enforced. M1+M2 is the minimum work to make the paid plans mean something; M3–M5 make it feel like a real SaaS.*
