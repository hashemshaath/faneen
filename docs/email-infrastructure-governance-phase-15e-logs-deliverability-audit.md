# Email Infrastructure Governance — Phase 15E
## Email Logs + Deliverability Dashboard Audit

_Read-only audit. No DB, RLS, RPC, migrations, sender paths, templates, or secrets were modified._

---

## 1. Executive Summary

After Phases 15A / 15C / 15D, all auth + transactional email is sent through the project-owned Resend account, and every send path writes to the unified `email_send_log` table. The admin Email Center and Deliverability surfaces already provide a queue/sent/failed/DLQ view with recipient masking, status filters, template filters, time windows, and realtime updates.

The infrastructure is observable enough for day-to-day operations. The only material gap is the absence of a Resend webhook → `email_send_log` bridge, which means the `bounced` and `complained` statuses are wired in the UI but currently only populated for legacy Mailgun events via `handle-email-suppression` (and that hook writes to `suppressed_emails`, not `email_send_log`). The UI must therefore not _claim_ delivered/bounced/complained as authoritative without that webhook source.

## 2. Decision

**PARTIAL** — observability is sound for sent / failed / dlq / rate_limited / suppressed. Delivered / bounced / complained / opened / clicked rely on infrastructure that is partially wired (own pixel + click endpoints for opens/clicks, no Resend webhook for bounces/complaints).

No blockers. Safe to proceed to Phase 15F.

## 3. Current Email Log Map

| Surface | Write path | Table | Identifier |
| --- | --- | --- | --- |
| Transactional send (`send-transactional-email`) | Inline inserts (`pending` → `sent`/`failed`/`dlq`) | `email_send_log` | `message_id` (UUID), `X-Entity-Ref-ID`, `X-Idempotency-Key` headers, Resend `provider_id` in `metadata` |
| Auth queued send (`process-email-queue`) | Inline inserts on success / failure / rate-limit / DLQ move | `email_send_log` | `payload.message_id`, Resend `provider_id` in `metadata` |
| pgmq queues | Native pgmq state (`auth_emails`, `transactional_emails` and their `_dlq` siblings) | n/a | `msg_id`, `read_ct`, `enqueued_at` |
| Open tracking | `email-track-open` → `record_email_open` RPC | `email_send_log.opens_count` / `first_opened_at` | `message_id` |
| Click tracking | `email-track-click` → RPC + 302 | `email_link_clicks` | `message_id`, link category |
| Suppression webhook | `handle-email-suppression` (Mailgun-era HMAC verify) | `suppressed_emails` | `email`, `reason` |
| Contact form retries | `process-contact-notification-retries` | `contact_notification_log` (mirrors send result) | own ids |
| Cron observability | `cron_run_log` | n/a | job name + run timestamp |

`email_send_log` is the single source of truth for unique-email stats. Rows MUST be deduplicated by `message_id` (latest by `created_at`) — both `EmailDeliveryLogs` and `AdminEmailDeliverability` already do this.

## 4. Auth Queue Logging

Yes — `process-email-queue` writes one row per state transition into `email_send_log`:

- `dlq` on TTL exceeded or max retries
- `sent` on Resend 2xx, with `metadata = { provider: 'resend', provider_id }`
- `rate_limited` on 429
- `failed` on other non-2xx (counts against the retry budget)
- DLQ moves via `move_to_dlq` RPC, with the dropped payload re-queued onto `<queue>_dlq`

There is **no separate auth-only log** — auth and transactional share `email_send_log`, distinguished by `template_name` (`signup`, `recovery`, `magiclink`, …) vs application template names.

## 5. Transactional Logging

Yes — `send-transactional-email` inserts:

- `pending` before the Resend POST
- `sent` with `metadata = { provider: 'resend', provider_id }` on success
- `dlq` on non-2xx Resend response (`error_message` truncated to 1000 chars)
- `dlq` on thrown exception
- `failed` if `RESEND_API_KEY` is missing
- `failed` rows for user-disabled categories / unsubscribe-token failures, so the dashboard can see why an email never went out

