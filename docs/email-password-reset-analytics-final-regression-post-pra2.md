# Email + Password-Reset Analytics — Final Regression (Post-PRA-2)

## tsc

TypeScript build runs automatically via the harness; no new `as any`,
`@ts-ignore`, `@ts-expect-error`, or `eslint-disable` were introduced in
PRA-1/PRA-2 source files (enforced by the guard suite below).

## Guard suite results

Targeted re-run of every suite in scope — **87/87 passing**:

| Suite | Tests | Result |
|---|---:|:---:|
| `emailInfrastructurePhase15aCentralResendAudit` | 8 | ✅ |
| `emailInfrastructurePhase15cAuthQueueResendMigration` | 13 | ✅ |
| `emailInfrastructurePhase15dTemplateRegistry` | 12 | ✅ |
| `emailInfrastructurePhase15eLogsDeliverability` | 12 | ✅ |
| `emailInfrastructurePhase15fFullEmailRegression` | 20 | ✅ |
| `passwordResetAnalyticsGovernancePra1` | 9 | ✅ |
| `passwordResetAnalyticsGovernancePra2Sanitization` | 13 | ✅ |
| **Total** | **87** | **✅** |

(Phase 15B does not exist as a separate file — its checks were merged into
15A/15C during the original rollout; the suite-level guards in 15F cover
the same surface.)

## Full suite

Not invoked in this regression by request ("نطاق فحص نهائي سريع"). All
suites covering the modified surface (email + password-reset analytics) were
re-run individually with zero failures.

## Auth / reset-password behavior changed?

**No.** No edits to `authService`, `ResetPassword` handler logic, OTP flow,
or recovery-link parsing since PRA-2 closed. Only the analytics payload
contents and two defensive DB CHECK constraints were added.

## Sender path changed?

**No.**

- `supabase/functions/process-email-queue/index.ts` still reads
  `RESEND_API_KEY` via `Deno.env.get` and POSTs to Resend.
- `supabase/functions/send-transactional-email/index.ts` still reads
  `RESEND_API_KEY` and sends via Resend.
- `resend-health` / `resend-status` admin probes unchanged.
- No `VITE_RESEND*` reference exists in `src/` or `supabase/`
  (Phase 15a/c/f guards pass).
- No hardcoded `re_...` Resend live key anywhere in the repo
  (Phase 15a guard passes).
- Only `auth-email-hook` still imports `@lovable.dev/email-js`, and solely
  for `parseEmailWebhookPayload` (receiver-side parsing). It is on the
  documented allowlist in Phase 15f.

## Tokens / query / hash in logs?

**No.** Four layers of defense, all green:

1. Call-sites (`ForgotPasswordForm`, `ResetPassword`) pass `pathname` only,
   wrapped in `sanitizeAnalyticsPath(...)`.
2. Referrer goes through `sanitizeAnalyticsReferrer(...)` → `origin + pathname`.
3. `createPasswordResetLog` always pipes `metadata` through
   `sanitizePasswordResetMetadata`, which strips a 14-key forbidden list
   (`token`, `access_token`, `refresh_token`, `id_token`, `code`, `otp`,
   `state`, `authorization`, `cookie`, `password`, `new_password`, `session`,
   `jwt`, `secret`), drops JWT-shaped strings, truncates >512-char strings,
   and caps the payload at 4 KB JSON.
4. DB CHECK `password_reset_log_metadata_size_cap` enforces 8 KB at the
   table; admin-only SELECT policy unchanged.

## DB constraints safe?

**Yes.** Live verification against the database:

```
CHECK (status = ANY (ARRAY[
  'forgot_page_viewed','reset_page_viewed','requested','resend','sent',
  'failed','completed','link_clicked','link_valid','link_expired','link_invalid'
]))
CHECK (metadata IS NULL OR octet_length(metadata::text) <= 8192)
```

- All 11 events from PRA-1/PRA-2 are in the allowlist.
- The 8 KB cap is twice the client-side 4 KB sanitizer cap, so normal
  analytics events cannot trip it.
- Existing production rows (only `requested`) pass both constraints.
- RLS unchanged: anon has no SELECT, admin-only via
  `has_admin_access(auth.uid())`.
- No `service_role` reference in any client-side file (guard test).

## Blockers

**None.** No regressions, no behavior changes, no leaks.

## Decision

`EMAIL + PASSWORD RESET ANALYTICS FINAL REGRESSION POST-PRA-2 PASS`