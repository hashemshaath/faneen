# SOFT LAUNCH REAL EXECUTION — First RFQ Live Run

**Status:** 🔴 Not executed yet. No row exists in `quote_requests` or `rfq_requests` (count = 0).

The first live RFQ must be submitted by the Launch Operator from an internal test customer account, against a Tier A provider matched by sector + city. This document is the recording sheet.

## Run Record

| Field | Value |
|-------|-------|
| Submission timestamp (UTC) | PENDING |
| Customer type | PENDING |
| Sector | PENDING |
| City | PENDING |
| Files uploaded? (count/type) | PENDING |
| RFQ created in DB? (`quote_requests.id`) | PENDING |
| Appears in admin operations center? | PENDING |
| Email to customer sent? (template + status) | PENDING |
| `email_send_log` shows `provider=resend` + `provider_id`? | PENDING |
| Provider match found? (which providers) | PENDING |
| Lead/notification dispatched to provider? | PENDING |
| Visible in provider dashboard? | PENDING |
| Any errors? (link to logs) | PENDING |
| Any duplicate row / duplicate email? | PENDING |
| Manual intervention required? | PENDING |

## Decision Matrix

- **GO** — all flow checkpoints green, no duplicates, no leaks.
- **HOLD** — any breakage in email, RFQ persistence, admin visibility, or provider dashboard.
- **FIX BEFORE CONTINUING** — any duplicate, any data leak, any failed send to a real recipient.

## Current Decision

`HOLD — first RFQ not executed; Tier A + customer cohorts empty`.
</file>