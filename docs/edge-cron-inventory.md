# Edge Cron Inventory

Snapshot of `cron.job` rows in the Lovable Cloud project, mapped against
`supabase/functions/**` and the inventory in
`src/__tests__/supabaseFunctionsInventory.test.ts`.

Authorization tokens and apikeys in the commands below are redacted
(`<REDACTED_ANON_KEY>` / `<REDACTED_SERVICE_ROLE_FROM_VAULT>`).

## Active jobs

| jobid | jobname | schedule | target | classification | status |
|------:|---------|----------|--------|----------------|--------|
| 1  | check-overdue-daily            | `0 8 * * *`    | `check-overdue`                              | cron     | OK |
| 3  | ping-search-engines-6h         | `0 */6 * * *`  | `ping-search-engines`                        | admin    | OK |
| 4  | check-migration-alerts-hourly  | `0 * * * *`    | `check-migration-alerts`                     | —        | STALE: function missing on disk |
| 5  | daily-site-audit               | `0 3 * * *`    | `run-site-audit`                             | admin    | OK |
| 11 | check-email-deliverability     | `*/15 * * * *` | SQL `public.check_email_deliverability()`    | DB func  | OK |
| 12 | audit-sitemap-status-daily     | `0 3 * * *`    | `audit-sitemap-status`                       | admin    | OK |
| 14 | contact-weekly-sla-report      | `0 9 * * 1`    | `weekly-sla-report`                          | cron     | DUPLICATE of jobid 15 |
| 15 | weekly-sla-report              | `0 9 * * 1`    | `weekly-sla-report`                          | cron     | DUPLICATE of jobid 14 |
| 16 | contact-notification-retries   | `* * * * *`    | `process-contact-notification-retries`       | cron     | OK |
| 21 | process-email-queue            | `5 seconds`    | `process-email-queue`                        | cron     | OK |
| 22 | check-badge-backlinks-monthly  | `0 3 1 * *`    | `check-badge-backlinks`                      | cron     | OK |
| 26 | process-expired-memberships    | `0 23 * * *`   | SQL `public.process_expired_memberships()`   | DB func  | OK |
| 27 | process-renewal-failures       | `15 23 * * *`  | SQL `public.process_renewal_failures()`      | DB func  | OK |
| 28 | notify-expiring-memberships    | `0 6 * * *`    | SQL `public.notify_expiring_memberships()`   | DB func  | OK |
| 29 | membership-lifecycle-dispatcher| `30 2 * * *`   | `membership-lifecycle-dispatcher`            | cron     | OK |

Redacted command pattern for HTTP-posting jobs:

```
SELECT net.http_post(
  url := 'https://<project>.supabase.co/functions/v1/<function-name>',
  headers := '{"Content-Type":"application/json","apikey":"<REDACTED_ANON_KEY>"}'::jsonb,
  body := '{}'::jsonb
);
```

`membership-lifecycle-dispatcher` uses a service-role token pulled from
`vault.decrypted_secrets` (`email_queue_service_role_key`) — also redacted.

## Expected cron-classified functions: coverage

| function                                | scheduled? | notes |
|-----------------------------------------|------------|-------|
| `membership-payment-reconcile`          | NO         | No `cron.job` row. Needs review. |
| `membership-lifecycle-dispatcher`       | YES (29)   | daily 02:30 |
| `monthly-provider-credit-grant`         | NO         | No `cron.job` row. Likely needs `0 0 1 * *`. Needs review. |
| `process-email-queue`                   | YES (21)   | every 5s |
| `process-contact-notification-retries`  | YES (16)   | every minute |
| `check-overdue`                         | YES (1)    | daily 08:00 |
| `weekly-sla-report`                     | YES (14+15)| duplicate |
| `check-badge-backlinks`                 | YES (22)   | monthly day-1 03:00 |

## Issues found

1. STALE: `check-migration-alerts-hourly` (jobid 4) posts to
   `/functions/v1/check-migration-alerts`, which has no directory under
   `supabase/functions/`. Every hourly run will 404.
2. DUPLICATE: `contact-weekly-sla-report` (jobid 14) and `weekly-sla-report`
   (jobid 15) share schedule and target.
3. MISSING SCHEDULES:
   - `membership-payment-reconcile`
   - `monthly-provider-credit-grant`

## Recommended fixes (deferred — not applied in this phase)

- Unschedule `check-migration-alerts-hourly`, or restore the function.
- Unschedule one duplicate weekly-SLA job (keep `weekly-sla-report`,
  drop `contact-weekly-sla-report`).
- Schedule `membership-payment-reconcile` (suggest hourly).
- Schedule `monthly-provider-credit-grant` (suggest `0 0 1 * *`).

These require `cron.unschedule` / `cron.schedule` via the Supabase insert
tool — cron commands carry tokens and must not be committed to migrations.

## Security / redaction

- All Authorization headers and apikey values are redacted in this doc.
- The live `cron.job.command` rows still carry the real anon key and
  vault-decrypted service-role key — standard Supabase cron pattern, not
  introduced by this audit.
