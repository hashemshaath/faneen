# MEMBERSHIP-PAGE-REDESIGN-2 — Audit & Outcomes

**Decision:** PASS.

## 1. Audit summary (before this phase)

| Area | State |
|---|---|
| Page | `src/pages/Membership.tsx` — long, but functional. Hero copy was generic ("Pick the plan that grows your business"), no spec hero, no anchor for "compare". |
| Plan source | `listActiveMembershipPlans()` (filters `is_active = true`). Inactive/hidden plans never leak to the public page. |
| Limits source | `membership_plans.limits` JSON → `LIMIT_FIELDS` / `parseLimits()` / `getPlanLimitDisplayValue()` in `src/lib/membership-limits.ts`. Real data; nothing fabricated. |
| Feature matrix | `PlanFeatureMatrix` (data-driven from DB), but hidden behind a collapsed `<details>`. |
| Governance | `useMembershipVisibility()` + `MembershipUnavailableState` from REDESIGN-1 in place. CTAs branch on `membershipPathOrNull`. |
| Final CTA | "Talk to sales / Ready to grow" + a privacy claim ("All plans include full data protection and privacy") — overstated. |
| FAQ | 11 entries (incl. 6 governance from REDESIGN-1). Missing "do benefits differ by service type?". |
| Service alignment | No dedicated section explaining tier-vs-activation expectations. |

## 2. Governance preservation

- `useMembershipVisibility()` and the early-return to `MembershipUnavailableState` are untouched. Test asserts the guard still short-circuits before any plan/sales surface renders.
- Active-only plan read wrapper (`listActiveMembershipPlans`) is the only public source. No new code path queries `membership_plans` directly.
- CTAs introduced by this phase:
  - Hero primary → in-page anchor `#compare` (no route change).
  - Hero secondary → `/contact` (public route, unrelated to memberships visibility).
  - Final CTA primary → in-page anchor `#compare`.
  - Final CTA secondary → `/contact`.
  None of them link to `/membership` directly, so `membershipPathOrNull` semantics are unaffected.
- Admin bypass behavior is unchanged.

## 3. Redesign (page structure)

### Before
1. `MembershipHeader` (badge + h1 + subtitle + billing toggle).
2. Disclaimer.
3. Regular-user "switch to provider" card.
4. Moyasar info strip.
5. Business status block.
6. Pending upgrades / RenewalStatusBanner / SubscribeStepper / Promo redeem / CurrentSubscription / Payments.
7. Plan recommender.
8. Plan grid (bento).
9. `<details>` Feature comparison (collapsed by default).
10. Benefits / TrustStrip / Testimonials / FAQ.
11. Final CTA.

### After
1. **MembershipHero** (new) — spec title "عضويات قطاعات", subtitle, primary "قارن العضويات", secondary "تواصل معنا", safe note.
2. Disclaimer (unchanged).
3. Regular-user "switch to provider" card (unchanged).
4. Moyasar info strip (unchanged).
5. Business status block (unchanged).
6. Pending upgrades / RenewalStatusBanner / SubscribeStepper / Promo redeem / CurrentSubscription / Payments (unchanged).
7. Plan recommender (unchanged).
8. **MembershipHeader** — now toggle-only, placed directly above the plan grid where pricing is compared.
9. Plan grid (bento, unchanged).
10. **`<section id="compare">`** with the always-visible feature comparison matrix (the hero "قارن العضويات" CTA scrolls here).
11. **ServiceActivationAlignment** (new) — four safe bullets covering plan-gated activation, admin review, provider/admin pauses, and the no-guarantee rule.
12. Benefits / TrustStrip / Testimonials / FAQ (FAQ gained one entry: "هل تختلف المزايا حسب نوع الخدمة؟").
13. Final CTA — copy refreshed to "اختر العضوية المناسبة" + "تواصل معنا", primary scrolls to `#compare`, supporting line replaced with the safe "العضوية لا تضمن الطلبات أو المبيعات" disclaimer.