No `Authorization` header, bearer token, or API key is logged.

## 6. Status Lifecycle (actually populated today)

| Status | Populated by | Authoritative? |
| --- | --- | --- |
| `pending` | `send-transactional-email` pre-flight | yes |
| `sent` | both senders on Resend 2xx | yes |
| `failed` | both senders on transient/non-429 errors | yes |
| `dlq` | both senders on permanent failures, TTL, max retries, exceptions | yes |
| `rate_limited` | `process-email-queue` on 429 (drives `email_send_state.retry_after_until`) | yes |
| `suppressed` | written by `send-transactional-email` when recipient is on suppression list (and existing user-disabled paths) | yes |
| `bounced` | UI is wired, but no current writer pipes Resend bounces into `email_send_log` | **NO — display-only label**, requires Resend webhook |
| `complained` | same as above | **NO — display-only label**, requires Resend webhook |
| `opens_count` / `first_opened_at` | `email-track-open` (own 1×1 pixel) | yes, but subject to image-blocking |
| `clicks_count` / `first_clicked_at` | `email-track-click` redirect | yes, but only for wrapped links |

## 7. Retry / DLQ / TTL Behavior

- **Max retries:** 5 (`MAX_RETRIES` in `process-email-queue`), counted from real `failed` rows for that `message_id`, **not** pgmq `read_ct` — this stops phantom retry inflation when a 429 stops a batch mid-flight.
- **TTL:** auth = 15 min, transactional = 60 min (overridable via `email_send_state`).
- **DLQ move:** `move_to_dlq` RPC re-queues the payload onto `<queue>_dlq` and writes a `dlq` row to `email_send_log` with the reason.
- **Duplicate-send guard:** before each send, the worker re-checks `email_send_log` for a prior `sent` row with the same `message_id` and skips the queue entry if found (VT-expired race protection).
- **Rate-limit cooldown:** 429 sets `email_send_state.retry_after_until` from the `Retry-After` header (parsed as seconds or HTTP-date); subsequent invocations short-circuit until the cooldown window passes.
- **Transactional path:** synchronous. No retry budget — a failure goes straight to `dlq` and the caller receives a 5xx. Acceptable because triggers are idempotent per `idempotencyKey`.

## 8. Admin Deliverability UI Review

`/admin/email-deliverability` (`AdminEmailDeliverability.tsx`):

- Window filter (15 min / 1 h / 24 h / 7 d / 30 d) backed by `get_email_deliverability_stats` RPC.
- Status filter exposing `sent`, `failed`, `dlq`, `suppressed`, `bounced`, `complained`.
- Template filter populated from distinct `template_name` values currently in window.
- Recipient search (uses `ilike` on the unmasked column — admin-only).
- Realtime subscription on `email_send_log` + `email_deliverability_alerts` with toast surfacing.
- Stat cards: total / sent / failed / bounced / complained / dlq / suppressed.
- Logs table dedupes by `message_id` and caps display at 100 rows after dedupe.

`/admin/email-center` (`AdminEmailCenter.tsx` + `EmailDeliveryLogs.tsx`):

- Window + status + template + domain filters.
- Recipient column is **masked by default** (`maskRecipient`), toggleable per-row with an explicit eye icon — never bulk-revealed.
- Status uses `STATUS_TONE` color tokens (no inline hex).
- `EmailDlqMonitor` shows DLQ items with `DlqClassification` reasons (no token / body exposure).
- `EmailHealthAlerts` surfaces alert rows from `email_deliverability_alerts`.
- No raw email body, HTML, unsubscribe token, reset link, or invite token is rendered in either dashboard.

Both routes are wrapped by `AdminRoute` + `DashboardLayout` (admin-only).

## 9. Resend Metadata Review

- Both `send-transactional-email` and `process-email-queue` parse the Resend 2xx JSON `id` field and store it as `metadata.provider_id` alongside `metadata.provider = 'resend'`.
- `X-Entity-Ref-ID` and `X-Idempotency-Key` headers carry our internal `message_id` end-to-end so we can correlate with the Resend dashboard.
- The full Resend response body is **not** stored on success; only `id` is extracted. On error, the response body is truncated to 1000 chars before being placed in `error_message`.
- No `Authorization` header value, bearer prefix, or raw API key is ever logged. `console.log` lines mask the recipient via `maskEmail()`.

