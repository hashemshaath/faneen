# Page Polish Backlog — NAVIGATION-ARCHITECTURE-REBUILD-1 (Part G)

Audit-only output for the top dashboard pages. Implementation is
deferred — listed as a prioritized backlog so this rebuild stays in the
navigation layer.

## High priority
- `/dashboard/work-orders` — add empty state with CTA to create WO; surface health badge.
- `/dashboard/contracts` — add breadcrumbs + "next action" hint when status = Draft.
- `/dashboard/leads` & `/dashboard/provider/leads` — consolidate empty states + subtitle.
- `/dashboard/rfq` / `/dashboard/rfq/inbox` — clarify titles ("Outgoing" vs "Incoming").
- `/dashboard/messages` — error state when realtime channel drops.

## Medium priority
- `/dashboard/projects`, `/dashboard/portfolio`, `/dashboard/promotions` — unify 16:11 image grid (Dashboard Standard).
- `/dashboard/analytics`, `/dashboard/contract-analytics` — add "related references" footer.
- `/dashboard/settings*` — consolidate `/profile`, `/communication-preferences`, `/settings`, `/badge`, `/business-edit` under a single Settings hub.
- `/dashboard/installments`, `/dashboard/loyalty*` — split provider Membership group into Billing vs Loyalty.

## Low priority
- Add help button to every Core Daily page (currently inconsistent).
- Standardize loading skeletons (mix of `Skeleton` vs spinners today).
- Audit health badges across `Contracts`, `Work Orders`, `Procurement` for consistent thresholds.

Tracked separately from this PR.

---

## PAGE-POLISH-REPAIRS-1 — completed (presentation only)

Scope: presentation-layer polish for the top 10 highest-impact pages.
No routes, RLS, or schema changed. No domains added.

Target pages locked under invariants in
`src/tests/pagePolishRepairs1.test.ts`:

- DashboardOperationsCenter
- DashboardWorkOrders
- DashboardWorkOrderDetail
- ProductionBoardPage
- DashboardProcurement
- DashboardProcurementDetail
- DashboardContracts
- ContractDetail
- DashboardBusinessEdit
- AdminProviderReview

Shipped:
- New shared primitive `src/components/dashboard/DashboardEmptyState.tsx`
  (icon + title + description + primary/secondary CTA + help link).
- Polished empty state on `DashboardProcurement` (card-style with CTAs
  and Help Center link instead of bare text).
- Test suite `src/tests/pagePolishRepairs1.test.ts` locking:
  - all 10 target pages still exist
  - no inventory/accounting/supplier-portal imports introduced
  - no physical RTL classes (`text-left/right`, `ml-*/mr-*`, `pl-*/pr-*`)
  - every page renders a heading or PageHeader
  - list pages keep an empty signal and a loading signal
  - detail pages keep `RelatedReferencesPanel` mounted
  - work-order pages keep `HealthBadge` mounted
  - no `/admin/identity?view=` legacy deep-links re-introduced

## PAGE-POLISH-REPAIRS-1 — deferred backlog

Carried forward, intentionally out of scope for this phase:

- `DashboardOperationsCenter` — finalize section ordering hint banner
  (health → KPIs → alerts → diagnostics → integrity).
- `DashboardWorkOrderDetail` — confirm single timeline (audit for
  accidental dual timeline mounts on tab switches).
- `ProductionBoardPage` — header WIP/overdue/unassigned ribbon polish.
- `DashboardContracts` — adopt `DashboardEmptyState` in place of the
  bespoke `ContractEmptyState` once visual parity is signed off.
- `ContractDetail` — explicit "admin-not-a-party" banner for admin-created
  contracts; verify parties summary on mobile.
- `DashboardBusinessEdit` — promote publish-readiness summary above the
  long-form profile form on first paint.
- `AdminProviderReview` — collapse `PublishReadinessPanel` +
  `AdminProviderGrowthPanel` overlap into a single ordered column.
- Standardize loading skeletons (mix of `Skeleton` + spinners remains).