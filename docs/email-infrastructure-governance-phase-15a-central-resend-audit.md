# EMAIL INFRASTRUCTURE GOVERNANCE — PHASE 15A
## Central Resend Microservice — Full Audit

_Audit only. No production code, secrets, templates, DB, RLS, RPC, migrations,
edge function behavior, or provider settings were modified. Only this document
and one read-only guard test were added._

---

## 1. Executive Summary

The platform operates **two parallel email send paths**:

| Path | Trigger | Edge Function | Provider actually used |
|------|---------|---------------|------------------------|
| **A. App / transactional** | `sendTransactionalEmail` wrapper → `send-transactional-email` | `supabase/functions/send-transactional-email/index.ts` | **Resend** (`api.resend.com/emails` with `RESEND_API_KEY`) — direct, bypasses pgmq queue |
| **B. Auth + queued** | `auth-email-hook` → `enqueue_email` RPC → `process-email-queue` | `supabase/functions/process-email-queue/index.ts` | **Lovable email gateway** (`sendLovableEmail` from `npm:@lovable.dev/email-js`) — NOT our Resend key |

Path A is canonical and aligned with the stated policy ("Resend via our own
API only"). Path B sends through Lovable's hosted email infrastructure
(which may itself relay through Resend on Lovable's side, but does NOT use
`RESEND_API_KEY` from our secrets, and is therefore opaque to our
observability and deliverability controls).

### Overall decision

**PARTIAL.**

- App / transactional emails: ✅ PASS — single canonical microservice, single
  wrapper, no client-side keys, no duplicate sender helpers.
- Auth + queued emails: ⚠️ DOES NOT MATCH POLICY — the queue worker dispatches
  via `@lovable.dev/email-js`, not via Resend. Auth verification, password
  recovery, magic links, invitations, email change and reauthentication all
  flow through this path.

### Direct answers

- Are we using Resend via our own API? **Partially.** Yes for app emails;
  No for auth + any email routed through `enqueue_email`.
- Is the Lovable email integration in use? **Yes — confirmed.** Imports of
  `npm:@lovable.dev/email-js` exist in `process-email-queue` and
  `auth-email-hook`, and `sendLovableEmail(...)` is the dispatch call inside
  the queue worker.
- Is there duplicate sending? **No duplicate path was observed per event** —
  each trigger picks exactly one path. There is, however, redundant
  infrastructure (two effective providers active in the project).
- Are API keys exposed? **No.** `RESEND_API_KEY` is only read via
  `Deno.env.get` in server-side edge functions. No `VITE_RESEND_*`, no
  hardcoded `re_…` literal, no client import of Resend SDK.

---

## 2. Central Map

### 2.1 Canonical client wrapper

- `src/modules/notifications/services/sendTransactionalEmail.ts` — the only
  approved client-side entry point. Invokes `send-transactional-email` and
  returns the raw `{ data, error }`. No transformation, no DB access.
- Enforced by existing isolation audit:
  `scripts/transactional-email-isolation-audit.mjs` and the per-feature
  `*-email-isolation.test.ts` tests.

### 2.2 Edge functions that send or relate to email

Verified via `ls supabase/functions/`:

| Function | Role | Path |
|----------|------|------|
| `send-transactional-email` | Canonical Resend sender (app emails) | A |
| `process-email-queue` | Queue worker, dispatches via Lovable gateway | B |
| `auth-email-hook` | Supabase Auth webhook, enqueues to `auth_emails` | B |
| `handle-email-unsubscribe` | One-click unsubscribe validator | shared |
| `handle-email-suppression` | Bounce / complaint webhook | shared |
| `admin-preview-email` | Admin template preview | A (read) |
| `preview-transactional-email` | Template preview render | A (read) |
| `admin-retry-dlq-email` | Re-invokes `send-transactional-email` (admin) | A |
| `email-track-open`, `email-track-click` | Open / click pixel tracking | shared |
| `notify-amendment-event`, `notify-client-invitation`, `notify-contact-event`, `notify-customer-lead-update`, `notify-supplier-lead` | Notification dispatchers; rely on `send-transactional-email` for outbound mail | A |
| `process-contact-notification-retries` | Retries via the wrapper path | A |
| `contracts-expiry-notifier` | Cron-driven contract reminders | A |
| `admin-update-user-email` | Identity flow (no direct mail send) | n/a |
| `resend-status`, `resend-health` | Admin probes of the Resend account itself | A (read) |

### 2.3 Server-side direct callers of `send-transactional-email`

Allowed (edge-to-edge invocation):
- `supabase/functions/admin-retry-dlq-email/index.ts`
- `supabase/functions/audit-sitemap-status/index.ts`

No client component calls `supabase.functions.invoke('send-transactional-email')`
directly — confirmed by ripgrep across `src/`. All client call sites import
the wrapper.

---

## 3. Resend Usage

### 3.1 Where Resend is invoked

| File | Purpose | Key access |
|------|---------|-----------|
| `supabase/functions/send-transactional-email/index.ts:537` | `POST https://api.resend.com/emails` (actual send) | `Deno.env.get('RESEND_API_KEY')` |
| `supabase/functions/resend-status/index.ts` | Admin status probe → `/domains` | `Deno.env.get('RESEND_API_KEY')` |
| `supabase/functions/resend-health/index.ts` | Service-health probe → `/domains` | `Deno.env.get('RESEND_API_KEY')` |

### 3.2 Where Resend must NOT appear (verified clean)

- No `VITE_RESEND_*` in `src/`.
- No `re_…` literal token anywhere.
- No `import * from 'resend'` (or `@resend/*`) in `src/`.
- No hardcoded `Authorization: Bearer re_…` patterns.
- `RESEND_API_KEY` is referenced in `src/` only as a *label string* inside
  admin UI panels (`AdminIntegrations.tsx`, `ResendIntegrationCard.tsx`) —
  these are display copy, not key reads.

### 3.3 Sender domain / from address

- `FROM_DOMAIN = "qitaat.com"` is hardcoded in
  `send-transactional-email/index.ts` (line 8).
- `from: \`${SITE_NAME} <noreply@${FROM_DOMAIN}>\`` is the canonical From.
- No `RESEND_FROM_EMAIL` / `RESEND_REPLY_TO` env vars are read anywhere —
  policy-name proposals from this prompt are NOT yet implemented; the
  current code uses the constant above.

---

## 4. Lovable Email Integration — STATUS: ACTIVE

Confirmed imports of the Lovable email SDK (`npm:@lovable.dev/email-js`):

| File | Line | Symbol | Effect |
|------|------|--------|--------|
| `supabase/functions/process-email-queue/index.ts` | 1 | `sendLovableEmail` | **HIGH RISK** — actual outbound dispatch for every queued message (auth emails + anything enqueued via `enqueue_email`) |
| `supabase/functions/process-email-queue/index.ts` | 252 | `await sendLovableEmail(...)` | dispatch call site |
| `supabase/functions/auth-email-hook/index.ts` | 3 | `parseEmailWebhookPayload` | parser for Supabase Auth webhook body (no direct send) |
| `supabase/functions/auth-email-hook/index.ts` | 4 | `verifyWebhookRequest`, `WebhookError` (from `@lovable.dev/webhooks-js`) | signature verification of the Auth hook |

Implication: every auth email — signup confirmation, magic link, recovery,
invite, email change, reauthentication — and any future call to the shared
`enqueue_email` RPC is currently sent via Lovable's gateway, NOT via the
project's own Resend account. `RESEND_API_KEY` is not consulted on this
path.

_No remediation performed in this phase per the "no production changes"
rule. Remediation belongs to Phase 15B / 15C._

---

## 5. Auth Emails (verification, recovery, resend, magic link, invite)

Flow:
1. Supabase Auth fires the Send Email Hook with a webhook payload.
2. `auth-email-hook` verifies the signature (`verifyWebhookRequest`) and
   parses the payload (`parseEmailWebhookPayload`).
3. The hook renders the matching React Email template from
   `supabase/functions/_shared/email-templates/` and calls
   `supabase.rpc('enqueue_email', ...)` against the `auth_emails` pgmq queue.
4. `process-email-queue` reads `auth_emails` first, dispatches via
   `sendLovableEmail`. **This is the policy gap.**

Observable consequences:
- Sends from this path WILL appear in Lovable's email logs but WILL NOT
  appear in the project's Resend dashboard.
- Bounces / complaints come back through `handle-email-suppression`
  (Mailgun-style webhook per Lovable docs) — the project's Resend webhook
  configuration does not see them.
- `email_send_log` rows for auth emails record `status` correctly; the
  `metadata.provider` field is not set to `resend` on this path.

Cannot verify from code alone:
- Whether Supabase Auth's "native" SMTP is also configured to point at
  Resend as a secondary path — requires the Supabase Auth dashboard
  (Authentication → Emails → SMTP). Per house rules we do not surface
  dashboard URLs to the user; flagged for manual operator verification.

---

## 6. Transactional Email Coverage by Domain

All paths below resolve to `sendTransactionalEmail(...)` (wrapper) or a
server-side invocation of `send-transactional-email`, i.e. **Path A
(Resend)**.

| Domain | Call sites (representative) | Wrapper used? | Notes |
|--------|-----------------------------|---------------|-------|
| Contact form | `src/pages/Contact.tsx` (×2: confirmation + admin notify) | ✅ | Idempotency keys: `contact-confirm-${id}`, `contact-admin-${id}` |
| Booking | `src/components/booking/BookingWidget.tsx` | ✅ | Fire-and-forget |
| Contracts | `src/pages/ContractDetail.tsx`, `src/pages/dashboard/DashboardContracts.tsx`, `src/modules/contracts/services/invitations.ts` | ✅ | |
| Memberships | `src/pages/Membership.tsx` (×3), `src/components/membership/AdminUpgradeRequestsPanel.tsx` (×3), `src/pages/admin/AdminMemberships.tsx`, `src/modules/memberships/services/payments/{manualMarkPaid,manualMarkRefunded}.ts` | ✅ | |
| Providers / leads | `src/modules/providers/services/submitProviderLead.ts`, `src/modules/leads/services/sendLeadTransactionalEmail.ts`, `src/pages/admin/AdminProviderReview.tsx` | ✅ | Lead service re-exports the wrapper |
| Admin / businesses | `src/pages/admin/AdminBusinesses.tsx` | ✅ | |
| Auth-adjacent app mail (registration confirmations, etc.) | `src/services/auth/authService.ts` (×2) | ✅ | Note: these are post-auth notifications, not Supabase Auth's own verification mail |
| Business invitations / staff | `src/components/dashboard/business-edit/InvitationsPanel.tsx` (×2) | ✅ | |
| Operations / customer comms | `src/modules/operations/customerCommunications/dispatcher.ts` | ✅ | |
| Email center preview | `src/components/admin/email-center/EmailTemplatePreview.tsx` | ✅ | |

No duplicate sender helpers were found. No legacy direct `fetch` of Resend
from any other file.

---

## 7. RFQ / Procurement, Operations / SLA, Admin / User

- **RFQ / lead intake**: routed through `submitProviderLead` and
  `sendLeadTransactionalEmail`; both go through the wrapper.
- **Supplier lead notify**: `notify-supplier-lead` edge function emits via
  the canonical sender (no direct provider call).
- **Operations / SLA**: `weekly-sla-report` and
  `process-contact-notification-retries` use the canonical sender or write
  to `contact_notification_log` for in-app retry — no second provider.
- **Admin user access**: `admin-update-user-email` handles identity changes
  without itself sending mail; downstream notifications use the wrapper.

No domain shows a parallel sender or fallback to a non-Resend provider on
Path A.

---

## 8. Email Logs & Observability

Tables (verified present in the schema list):
- `email_send_log` — append-only history; `status ∈ {pending, sent, dlq,
  suppressed, failed, bounced, complained}`; `message_id` correlates rows.
- `email_send_state` — single-row throughput / TTL config.
- `suppressed_emails` — bounces / complaints / unsubscribes; checked
  before any send on Path A.
- `email_unsubscribe_tokens` — one-click unsubscribe.
- `email_link_clicks`, `email_deliverability_alerts`,
  `contact_notification_log`, `cron_run_log` — auxiliary observability.

Admin surfaces:
- `src/pages/admin/AdminEmailCenter.tsx` — tabs: Overview, Alerts,
  Templates, Logs, DLQ, Suppression, Queue, Config, Reports. Admin-gated
  via `useNoIndex` + `DashboardLayout` + RBAC.

Gaps:
- Path B (Lovable gateway) inserts a `provider` value of its own; rows from
  auth emails do not have `metadata.provider = 'resend'`. Path A rows do.
  The Admin Email Center does not currently expose a `provider` filter.
- No `bounced` / `complained` event flow from Resend webhooks into
  `email_send_log` was found (`handle-email-suppression` writes only into
  `suppressed_emails`). Flagged for Phase 15E.

---

## 9. Templates & Copy Inventory

- `supabase/functions/_shared/email-templates/` — Supabase Auth templates
  (signup, magic-link, recovery, invite, email-change, reauthentication).
- `supabase/functions/_shared/transactional-email-templates/` — app
  templates, registered in `registry.ts`. Catalog mirror lives in
  `src/lib/email-center/email-template-catalog.ts` for admin UI.
- `supabase/functions/_shared/email-layout/` — shared header/footer
  layout used by both directories.

No duplicate template definitions for the same `templateName` were found
across the two directories. No `dangerouslySetInnerHTML`. No external
stylesheet. All copy is bilingual via template props, not hardcoded ar/en
blocks inside the same template.

Action items (not done in this phase — Phase 15D):
- Unify subject prefix across all transactional templates.
- Confirm a single `reply-to` policy (currently not set explicitly in
  `send-transactional-email`).

---

## 10. Security & Secrets

| Check | Result |
|-------|--------|
| `VITE_RESEND_*` in `src/` | None |
| Hardcoded `re_…` literal Resend keys | None |
| `Authorization: Bearer …` literal | Only via `Bearer ${resendKey}` template inside the edge function |
| `service_role` used outside server context | None (all references are inside `supabase/functions/`) |
| `SUPABASE_SERVICE_ROLE_KEY` referenced in `src/` | None |
| Recipient addresses logged | Logged as `recipient_email` column in `email_send_log`; not echoed into edge `console.*` outside dedupe warnings |
| API key in logs / error messages | None observed; `resend-status` masks the key (`maskKey`) for the admin probe response |
| `SMTP` direct usage | None |

---

## 11. Duplication / Legacy Classification

| Component | Classification |
|-----------|----------------|
| `src/modules/notifications/services/sendTransactionalEmail.ts` | **Canonical** |
| `supabase/functions/send-transactional-email` | **Canonical** (Resend) |
| `supabase/functions/process-email-queue` (Lovable dispatch) | **High Risk / Off-policy** |
| `supabase/functions/auth-email-hook` (queues to Path B) | **High Risk by transitivity** |
| `supabase/functions/resend-status`, `resend-health` | Canonical (read-only) |
| `src/components/admin/ResendIntegrationCard.tsx` | Canonical (admin UI) |
| Any other `*-email-isolation.test.ts` guard | Canonical guard |

No orphan/legacy senders found. No second wrapper. No `mailer.ts`,
`emailService.ts`, or similar parallel helper.

---

## 12. Missing Coverage

- No automated test asserts that `process-email-queue` dispatches via the
  project's Resend account. (Today it asserts the opposite by accident,
  since the file imports `@lovable.dev/email-js`.)
