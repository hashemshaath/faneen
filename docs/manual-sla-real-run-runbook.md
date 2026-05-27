# Manual SLA Real-Run Runbook (BUSINESS-OPERATIONS-2V)

> **Status: DISABLED in production.** This runbook documents the
> *contract* of the server-only `manual-sla-real-run` edge function.
> It does **not** authorize any live execution. The endpoint stays
> inert until `OPERATIONS_REAL_RUN_ENABLED='true'` is explicitly set
> by an on-call operator with a logged change ticket.

## Purpose

Document how to:

- Smoke-test the `manual-sla-real-run` edge endpoint **in denial
  mode** without enabling real execution.
- Confirm the guard chain (auth → admin role → flag → approval →
  confirmation token → reason → `dryRun:false` → `enableWrites:true`)
  fails closed.
- Understand the shape of an approval payload **for design review
  only** — never to be hand-forged in production.
- Roll back / re-disable the endpoint if it is ever enabled.

This runbook is **not** a permission to run SLA dispatch in
production. It is reference material for safety review.

## Prerequisites

- You are an authenticated `admin` or `super_admin` per
  `public.has_admin_access`.
- You have a logged change ticket and incident-commander approval
  before any flag flip.
- You are running smoke calls from a server-side or operator
  workstation context. No browser execution path exists.
- You have access to a **non-production** Supabase project for any
  experimentation that could conceivably mutate alert rows.

## Required environment variables

| Variable                                    | Purpose                                                 | Default |
|---------------------------------------------|---------------------------------------------------------|---------|
| `MANUAL_SLA_REAL_RUN_URL`                   | Full URL of the deployed edge function                  | unset   |
| `MANUAL_SLA_REAL_RUN_BEARER`                | Operator's `Authorization: Bearer <jwt>` token value    | unset   |
| `OPERATIONS_REAL_RUN_ENABLED`               | Server-side flag, must stay `false` outside an incident | unset   |
| `OPERATIONS_EXEC_CONTEXT`                   | Must be `server` for the CLI skeleton to consider gates | unset   |
| `OPERATIONS_MANUAL_HARNESS_CONFIRM`         | Must be exactly `I-UNDERSTAND-THE-RISK`                 | unset   |
| `OPERATIONS_MANUAL_HARNESS_APPROVAL_JSON`   | JSON-encoded approval payload (design reference only)   | unset   |

The smoke harness never reads or echoes the bearer value. It only
checks presence. If you log requests, **redact the Authorization
header** — the smoke harness redacts automatically.

## Secret handling rules

- **Never** paste a service-role key into a shell prompt, runbook,
  CI variable, or chat. The edge function constructs its own
  service-role client from project secrets; operators never see it.
- **Never** include `SUPABASE_SERVICE_ROLE_KEY` in any local script
  or `.env.local`.
- **Never** echo `$MANUAL_SLA_REAL_RUN_BEARER` to logs, shared
  terminals, or screenshots.
- **Never** commit any sample approval payload that contains real
  PII, recipient IDs, or notification bodies.
- Treat the runbook as **public-safe** — nothing in this file is a
  credential.

## Denial-mode curl examples

All of the following are expected to **fail closed** in normal
operation. None of them flip a flag or mutate data.

1. Missing bearer (expect `401 AUTHORIZATION_REQUIRED`):

   ```bash
   curl -i -X POST "$MANUAL_SLA_REAL_RUN_URL" \
        -H "Content-Type: application/json" \
        -d '{}'
   ```

2. Wrong method (expect `405 METHOD_NOT_ALLOWED`):

   ```bash
   curl -i -X GET "$MANUAL_SLA_REAL_RUN_URL" \
        -H "Authorization: Bearer $MANUAL_SLA_REAL_RUN_BEARER"
   ```

3. Flag disabled (expect `403 OPERATIONS_REAL_RUN_DISABLED`):

   ```bash
   curl -i -X POST "$MANUAL_SLA_REAL_RUN_URL" \
        -H "Authorization: Bearer $MANUAL_SLA_REAL_RUN_BEARER" \
        -H "Content-Type: application/json" \
        -d '{"approvalId":"design-review","confirmationToken":"x","reason":"smoke","dryRun":false,"enableWrites":true,"approval":{}}'
   ```

4. Missing approval payload (expect `400 APPROVAL_PAYLOAD_REQUIRED`
   once the flag is on — never tested in production):

   ```bash
   curl -i -X POST "$MANUAL_SLA_REAL_RUN_URL" \
        -H "Authorization: Bearer $MANUAL_SLA_REAL_RUN_BEARER" \
        -H "Content-Type: application/json" \
        -d '{"approvalId":"design-review","confirmationToken":"x","reason":"smoke","dryRun":false,"enableWrites":true}'
   ```

## Gates-open / no-op explanation

Even if **every** environment gate is set and a valid approval
payload is supplied, the system intentionally has multiple
independent stops:

