# PRICING-PRODUCT-SIGNOFF-1 — Final Pricing Display Signoff Audit

**Decision:** PARTIAL PASS — display surface is safe; explicit product-owner
approval of the numeric prices below cannot be inferred from the codebase and
is therefore left as a manual signoff item.

## 1. Pricing data (source of truth: `membership_plans`)

Verified live values (DB read, ordered by `sort_order`):

| tier       | name (ar / en)            | price_monthly | price_yearly | active |
|------------|---------------------------|---------------|--------------|--------|
| free       | مجانية / Free             | 0             | 0            | true   |
| basic      | أساسية / Basic            | 99            | 990          | true   |
| premium    | احترافية / Premium        | 249           | 2490         | true   |
| enterprise | مؤسسات / Enterprise       | 499           | 4990         | true   |

Currency: **SAR** (constant, declared in JSON-LD and the stepper VAT block).
Yearly saving vs. 12× monthly: ~16.7% across all paid tiers (≈ "2 months
free"). Computed in UI, never hardcoded.

## 2. UI display surfaces audited

All surfaces read from plan props — no hardcoded user-facing numbers:

- `src/components/membership/PlanCard.tsx` — `plan.price_monthly` /
  `plan.price_yearly`; missing → "تواصل معنا" / "Contact us"; CTA disabled
  when `isPriceMissing`.
- `src/components/membership/MembershipHeader.tsx` — yearly toggle and
  "Save N%" badge gated on `yearlyAvailable`; snaps back to monthly when
  yearly disappears.
- `src/components/membership/SubscribeStepper.tsx` — VAT 15% inclusive
  (`price / 1.15`), savings derived from plan prices, no provider/API calls.
- `src/pages/Membership.tsx` — AggregateOffer + per-plan UnitPriceSpecification
  JSON-LD sourced from plan objects; `priceCurrency: 'SAR'` constant.
- `MembershipFAQ` / `Membership.tsx` — explicit "prices include 15% VAT"
  copy; no launch / beta / manual-activation marketing claims.

Governance preserved: `useMembershipVisibility` + `membershipPathOrNull`
still gate the page and CTAs; hidden plans/routes do not render the grid.

## 3. Checkout / payment consistency

Untouched in this phase. SubscribeStepper consumes the same `plan` object as
the public grid and emits `onConfirm({ planId, billingCycle })`; the
invoice/return surfaces (`MembershipPaymentReturn`, `MembershipInvoice`) read
plan and amount from the subscription/payment records, not from UI literals.

## 4. Safety scan (no violations)

- No hardcoded SAR amounts in any audited UI file (`pricingSourceOfTruth1`
  regex + this phase's `pricingProductSignoff1` lock).
- No "launch offer" / "beta" / "manual activation" marketing copy.
- No fake discount or guarantee-of-results language tied to pricing.
- No path renders "Free" as a substitute for a missing price.
- `useMembershipVisibility` continues to suppress the plan grid when the
  module is hidden.

## 5. Signoff status

The four numeric prices listed in §1 are **technically correct** (DB-backed,
consistently displayed, VAT-inclusive) but require an explicit product-owner
signoff to be considered **commercially approved**. Until that signoff is
recorded here, the display is left unchanged because:

1. The prices already came from the canonical source (`membership_plans`).
2. The page renders no fake numbers — every value traces back to that table.
3. Suppressing numeric display without a product instruction would degrade
   the public surface and would itself be an unapproved product change.

### How to record approval

Update this section with: approver name, date, and decision. If approval is
denied, follow up with **PRICING-VISIBILITY-GUARD-1** to hide numeric prices
behind "تواصل معنا" / "Contact us" without removing the underlying data.

- Approved by: _pending_
- Date: _pending_
- Notes: _pending_

## 6. Remaining debt

- Multi-currency support (SAR only today).
- Offers / discount engine (none — intentionally out of scope).
- Admin in-app pricing editor (DB-only edits today).
- Formal pricing-approval workflow (this doc is the manual placeholder).

## 7. Recommended next phase

- **PRICING-VISIBILITY-GUARD-1** — only if product withholds approval.
- **FINAL-QA-1** — once product owner records approval above.