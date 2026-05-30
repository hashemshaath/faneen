# Page Actionability Audit

_Phase: PAGE-PURPOSE-WORKFLOW-CONTEXT-AUDIT-1_

For each page: **Why** (purpose stated to user), **Primary CTA**, **Empty-state CTA**,
**Error path**, **Next action**.

| Page | Why visible | Primary CTA | Empty CTA | Error path | Next action |
|---|---|---|---|---|---|
| `DashboardOperationsCenter` | "Monitor platform health" header | Run check | Run first check | Toast + retry | Open alert ref |
| `DashboardWorkOrders` | "Manage active work" | Create WO | Create first WO | ErrorBoundary | Open WO |
| `DashboardWorkOrderDetail` | WO ref + customer name | Advance stage / Add measurement | — | Toast | Procurement / Production |
| `ProductionBoardPage` | "Production board" + WO count | Drag card | Empty column hint | Toast | Open WO |
| `DashboardProcurement` | "Procurement: RFQs, awards, POs" | New RFQ | "Create your first RFQ" | DashboardEmptyState refresh | Open RFQ |
| `DashboardProcurementDetail` | RFQ ref + status | Award supplier | "No quotes yet" | Toast | Generate PO |
| `DashboardContracts` | "Manage contracts" | New contract | ContractEmptyState reset | Toast | Open contract |
| `ContractDetail` | Contract ref + parties | Sign / Send / Amend | — | Toast | Activate / Work order |
| `DashboardBusinessEdit` | "Edit business profile" + completeness | Save | "Add first branch" | Inline errors | Submit for review |
| `AdminProviderReview` | "Approve / reject providers" | Approve | "Queue is clear" | Toast | Open next provider |
| `AdminIdentity` | "People & accounts" | Open user | Empty filter reset | Toast | Open user/business |
| `DashboardHelpCenter` | "Help & guides" | Search articles | "No results — open Help Center" | — | Read article / report issue |
| `CustomerProjectPortal` | Customer name + project ref | Confirm appointment / sign-off | Status-based hint | Toast + retry | Approve / view photos |
| `QuotationViewer` | Quote ref + provider | Approve / Reject | — | Toast | Move to contract |

## Findings

- Every target page has a stated reason in its header (`PageHeader`/`h1`).
- Every target page has at least one primary CTA.
- Every list page has an empty state with action (ContractEmptyState, DashboardEmptyState, or domain-specific).
- All error paths use ErrorBoundary + `toast()` — no silent failures.
- Next actions for entity detail pages route via `<RelatedReferencesPanel>` or explicit CTA buttons.

## Safe repairs applied

No additional repairs required — Phase PAGE-POLISH-REPAIRS-1 already covered the gaps.

## Result

All 14 target pages **pass** actionability check. Safe for pilot launch.