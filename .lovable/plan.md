
# Provider Onboarding & Activation — Read-Only Audit

Read-only. No code changes. Evidence comes from live DB and code walk.

---

## 1. Funnel Map (real counts, today)

Data source: `businesses` + related tables in the live DB.

```text
Stage                                        Count   Notes
─────────────────────────────────────────────────────────────
Total businesses                                12
├─ approval_status = published                  10
├─ approval_status = approved                    1
└─ approval_status = draft                       1   (placeholder)

is_active = true                                11
is_verified = true                              12   (verification flag on for all — trusted)
Has ≥1 branch                                    6   (business_branches)
Has ≥1 business_taxonomy_categories (biz)       10   ← required by matcher
Has ≥1 active business_service                   3   ← BIG DROP
Has per-service taxonomy link (bstc)             0   ← used by service search
Has ≥1 business_service_areas (coverage)         1   ← CRITICAL DROP for matcher
Received ≥1 quote_request_lead                   2
Placed ≥1 opportunity_bid                        0
Active membership_subscription                   0
```

**Per-business activation matrix** (published/approved only, 11 rows):

```text
Name (trunc)                 svc  cov  tax_biz  taxSvc  matchable?
شركة بيانات تكنولوجي           4    1     12       0     ✅ (only one)
شركة توكيلات عبدالله            1    0     13       0     ❌ no coverage
شركة المانع لتجارة              0    0     20       0     ❌ no service, no coverage
شركة آبياتكو                    0    0      6       0     ❌
شركة البرهان                    0    0      6       0     ❌
مصنع المنزل السعودي             0    0      3       0     ❌
شركة أبواب آمان (approved)      0    0      5       0     ❌
شركة مصنع الف نون               0    0      7       0     ❌
مصنع ألف نون للرخام              0    0      3       0     ❌
شركة انشاءات القوة              0    0      0       0     ❌ (no taxonomy either)
شركة مشفى (is_active=f)         0    0      3       0     ❌ soft-off
```

**Matcher eligibility** (`match_quote_to_providers`, verified in
`supabase/migrations/20260714000303_*.sql`):

- Requires `is_active` **AND** `approval_status IN ('approved','published')`
- **AND** a matching row in `business_taxonomy_categories` (business-level)
- **AND** `business_service_areas` covering the quote's `city_id`
  (with optional `district_ids` match)
- City-only fallback still requires taxonomy + `businesses.city_id`

Result: **1 of 12 providers (8%)** is actually reachable by the primary
matcher today. This is the single most damaging fact in the funnel and
explains why only 2 businesses ever received a lead.

### Activation definition (proposed, code-aligned)

A provider is "active" ⇔ `is_active` + `approval_status ∈ {approved, published}`
+ ≥1 primary/secondary `business_taxonomy_categories` + ≥1
`business_service_areas` row + ≥1 active `business_service`.

By this bar: **0 / 12** providers are fully active. The one matchable
provider (Bayanat) is missing per-service taxonomy links.

---

## 2. Friction Analysis (ranked by drop-off impact)

Ordered from biggest funnel leak to smallest.

### F-A. Coverage never gets set — 1 / 11 (–91%). **#1 leak**
- The Q2 coverage screen exists but is not prompted. Nothing in the
  post-approval flow says "add cities you serve or you won't receive
  leads." No dashboard nudge, no NBA card, no empty-state on Leads.
- Owner has no reason to know coverage is what makes them matchable.

### F-B. No services added — 8 / 11 approved providers have zero services (–73%)
- `business_services` is discoverable only via a dashboard tab; no
  first-run prompt, no completeness percentage, no "publish your
  first service" CTA on the Overview.
- Adding a service does not auto-link taxonomy
  (`business_service_taxonomy_categories = 0 across all businesses`),
  so even the 3 that have services still fail the per-service matcher
  variants and search facets.

### F-C. No completeness score/checklist surfaces to the provider
- Column `businesses.onboarding_completion` exists but is not shown
  anywhere provider-facing. `src/modules/growth/providerGrowth.ts`
  computes a readiness score for internal admin/growth engine only.
- Providers have no single "you are 40% ready → do these 3 things"
  view. This is the highest-leverage single UI addition.

### F-D. Approval status is invisible to the provider
- `draft` and `approved` (pre-publish) businesses exist (2 today).
  There is no banner telling the owner "under review — expected 24h"
  or "approved — publish now." Admin approval is manual; SLA is
  informal. Matching silently excludes `draft`.
- `provider_submission_new` admin notification exists in migrations but
  we did not confirm it fires on the current signup path — worth a
  runtime check before F2.

### F-E. Multiple, overlapping entry points confuse the funnel
- `ForProviders.tsx` (754 lines), `ProviderJoin.tsx` (1164),
  `RegisterEntity.tsx` (483), `Onboarding.tsx` (1390) plus
  `/providerJoin/*`. Four "start here" paths exist; the CTA copy and
  the fields collected differ. Some collect sector, some don't.
- Long forms (Onboarding.tsx is 1390 LOC) suggest a "wall of fields"
  smell. Wizard steps exist (`WizardStepper` — 3 stages) but the
  business-details tab is field-dense.

### F-F. Leads inbox has no empty-state education
- Providers who reach the leads screen with zero leads see nothing
  telling them **why** (missing coverage/services). We should show
  the exact activation checklist inline here.

