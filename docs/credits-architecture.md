# Provider Credits Architecture

Canonical reference for the Provider Lead Credits subsystem. Both client and
server access to provider credits is funneled through dedicated boundary
modules, and two CI guardrails enforce that boundary.

## Overview

Providers consume **lead credits** when revealing buyer contact details, and
receive a monthly grant based on their active subscription plan. All reads,
debits, grants, and admin adjustments must go through the canonical boundary
modules below. Direct table or RPC access from anywhere else is a regression.

## Boundaries

### Client boundary
`src/modules/credits/services/**`

- Read wrappers (ledger reads).
- Admin mutation wrappers (`adminAdjustProviderCredits`).
- All React Query hooks and UI must import through this module.

### Server boundary
`supabase/functions/_shared/credits/**`

Exports:
- `debitProviderLeadCredit`
- `grantMonthlyProviderCredit`
- `adminAdjustProviderCreditsServer`
- `insertCreditLedgerTransaction`
- `getProviderCreditBalance`
- `buildRevealIdempotencyKey`
- `buildMonthlyGrantIdempotencyKey`

All edge functions must import through `_shared/credits`.

## Guardrails (CI)

- `npm run credits-isolation-audit` — locks the client boundary
  (`src/modules/credits/services/**`).
- `npm run edge-credits-isolation-audit` — locks the server boundary
  (`supabase/functions/_shared/credits/**`).

Both run in `.github/workflows/code-audit.yml` and fail the build on
violation.

## Guarded targets

| Target | Type | Client guard | Server guard |
|---|---|---|---|
| `provider_lead_credit_transactions` | table | ✅ | ✅ |
| `admin_adjust_provider_credits` | RPC | ✅ | ✅ |
| `consume_provider_lead_credit` | RPC | — | ✅ |
| `grant_monthly_provider_credit` | RPC | — | ✅ |

## Atomic RPCs

- **`consume_provider_lead_credit(subscription_id, lead_id, user_id, idempotency_key, ...)`**
  Atomically checks balance, decrements `provider_subscriptions.lead_credits_balance`,
  and inserts a ledger row. Returns `{ ok, reason }` where `reason ∈
  { 'insufficient', 'subscription_not_found', ... }`.
- **`grant_monthly_provider_credit(subscription_id, amount, period_start, period_end, plan_code, idempotency_key)`**
  Atomically grants the monthly credit, guarded by a partial unique index on
  the idempotency key. Returns `{ ok, granted, idempotent }`.
- **`admin_adjust_provider_credits(...)`**
  Admin-only manual adjustment with full ledger audit row.

## Idempotency contracts

| Operation | Key format |
|---|---|
| Reveal contact debit | `reveal:<leadId>:<userId>` |
| Monthly credit grant | `monthly:<subscriptionId>:YYYY-MM` (UTC) |

Keys are built exclusively via `buildRevealIdempotencyKey` /
`buildMonthlyGrantIdempotencyKey`.

## Failure mapping (edge HTTP)

| RPC `reason` | HTTP status |
|---|---|
| `insufficient` | 402 |
| `subscription_not_found` | 402 |
| any other debit failure | 500 |

Edge functions always return `200 OK JSON` for non-error business outcomes
(per project convention).

## Sequence diagrams

### A. Reveal contact debit

```
Client (UI)
   │  invoke admin-reveal-lead-contact { leadId }
   ▼
admin-reveal-lead-contact (edge)
   │  buildRevealIdempotencyKey(leadId, userId)
   │  getProviderCreditBalance(userId) ──► provider_subscriptions
   │  debitProviderLeadCredit({ subscriptionId, leadId, userId, key })
   │        └──► RPC consume_provider_lead_credit (atomic)
   │                   ├─ ok:true            → reveal contact, 200
   │                   ├─ insufficient       → 402
   │                   └─ subscription_not_found → 402
   ▼
Response → Client
```

### B. Monthly credit grant

```
Cron (scheduler)
   │  invoke monthly-provider-credit-grant
   ▼
monthly-provider-credit-grant (edge)
   │  for each active subscription:
   │     buildMonthlyGrantIdempotencyKey(subId, YYYY-MM UTC)
   │     grantMonthlyProviderCredit({ subscriptionId, amount, period, planCode })
   │           └──► RPC grant_monthly_provider_credit (atomic, unique key)
   │                      ├─ ok:true granted:true      → granted++
   │                      ├─ ok:true idempotent:true   → skipped++
   │                      └─ ok:false                  → errors[]
   ▼
Response → { granted, skipped, errors } 200
```

## The rule

> **Never** call `provider_lead_credit_transactions`,
> `consume_provider_lead_credit`, `grant_monthly_provider_credit`, or
> `admin_adjust_provider_credits` directly outside the canonical boundaries:
>
> - Client: `src/modules/credits/services/**`
> - Server: `supabase/functions/_shared/credits/**`
>
> CI will fail via `credits-isolation-audit` and
> `edge-credits-isolation-audit`.

## Related

- Edge functions using the shared module:
  - `supabase/functions/admin-reveal-lead-contact`
  - `supabase/functions/monthly-provider-credit-grant`
- Audit scripts:
  - `scripts/credits-isolation-audit.mjs`
  - `scripts/edge-credits-isolation-audit.mjs`