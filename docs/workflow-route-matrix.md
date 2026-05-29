# Workflow Route Matrix

_Last refreshed: APP-STABILITY-CLEANUP-SECURITY-1._

High-signal map of the routes that carry user workflows, the page that
owns each route, the service wrappers it uses, the access level, and
security notes. Use this when reviewing route shadowing, missing
`useNoIndex`, missing `ProtectedRoute`, or PII exposure.

## Public routes

| Route | Owner page | Service wrappers | Access | Security notes |
|-------|------------|------------------|--------|----------------|
| `/q/:code` | `pages/QSlugDispatcher` → `QuotationViewer` (if `?t=<token>`) or `PublicBarcodeResolve` (otherwise) | `modules/workOrders` quotation services, `resolve_barcode` RPC | Public, **noindex** | Dispatcher exists to eliminate the prior `/q/:refId` vs `/q/:barcode_code` route shadowing. Both targets call `useNoIndex()`. No PII, no token rendered. `robots.txt` (static + edge) `Disallow: /q/`. |
| `/s/:token` | `pages/PublicSiteScan` | client-site public RPC | Public, **noindex** | Token-scoped read-only view. |
| `/r/:refId` | `pages/ReferenceResolver` | `modules/reference/services/lookupByReference` | Public | Redirects to the canonical entity page; no PII rendered itself. |
| `/v/c/:number`, `/v/b/:username` | `pages/VerifyContract`, `pages/VerifyBusiness` | identity/verification RPCs | Public | Show only the verified status flag, never raw identifiers. |
| `/invite/:token`, `/staff-invite/:token` | `pages/InviteAccept`, `pages/StaffInviteAccept` | invitation RPCs | Public token | Acceptance requires auth; token is never logged or rendered. |

## Authenticated routes

| Route | Owner page | Service wrappers | Access | Security notes |
|-------|------------|------------------|--------|----------------|
| `/dashboard` | `pages/dashboard/DashboardOverview` | mixed module services | Auth | `ProtectedRoute` + onboarding redirect. |
| `/dashboard/work-orders` | `DashboardWorkOrders` | `modules/workOrders` | Auth | List view — no per-row notes/attachments fetch. |
| `/dashboard/work-orders/board` | `ProductionBoardPage` | `modules/workOrders` board services | Auth | Read-only (drag/drop deferred). |
| `/dashboard/work-orders/:refId` | `DashboardWorkOrderDetail` | `modules/workOrders` | Auth | Detail-only data lazy-loaded. |
| `/dashboard/procurement`, `/dashboard/procurement/:id` | `DashboardProcurement(Detail)` | `modules/procurement` | Auth | RFQ lifecycle via `procurement_award_quote` RPC; no direct table access. |
| `/dashboard/messages`, `/notifications` | dashboard messaging / notifications | `modules/messaging`, `modules/notifications` | Auth | Notifications insert path goes through service wrappers (`notifications-insert-isolation-audit`). |
| `/contracts`, `/contracts/:id` | `pages/Contracts`, `ContractDetail` | `modules/contracts` | Auth | Locking on `Active`; PDF generation is on-demand. |

## Admin routes

| Route | Owner page | Service wrappers | Access | Security notes |
|-------|------------|------------------|--------|----------------|
| `/admin/identity` | `AdminIdentity` | `modules/users` / `modules/identity` (`IdentityActivityFeed` uses a guarded service wrapper — HYGIENE-PROFILES-1) | Admin | Read-only PII surfaces are masked through `lib/masking`. |
| `/admin/businesses` | `AdminBusinesses` | `modules/businesses/services/guardedMutations` | Admin | All sensitive-field writes via the guarded wrappers (`businesses-sensitive-fields-isolation-audit`). |
| `/admin/ai-center`, `/admin/private-sectors`, `/admin/locations/*` | admin pages | matching `modules/*` admin services | Admin | All wrapped in `<ProtectedRoute requireAdmin>`. |

## Routing invariants (enforced by tests)

- Exactly one `/q/*` public route in `App.tsx` (`src/pages/__tests__/qSlugDispatcher.test.ts`).
- `/q/:code` is wired to `QSlugDispatcher`, which dispatches by `?t=` token.
- Legacy patterns `/q/:refId` and `/q/:barcode_code` must not return.
- `QSlugDispatcher` contains no Supabase / storage / `console.*` calls,
  no admin/dashboard imports, and never renders raw `code` / `token`.
- `public/robots.txt` and `supabase/functions/robots/index.ts` both
  `Disallow: /q/` (kept in sync by `robots-sitemap-sync-audit`).
- `scripts/jsonld-snapshots/index.json` only references files that
  exist on disk.

## Out of scope (still deferred)

- Drag/drop on the production board (`BUSINESS-WORKFLOW-PRODUCTION-2`).
- Realtime invalidation on dashboards (`BUSINESS-WORKFLOW-REALTIME-1`).
- Supplier portal, line-item RFQs, PO generation (`BUSINESS-WORKFLOW-PROCUREMENT-3`).
- Inventory module (`BUSINESS-WORKFLOW-INVENTORY-1`).

See `docs/deferred-backlog.md` for the full list.