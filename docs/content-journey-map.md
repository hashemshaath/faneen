# Content Journey Map — UX-REDESIGN-7

_Phase: UX-REDESIGN-7 / Part B_

Maps every content surface (public + dashboard) onto six core journeys so
each step has explicit *help*, *related content*, and *next-best-action*
touchpoints.

## Journey 1 — Discovery → Quote

`/` → `/search` → `/sectors/:sector` → `/quote`

| Step | Surface | Help (pageKey) | Next best action |
|---|---|---|---|
| Land | `Index.tsx` | `public.home` | Explore sectors |
| Search | `Search.tsx` | `public.search` | Open a sector page |
| Sector | `SectorLanding.tsx` / `PrivateSectorDetail.tsx` | `public.sector-detail` | Request quote |
| Quote | `Quote.tsx` | `public.quote` | Submit / save draft |

## Journey 2 — Brand-led

`/` → `/brands` → `/brands/:slug` → `/providers/:slug` → `/quote`

| Step | Help (pageKey) | NBA |
|---|---|---|
| Brands list | `public.brands` | Filter / open brand |
| Brand detail | `public.brand-detail` | Find providers / quote |
| Provider profile | `public.provider-detail` (mapped in this phase) | Contact / quote |
| Quote | `public.quote` | Submit |

## Journey 3 — Provider onboarding

`/auth` → `/onboarding` → `/dashboard/overview` → `/dashboard/business` → publish

| Step | Help (pageKey) | NBA |
|---|---|---|
| Overview | `dashboard.overview` | Complete profile |
| Profile | `dashboard.business-profile` | Submit for approval |
| Approval | (admin) `admin.provider-review` | Approve / request changes |

## Journey 4 — Provider growth

`/dashboard/provider-growth` → `/help` → `/dashboard/business`

| Step | Help (pageKey) | NBA |
|---|---|---|
| Growth | `dashboard.provider-growth` | Improve completeness |
| Help | `admin.help` (or article slug) | Apply suggestion |

## Journey 5 — Customer fulfilment

RFQ → Contract → Work Order → Completion → Feedback

| Step | Help (pageKey) |
|---|---|
| RFQ | `dashboard.procurement` |
| Contract | `dashboard.contracts` / `dashboard.contract-detail` |
| Work Order | `dashboard.work-orders` / `dashboard.work-order-detail` |
| Production | `dashboard.production` |
| Customer feedback | `customer.feedback` |

## Journey 6 — Admin

Review → Operations → Help

| Step | Help (pageKey) |
|---|---|
| Provider review | `admin.provider-review` |
| Operations | `admin.operations-center` |
| Help (admin) | `admin.help` |

## Cross-journey content links wired this phase

- Blog → Help (contextual, DB-driven by post category).
- Help → Product (NBA card per article slug).
- Sector ↔ Brand already cross-linked in UX-REDESIGN-5; preserved.
- Brand ↔ Provider already cross-linked in UX-REDESIGN-4; preserved.