- No automated test asserts `metadata.provider === 'resend'` for delivered
  rows.
- No automated guard that `auth-email-hook` posts to Resend (it currently
  does not — it enqueues to Path B).

---

## 13. High-Risk Findings (ranked)

1. **R1 — Auth emails do not use the project's Resend.** `process-email-queue`
   uses `sendLovableEmail`. Affects: signup verification, recovery, magic
   link, invite, email change, reauth.
2. **R2 — Two effective providers active.** Path A (Resend) and Path B
   (Lovable gateway). Operationally split; admin sees only Path A in the
   Resend dashboard.
3. **R3 — No provider attribution in `email_send_log` UI.** Admins cannot
   tell at a glance which path delivered a given row.
4. **R4 — `FROM_DOMAIN` hardcoded.** Not yet driven by `RESEND_FROM_EMAIL`
   secret. Acceptable today (single brand) but blocks multi-tenant.

No findings classified as Critical (no key leaks, no client-side secrets,
no duplicate sends, no missing suppression check).

---

## 14. Items Requiring External (Dashboard) Verification

- Supabase Auth → Emails settings: confirm the Send Email Hook is enabled
  and points at `auth-email-hook`, and that native SMTP is NOT separately
  configured (which would cause silent double sends).
- Resend dashboard: confirm `qitaat.com` (or the active sender subdomain)
  is verified and that the API key in use has `emails:send` scope.
