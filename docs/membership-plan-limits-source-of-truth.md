# Membership Plan Limits — Source of Truth

_Phase: PLAN-FEATURE-MATRIX-1 — Decision: PARTIAL PASS (display-safe)_

## Canonical location

`membership_plans.limits` (JSONB) is the single source of truth for plan
capabilities. The TypeScript canonical schema lives in
[`src/lib/membership-limits.ts`](../src/lib/membership-limits.ts) as
`LIMIT_FIELDS`, each entry carrying a new `confirmed: boolean` flag.

| Key | Type | Confirmed | Source |
|---|---|---|---|
| `homepage_visibility` | boolean | ✅ | seed (Premium only) |
| `suggested_services` | boolean | ✅ | seed (Premium only) |
| `profile_badge` | boolean | ✅ | seed (Premium, Enterprise) |
| `max_projects` | number | ✅ | seed (Free=3, Basic=10, Premium=0, Enterprise=0) |
| `max_services` | number | ✅ | seed (Free=5, Basic=15, Premium=0, Enterprise=0) |
| `max_promotions` | number | ✅ | seed (Free=1, Basic=5, Premium=20, Enterprise=0) |
| `max_branches` | number | ✅ | seed (Free=1, Basic=3, Premium=10, Enterprise=0) |
| `bnpl_enabled` | boolean | ✅ | seed (Premium only) |
| `analytics_enabled` | boolean | ✅ | seed (Basic+) |
| `api_access` | boolean | ✅ | seed (Enterprise only) — added in this phase |
| `priority_support` | boolean | ✅ | seed (Premium, Enterprise) |
| `dedicated_manager` | boolean | ✅ | seed (Premium, Enterprise) |
| `performance_reports` | boolean | ✅ | seed (Premium only) |
| `max_featured_ads` | number | ❌ deferred | no enforcement, no seed |
| `search_priority` | number | ❌ deferred | no enforcement, no seed |
| `max_blog_posts` | number | ❌ deferred | no enforcement, no seed |
| `max_contracts` | number | ❌ deferred | UI fallback only |
| `max_staff` | number | ❌ deferred | UI fallback only |
| `max_bookings_daily` | number | ❌ deferred | no enforcement, no seed |

`0` on a `max_*` numeric key means **unlimited** (legacy convention preserved
by `getPlanLimitDisplayValue` → `∞`).

## Display rules

- **Public surfaces** (`/membership` `PlanFeatureMatrix`, `PlanCard` highlights)
  render **only confirmed** keys. This is what avoids fake "Unlimited" /
  "Not included" badges for product areas that have no real source-of-truth.
- **Admin editor** (`AdminMemberships`) continues to render every key from
  `LIMIT_FIELDS` so super-admins can fill them in later.
- **`PlanFeatureMatrix`** accepts an opt-in `includeUnconfirmed` prop for
  admin/preview contexts.

## No DB / billing changes

- No migration was created — the existing seed data is already correct for
  every confirmed key.
- Pricing fields (`price_monthly`, `price_yearly`) were **not** changed.
  Current values come from the active `membership_plans` rows and remain the
  source of truth. A follow-up `PRICING-SOURCE-OF-TRUTH-1` phase should
  confirm them against product.
- No payment/billing logic touched.

## Governance preservation

- Hidden `/membership` route short-circuit (`useMembershipVisibility`) untouched.
- `MembershipPlanModuleMatrix` (RPC-driven) untouched.
- `list_membership_plan_modules` / super-admin overrides untouched.
- Hidden / inactive plans still filtered by `listActiveMembershipPlans`.

## Remaining debt

1. Confirm and seed numeric values for the 6 deferred keys (or remove them).
2. `PRICING-SOURCE-OF-TRUTH-1` — confirm current monthly/yearly prices.
3. `support.level` / `analytics.level` enum keys deferred — current schema
   uses boolean `priority_support` / `analytics_enabled` only.