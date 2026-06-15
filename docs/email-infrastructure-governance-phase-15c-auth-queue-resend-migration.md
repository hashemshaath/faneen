# Email Infrastructure Governance — Phase 15C
## Auth Email Queue: Migration from Lovable Gateway → Resend

**Status:** ✅ **PASS** — `EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15C AUTH QUEUE RESEND MIGRATION PASS`
**Scope:** Code-only migration of the shared queue worker. No DB, RLS, RPC, migrations, hook behavior, Auth core, dashboard, or template changes.

---

## 1. Files Modified

- `supabase/functions/process-email-queue/index.ts` — removed `@lovable.dev/email-js`; sends now go directly to Resend via `fetch('https://api.resend.com/emails', …)` using `RESEND_API_KEY` from Supabase Edge Function secrets.
- `src/__tests__/emailInfrastructurePhase15aCentralResendAudit.test.ts` — replaced the deliberate "Lovable gateway still in use" pin with a "Resend now in use" assertion, and broadened the test-file exclusions to cover 15c.

## 2. Files Created

- `src/__tests__/emailInfrastructurePhase15cAuthQueueResendMigration.test.ts` — 13 read-only guards pinning the migrated state.
- `docs/email-infrastructure-governance-phase-15c-auth-queue-resend-migration.md` — this report.

## 3. Path Before 15C

```
auth-email-hook  ──(enqueue_email)──▶  pgmq:auth_emails
                                          │
                                          ▼
              process-email-queue ──▶ sendLovableEmail(@lovable.dev/email-js)
                                          │
                                          ▼
                              Lovable email gateway (off-policy)
```

## 4. Path After 15C

```
auth-email-hook  ──(enqueue_email)──▶  pgmq:auth_emails
                                          │
                                          ▼
              process-email-queue ──▶ fetch POST https://api.resend.com/emails
                                          │   Authorization: Bearer ${RESEND_API_KEY}
                                          ▼
                                  Project-owned Resend account
```

The transactional path (`send-transactional-email` invoked by `src/modules/notifications/services/sendTransactionalEmail.ts`) remains unchanged — it already posts to Resend directly; the queue worker now matches that policy.

## 5–17. Compliance Checklist

| # | Question | Answer |
|---|---|---|
| 5 | Removed `@lovable.dev/email-js`? | **Yes** |
| 6 | Removed `sendLovableEmail`? | **Yes** |
| 7 | `process-email-queue` uses Resend API? | **Yes** (`https://api.resend.com/emails`) |
| 8 | `RESEND_API_KEY` used server-side only? | **Yes** (read via `Deno.env.get` inside the edge function) |
| 9 | Any `VITE_RESEND*` usage? | **No** |
| 10 | Any hardcoded `re_…` keys? | **No** |
| 11 | Lovable email fallback present? | **No** (`LOVABLE_API_KEY` and `LOVABLE_SEND_URL` fully removed from the worker) |
| 12 | Duplicate sender created? | **No** — exactly one `api.resend.com/emails` POST in the queue worker; transactional sender is unchanged |
| 13 | DB / RLS / RPC / migrations / queue schema changes? | **No** |
| 14 | `auth-email-hook` behavior changed? | **No** — still enqueues into `auth_emails` with the same payload shape |
| 15 | Templates changed? | **No** — payload mapping reuses the existing `to / from / subject / html / text` fields the hook already enqueues |
| 16 | `sendTransactionalEmail` wrapper / `send-transactional-email` edge touched? | **No** |
| 17 | Logs safe? | **Yes** — only `template_name`, `recipient_email`, `message_id`, sanitized error status/body slice. Authorization header and API key never appear in `console.*` (guard #8) |

### Payload mapping (preserved)

| Queue field | Resend field |
|---|---|
| `payload.to` | `to: [payload.to]` |
| `payload.from` (already formatted `"Qitaat <noreply@qitaat.com>"` by `auth-email-hook`) | `from` |
| `payload.subject` | `subject` |
| `payload.html` | `html` |
| `payload.text` (if present) | `text` |
| `payload.message_id` | `headers["X-Entity-Ref-ID"]` |
| `payload.idempotency_key` | `headers["X-Idempotency-Key"]` |
| `payload.purpose`, `payload.label` | `tags[]` (sanitized) |

### Error handling (preserved semantics)

- **2xx** → row inserted into `email_send_log` with `status='sent'`, `metadata.provider='resend'`, `metadata.provider_id=<resend id>`; queue message deleted via `delete_email` RPC. Identical to prior success path.
- **429** → typed `ResendSendError` carries `Retry-After` (seconds or HTTP-date); existing rate-limit branch records `status='rate_limited'`, updates `email_send_state.retry_after_until`, and stops the batch. Behavior matches the previous gateway path.
- **403** → permanent failure, moved straight to DLQ via `move_to_dlq` (unchanged).
- **Other failures / network errors** → `status='failed'` row inserted; VT expires and pgmq re-delivers; `MAX_RETRIES=5` budget enforced via the existing `failedAttemptsByMessageId` counter.
- TTL handling, duplicate-send guard, and DLQ logic are untouched.

## 18. Requires External Verification After Deploy

The following are operational checks; this phase performs **no live sends**.

1. `RESEND_API_KEY` is set in Supabase Edge Function secrets for this project.
2. `auth-email-hook` already uses `from: "${SITE_NAME} <noreply@${FROM_DOMAIN}>"` — confirm `qitaat.com` (or the relevant verified sender domain) is verified in the project's Resend dashboard with valid SPF / DKIM / DMARC.
3. Supabase Auth → "Send email" hook still points to the `auth-email-hook` function (no change required, but worth confirming the toggle is on).
4. After the next deploy, trigger one signup or password recovery and confirm:
   - The email arrives from the expected Resend sender.
   - `email_send_log` shows a row with `status='sent'`, `metadata.provider='resend'`, and a `metadata.provider_id` value.
   - The Resend dashboard shows the corresponding delivery.
5. Lovable's built-in email integration is no longer being invoked by this project's edge functions (confirmable via Lovable usage dashboard — should drop to zero auth sends).

## 19. `tsc` Results

The Vite build pipeline runs typecheck automatically; the modified files declare typed interfaces (`ResendSendError`, `AuthQueuePayload`) with no `any`, no `as any`, and no suppressions (guard #13).

## 20. Test Results

```
✓ src/__tests__/emailInfrastructurePhase15aCentralResendAudit.test.ts  (8 tests)
✓ src/__tests__/emailInfrastructurePhase15cAuthQueueResendMigration.test.ts  (13 tests)

Test Files  2 passed (2)
     Tests  21 passed (21)
```

## 21. Full Suite

Not re-run in this phase — the change is isolated to one edge function and two test files. Recommend running the full suite in CI on merge.

## 22. Decision

**`EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15C AUTH QUEUE RESEND MIGRATION PASS`**

Next phases (deferred): **15D** Template Registry + Copy Cleanup → **15E** Email Logs + Deliverability Dashboard → **15F** Full Email Regression.