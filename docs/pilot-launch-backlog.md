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