# Pilot Launch Backlog

_Live log — append findings as the pilot runs._
_Phase: PILOT-LAUNCH-OPERATIONS-1_

## How to use

1. Add one row per finding the moment it is observed.
2. Classify: `bug | copy | help | perf | ux | data | infra`.
3. Severity: `S1 blocker | S2 high | S3 medium | S4 low`.
4. Status: `open | in-progress | fixed | wontfix | deferred`.
5. Link the source: observability snapshot id, help issue ref, log line, or screenshot path.

## Backlog

| Date | Source | Class | Severity | Page / area | Finding | Proposed fix | Status |
|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | — | — | — | — | — | — | open |

## Weekly review template

Copy this block every Monday.

### Week of YYYY-MM-DD

**Funnel deltas**
- Provider signups: …
- Approved providers: …
- RFQs submitted: …
- Quotes sent: …
- Contracts signed: …
- Work orders completed: …
- Customer portal visits: …

**Health**
- Avg observability score: …
- Email DLQ rate: …
- Top 3 errors: …

**Top findings this week**
1. …
2. …
3. …

**Decisions**
- …

**Promoted to next sprint**
- …

## Known deferred (from earlier phases)

| Item | Source phase | Why deferred |
|---|---|---|
| `/compare` entry-point CTA in search results | PAGE-PURPOSE-… | Backlog — not pilot-blocking |
| Rename "Operations" sidebar label → "Daily Ops" | PAGE-PURPOSE-… | Wait for pilot feedback |
| Help articles for `production-board`, `procurement-detail`, `business-profile`, `staff` | PAGE-POLISH-1 | Author during pilot |
| Help pageKeys for leads / my-requests / bookings / reviews | PAGE-PURPOSE-… | Add once articles exist |
| `/sector/:slug` deprecation | PAGE-PURPOSE-… | Needs SEO redirect proof |
| `/dashboard/operations` vs `operations-center` merge consideration | PAGE-PURPOSE-… | Distinct purpose; revisit post-pilot |

## BUSINESS-HARDENING-1 follow-through (wire during pilot week 1)

| Ticket | Part | Description |
|---|---|---|
| HARDENING-1-A | A | Fan-out admin notification on `customer.nps_submitted` (owner + active managers, no PII). |
| HARDENING-1-B | B | Register `work-order-assigned` AR/EN email template + dispatcher wiring. |
| HARDENING-1-C | C | Insert `skipped_no_recipients` notification_events row when quote expires without recipients. |
| HARDENING-1-D | D | Closure → idempotent `nps_request_pending` portal prompt (key: `contract_id`+`nps_request`). |
| HARDENING-1-E | E | Warranty resolved → `nps_followup_pending` portal prompt, 90-day suppression. |
| HARDENING-1-F | F | BOQ screen next-best-action card + procurement empty-state copy. |
| HARDENING-1-G | G | Verify `executeAwardHandoff` single-comment idempotency under re-award. |
| HARDENING-1-H | H | Add `skipped_no_recipients` metric to Operations Center system-health card. |