- Lovable Cloud → Emails: confirm the project's email domain status (this
  Phase 15A does not toggle or query it).

These cannot be checked from source and are not part of this audit's
pass/fail decision.

---

## 15. Recommended Remediation Roadmap

| Phase | Goal | Touches |
|-------|------|---------|
| **15B — Canonical Email Wrapper Enforcement** | Lock the wrapper, add CI check that no new direct `supabase.functions.invoke('send-transactional-email')` appears in `src/`; expand server-side allow-list | Guard tests only |
| **15C — Auth Email Verification / Supabase SMTP with Resend** | Decide between (a) replace `sendLovableEmail` in `process-email-queue` with a Resend call using `RESEND_API_KEY`, OR (b) point Supabase Auth native SMTP at Resend and retire the hook. **Requires user approval** | Edge function code, possibly Auth settings |
| **15D — Template Registry + Copy Cleanup** | Single subject convention, single `reply-to`, audit bilingual copy | Templates only |
| **15E — Email Logs + Deliverability Dashboard** | Resend webhooks → `email_send_log` with `bounced` / `complained` states; add provider filter to Admin Email Center | DB + edge + UI |
| **15F — Full Email Regression** | End-to-end test pass across all 30+ call sites | Tests only |

---

## 16. Tests Run / Added

