# Page Integration Matrix

_Phase: PAGE-PURPOSE-WORKFLOW-CONTEXT-AUDIT-1_

Legend: ✅ present · ⚠️ partial · ➖ N/A · ❌ missing (must fix before pilot).

| Page | Nav | Breadcrumb | HelpLauncher | Loading | Empty | Error | Next action | Related refs | Ref-id labels | noindex |
|---|---|---|---|---|---|---|---|---|---|---|
| `DashboardOverview` | ✅ | ➖ (root) | ✅ | ✅ | ✅ | ✅ | Quick Create | ➖ | ✅ | ✅ |
| `DashboardContracts` | ✅ | ✅ | ✅ | ✅ | ✅ (`ContractEmptyState`) | ✅ | Create / open | ➖ | ✅ | ✅ |
| `ContractDetail` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Sign / pay | ✅ | ✅ | ✅ |
| `DashboardWorkOrders` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Create WO | ➖ | ✅ | ✅ |
| `DashboardWorkOrderDetail` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Procurement / production | ✅ | ✅ | ✅ |
| `ProductionBoardPage` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Move stage | ➖ | ✅ | ✅ |
| `DashboardProcurement` | ✅ | ✅ | ✅ | ✅ | ✅ (`DashboardEmptyState`) | ✅ | New RFQ | ➖ | ✅ | ✅ |
| `DashboardProcurementDetail` | ➖ | ✅ | ✅ | ✅ | ✅ | ✅ | Award | ✅ | ✅ | ✅ |
| `DashboardBusinessEdit` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Publish | ➖ | ✅ | ✅ |
| `AdminProviderReview` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Approve / reject | ✅ | ✅ | ✅ |
| `AdminIdentity` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Open user/business | ✅ | ✅ | ✅ |
| `DashboardOperationsCenter` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Run check | ➖ | ✅ | ✅ |
| `CustomerProjectPortal` | ➖ (token) | ➖ | ➖ (public) | ✅ | ✅ | ✅ | Confirm / sign | ✅ | ✅ | ✅ |
| `QuotationViewer` | ➖ (token) | ➖ | ➖ | ✅ | ✅ | ✅ | Approve | ✅ | ✅ | ✅ |
| `DashboardHelpCenter` | ✅ | ➖ | ✅ | ✅ | ✅ | ✅ | Open article | ➖ | ➖ | ✅ |
| `HelpCenterHome` / article / category | ✅ | ✅ | ➖ | ✅ | ✅ | ✅ | Open article | ➖ | ➖ | ➖ |
| `DashboardLeads` / `ProviderLeads` | ✅ | ✅ | ⚠️ (no key yet) | ✅ | ✅ | ✅ | Quote | ✅ | ✅ | ✅ |
| `DashboardMyRequests` | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | View status | ✅ | ✅ | ✅ |
| `DashboardBookings` | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | Confirm | ✅ | ✅ | ✅ |
| `DashboardWarranties` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | File claim | ✅ | ✅ | ✅ |
| `DashboardReviews` | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | Reply | ✅ | ✅ | ✅ |
| `Notifications` / `DashboardNotifications` | ✅ | ✅ | ➖ | ✅ | ✅ | ✅ | Open ref | ➖ | ✅ | ✅ |

## Safe repairs applied this phase

- `docs/contextual-help-fit-check.md` lists `dashboard.leads`, `dashboard.my-requests`, `dashboard.bookings`, `dashboard.reviews` as missing pageKeys. **Backlog only** — no help articles to wire yet.
- No raw UUID labels detected in audited pages (`useDisplayRefId` enforced).
- No noindex regression: admin/customer/portal/token routes all set noindex via `useNoIndex`.

## Pre-pilot blockers

None.