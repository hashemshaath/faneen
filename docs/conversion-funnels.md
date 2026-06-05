# Conversion Funnels — MARKETPLACE-CONVERSION-OPTIMIZATION-1

## Visitor funnel

```text
Google
  ↓
Landing page (/, /sectors, /search, blog)
  ↓
Sector page (/sectors/:sector)
  ↓
Provider page (/providers/:slug)
  ↓
RFQ started (/quote)
  ↓
RFQ submitted
  ↓
Matched to provider(s)
```

| Stage | Owner page | Event source | Notes |
|---|---|---|---|
| Landing | `Index.tsx` | `provider_landing_metrics` view | Tracked |
| Sector | `SectorLanding.tsx` | navigation | Inferred |
| Provider | `BusinessProfile` | `provider_interactions` | Tracked |
| RFQ started | `Quote.tsx` | form_start (analytics) | Tracked |
| RFQ submitted | `Quote.tsx` | `rfqs` insert | Tracked |
| Matched | provider dashboard | `leads` table | Tracked |

## Provider funnel

```text
Landing (/for-providers)
  ↓
Registration (/auth)
  ↓
Business created (`businesses` row)
  ↓
Profile completion (completeness ≥ threshold)
  ↓
Verification request
  ↓
Publication (admin approval)
  ↓
Lead received (first lead in inbox)
```

| Stage | Owner page | Event source | Notes |
|---|---|---|---|
| Landing | `ForProviders.tsx` | landing metrics | Tracked |
| Registration | `Auth.tsx` | auth events | Tracked |
| Business created | `OnboardingWizard` | `businesses` insert | Tracked |
| Completion | `DashboardOverview` | computed | Tracked |
| Verification | `DashboardBusinessProfileHub` | `business_verification_requests` | Tracked |
| Publication | `AdminProviderReviewHub` | `is_active` flip | Tracked |
| Lead received | `DashboardLeads` | `leads` insert | Tracked |

## Drop-off hypotheses (audit only)

- Sector → Provider: weak inline CTA on product/service cards.
- RFQ started → RFQ submitted: mobile upload friction.
- Business created → Completion: discoverability of NBA cards.
- Completion → Verification: prompt visibility.