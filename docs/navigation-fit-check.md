# Navigation Fit Check

_Phase: PAGE-PURPOSE-WORKFLOW-CONTEXT-AUDIT-1_
_Baseline_: sidebar architecture from `src/components/dashboard/DashboardSidebar.tsx`
and `src/components/dashboard/navigation/menuArchitecture.ts` (recommended order).

## Group placement (provider/manager view)

| Sidebar group (AR / EN) | Pages | Fit | Notes |
|---|---|---|---|
| الرئيسية / Overview | `/dashboard`, `/dashboard/operations-center` | ✅ | Health card pinned. |
| المبيعات والعملاء / Sales & Customers | `/dashboard/leads`, `/clients`, `/provider/leads`, `/my-requests`, `/rfq/inbox` | ✅ | RFQ inbox correctly placed here, not Procurement. |
| العقود والتنفيذ / Contracts & Execution | `/dashboard/contracts`, `/dashboard/work-orders`, `/work-orders/overview`, `/work-orders/board` | ✅ | Detail (`:refId`) reached from list (no nav entry needed). |
| التشغيل والإنتاج / Production & Operations | `/dashboard/work-orders/board`, `/dashboard/operations`, `/dashboard/operations/feed` | ✅ | Operations snapshot kept distinct from Observability. |
| المشتريات / Procurement | `/dashboard/procurement` | ✅ | Detail reached from list. |
| الجودة وتجربة العميل / Quality & CX | `/dashboard/reviews`, `/dashboard/warranties`, `/dashboard/bookings` | ✅ | |
| النمو والتسويق / Growth & Marketing | `/dashboard/promotions`, `/dashboard/portfolio`, `/dashboard/showcase`, `/dashboard/badge`, `/dashboard/loyalty` | ✅ | Badge correctly grouped with growth. |
| الإدارة / Administration | provider-specific: `/dashboard/business-edit`, `/dashboard/business-completion`, `/dashboard/private-sectors`, `/dashboard/provider/membership`, `/dashboard/provider/service-areas` | ✅ | |
| المساعدة / Help | `/dashboard/help`, `/help` | ✅ | |
| الإعدادات / Settings | `/dashboard/settings`, `/settings/staff`, `/dashboard/profile`, `/dashboard/communication-preferences` | ✅ | |

## Quick Create check

`menuArchitecture.quickCreateActions` ships 5 actions (contracts, quotes, work orders, RFQ, report-issue).
All targets resolve to live routes (verified by `navigationArchitectureRebuild1.test.ts`). Roles: providers + admins see all; end-users see only `report-issue`.

## Admin sidebar

| Group | Fit | Notes |
|---|---|---|
| Identity | ✅ | `AdminIdentity` rename verified (no "هوية" strings in nav). |
| Businesses | ✅ | Provider review pinned. |
| Contracts | ✅ | Templates + analytics adjacent. |
| Memberships | ✅ | Four sub-routes grouped. |
| Operations | ✅ | Operations Console adjacent to Operations. |
| Content & SEO | ✅ | |
| Communications | ✅ | Contact-center tabs replace 4 deprecated pages. |
| Locations | ✅ | Hub + 3 sub-pages. |
| Reference | ✅ | Triage + inspector reachable. |
| AI & System | ✅ | Super-admin gated. |

## Items intentionally NOT in sidebar

- Detail pages (`/:refId`, `/:id`) — reached from lists.
- Token routes (`/q/:code`, `/s/:token`, `/client/:refId`, `/r/:refId`) — context-only.
- Static legal/marketing — footer only.
- Customer surfaces inside auth shell (`/contracts/:id` for customer signers) — reached via email link.

## Adjustments recommended (non-blocking)

- Add a Cmd+K-only entry for `/compare` and `/compare-profiles` so power users can jump directly. (Backlog.)
- Consider renaming sidebar label "Operations" → "Daily Ops" to disambiguate from Observability's "Operations Center". (Backlog.)

## Result

Sidebar IA matches recommended order with zero dead links (verified by `broken-links-audit.mjs` last green run + new test below).