### F-G. Zero memberships, zero bids
- No provider has ever completed a membership checkout or placed a
  bid. Consistent with the fact that they have no leads to convert.
  Not a friction to fix directly — a symptom of F-A/F-B.

### F-H. Placeholder + soft-off rows in the funnel
- 1 draft placeholder ("Qitaat Placeholder Owner") and 1 published
  business with `is_active=false` pollute counts and matcher joins.
  Clean-up is trivial and improves every downstream metric.

---

## 3. What Exists vs What's Missing

| Concern                                    | Exists?  | Notes |
|--------------------------------------------|----------|-------|
| Signup → business row                      | ✅       | Works; too many entry points |
| Onboarding wizard shell                    | ✅       | `WizardStepper`, 3 stages |
| Admin approval workflow                    | ✅       | Manual; no owner-facing status |
| `provider_submission_new` admin notify     | ⚠️       | Exists in migrations, runtime not verified |
| Coverage editor (Q2-UI)                    | ✅       | Not discoverable, not prompted |
| Service editor + taxonomy picker           | ✅       | Not prompted; taxonomy link not created |
| Profile completeness (owner-facing)        | ❌       | Column exists, no UI |
| First-run checklist / NBA cards            | ❌       | Growth engine has internal score only |
| "You're under review" banner               | ❌       | |
| "Publish your profile" CTA (approved→pub)  | ❌       | |
| Leads inbox empty-state education          | ❌       | |
| Demo/placeholder data cleanup              | ❌       | 1 draft + 1 soft-off row |

---

## 4. Phased Plan (highest leverage first)

Sized for independent smoke-testable passes. Reuses existing components
and columns where possible.

### F1 — Activation Checklist on Provider Dashboard (**highest leverage**)
Ship a single "Your activation" card on `/dashboard` (Overview) showing
5 concrete steps with live checks:

1. Business approved ✔/✖ (from `approval_status`)
2. Coverage set — ≥1 `business_service_areas` row
3. At least one active service
4. Each service has a taxonomy category (bstc row)
5. Profile basics (logo + description ≥ 20 chars)

Each row links directly to the exact editor. Also expose the same card
as the **empty-state** on `/dashboard/leads`. No schema change — read
what already exists. Persist rollup into `onboarding_completion` for
admin/analytics reuse.

Impact: directly addresses F-A, F-B, F-C, F-F.

### F2 — Approval-status banner + coverage nudge
- Persistent bilingual banner on all dashboard pages when
  `approval_status ∈ {draft, pending, approved}` (approved-not-published
  gets a "Publish" CTA; draft/pending gets "Under review — ~24h").
- Verify `provider_submission_new` admin notification actually fires
  on the current signup path; wire it if not.
- Add a one-time in-app toast pointing to the coverage editor when a
  provider first reaches `approved`.

Impact: F-D, plus reinforces F-A. No schema change.

### F3 — Auto-link taxonomy when a service is created + service-first prompt
- When `business_services` inserted from the provider UI, ensure a
  `business_service_taxonomy_categories` row is created from the
  chosen category (currently 0 rows across all providers → bug or
  missing UI wiring). Verify in the service form component before
  deciding trigger vs UI fix.
- Add "Add your first service" prompt at the top of the dashboard for
  approved providers with zero services.

Impact: F-B tail; unlocks per-service search facets.

### F4 — Entry-point consolidation
- Pick one canonical CTA (`/for-providers` → `/join`) and redirect the
  others. Keep `RegisterEntity` for admin-created rows only.
- Shorten `Onboarding.tsx` (1390 LOC) by moving optional fields behind
  a post-approval "Complete your profile" step driven by the F1
  checklist. Requires-only-what's-needed for admin approval up front:
  legal name, sector, city, contact.

Impact: F-E. Bigger pass; defer until F1–F3 land.

### F5 — Data cleanup + activation metric
- Delete/archive the placeholder business; investigate the one
  `is_active=false` published row.
- Add a saved SQL/analytics tile "Activation rate" =
  fully-active ÷ approved businesses. Track weekly.

Impact: keeps the funnel honest; supports the "50 verified providers"
goal by defining the target the same way the matcher does.

---

## What NOT to build now (over-engineering for 9-provider stage)

- Gamified badges / streaks for onboarding
- Guided product tour library (Intro.js / Shepherd)
- New onboarding_state table (existing `approval_status` +
  `onboarding_completion` cover it; add a table only if F3 needs it)
- Automated approval rules — 12 rows / week; a human is faster
- ML-based completeness suggestions

---

## Technical Notes

- Matcher lives in `supabase/migrations/20260714000303_*.sql`
  (`match_quote_to_providers`). Activation criteria in §1 mirror its
  WHERE clauses exactly — keep them in sync if the matcher changes.
- Provider-facing completeness should read the same signals as
  `src/modules/growth/providerGrowth.ts` so admin/growth and owner
  views can't disagree. Consider extracting to a shared helper in F1.
- `businesses.onboarding_completion` (single numeric column) is
  sufficient storage; no new schema needed for F1–F3.
- Verify `provider_submission_new` trigger path end-to-end in F2 before
  claiming admin notifications work — migrations exist but runtime
  wiring hasn't been confirmed in this audit.
