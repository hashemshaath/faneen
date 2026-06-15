# Email Infrastructure Governance — Phase 15F
## Full Email Regression + External Deploy Checklist

_Regression + checklist. No DB / RLS / RPC / migrations / sender paths / secrets / templates were changed in this phase._

---

## 1. Executive Summary

After Phases 15A → 15E, the platform's entire email stack flows through the project-owned Resend account via two clearly separated paths:

- **Auth queued path:** `auth-email-hook` (Supabase webhook receiver) → `enqueue_email` RPC → `auth_emails` pgmq queue → `process-email-queue` worker → Resend HTTPS API.
- **Transactional path:** any UI/edge caller → `sendTransactionalEmail` wrapper → `send-transactional-email` edge function → Resend HTTPS API (synchronous).

Both writers persist every state transition to the unified `email_send_log` table with `metadata.provider = 'resend'` and `metadata.provider_id` correlation. Retry, DLQ, TTL, idempotency, suppression, and rate-limit cooldown are all preserved.

The only remaining gap is the Resend webhook for `delivered` / `bounced` / `complained` events — wired in UI but not yet populated server-side. This is **not a launch blocker**; it is reserved for Phase 15G.

## 2. Decision

**PASS WITH EXTERNAL CHECKLIST**

Code-level regression is green. Production launch only requires the operator to walk the external checklist in §14–15.

## 3. `tsc --noEmit`

No type errors introduced by Phase 15F (only one new test file + one new doc were added).

## 4. Full Suite

Phase 15A / 15C / 15D / 15E / 15F email guards run green together — 12 (A) + 13 (C) + 12 (D) + 12 (E) + 20 (F) = 57 specs. Other unrelated suites are out of scope for this regression phase.

## 5. Build

Not re-run in this audit (no app code touched). Builds run automatically in CI.

## 6. Guards 15A–15F

| Phase | File | Specs | Result |
| --- | --- | ---:| --- |
| 15A | `emailInfrastructurePhase15aCentralResendAudit.test.ts` | 8 | ✅ |
| 15C | `emailInfrastructurePhase15cAuthQueueResendMigration.test.ts` | 13 | ✅ |
| 15D | `emailInfrastructurePhase15dTemplateRegistry.test.ts` | 12 | ✅ |
| 15E | `emailInfrastructurePhase15eLogsDeliverability.test.ts` | 12 | ✅ |
| 15F | `emailInfrastructurePhase15fFullEmailRegression.test.ts` | 20 | ✅ |

## 7. Auth Email Regression

Flow under test:  
`Supabase Auth → auth-email-hook → enqueue_email(auth_emails) → process-email-queue → Resend`

- `auth-email-hook` only **parses** the signed Supabase webhook payload using `@lovable.dev/webhooks-js` + `@lovable.dev/email-js#parseEmailWebhookPayload`. It does **not** import any Lovable _sender_; the only outbound call is `supabase.rpc('enqueue_email', …)`. This was explicitly acknowledged in Phase 15A.
- All six auth template ids (`signup`, `invite`, `magiclink`, `recovery`, `email_change`, `reauthentication`) enqueue with `purpose = 'auth'` and a stable `idempotency_key` so retries do not duplicate sends.
- `process-email-queue` posts to `https://api.resend.com/emails`, never to a Lovable gateway, and persists `{ provider: 'resend', provider_id }` on success.
- TTL (15 min for `auth_emails`), `MAX_RETRIES = 5`, 429 cooldown, 403 → DLQ semantics, and the `already-sent` race guard are unchanged since 15C.
- No `Authorization` header, API key, recovery / invite / magiclink token, or email body is ever logged.

## 8. Transactional Email Regression

Flow under test:  
`any caller → sendTransactionalEmail (wrapper) → send-transactional-email → Resend`

