# R4F-8B — Membership Payments Schema Proposal

**Status:** Applied as schema preparation. No live payment provider integration, no checkout flow, no webhooks wired, no UI/copy changes. Manual / admin / promo activation remains the only production path.

## What changed

### `membership_subscriptions` — new nullable columns
| Column | Type | Notes |
|---|---|---|
| `payment_provider` | text NULL | check: `manual|promo|stripe|paddle|tap|hyperpay|moyasar|other` |
| `payment_status` | text NULL | check: `pending|paid|failed|refunded|manual|cancelled` |
| `last_invoice_id` | text NULL | |
| `last_external_payment_id` | text NULL | |
| `last_paid_at` | timestamptz NULL | |
| `last_paid_amount` | numeric(10,2) NULL | |
| `last_paid_currency` | varchar(3) NULL | char_length=3 check |
| `last_receipt_url` | text NULL | |
| `payment_metadata` | jsonb NOT NULL DEFAULT `'{}'` | provider-agnostic bag |

All columns are nullable (metadata defaults to `{}`), so existing manual rows continue to function without backfill.

### New table: `membership_payment_intents`
Provider-agnostic intent record. Cascades on subscription delete. Unique idempotency key + conditional unique on `(provider, provider_intent_id)`. Status check covers full lifecycle: `created → requires_action → succeeded | failed | cancelled | refunded`.

### New table: `membership_payment_webhook_events`
Raw webhook audit + dedupe (`unique(provider, event_id)`).

## Why nullable
- Zero-impact rollout. No backfill required.
- Manual/admin/promo activations write nothing new.
- A future R4F-8E provider integration starts populating fields incrementally.

## RLS summary
| Table | Service role | Admin | Owner | Other |
|---|---|---|---|---|
| `membership_payment_intents` | ALL | SELECT all | SELECT where `user_id = auth.uid()` | none |
| `membership_payment_webhook_events` | ALL | SELECT all | — | none |

No client writes in this phase. All writes will go through SECURITY DEFINER RPCs / service-role edge functions in R4F-8D / R4F-8E.

## Idempotency strategy
- **Intent creation:** `idempotency_key` is unique. Recommended format `mp-intent-{subscription_id}-{billing_cycle}-{period_start}`.
- **Webhook dedupe:** `(provider, event_id)` unique. Retries are no-ops at insert time.
- **Email dispatch:** reuse existing `email_send_log.metadata->>'dispatch_key'` pattern (see R4F-5 dispatcher). Recommended keys: `mp-paid-{subscription_id}-{period_start}`, `mp-refunded-{payment_id}`, `mp-failed-{intent_id}`.

## Payment intent lifecycle
```
created ──► requires_action ──► succeeded ──► (optional) refunded
   │             │                 │
   ├─► failed    ├─► failed        └─► (mirrors into membership_subscriptions.last_paid_*)
   └─► cancelled └─► cancelled
```
`confirmed_at` is set on terminal success.

## Webhook event lifecycle
```
received  ──insert (dedupe on provider,event_id)──►  processed_at = now()
                                                  │
                                                  └─ on failure: processing_error populated, processed_at NULL → retried
```

## What remains manual
- All current activation paths (UI-driven `subscribe_to_plan`, admin tier override, promo redemption).
- All transactional email copy (beta / manual-activation tip).
- Cron lifecycle dispatcher (R4F-6) is unaffected.

## Rollback notes
- Tables are additive; no app/services code references them yet.
- To roll back:
  ```sql
  DROP TABLE IF EXISTS public.membership_payment_webhook_events;
  DROP TABLE IF EXISTS public.membership_payment_intents;
  ALTER TABLE public.membership_subscriptions
    DROP COLUMN IF EXISTS payment_provider,
    DROP COLUMN IF EXISTS payment_status,
    DROP COLUMN IF EXISTS last_invoice_id,
    DROP COLUMN IF EXISTS last_external_payment_id,
    DROP COLUMN IF EXISTS last_paid_at,
    DROP COLUMN IF EXISTS last_paid_amount,
    DROP COLUMN IF EXISTS last_paid_currency,
    DROP COLUMN IF EXISTS last_receipt_url,
    DROP COLUMN IF EXISTS payment_metadata;
  ```
- Safe at any time before R4F-8C wrappers reference the new fields.

## Audit impact
- `memberships-isolation-audit` / `edge-memberships-isolation-audit`: **no change** in R4F-8B. New tables are not added to the guarded list yet because no app/service code touches them. R4F-8C will either:
  - add `src/modules/memberships/services/payments/**` wrappers and extend the audit allowlist + guarded table list, or
  - introduce a dedicated `payments-isolation-audit`.

## Future phases
| Phase | Title |
|---|---|
| R4F-8C | Provider-agnostic service scaffold (no provider yet) |
| R4F-8D | Webhook edge function + idempotency wiring |
| R4F-8E | First real provider integration (Stripe/Paddle/Tap/...) |
| R4F-8F | Post-payment lifecycle automation (paid/refunded/failed emails via dispatcher) |
