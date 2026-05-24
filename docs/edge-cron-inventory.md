# Edge Cron Inventory

Snapshot of `cron.job` rows in the Lovable Cloud project, mapped against
`supabase/functions/**` and the inventory in
`src/__tests__/supabaseFunctionsInventory.test.ts`.

Authorization tokens and apikeys in the commands below are redacted
(`<REDACTED_ANON_KEY>` / `<REDACTED_SERVICE_ROLE_FROM_VAULT>`).

## Active jobs (post EDGE-CRON-REPAIR-1)

| jobid | jobname | schedule | target | classification | status |
|------:|---------|----------|--------|----------------|--------|
| 1  | check-overdue-daily                  | `0 8 * * *`    | `check-overdue`                              | cron     | OK |
| 3  | ping-search-engines-6h               | `0 */6 * * *`  | `ping-search-engines`                        | admin    | OK |
| 5  | daily-site-audit                     | `0 3 * * *`    | `run-site-audit`                             | admin    | OK |
| 11 | check-email-deliverability           | `*/15 * * * *` | SQL `public.check_email_deliverability()`    | DB func  | OK |
| 12 | audit-sitemap-status-daily           | `0 3 * * *`    | `audit-sitemap-status`                       | admin    | OK |
| 15 | weekly-sla-report                    | `0 9 * * 1`    | `weekly-sla-report`                          | cron     | OK |
| 16 | contact-notification-retries         | `* * * * *`    | `process-contact-notification-retries`       | cron     | OK |
| 21 | process-email-queue                  | `5 seconds`    | `process-email-queue`                        | cron     | OK |
| 22 | check-badge-backlinks-monthly        | `0 3 1 * *`    | `check-badge-backlinks`                      | cron     | OK |
| 26 | process-expired-memberships          | `0 23 * * *`   | SQL `public.process_expired_memberships()`   | DB func  | OK |
| 27 | process-renewal-failures             | `15 23 * * *`  | SQL `public.process_renewal_failures()`      | DB func  | OK |
| 28 | notify-expiring-memberships          | `0 6 * * *`    | SQL `public.notify_expiring_memberships()`   | DB func  | OK |
| 29 | membership-lifecycle-dispatcher      | `30 2 * * *`   | `membership-lifecycle-dispatcher`            | cron     | OK |
| 30 | membership-payment-reconcile-hourly  | `0 * * * *`    | `membership-payment-reconcile`               | cron     | OK (new) |
| 31 | monthly-provider-credit-grant        | `0 0 1 * *`    | `monthly-provider-credit-grant`              | cron     | OK (new) |

### Removed in EDGE-CRON-REPAIR-1

| jobid | jobname | reason |
|------:|---------|--------|
| 4  | check-migration-alerts-hourly  | Target edge function did not exist (404s). |
| 14 | contact-weekly-sla-report      | Duplicate of jobid 15 (same schedule + same target). |

Redacted command pattern for HTTP-posting jobs:

```
SELECT net.http_post(
  url := 'https://<project>.supabase.co/functions/v1/<function-name>',
  headers := '{"Content-Type":"application/json","apikey":"<REDACTED_ANON_KEY>"}'::jsonb,
  body := '{}'::jsonb
);
```

Service-role pattern (used by `membership-lifecycle-dispatcher`,
`membership-payment-reconcile-hourly`, `monthly-provider-credit-grant`):

```
SELECT net.http_post(
  url := 'https://<project>.supabase.co/functions/v1/<function-name>',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (
      SELECT decrypted_secret FROM vault.decrypted_secrets
      WHERE name = '<REDACTED_SERVICE_ROLE_FROM_VAULT>'
    )
  ),
  body := '{"triggeredBy":"cron"}'::jsonb
);
```

## Expected cron-classified functions: coverage

| function                                | scheduled? | notes |
|-----------------------------------------|------------|-------|
| `membership-payment-reconcile`          | YES (30)   | hourly (new) |
| `membership-lifecycle-dispatcher`       | YES (29)   | daily 02:30 |
| `monthly-provider-credit-grant`         | YES (31)   | `0 0 1 * *` (new) |
| `process-email-queue`                   | YES (21)   | every 5s |
| `process-contact-notification-retries`  | YES (16)   | every minute |
| `check-overdue`                         | YES (1)    | daily 08:00 |
| `weekly-sla-report`                     | YES (15)   | duplicate removed |
| `check-badge-backlinks`                 | YES (22)   | monthly day-1 03:00 |

## Issues found

None as of EDGE-CRON-REPAIR-1.

## Security / redaction

- All Authorization headers and apikey values are redacted in this doc.
- Live `cron.job.command` rows still carry the real anon key and
  vault-decrypted service-role key — standard Supabase cron pattern.