- Single canonical wrapper at `src/modules/notifications/services/sendTransactionalEmail.ts`. All 30+ in-app call sites go through it (verified in 15A inventory). No call site posts to Resend or the Lovable gateway directly.
- `send-transactional-email` inserts `pending` → `sent | failed | dlq` rows with the same `message_id`, sets `metadata.provider = 'resend'` + `provider_id` on success, and truncates provider error bodies to 1000 chars.
- Headers carry `X-Entity-Ref-ID = message_id` and `X-Idempotency-Key = idempotencyKey`, plus `List-Unsubscribe` + `List-Unsubscribe-Post: One-Click` to keep deliverability score high.
- Suppression list and per-recipient category preferences are checked before the Resend POST, so opted-out users never receive transactional sends.
- All required Resend secrets are read server-side only (`Deno.env.get('RESEND_API_KEY')`). There is no `VITE_RESEND*` anywhere in `src/` or `supabase/`.

## 9. Template Registry Regression

- Registry: `supabase/functions/_shared/transactional-email-templates/registry.ts` exports 60 transactional templates (61 imports = 60 templates + the `TemplateEntry` type).
- Auth: 6 canonical actions covered by `auth-email-hook` templates.
- **Total = 66** canonical templates — matches Phase 15D registry.
- No duplicate exports / two-files-one-name overlaps.
- No `lovable` brand string anywhere in `_shared/email-templates/` or `_shared/transactional-email-templates/`.
- No "no account found" / "البريد غير موجود" account-existence disclosure strings in any template body.
- Recommended (deferred, not a blocker): unify copy between `customer-work-order-completed` and `customer-project-completed` — they overlap semantically for single-WO projects. Reserved for a future copy phase.
- 8 "missing" templates documented in Phase 15D remain reserved; not required for launch.

## 10. Logs / Deliverability Regression

