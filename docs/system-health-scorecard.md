# System Health Scorecard

_BUSINESS-SYSTEMS-ARCHITECTURE-AUDIT-1 — Phase I._

Derived from `docs/system-maturity-matrix.md` aggregate scores, then
adjusted for integration completeness (Phase F) and notification coverage
(Phase E).

Status legend:
- **Production Ready** ≥ 85 with no integration gaps
- **Needs Hardening** 75–84 — ship for pilot, monitor closely
- **Needs Integration** any score but with one or more open integration gaps
- **Needs Cleanup** 65–74 with notification or reporting gaps
- **Needs Rebuild** < 65

| System              | Score | Status              |
|---------------------|-------|---------------------|
| Contracts           | 90    | Production Ready    |
| Memberships/Credits | 89    | Production Ready    |
| Leads               | 89    | Production Ready    |
| Notifications       | 89    | Production Ready    |
| Businesses          | 88    | Production Ready    |
| Identity & Roles    | 87    | Production Ready    |
| Help Center         | 87    | Production Ready    |
| Work Orders         | 86    | Production Ready    |
| Reference Resolver  | 86    | Production Ready    |
| Messaging           | 84    | Needs Hardening     |
| Quotations          | 83    | Needs Hardening     |
| Quote Requests      | 83    | Needs Hardening     |
| Provider Directory  | 83    | Needs Hardening     |
| Provider Review     | 83    | Needs Hardening     |
| Operations Center   | 83    | Needs Hardening     |
| Transactional Email | 83    | Needs Hardening     |
| Procurement         | 82    | Needs Integration   | (BOQ→Procurement auto-gen) |
| Provider Growth     | 81    | Needs Hardening     |
| Observability       | 81    | Needs Hardening     |
| Customer Tracking   | 80    | Needs Hardening     |
| Installation Appts  | 80    | Needs Hardening     |
| SEO Surface         | 80    | Needs Hardening     |
| Help Assistant      | 80    | Needs Hardening     |
| Client Sites        | 80    | Needs Hardening     |
| Files / Storage     | 80    | Needs Hardening     |
| Project Closure     | 79    | Needs Integration   | (closure→NPS auto request) |
| International       | 79    | Needs Hardening     |
| Contact Center      | 79    | Needs Hardening     |
| Catalog & Categories| 78    | Needs Hardening     |
| Barcodes            | 77    | Needs Hardening     |
| Measurements & BOQ  | 76    | Needs Integration   | (auto-gen to procurement) |
| Production Board    | 76    | Needs Hardening     |
| Blog                | 76    | Needs Hardening     |
| Supplier Quotes     | 76    | Needs Hardening     |
| Analytics           | 76    | Needs Cleanup       | (reporting depth) |
| Bookings            | 75    | Needs Hardening     |
| Warranty            | 75    | Needs Integration   | (resolved→NPS) |
| Feedback / NPS      | 74    | Needs Cleanup       | (no admin nudge) |
| Workspace State     | 73    | Needs Cleanup       |
| Loyalty             | 68    | Needs Cleanup       |
| Installments / BNPL | 66    | Needs Cleanup       |
| Purchase Orders     | 45    | Needs Rebuild       | (scaffold only — v2) |

## Risk ranking

**Highest-risk (must monitor in pilot)**
1. Purchase Orders — no dedicated UI; rely on WO comments
2. Installments / BNPL — payment provider integration is pilot-only
3. Loyalty — minimal customer surfaces
4. Procurement → WO handoff — single comment thread
5. Warranty claim resolution — no NPS re-prompt

**Highest-opportunity (small repair, big payoff)**
1. Closure → NPS auto-request hook
2. `work_order_assigned` email template
3. NPS admin notification
4. BOQ → Procurement auto-generation helper
5. Supplier Quote comparison reporting depth

## Recommended execution order
1. Pilot launch with current scorecard. No new modules.
2. Phase J safe repairs (this loop).
3. After 2 weeks of pilot, address top-3 opportunities above.
4. v2 epic: Purchase Orders + Inventory + Supplier Payments.