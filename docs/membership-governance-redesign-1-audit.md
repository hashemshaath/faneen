# MEMBERSHIP-PAGE-GOVERNANCE-REDESIGN-1 — Audit & Outcomes

## 1. Membership system inventory (before)

| Surface | Path | Owner |
|---|---|---|
| Public membership page | `/membership` | `src/pages/Membership.tsx` |
| Membership invoice | `/membership/payments/:id/invoice` | `src/pages/MembershipInvoice.tsx` |
| Payment return | `/membership/payment/return` | `src/pages/MembershipPaymentReturn.tsx` |
| Provider membership | `/dashboard/provider/membership` | `src/pages/dashboard/ProviderMembership.tsx` |
| Admin memberships hub | `/admin/memberships` (+ tab redirects for rejections/events/payments/providers) | `src/pages/admin/AdminMembershipsHub.tsx` |
| Dashboard overview widget | `MembershipWidget` | `src/components/dashboard/overview/shared.tsx` |
| Provider tier card | dashboard right rail | `src/components/dashboard/ProviderMembershipCard.tsx` |
| Service activation upgrade | `DashboardServices` `ServiceTile` | `src/pages/dashboard/DashboardServices.tsx` |
| Feature lock fallback | reusable | `src/components/membership/FeatureGate.tsx` |
| Public providers landing | `/for-providers` | `src/pages/ForProviders.tsx` |
| Profile jump links | `/dashboard/profile` | `src/pages/dashboard/DashboardProfile.tsx` |

### Data sources
- Plans: `membership_plans` via `listActiveMembershipPlans()` (active+visible only).
- User subscription: `membership_subscriptions` via `getCurrentMembershipSubscription()`.
- Feature gating: `has_membership_feature(_user_id, _feature_key, _business_id)` SQL function (already source-of-truth).
- Module visibility: `system_modules.memberships` (route `/membership`) + per-user/account-type overrides resolved by `get_user_visible_modules` RPC.

### Governance gaps found
1. `/membership` route had **no guard** — hiding the `memberships` module from the admin only hid sidebar entries; the page still rendered the full sales surface for anyone navigating directly.
2. Six upgrade CTAs hard-linked to `/membership` regardless of module visibility:
   `FeatureGate`, `DashboardServices.ServiceTile`, `ProviderMembership`, `ProviderMembershipCard`, `MembershipWidget`, `ForProviders`, `DashboardProfile`.
3. Unsafe / contradictory copy on public page and provider card:
   - "Join hundreds of businesses that trust Qitaat" — unverified social proof claim.
   - FAQ said "Currently in beta — upgrades activated manually with no charge" while the page itself also says "Online payment via Moyasar — straight to secure checkout".
   - Provider card pill said "Beta — upgrades manually activated for now" — same contradiction.
4. No FAQ entries addressing the governance contract (no guarantee of leads/sales, why some services require an upgrade, what happens when memberships are paused).

## 2. Visibility governance fix

- Added `src/hooks/useMembershipVisibility.ts` — single source for `canShowMembershipPage`, `shouldShowUpgradeCTA`, `membershipPathOrNull`, `unavailableMessage`, `isAdminBypass`. Wraps existing `useVisibleModules()` so the `memberships` module key in `system_modules` remains the canonical control.
- Added `src/components/membership/MembershipUnavailableState.tsx` — `noindex` + neutral contact-support fallback.
- `Membership.tsx` now early-returns the unavailable state when the module is hidden for the viewer. Admins bypass (so they can still QA the page).
- All six upgrade CTAs branch on `membershipPathOrNull`: when null they render a `Contact support` link instead of a dead `/membership` link.
- Admin routes (`/admin/memberships*`) are unchanged — admin governance is independent and continues to work via `requireAdmin`.
- RLS, edge functions, payment intents, and provider subscription resolvers are untouched.

## 3. /membership redesign (this phase, light-touch)

