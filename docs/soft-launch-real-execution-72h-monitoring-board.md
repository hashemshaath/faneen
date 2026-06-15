# SOFT LAUNCH REAL EXECUTION — 72h Monitoring Board

**Window start:** Set on first live RFQ submission (currently `T0 = PENDING`).
**Window end:** `T0 + 72h`.

## Targets vs Observed

| المؤشر | الهدف (أول 72 ساعة) | Observed | Source |
|--------|----------------------|----------|--------|
| عدد RFQs | 3–5 | 0 | `select count(*) from quote_requests where created_at >= T0` |
| RFQ submit success | 100% | n/a | `quote_request_events` |
| Email sent success | ≥ 95% | n/a | `email_send_log` deduped by `message_id` |
| Duplicate emails | 0 | 0 | grouped by `message_id` |
| Duplicate RFQs | 0 | 0 | grouped by `(customer_id, sector, created_at::date)` |
| Provider response | ≥ 30% | n/a | `lead_request_events` reply rate |
| Admin review SLA | < 24h | n/a | first admin activity per RFQ |
| فشل رفع الملفات | 0–1 | n/a | `quote_request_files` errors |
| شكاوى العملاء | 0–2 | n/a | `help_issue_reports` |
| مشاكل دخول | 0–2 | n/a | `auth_logs` + support inbox |

## Refresh Cadence

- Hour +1: email + RFQ persistence sanity.
- Hour +6: provider response check.
- Hour +24: SLA + duplicate review.
- Hour +48 / +72: full sweep, write Go/Hold decision in section below.

## Operator Sign-off

| Slot | Operator | Note |
|------|----------|------|
| Day 0 | PENDING | |
| Day 1 AM | PENDING | |
| Day 1 PM | PENDING | |
| Day 2 | PENDING | |
| Day 3 | PENDING | |

## 72h Decision

- [ ] `GO TO DAY 1 PILOT`
- [ ] `HOLD — FIX BEFORE CONTINUING`
- [ ] `LIMITED GO — ONLY INTERNAL RFQS`

Decision + reason: PENDING (window not started).
</file>