## 10. Privacy & Security Findings

- ✅ No raw recovery/invite/magiclink token is written to `email_send_log` — templates render them into the HTML body only, which is **not** persisted by either send function.
- ✅ No reset link or full URL with token is logged. The transactional path logs only `recipient_email` (admin-only, masked at the UI layer) and the truncated provider error.
- ✅ No `Authorization` header, `RESEND_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` is logged or echoed in responses.
- ✅ No `VITE_RESEND*` exists anywhere in `src/` or `supabase/` (verified by the Phase 15D and 15E guards).
- ✅ Admin dashboards never render `metadata` JSON verbatim — they read at most `metadata.sender_domain` and `metadata.provider_id`.
- ⚠️ `recipient_email` is stored unmasked at rest (required to dedupe / search / suppress). Mitigated by: RLS-restricted reads, admin-only UI, and per-row reveal toggle in the Email Center.

## 11. Missing Observability

These are **gaps documented for future phases**, not regressions:

1. **No Resend webhook integration.** `bounced` / `complained` / `delivered` from Resend are not piped into `email_send_log`. The UI's bounced/complained columns are currently 0-or-Mailgun-legacy.
2. **No `template_id` / `template_version` field.** Correlation today is by `template_name` string only.
3. **No `module` / `center` discriminator** to split contracts / quotes / auth / marketing without parsing `template_name`.
4. **No alerting on sustained DLQ growth** beyond `email_deliverability_alerts` thresholds — no on-call route.
5. **No retry-metrics aggregation** (e.g. average attempts before success) — would require a new RPC.
6. **`get_email_deliverability_stats` RPC counts include rows whose status was later superseded.** Per-message dedupe happens in client code; the RPC does not yet do `DISTINCT ON (message_id)`.

No DB / RPC / migration changes are made in this phase to address these — they are pinned in the guard test and reserved for `15F` or a dedicated observability phase.

## 12. High-Risk Findings

None. No secret exposure, no token leakage, no infinite-retry path, no admin escalation surface introduced or discovered.

## 13. Safe UI / Copy Changes Made

None applied. The dashboards already:

- mask recipients by default in the Email Center,
- label provider status sources via `STATUS_TONE`,
- never render bodies or tokens,
- gate behind admin-only routes.

No copy changes were necessary to avoid misleading `delivered`/`bounced` claims because the current UI does not _assert_ delivery — it surfaces only what `email_send_log` actually contains (zero rows for those statuses while no webhook is wired).

## 14. Needs DB / RPC Later

- Resend webhook receiver → write `delivered` / `bounced` / `complained` rows into `email_send_log` with provider event id.
- Optional `template_id` and `module` columns on `email_send_log`.
- Server-side dedupe view (`email_send_log_latest`) so RPC stats no longer rely on client dedupe.

## 15. Needs External Verification

- Confirm `RESEND_API_KEY` is set in the production Supabase Edge Function secrets.
- Confirm `qitaat.com` is the verified sender domain in Resend with SPF / DKIM / DMARC green.
- Inspect Resend dashboard `X-Entity-Ref-ID` headers to confirm correlation with our `message_id`.
- After Phase 15F regression, configure a Resend webhook → new edge receiver (out of scope here).

## 16. Tests

- `src/__tests__/emailInfrastructurePhase15eLogsDeliverability.test.ts` — 12 guards, all PASS.
- Phase 15A / 15C / 15D guards continue to pass unchanged.

## 17. Full Suite

Not re-run in this audit (per scope — no code changes to email flow). Targeted Phase 15E suite green.

## 18. DB / RLS / RPC / Migrations Touched?

**No.**

## 19. Sender Paths Changed?

**No.**

## 20. Secrets Exposed or Logged?

**No.**

## 21. Final Decision

`EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15E LOGS DELIVERABILITY AUDIT COMPLETE`