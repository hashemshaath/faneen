# BUSINESS-OPERATIONS-2A — SLA, Overdue, and Escalation Architecture

Status: **Audit + architecture only.** No production behavior changes, no new
cron jobs, no new tables, no notifications dispatched, no RLS changes, and no
destructive migrations are introduced in this phase. This document defines
the target SLA / escalation model for the platform and is the source of truth
for future phases (2B table + wrappers, 2C dry-run cron, 2D notification
dispatch, 2E admin operations dashboard).

Reference: builds on `docs/business-operations-lifecycle.md` (canonical
lifecycle states from 1A) and the existing `cron_run_log` observability
surface (see `docs/edge-cron-inventory.md`).

---

## 1. SLA matrix

Thresholds are first-cut defaults intended to be tunable via
`system_settings` (proposed key `operations.sla.*`) in phase 2B. All times
are computed in UTC against `triggered_at` / entity timestamps. "Business
hours" is **not** applied in 2A — every threshold is wall-clock for
simplicity and predictability.

### 1.1 Leads / quote requests

| Condition                                  | Threshold | Severity | Owner          | Suggested action            |
|--------------------------------------------|-----------|----------|----------------|-----------------------------|
| New lead `submitted` not `viewed`          | 24 h      | warning  | provider       | Nudge provider              |
| `viewed` but not `contacted`               | 48 h      | warning  | provider       | Nudge provider              |
| `contacted` but no quote sent              | 72 h      | overdue  | provider       | Escalate to manager         |
| Quote request awaiting customer reply      | 5 d       | info     | client         | Reminder to client          |
| Customer waiting > 7 d after quote sent    | 7 d       | overdue  | provider       | Re-engagement nudge         |

### 1.2 Staff invitations

| Condition                                  | Threshold | Severity | Owner    | Suggested action            |
|--------------------------------------------|-----------|----------|----------|-----------------------------|
| `pending_acceptance` not accepted          | 7 d       | warning  | inviter  | Resend or revoke            |
| Invitation expired (TTL elapsed)           | 14 d      | overdue  | inviter  | Mark expired, suggest reinvite |
| Repeated invite failures (≥3 send errors)  | n/a       | critical | admin    | Investigate delivery infra  |

### 1.3 Contracts

| Condition                                  | Threshold | Severity | Owner    | Suggested action            |
|--------------------------------------------|-----------|----------|----------|-----------------------------|
| `pending_signature` not signed             | 7 d       | warning  | both     | Reminder to counterparty    |
| Active contract `end_date` within 30 d     | 30 d      | info     | both     | Renewal nudge               |
| `end_date` passed, status still `active`   | 0 d after | overdue  | system   | Auto-flag for completion    |
| `disputed` without action                  | 3 d       | critical | admin    | Escalate to ops             |

### 1.4 Business verification

| Condition                                  | Threshold | Severity | Owner    | Suggested action            |
|--------------------------------------------|-----------|----------|----------|-----------------------------|
| `pending_verification` aging               | 3 d       | warning  | admin    | Assign reviewer             |
| Rejected without `rejection_reason`        | n/a       | critical | admin    | Data integrity alert        |
| Flagged entity not reviewed                | 24 h      | overdue  | admin    | Assign moderator            |

### 1.5 Membership / payments

| Condition                                  | Threshold | Severity | Owner    | Suggested action            |
|--------------------------------------------|-----------|----------|----------|-----------------------------|
| Payment intent `pending`                   | 1 h       | warning  | system   | Re-check provider           |
| Subscription `past_due`                    | 3 d       | overdue  | finance  | Retry / dunning             |
| Failed payment not reconciled              | 24 h      | critical | finance  | Manual reconciliation       |
| Refund event not reviewed                  | 48 h      | warning  | finance  | Acknowledge in ops UI       |

### 1.6 Contact / support