## 4. Plan cards

No structural change in this phase — `PlanCard` already:
- shows only active/visible plans (parent uses `listActiveMembershipPlans`),
- shows price only when present in the row (`price_monthly` / `price_yearly`),
- shows billing period only when price > 0,
- shows current-plan badge, upgrade/downgrade/free state, and a localized loading state,
- derives feature bullets from `LIMIT_FIELDS` / `parseLimits` (real DB limits, no fabricated numbers).

CTA states resolved by the parent (`handleSubscribe`): current plan disabled, free plan no-op, downgrade confirmation, upgrade → Moyasar checkout. Unchanged.

## 5. Feature matrix

Now always visible inside `#compare`. Groups come from `LIMIT_CATEGORIES` (`visibility`, `content`, `operations`, `support`). Cells:
- Booleans render as ✓ / —.
- Numeric `max_*` with value `0` render as "∞" (handled by `getPlanLimitDisplayValue`).
- Other numbers render verbatim.

No qualitative "حسب التفعيل" fallback is needed today because every cell maps to a known column in `membership_plans.limits`. If a future field is added without limits, `parseLimits` returns the documented `defaultValue` so the matrix stays consistent — nothing fabricated.

## 6. Copy / claim safety

- Hero, alignment section, and final CTA contain **no** guarantees, no "guaranteed leads/sales", no SLA promises, no PDPL/hosting/legal claims, no invented launch offers.
- Removed overreaching final-CTA line "All plans include full data protection and privacy" — replaced with the explicit "Memberships do not guarantee leads or sales" disclaimer.
- Removed "Talk to sales" (no sales team is staffed) → "Contact us" / "تواصل معنا".
- All REDESIGN-1 disclaimers, governance FAQ, and unavailable-state behavior are preserved.

## 7. Files

### Created
- `src/components/membership/MembershipHero.tsx`
- `src/components/membership/ServiceActivationAlignment.tsx`
- `src/tests/membershipPageRedesign2.test.ts`
- `docs/membership-page-redesign-2-audit.md`

### Modified
- `src/pages/Membership.tsx` — mount new hero, anchor `#compare`, always-open matrix, alignment section, refreshed final CTA.
- `src/components/membership/MembershipHeader.tsx` — reduced to a toggle-only component (hero block moved to `MembershipHero`).
- `src/components/membership/MembershipFAQ.tsx` — added "do benefits differ by service type?" entry.

### Not modified
- `useMembershipVisibility`, `MembershipUnavailableState`, payment intents, RLS, edge functions, plan/subscription read wrappers, `PlanCard`, `PlanFeatureMatrix`, service-activation entitlement logic.
- No DB migrations.

## 8. Validation

- `src/tests/membershipPageRedesign2.test.ts` — 8/8 pass.
- `src/tests/membershipPageGovernanceRedesign1.test.ts` — 6/6 pass (regression).
- TypeScript: clean (page edits are additive imports + JSX swaps).
- SEO: page meta / canonical / JSON-LD blocks unchanged; `#compare` is an in-page anchor, no new indexable URL.
- RTL: hero, alignment, and CTA use logical spacing (`start/end`, `gap`, `inline-flex`). No `left/right` hardcoded.

## 9. Remaining debt

- **PLAN-FEATURE-MATRIX-1** — fully closed for now: the public matrix is data-driven from `membership_plans.limits`. Track upgrades to the underlying schema (e.g. exposing service-sector quotas as first-class columns) under a follow-up.
- **Pricing confirmation** — prices come from `membership_plans.price_monthly` / `price_yearly`; we do not display synthetic prices anywhere. If a paid plan has `price_*` set to 0 the card correctly renders "Free / مجاناً" with no billing period — verified by `PlanCard`.
- **Recommended next phase** — `MEMBERSHIP-CONVERSION-TELEMETRY-1`: instrument `compare` anchor scroll, alignment-section views, and CTA clicks so the redesign can be A/B-measured. No content/governance changes implied.