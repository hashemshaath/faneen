# Edge Function Inventory — HARDENING-1C

_Last updated: HARDENING-1C audit pass._

Total functions: 55 (excluding `_shared`).

## Categories

### Public (intentionally unauthenticated)
- `robots`, `sitemap`, `og-image`, `badge-pixel`
- `email-track-open`, `email-track-click`
- `ingest-web-vitals`
- `handle-email-unsubscribe`, `handle-email-suppression`

### User-authenticated
- `submit-quote-request`, `match-quote-request`, `get-revealed-contact`
- `ai-center`, `blog-ai-tools`, `analyze-contract-document`, `verify-pdf-arabic`
- `send-otp`, `verify-otp`, `send-login-otp`, `verify-login-otp`, `temp-code-session`
- `national-address-lookup`
- `notify-amendment-event`, `notify-client-invitation`,
  `notify-contact-event`, `notify-customer-lead-update`,
  `notify-supplier-lead`
- `membership-payment-create-intent`, `membership-payment-confirm`,
  `membership-payment-reconcile`
- `send-transactional-email`, `preview-transactional-email`

### Admin/service-role only
- `admin-create-user`, `admin-delete-user`, `admin-reset-password`
- `admin-preview-email`, `admin-retry-dlq-email`
- `admin-reveal-lead-contact`
- `manual-sla-real-run` (feature-flag gated, default inert)
- `triage-contact-message`, `ab-evaluate`, `test-contact-webhook`

### Webhooks (signature-verified)
- `membership-payment-webhook`
- `auth-email-hook`

### Cron / scheduled
- `check-overdue`
- `monthly-provider-credit-grant`
- `membership-lifecycle-dispatcher`
- `process-email-queue`
- `process-contact-notification-retries`
- `weekly-sla-report`
- `audit-sitemap-status`, `check-badge-backlinks`, `ping-search-engines`,
  `run-site-audit`

## Notification dispatchers (allowed to write `public.notifications`)

See `src/__tests__/hardening1c.edgeFunctionAudit.test.ts` — the
`NOTIFICATION_DISPATCHERS` set is the authoritative allow-list. No other
edge function may insert into `public.notifications`.

## Audit invariants (enforced by tests)

- No JWT-like literals in edge sources.
- No echo of the `Authorization` header in response bodies.
- No raw OTP/password/service-role values in logs.
- No raw unsubscribe token values in logs.
- All `admin-*` functions read the `Authorization` header.
- `manual-sla-real-run` remains feature-flag gated and never writes
  notifications directly.
- No edge function returns a `.stack` field in its JSON body.
- `membership-payment-webhook` references signature verification.

## Recent fixes

- **HARDENING-1C**: redacted raw `token` value from
  `handle-email-unsubscribe` error log (was a bearer-credential leak in
  function logs).
- **HARDENING-1D**: normalized error envelopes for `admin-delete-user`,
  `check-overdue`, and `monthly-provider-credit-grant`. All three now return
  safe `code` strings instead of raw `err.message` in HTTP responses, and log
  coarse safe error categories without exposing secrets or PII.