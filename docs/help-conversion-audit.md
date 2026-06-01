# Help → Product Conversion Audit — UX-REDESIGN-7

_Phase: UX-REDESIGN-7 / Part E_

Reviewed every published help article surface (`HelpArticlePage.tsx`)
against the workflow continuation contract: each article must offer a
**next action**, **related articles**, and a clear **workflow
continuation** into the product.

## Per-article coverage

| Block | Status |
|---|---|
| Related articles (sidebar + bottom) | ✅ existing (via `findRelatedArticles`) |
| Prev / Next within category | ✅ existing |
| Helpful vote + feedback note | ✅ existing |
| Report-issue link on negative vote | ✅ existing |
| **Next best action card** (slug → product route) | ✅ added this phase |
| Bookmark + share + print | ✅ existing |

## Slug → product route mapping

Defined in `src/modules/helpCenter/nextBestAction.ts`. Examples:

| Slug | Target | Reason |
|---|---|---|
| `create-business` / `edit-business` / `completeness` / `how-publishing-works` | `/dashboard/business` | publishing workflow |
| `what-is-wo` / `wo-boq` / `wo-rfq` / `wo-production` / `measurements` | `/dashboard/work-orders` | work-order ops |
| `what-is-rfq` / `create-rfq` / `supplier-quotes` / `award` / `po-draft` | `/dashboard/procurement` | RFQ flow |
| `contract-lifecycle` / `payments` / `vat` / `amendments` / `export-pdf` | `/dashboard/contracts` | contracts |
| `create-quote` / `quote-to-contract` / `quote-pdf` / `quote-validity` | `/dashboard/quotes` | quotation |
| `warranty-start` / `coverage` / `file-claim` / `warranty-expiry` | `/dashboard/warranties` | warranty |
| `lead-credits` | `/dashboard/membership` | provider growth |
| `provider-link-brands` / `request-new-brand` / `brand-request-review` | `/dashboard/brands` | brand ops |
| `tracking-link` / `what-you-see` / `privacy` / `support` / `confirm` | `/contact` | customer self-serve |
| `identity-overview` / `approve-providers` / `diagnostics` | `/admin/provider-review` | admin |
| `brands-overview` / `brands-rfq-discovery` | `/quote` | discovery → conversion |
| default (unknown / general) | `/sectors` | safe public fallback |

## Workflow continuation invariants

- Every article renders **at most one** NBA card (no clutter).
- NBA route is always a real route — `/dashboard/*` for provider/admin
  audiences, `/quote` / `/sectors` / `/contact` for general/customer.
- No NBA card promises pricing or execution outcomes.
- Admin NBA points to `/admin/*` only when the article is admin-audience.

## Orphan check

- No published article without related articles (sidebar always shows
  fallback when category siblings are sparse).
- No published article without an NBA target (default falls back to
  `/sectors`).