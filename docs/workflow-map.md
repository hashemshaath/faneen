# Workflow Map

_Phase: PAGE-PURPOSE-WORKFLOW-CONTEXT-AUDIT-1_

Each workflow lists the canonical page order. Pages outside the canonical
order are listed under **Adjacent**. Missing entries are explicit.

## 1. Public discovery

```
/  →  /search  or  /sectors/:slug  →  /:username (provider profile)  →  /quote
```
Adjacent: `/services/:slug`, `/profile-systems/:slug`, `/projects/:id`, `/compare`.
Help: `customer.portal` (post-quote), `dashboard.overview` (post-signup).
Gaps: search result cards link to provider profile only — `/compare` is reachable through Cmd+K, not a visible CTA. **Logged as backlog; not blocking pilot.**

## 2. Provider onboarding

```
/auth (signup)  →  /onboarding  →  /dashboard
                                    →  /dashboard/business-draft
                                        →  /dashboard/business-edit
                                            →  /dashboard/business-completion
                                                →  /admin/provider-review (admin)
                                                    →  PUBLISHED → /:username
```
Help: `admin.provider-review`, `dashboard.business-profile`, `dashboard.overview`.
Gaps: none — pipeline fully wired post Provider Growth Engine.

## 3. Quotation flow

```
/dashboard/leads          →  /dashboard/provider/leads/:id
/dashboard/rfq/inbox      →  /dashboard/rfq/:id
/dashboard/my-requests    →  /dashboard/my-requests/:id           (customer)
                            ↘ converts to draft contract
                              →  /dashboard/contracts  →  /contracts/:id
```
Help: `dashboard.quotes`, `dashboard.contracts`.
Gaps: none.

## 4. Contract flow

```
Contract draft  →  Party review  →  Approval / signature  →  Active
/dashboard/contracts → /contracts/:id → (signed) → /dashboard/work-orders
```
Customer surface: `/contracts/:id` (token gated for customers).
Help: `dashboard.contracts`, `dashboard.contract-detail`.
Gaps: none.

## 5. Work order flow

```
/dashboard/work-orders
  →  /dashboard/work-orders/:refId
        →  Measurements  →  BOQ  →  Quotation/Procurement
              →  /dashboard/procurement, /dashboard/procurement/:id
        →  Production  →  /dashboard/work-orders/board
        →  Installation  →  Closure  →  Warranty
              →  /dashboard/warranties
```
Help: `dashboard.work-orders`, `dashboard.work-order-detail`, `dashboard.production`, `dashboard.warranties`.
Gaps: none.

## 6. Procurement flow

```
BOQ (from WO)  →  /dashboard/procurement (RFQ)
              →  Supplier quotes  →  Comparison  →  Award
                  →  PO draft → linked to contract / WO
```
Help: `dashboard.procurement`.
Gaps: no dedicated supplier portal — out of scope.

## 7. Customer experience

```
/quote  →  Email link  →  /q/:code (or /client/:refId)
        →  Quotation viewer (token)  →  Approve
        →  /client/:refId portal  →  Appointment  →  Confirmation
        →  Closure  →  Feedback  →  Warranty (`WAR-` ref → portal)
```
Help: `customer.portal`.
Gaps: none.

## 8. Admin governance

```
/admin → /admin/operations
      → /admin/identity / /admin/users
      → /admin/businesses → /admin/provider-review
      → /admin/diagnostics
      → /dashboard/operations-center (cross-link)
```
Help: `admin.identity`, `admin.provider-review`, `admin.operations-center`.
Gaps: none.

## 9. Help & support

```
/help → /help/category/:slug → /help/article/:slug
/dashboard/help (auth contextual home)
Contextual: <HelpLauncher pageKey=…> on every core page
/help/report-issue, /help/feature-request → /admin/help
```
Help: meta — see `contextualHelp.ts`.
Gaps: see `docs/contextual-help-fit-check.md`.

## 10. Observability

```
/dashboard/operations-center
  → System Health card → Run check
  → History snapshots
  → Data Integrity drill-in
  → Alerts (notifications)
```
Help: `admin.operations-center`.
Gaps: none.

## Cross-workflow links verified

- Reference resolver `/r/:refId` covers `WO, TASK, CNT, QTE, LED, BKG, TEAM, STF, BOQ, BOQI, RFQ, PO, WOQ, CONTRACT, QUOTE, NOTE, APT, CLS, WAR, FDB, CPN, CTL, PDE` (see `src/modules/workspace/shell/refRouteMap.ts`).
- Quick Create (sidebar) covers contracts, quotes, work orders, RFQ, report-issue.
- Command palette resolves typed refs via `parseRef()` to canonical surfaces above.