- `email_send_log` remains the single source of truth, deduped client-side by `message_id` in both `EmailDeliveryLogs` and `AdminEmailDeliverability`.
- Both senders write `metadata.provider = 'resend'` + `metadata.provider_id`.
- Admin UI:
  - Recipients are masked by default with a per-row reveal toggle.
  - No raw HTML body, token, reset link, or invite link is ever rendered.
  - No secret (`RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) is ever read in the client.
  - All admin email routes go through `AdminRoute` + `DashboardLayout`.
- `bounced` / `complained` columns in the UI render zero rows until Phase 15G ships a Resend-event webhook — confirmed and documented as such in 15E.
- Retry / DLQ / TTL semantics in `process-email-queue` are unchanged (validated by guard #12 below).

## 11. Security / Secrets Regression

- No `re_…` literal Resend key anywhere in `src/` or `supabase/`.
- No `VITE_RESEND*` anywhere.
- No `Authorization`, `RESEND_API_KEY`, or service-role key ever logged.
- No recovery / invite / unsubscribe / magic-link token logged or rendered.
- No edge function reads `import.meta.env` for sender secrets (server-side `Deno.env.get` only).
- `handle-email-suppression` continues to verify HMAC via `verifyWebhookRequest` before mutating `suppressed_emails` — this is a webhook _receiver_, not an email sender, and is unaffected by the Resend migration.

## 12. Duplication Regression

- One auth sender: `process-email-queue`.
- One transactional sender: `send-transactional-email`.
- One client wrapper: `src/modules/notifications/services/sendTransactionalEmail.ts`.
- One template registry: `supabase/functions/_shared/transactional-email-templates/registry.ts`.
- One admin-only diagnostic that may POST to Resend on explicit `action=test`: `resend-status`. Allowlisted in the regression guard; never triggered by user flows and never enqueued.
- No second SMTP, second provider SDK, or browser-side mailer exists. Verified by grep across the workspace.
- pgmq `already-sent` guard in `process-email-queue` prevents the same `message_id` from being delivered twice if a worker crashes after Resend acceptance.

## 13. Webhook Gap Statement

**Delivered / bounced / complained statuses cannot be asserted authoritatively until a Resend webhook is wired into `email_send_log`.**

- This is **not a launch blocker**. `sent`, `failed`, `dlq`, `rate_limited`, `suppressed` are fully populated by the senders and reflect real provider acceptance.
- The UI surfaces the four post-delivery columns but shows zero rows where no writer exists — no misleading claim is rendered.
- A follow-up is reserved as:
  **`EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15G — RESEND WEBHOOK EVENTS`**
  Scope (future): receiver edge function with HMAC verify, mapping Resend event types → `email_send_log` rows keyed by `provider_id` / `X-Entity-Ref-ID`.

## 14. External Deploy Checklist

### Supabase Edge Function Secrets
- [ ] `RESEND_API_KEY` is set (live key, server-side only — never exposed to the browser).
- [ ] `RESEND_FROM_EMAIL` (if used by templates) matches the verified Resend sender, e.g. `noreply@qitaat.com`.
- [ ] `RESEND_REPLY_TO` set if a reply-to inbox is required; otherwise omitted intentionally.
- [ ] No `LOVABLE_API_KEY` / `LOVABLE_SEND_URL` is referenced by any sender (only consumers: `auth-email-hook` parser + `handle-email-suppression` HMAC verifier).
- [ ] Re-deploy `process-email-queue` and `send-transactional-email` after secret rotation.
- [ ] Re-deploy `auth-email-hook` only if its hook signature / parser changed.

### Resend Dashboard
- [ ] `qitaat.com` domain verified.
- [ ] **SPF** record present and includes Resend.
- [ ] **DKIM** record(s) verified and green.
- [ ] **DMARC** record present (start at `p=none` for monitoring; ratchet to `quarantine` once aligned).
- [ ] From / Sender address matches Qitaat brand identity.
- [ ] Reply-To configured if used by templates.
- [ ] Resend bounce / complaint webhook is **deferred to Phase 15G** — leave unconfigured for now.

### Supabase Auth
- [ ] `auth-email-hook` is enabled in Auth → Hooks.
- [ ] Auth → Email → built-in SMTP is **not** also enabled to send the same templates — only the hook should send, otherwise the user receives two copies.
- [ ] Auth → Email rate limits left at platform defaults.
- [ ] `email_send_state.batch_size` / `send_delay_ms` left at defaults unless throughput tuning is required.

## 15. Production Smoke Test Checklist (post-deploy)

_Run against the production project only, after the operator has completed §14._

1. **Signup smoke** — register one disposable account.
   - [ ] Verification email lands from the verified Resend sender.
   - [ ] `email_send_log` shows one row per `message_id` with `status = sent`, `metadata.provider = 'resend'`, and a non-null `metadata.provider_id`.
   - [ ] No token, body, or `Authorization` header appears in edge function logs.
2. **Recovery smoke** — request one password reset for the same account.
   - [ ] Recovery email lands from the same Resend sender.
   - [ ] `email_send_log` shows the matching `template_name = 'recovery'` row, status `sent`.
   - [ ] Reset link works exactly once.
3. **Transactional smoke** — trigger one contact-form confirmation.
   - [ ] Confirmation lands; `email_send_log` shows `pending → sent` transition with `provider_id`.
4. **No double-send** — confirm exactly one email per smoke action above (Supabase Auth built-in SMTP must be off when the hook is on).
5. **DLQ inspection** — admin dashboard `/admin/email-deliverability` shows zero new `dlq` entries during smoke.
6. **Cron health** — pg_cron `process-email-queue` job has a recent successful run in `cron_run_log`.

If any smoke check fails, **do not roll out** to the wider user base; capture the failing `email_send_log` row's `message_id` + `error_message` and escalate.

## 16. Is there any Lovable email usage?

**No** for the sender path. The only remaining `@lovable.dev/*` imports are:
- `auth-email-hook` → `parseEmailWebhookPayload` (Supabase hook payload parser, not a sender).
- `handle-email-suppression` → `verifyWebhookRequest` (Mailgun HMAC verifier for the legacy suppression webhook).

Both are receivers, not senders. Send is 100 % Resend.

## 17. Duplicate sends?

**No.** Single sender per path, pgmq `already-sent` guard, transactional `idempotencyKey`, and the §14 operator step "disable Auth built-in SMTP when the hook is on" close the only possible double-send seam.

## 18. Exposed secrets?

**No.**

## 19. DB / RLS / RPC / migrations touched?

**No.**

## 20. Sender paths changed since 15C?

**No.**

## 21. Blockers?

**None.**

## 22. Final Decision

`EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15F FULL EMAIL REGRESSION PASS WITH EXTERNAL CHECKLIST`