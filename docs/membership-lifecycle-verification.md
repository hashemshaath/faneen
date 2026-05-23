# R4F-7 — Membership Lifecycle Post-Deploy Verification

After the first scheduled run of `membership-lifecycle-dispatcher`
(daily at `30 2 * * *` UTC), use the following read-only queries to
confirm health. All four are also surfaced visually in the admin UI at
`/admin/membership-events` via the **Membership lifecycle jobs** panel
(no SQL needed for day-to-day monitoring).

All membership lifecycle templates tracked:
- `membership-subscription-expired`
- `membership-renewal-failed`
- `membership-renewal-reminder`
- `membership-promo-redeemed`
- `membership-subscription-activated`
- `membership-tier-changed-by-admin`
- `membership-cancelled-immediately`
- `membership-subscription-cancelled`

---

## 1. Cron job exists and is active

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'membership-lifecycle-dispatcher';
-- expect: schedule = '30 2 * * *', active = true
```

## 2. First scheduled run recorded

```sql
SELECT start_time, end_time, status, return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'membership-lifecycle-dispatcher')
ORDER BY start_time DESC
LIMIT 5;
-- expect: at least 1 row after 02:30 UTC, status = 'succeeded'
```

## 3. No repeated failures in the last 7 days

```sql
SELECT count(*) AS recent_failures
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
WHERE j.jobname = 'membership-lifecycle-dispatcher'
  AND d.status = 'failed'
  AND d.start_time > now() - interval '7 days';
-- expect: 0
```

## 4. Marker rows exist for eligible lifecycle notifications

```sql
SELECT template_name, status, metadata->>'dispatch_key' AS dispatch_key, created_at
FROM email_send_log
WHERE template_name IN (
  'membership-subscription-expired',
  'membership-renewal-failed',
  'membership-renewal-reminder',
  'membership-promo-redeemed'
)
ORDER BY created_at DESC
LIMIT 20;
-- expect: rows with non-null dispatch_key when eligible notifications exist.
-- If empty: no eligible lifecycle notifications occurred during the window —
-- this is a valid "no-op success", not a failure.
```

## 5. Idempotency — no duplicate dispatch keys

```sql
SELECT metadata->>'dispatch_key' AS dispatch_key, count(*) AS n
FROM email_send_log
WHERE metadata ? 'dispatch_key'
  AND template_name LIKE 'membership-%'
GROUP BY metadata->>'dispatch_key'
HAVING count(*) > 1;
-- expect: 0 rows (each dispatch_key appears at most once across pending/sent
-- transitions for the same email — see email_send_log dedup note).
```

## 6. Manual dry-run smoke (requires CRON_SECRET)

```bash
curl -X POST \
  'https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/membership-lifecycle-dispatcher?dryRun=1' \
  -H 'Content-Type: application/json' \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{}'
# expect HTTP 200 with { success: true, processed, sent: 0, skipped, failed, details:[...] }
# dry-run never writes email_send_log rows.
```

Re-running the live (non-dryRun) dispatcher must NOT create duplicate
`dispatch_key` marker rows — the dispatcher pre-checks
`email_send_log.metadata->>'dispatch_key'` before sending.