- The Deno smoke harness (`scripts/manual-sla-real-run-smoke.mjs`)
  refuses to fabricate approval tokens, refuses to set
  `enableWrites:true`, refuses to enable notification writes, and
  exits non-zero if the endpoint unexpectedly returns `accepted:true`.
- The CLI skeleton (`scripts/operations-manual-sla-real-run.mjs`)
  prints a `gates_open_no_op` report and exits non-zero even when
  all environment flags are open — it does not wire a live writer.
- The edge function force-coerces `enableNotificationWrites` to
  `false` regardless of request body. No SMS / email / push /
  WhatsApp dispatcher is imported.
- The frontend has **no** invocation button, link, or hook.

## Approval payload shape (design reference only)

```json
{
  "approvalTicket": "OPS-INCIDENT-XXXX",
  "approvedBy": "<operator-user-id>",
  "approvedAt": "<iso-8601-timestamp>",
  "scope": "manual_sla_real_run",
  "expiresAt": "<iso-8601-timestamp>",
  "reason": "<short human-readable reason>"
}
```

The exact runtime contract lives in
`src/modules/operations/services/manualRealRunRequest.ts` (see
`OperationsProductionApproval`). Do **not** hand-forge approval
payloads — they must be issued through the approval-audit-logged
workflow.

## Expected safe responses

| Scenario                                | HTTP | `reason`                          |
|-----------------------------------------|------|-----------------------------------|
| OPTIONS preflight                       | 200  | `ok` (CORS)                       |
| Wrong method                            | 405  | `METHOD_NOT_ALLOWED`              |
| Missing/invalid bearer                  | 401  | `AUTHORIZATION_REQUIRED` / `UNAUTHORIZED` |
| Caller is not admin                     | 403  | `ADMIN_ROLE_REQUIRED`             |
| Flag disabled                           | 403  | `OPERATIONS_REAL_RUN_DISABLED`    |
| Missing approval id / payload           | 400  | `APPROVAL_ID_REQUIRED` / `APPROVAL_PAYLOAD_REQUIRED` |
| Missing confirmation token / reason     | 400  | `CONFIRMATION_TOKEN_REQUIRED` / `REASON_REQUIRED` |
| `dryRun !== false`                      | 400  | `DRY_RUN_MUST_BE_FALSE`           |
| `enableWrites !== true`                 | 400  | `ENABLE_WRITES_MUST_BE_TRUE`      |

Every response envelope includes:

```
notificationsDeferredReason: NOTIFICATION_WRITES_DEFERRED
```

and **never** contains PII, recipient IDs, raw rows, or the
service-role key.

## How to keep the flag disabled

- `OPERATIONS_REAL_RUN_ENABLED` is **not** set in production
  secrets. Leave it absent. The edge function treats absence as
  "disabled".
- Do not add it to CI/CD pipelines, preview environments, or
  shared shells.
- Do not set it in `.env`, `.env.local`, or
  `supabase/functions/manual-sla-real-run/.env` (none of these
  files should declare it).
- If you must flip it temporarily during an incident, scope the
  change to a **single** edge function deployment and revert
  immediately after the run.

## Rollback / disable steps

1. Remove `OPERATIONS_REAL_RUN_ENABLED` from the edge function
   secrets (or set it to anything other than `true`).
2. Re-run the smoke harness with no extra flags; it must report
   `defaultedToDenial: true` and the endpoint must return
   `OPERATIONS_REAL_RUN_DISABLED`.
3. Verify `AdminOperations` still shows
   "Manual SLA edge endpoint: Deployed / Disabled by flag" and
   "Manual SLA runbook: Available".
4. File an incident note linking to the change ticket.

## What NOT to do

- Do **not** enable `OPERATIONS_REAL_RUN_ENABLED` for "just a test".
- Do **not** add a UI button, link, or React Query mutation that
  calls `manual-sla-real-run`.
- Do **not** add a cron schedule, scheduler entry, or background
  trigger.
- Do **not** weaken the harness to set `enableWrites:true` or
  `enableNotificationWrites:true`.
- Do **not** import any notification, email, SMS, push, or WhatsApp
  dispatcher from the edge function, harness, or smoke script.
- Do **not** log the Authorization header, service-role key, or
  raw approval payloads.
- Do **not** screenshot a terminal that has secrets in scrollback.

## Production operator checklist

Before any future enablement (NOT in this phase):

- [ ] Change ticket filed and linked.
- [ ] Incident commander approval recorded.
- [ ] Approval payload issued through audited workflow.
- [ ] Smoke harness re-run in denial mode and passed.
- [ ] Edge function logs cleared of stale errors.
- [ ] Rollback owner identified and on-call.
- [ ] Post-run: flag removed, smoke harness re-run, audit row
      confirmed in `operations_approval_audit`.

If you cannot tick every box, **do not enable the flag**.