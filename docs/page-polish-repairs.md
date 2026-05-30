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