Kept all existing payment/checkout flows intact. Visual changes:
- Added a governance-safe disclaimer block above the plan grid clarifying that benefits may vary by account/service and that membership does not guarantee leads/sales.
- Removed the "Join hundreds of businesses that trust Qitaat" line in the bottom CTA, replaced with the spec's safer "Pick the visibility and benefits level that fits your business…" wording.
- Replaced the contradictory "beta / manual activation" copy in `MembershipFAQ` and `ProviderMembershipCard` with the live behavior ("Instant activation after Moyasar payment; some benefits may be subject to admin review").
- Added the six governance FAQ entries from the spec (guarantee, service-upgrade reasons, brand review, contract availability, what happens if memberships are paused).

Out of scope for this phase (left for `MEMBERSHIP-PAGE-REDESIGN-2`): full bento/hero re-composition, plan recommender restyle, paid-only feature matrix overhaul.

## 4. Plan / feature alignment

No new numeric limits were invented. Existing `membership_plans.limits` JSON remains the only numeric source. The new FAQ explicitly tells users that:
- service / sector quotas can trigger upgrade prompts (governance for `DashboardServices`),
- brand/sector publishing may require admin review (matches existing brand approval flow),
- contract & RFQ access depend on account type; deeper limits depend on plan.

### Documented future debt (recommended next phase)
- `PLAN-FEATURE-MATRIX-1`: surface real numeric limits per plan from `membership_plans.limits` in the feature comparison table (currently the matrix is qualitative).
- Audit any remaining hard-coded VAT/launch-offer copy (the 15% VAT text is correct per project memory but should source from a single constant).

## 5. Copy / claim safety

Removed:
- "Join hundreds of businesses that trust Qitaat" (unverifiable social proof).
- "Currently in beta — upgrades activated manually with no charge" (contradicts live payments).
- "Beta — upgrades are manually activated for now" pill on provider card.

Added safe disclaimers:
- Plan-grid disclaimer about benefit variability and no guarantees of leads/sales.
- FAQ explicitly stating membership does not guarantee leads/sales.
- FAQ explaining service-upgrade prompts and brand review.
- Fallback "Memberships are currently unavailable" message when the admin disables the module.

## 6. Files

### Created
- `src/hooks/useMembershipVisibility.ts`
- `src/components/membership/MembershipUnavailableState.tsx`
- `src/tests/membershipPageGovernanceRedesign1.test.ts`
- `docs/membership-governance-redesign-1-audit.md`

### Modified
- `src/pages/Membership.tsx` — route guard, safe disclaimer, replaced unsafe CTA copy.
- `src/components/membership/MembershipFAQ.tsx` — replaced beta entry, added 6 governance FAQs.
- `src/components/membership/FeatureGate.tsx` — CTA respects visibility.
- `src/components/dashboard/ProviderMembershipCard.tsx` — CTA + pill copy.
- `src/components/dashboard/overview/shared.tsx` — `MembershipWidget` CTA.
- `src/pages/dashboard/ProviderMembership.tsx` — upgrade CTA.
- `src/pages/dashboard/DashboardServices.tsx` — service upgrade banner CTA.
- `src/pages/ForProviders.tsx` — public CTA.
- `src/pages/dashboard/DashboardProfile.tsx` — JumpLink.

### Migrations
None — `system_modules.memberships` already exists with route `/membership`.

## 7. Validation

- TypeScript compiles cleanly.
- New test suite asserts: hook contract, fallback CTAs branch on visibility, no `<Link to="/membership">` remains un-gated in CTA call sites, no `Join hundreds` / `Beta — upgrades are manually activated` claims remain, governance FAQs present.

## 8. Remaining membership debt

- `PLAN-FEATURE-MATRIX-1` — numeric limits per plan in the comparison table.
- `MEMBERSHIP-PAGE-REDESIGN-2` — full visual re-composition (hero, plan card layout, sticky mobile CTA).
- Per-route guards for `/membership/payments/:id/invoice` and `/membership/payment/return` (these currently rely on the user already having a paid intent; they don't show sales content, so they were intentionally left as-is).
- Consolidate VAT/region copy behind a single constant.