Added (read-only guard):
- `src/__tests__/emailInfrastructurePhase15aCentralResendAudit.test.ts`

The guard asserts the conditions that are TRUE today and pins the off-policy
import so a future regression (or a Phase 15C fix) is forced to update the
test deliberately. Specifically:

1. No `VITE_RESEND` in `src/`.
2. No hardcoded `re_…` literal Resend key in `src/` or `supabase/`.
3. No Resend SDK import inside `src/` (browser-facing code).
4. `RESEND_API_KEY` is only read via `Deno.env.get` in
   `supabase/functions/`.
5. The shared client wrapper exists at the canonical path.
6. `send-transactional-email` posts to `api.resend.com/emails`.
7. `process-email-queue` currently imports `@lovable.dev/email-js`
   (pinned as known state — to be flipped in Phase 15C).
8. No client component invokes `send-transactional-email` directly outside
   the wrapper (re-asserts the existing isolation invariant).

No production code, secrets, templates, DB, RLS, RPC, migrations, edge
functions, or provider settings were modified.

---

## 17. Decision

`EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15A CENTRAL RESEND AUDIT COMPLETE`

Overall verdict: **PARTIAL**. App / transactional path is canonical and
Resend-only. Auth / queued path is off-policy (Lovable gateway). Awaiting
user direction to proceed with Phase 15C.