| Condition                                  | Threshold | Severity | Owner    | Suggested action            |
|--------------------------------------------|-----------|----------|----------|-----------------------------|
| Ticket without first response              | 4 h       | warning  | admin    | Triage                      |
| High-priority ticket pending               | 1 h       | critical | admin    | Page on-call                |
| Repeated contact webhook failures          | n/a       | critical | admin    | Investigate webhook         |

---

## 2. Escalation levels

| Level | Name         | Audience                         | Channel(s)                  |
|-------|--------------|----------------------------------|-----------------------------|
| L0    | Informational| Owner of entity                  | In-app only                 |
| L1    | Warning      | Owner + business manager         | In-app + digest email       |
| L2    | Overdue      | Owner + business manager + admin | In-app + direct email       |
| L3    | Critical     | Admin / super_admin              | In-app + direct email + ops dashboard pin |

Promotion rules: an alert promotes one level after each additional threshold
window passes without `acknowledged_at` or `resolved_at` being set, capped
at L3.

---

## 3. Notification policy

- **Recipients** are resolved from the entity's owner (`businesses.user_id`
  or `business_staff` owner/manager) plus admins for L3.
- **Quiet hours** (proposed): no L0/L1 dispatch between 22:00–07:00 in the
  recipient's locale; L2/L3 always send.
- **Max frequency:** at most one alert per `(domain, entity_id, severity)`
  per 24 h. Promotion to a higher severity resets the window once.
- **Dedupe / idempotency key:**
  `sla:{domain}:{entity_id}:{condition_code}:{yyyy-mm-dd}` for daily alerts,
  and `sla:{domain}:{entity_id}:{condition_code}:{epoch_hour}` for hourly
  alerts. Stored on `operational_alerts.idempotency_key` (UNIQUE).
- **Channel routing** reuses the existing `createNotification` wrapper for
  in-app and the existing transactional email infrastructure for email; no
  new channels introduced in 2A.

---

## 4. Automation design

- **Cron frequency:** one consolidated job, every 15 minutes, scanning
  active domains via narrow indexed queries. Hourly/daily conditions are
  filtered inside the job.
- **Query strategy:** per-domain select with `LIMIT 500` and a stable
  ordering on `(updated_at ASC, id ASC)` to support resumable scans.
- **Dry-run mode:** the first deployable iteration (phase 2C) runs with
  `OPERATIONS_SLA_DRY_RUN=true`, which writes to `operational_alerts` but
  **does not** dispatch notifications. Output is reviewable via the admin
  ops dashboard and `cron_run_log.summary`.
- **`cron_run_log` integration:** every run records `job_name='sla-sweep'`,
  `function_name`, `started_at`, `finished_at`, `ok`, `status`, and a
  `summary` JSON containing per-domain counts (`scanned`, `created`,
  `promoted`, `skipped_idempotent`, `errors`).
- **No duplicate alerts:** enforced by the UNIQUE `idempotency_key` plus an
  in-job check before insert.
- **Retry behavior:** transient errors are logged with `error_code` and
  retried on the next tick; no in-loop retries. Hard failures abort the
  current domain but continue with the next.

---

## 5. Data model proposal

New table (deferred to phase 2B):

```
public.operational_alerts (
  id                uuid primary key default gen_random_uuid(),
  ref_id            text unique,                 -- ALR-NNNNNNN
  domain            text not null,               -- 'lead' | 'staff' | 'contract' | 'business' | 'payment' | 'support'
  entity_type       text not null,               -- e.g. 'quote_requests'
  entity_id         uuid not null,
  condition_code    text not null,               -- e.g. 'lead.viewed_not_contacted_48h'
  severity          text not null,               -- 'info' | 'warning' | 'overdue' | 'critical'
  status            text not null default 'open',-- 'open' | 'acknowledged' | 'resolved' | 'dismissed'
  title_ar          text not null,
  title_en          text not null,
  message_ar        text not null,
  message_en        text not null,
  owner_user_id     uuid,                        -- nullable for system-owned alerts
  owner_business_id uuid,
  due_at            timestamptz,
  triggered_at      timestamptz not null default now(),
  acknowledged_at   timestamptz,
  acknowledged_by   uuid,
  resolved_at       timestamptz,
  resolved_by       uuid,
  idempotency_key   text not null unique,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
```

