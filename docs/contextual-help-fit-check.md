# Contextual Help Fit Check

_Phase: PAGE-PURPOSE-WORKFLOW-CONTEXT-AUDIT-1_
_Sources_: `src/components/help/HelpLauncherFloating.tsx` (route→pageKey map)
and `src/modules/helpCenter/contextualHelp.ts` (pageKey→articles map).

## Coverage matrix

| Page | pageKey wired | Articles present | Status |
|---|---|---|---|
| `/dashboard/work-orders` | `dashboard.work-orders` | 5 | ✅ |
| `/dashboard/work-orders/:refId` | `dashboard.work-order-detail` | 3 | ✅ |
| `/dashboard/work-orders/board` | `dashboard.production-board` | — | ⚠️ pageKey wired, no articles yet (backlog) |
| `/dashboard/procurement` | `dashboard.procurement` | 5 | ✅ |
| `/dashboard/procurement/:id` | `dashboard.procurement-detail` | — | ⚠️ pageKey wired, no articles yet |
| `/dashboard/contracts` | `dashboard.contracts` | 5 | ✅ |
| `/contracts/:id` | `dashboard.contract-detail` | 4 | ✅ |
| `/dashboard/business` (edit) | `dashboard.business-profile` | — | ⚠️ no articles |
| `/dashboard/staff` | `dashboard.staff` | — | ⚠️ no articles |
| `/dashboard/operations-center` | not in map | — | ❌ **safe-repair candidate** below |
| `/dashboard/help` | `admin.help` | 2 | ✅ |
| `/admin/identity` | `admin.identity` | 3 | ✅ |
| `/admin/provider-review` | `admin.provider-review` | 3 | ✅ |
| `/admin/businesses` | `admin.identity` | 3 | ✅ |
| `/admin/operations` | `admin.operations-center` | 4 | ✅ |
| `/admin/help` | `admin.help` | 2 | ✅ |
| `/customer/projects/:token`, `/q/:token`, `/quote/:id` | `customer.portal` | 5 | ✅ |

## Backlog (articles to author)

- `dashboard.production-board` — production board mechanics.
- `dashboard.procurement-detail` — award & PO creation.
- `dashboard.business-profile` — completion gating.
- `dashboard.staff` — invites, roles, RLS.
- `dashboard.leads`, `dashboard.my-requests`, `dashboard.bookings`, `dashboard.reviews` — currently lack pageKeys; create when articles are ready.

## Safe repair applied this phase

Added a `dashboard.operations-center` mapping so the floating launcher
now surfaces observability articles on `/dashboard/operations-center`.
(See change in `src/components/help/HelpLauncherFloating.tsx`.)

## Mismatch audit

No mismatched topics detected (e.g. contract pages don't show RFQ articles).
Mapping enforced via test in `src/tests/pagePurposeWorkflowContextAudit1.test.ts`.