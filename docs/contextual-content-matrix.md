# Contextual Content Matrix — UX-REDESIGN-7

_Phase: UX-REDESIGN-7 / Part C_

For every major public + dashboard + admin surface, this matrix records:

- **Help** — `pageKey` in `contextualHelpRegistry`
- **Related** — primary related-content block on the page
- **NBA** — next-best-action target

## Public

| Page | Help pageKey | Related block | NBA |
|---|---|---|---|
| `/` Home | `public.home` * | Sectors, latest projects | `/sectors` / `/quote` |
| `/sectors` | (no key, hub) | Sector cards | open a sector |
| `/sectors/:sector` | `public.sector-detail` * | Brands, providers | `/quote` |
| `/brands` | `public.brands` | Brand cards | open a brand |
| `/brands/:slug` | `public.brand-detail` | Providers, sectors | `/quote` |
| `/providers/:slug` | `public.provider-detail` * | Brands, projects | `/contact` / `/quote` |
| `/quote` | `public.quote` * | Sectors, help on RFQ | submit |
| `/blog` | `public.blog` * | Tags, popular | `/quote` |
| `/blog/:slug` | `public.blog-post` * | Related posts, **related help** (new) | `/quote` |
| `/search` | `public.search` * | Sector / brand suggestions | sector page |

_*added in this phase._

## Dashboard

| Page | Help pageKey | NBA |
|---|---|---|
| `/dashboard/overview` | `dashboard.overview` | Complete profile |
| `/dashboard/business` | `dashboard.business-profile` | Submit for review |
| `/dashboard/quotes` | `dashboard.quotes` | Send to customer |
| `/dashboard/contracts` | `dashboard.contracts` | Open contract |
| `/contracts/:id` | `dashboard.contract-detail` | Add amendment |
| `/dashboard/work-orders` | `dashboard.work-orders` | Add measurement |
| `/dashboard/procurement` | `dashboard.procurement` | Create RFQ |
| `/dashboard/production` | `dashboard.production` | Move stage |
| `/dashboard/customer-experience` | `dashboard.customer-experience` | Share tracking |
| `/dashboard/warranties` | `dashboard.warranties` | File claim |
| `/dashboard/operations-center` | `dashboard.operations-center` | Open metric |
| `/dashboard/brands` | `dashboard.brands` | Link brand / request brand |

## Admin

| Page | Help pageKey | NBA |
|---|---|---|
| `/admin/provider-review` | `admin.provider-review` | Approve / request changes |
| `/admin/brand-requests` | `admin.brand-requests` | Review request |
| `/admin/operations` | `admin.operations-center` | Open metric |
| `/admin/help` | `admin.help` | Author / publish |

## Invariants

- Every public page that converts has at least one CTA to `/quote`,
  `/sectors`, or `/contact`.
- Every dashboard page that performs a long-running action has a help
  pageKey wired.
- No private link (`/admin`, `/dashboard`) is rendered from a public
  surface (enforced in tests).