Indexes (proposed): `(status, severity, triggered_at desc)`,
`(domain, entity_id)`, `(owner_business_id, status)`,
`(owner_user_id, status)`.

RLS sketch (deferred to 2B):
- `service_role`: ALL.
- `admin` / `super_admin` (via `has_role`): full read; update for
  acknowledge / resolve.
- Owner (`auth.uid() = owner_user_id` or owner of `owner_business_id` via
  `business_staff`): read + acknowledge their own alerts only.
- `anon`: no access.

---

## 6. Admin UI proposal

Route: `/admin/operations` (admin-only, behind existing admin layout and
`useNoIndex`).

Sections:
- **KPIs row:** open alerts by severity, MTTR, alerts created today.
- **Filters:** severity, status, domain, owner_business_id, date range.
- **Table:** ref_id, domain, condition, severity, owner, triggered_at,
  age, actions (acknowledge, resolve, open entity via `/r/{REF}`).
- **Detail drawer:** metadata, related entity link, history (status
  transitions), notification dispatch log.

Bilingual via existing `<Bi>` primitives. No popups (inline drawer per
project UX constraint).

---

## 7. Safety constraints

- **No alert spam:** UNIQUE idempotency key + 24 h dedupe window +
  per-severity rate limit per recipient.
- **No PII leaks:** alert `message_ar` / `message_en` never include phone,
  email, address, government IDs, or any field tagged sensitive in
  `businesses-sensitive-fields-isolation-audit`. Only `ref_id`s of related
  entities are surfaced.
- **No `provider_intent_id`** ever included in alert payloads or metadata.
- **No tokens / credentials** in metadata (enforced by a server-side
  redaction helper to be added in 2B and asserted by an isolation audit).
- **No synthetic emails / phones** in dispatched notifications — recipients
  are resolved via the existing identity wrappers.
- **No unauthorized entity visibility:** owners only see alerts scoped to
  their `owner_business_id` / `owner_user_id`; cross-tenant exposure is
  blocked by RLS.
- **Quiet hours** for L0/L1 prevent off-hours pings.
- **Dry-run first:** phase 2C ships with dispatch disabled; only `2D`
  enables actual notifications after a one-week observation window.

---

## 8. Risks

- **Recipient resolution drift:** owner mapping for businesses with
  multiple managers needs a deterministic rule. Proposed: notify all
  `owner`/`manager` staff for L1+; primary owner only for L0.
- **Threshold tuning:** initial thresholds are guesses; expect adjustments
  after the dry-run window. Storing thresholds in `system_settings` keeps
  this safe.
- **Cron overlap:** if a run takes longer than 15 minutes, the next tick
  could collide. Mitigate with an advisory lock keyed on `'sla-sweep'`.
- **Notification storm on first enable:** the dry-run window plus a
  one-time backfill cap (max 200 alerts on the first non-dry-run tick) is
  required before 2D ships.
- **Localization debt:** every `condition_code` must ship with both
  `title_*` and `message_*`; missing translations should fall back to the
  other locale, not to `condition_code`.

---

## 9. Recommended implementation phases

- **2A (this doc)** — audit + design only. No code changes beyond this doc
  and an architecture test.
- **2B** — `operational_alerts` table + canonical service wrappers +
  isolation audit + RLS. No cron, no dispatch.
- **2C** — first cron job in dry-run mode; populates alerts; writes
  `cron_run_log` rows; admin UI read-only.
- **2D** — notification dispatch (in-app first, email second) with
  per-recipient rate limits.
- **2E** — admin operations dashboard with acknowledge / resolve actions
  and history drawer.

---

## 10. Next phase

**BUSINESS-OPERATIONS-2B** — create `operational_alerts` table with RLS,
grants, indexes, and canonical service wrappers under
`src/modules/operations/services/`. Add `operations-isolation-audit` to
forbid direct table access outside the wrappers. Still no cron, still no
dispatch.