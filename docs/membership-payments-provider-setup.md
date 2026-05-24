# R4F-9B — Membership Payments Provider Setup

**Status:** Provider choice locked and secrets documented. No live code, SDK, schema, migration, or UI changes yet. This document is a prerequisite before any provider integration work begins in R4F-9C.

---

## 1. Provider Decision

| Decision | Value |
|---|---|
| **First provider** | **Moyasar** |
| **Future second provider** | Stripe (for international / multi-currency expansion) |

### Rationale for Moyasar
- Saudi/GCC fit — licensed in the Kingdom.
- SAR settlement — no FX markup for local transactions.
- Mada support — native, not routed through a third party.
- Apple Pay support — available out of the box.
- Arabic-friendly merchant dashboard — reduces operational friction for local operations.
- Hosted payment form (`/v2/charges`) maps cleanly to the current one-shot `membership_payment_intents` lifecycle.

### Stripe as second provider
- `PaymentIntent` status enum is a near 1:1 match with the existing internal lifecycle (`created`, `requires_action`, `succeeded`, `failed`, `cancelled`, `refunded`).
- Best fit if/when the platform expands outside SAR or needs multi-currency checkout.
- Switching cost is low because the internal scaffold is provider-agnostic.

---

## 2. Required Secrets

| Name | Scope | Notes |
|---|---|---|
| `MOYASAR_SECRET_KEY` | Edge functions only | Server-side secret. Never expose to client. |
| `MOYASAR_PUBLISHABLE_KEY` | Edge functions or frontend | Safe to expose if Moyasar requires it client-side. If checkout is fully server-generated, keep it in edge functions only. |
| `MOYASAR_WEBHOOK_SECRET` | Edge functions only | Used to verify Moyasar webhook signatures. |
| `MEMBERSHIP_PAYMENTS_SUCCESS_URL` | Edge functions | Public-facing return URL after successful checkout. |
| `MEMBERSHIP_PAYMENTS_CANCEL_URL` | Edge functions | Public-facing return URL after cancelled/abandoned checkout. |
| `MEMBERSHIP_PAYMENTS_WEBHOOK_URL` | Edge functions | Public webhook ingress URL (derived from project URL). |

**Note:** Do not store any of these values in the codebase. They will be configured via the backend secrets system before R4F-9C.

---

## 3. Supabase Secrets Plan

When the time comes to wire secrets (after R4F-9B, during R4F-9C prep), the following commands will be used. Do not run them in this phase.

```bash
# Server-side secrets (edge functions)
supabase secrets set MOYASAR_SECRET_KEY=<...>
supabase secrets set MOYASAR_WEBHOOK_SECRET=<...>

# Callback URLs (edge functions read these at runtime)
supabase secrets set MEMBERSHIP_PAYMENTS_SUCCESS_URL=https://www.qitaat.com/membership/payment/return?status=success
supabase secrets set MEMBERSHIP_PAYMENTS_CANCEL_URL=https://www.qitaat.com/membership/payment/return?status=cancelled
```

---

## 4. Public Frontend Environment Plan

Moyasar supports a hosted checkout model where the checkout URL is generated server-side (via edge function) and the user is redirected. This is the preferred approach for membership payments because:
- The amount and currency are calculated server-side, never trusted from the client.
- The publishable key does not need to be shipped to the browser.

If Moyasar JS SDK (client-side tokenization) is chosen later, the publishable key can be exposed safely via a lightweight edge function config endpoint or a public env var:

```
VITE_MOYASAR_PUBLISHABLE_KEY=pk_test_...
```

**Recommendation:** Start with server-side checkout generation. Only add client-side key exposure if the UX requires it.

---

## 5. Edge Function URLs

### Planned Edge Functions

| Function | Purpose | JWT Verify |
|---|---|---|
| `membership-payment-create-intent` | Create a Moyasar charge / checkout URL for a subscription. | `true` |
| `membership-payment-confirm` | Poll/reconcile payment status after user return. | `true` |
| `membership-payment-reconcile` | Cron / admin-triggered reconciliation of pending intents. | `true` |
| `membership-payment-webhook` | Receive Moyasar webhooks. | `false` |

### Webhook URL Pattern

```
https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/membership-payment-webhook
```

This URL will be registered in the Moyasar dashboard as the webhook endpoint. The function name (`membership-payment-webhook`) and project ref are already known from the scaffold.

---

## 6. Callback URL Plan

### Success URL

```
/membership/payment/return?intent=<payment_intent_id>&status=success
```

### Cancel URL

```
/membership/payment/return?intent=<payment_intent_id>&status=cancelled
```

**Note:** The exact `/membership/payment/return` route does not exist yet. It will be implemented as part of **R4F-9E** (confirm/reconcile return flow). The edge function `membership-payment-create-intent` will embed these callback URLs into the Moyasar checkout session.

---

## 7. Status Mapping

### Moyasar → Internal `membership_payment_intents.status`

| Moyasar Status | Internal Status | Notes |
|---|---|---|
| `initiated` | `created` or `requires_action` | Checkout URL generated, awaiting payment. |
| `paid` | `succeeded` | Payment captured successfully. |
| `failed` | `failed` | Payment declined or error. |
| `voided` / `expired` | `cancelled` | Abandoned or expired checkout. |
| `refunded` | `refunded` | Full or partial refund issued via Moyasar dashboard. |

**Reconciliation rule:** The webhook handler treats Moyasar as the source of truth. Internal status transitions are only allowed in the direction of the lifecycle (no rollback from `succeeded` to `created`).

---

## 8. Webhook Verification Model

1. **Raw body preservation:** The edge function must read the raw request body (before JSON parsing) to compute the HMAC signature.
2. **HMAC verification:** Use `MOYASAR_WEBHOOK_SECRET` to compute the expected signature. Compare using a constant-time string comparison (`crypto.timingSafeEqual` or equivalent).
3. **Reject invalid signatures:** Return HTTP 401. Do not process the body or store anything.
4. **Event storage:** Every valid event is stored in `membership_payment_webhook_events` before processing.
5. **Idempotency:** Deduplicate by `provider = 'moyasar'` + `event_id`. UNIQUE constraint prevents replays.
6. **No raw payload in UI:** Never render the raw webhook payload in any admin or user view. Only derived, whitelisted fields may be displayed.

---

## 9. Idempotency Rules

| Layer | Key Format | Example |
|---|---|---|
| **Create intent** | `mp:<subscription_id>:<plan_or_tier>:<billing_cycle>:<attempt>` | `mp:sub-123:gold:annual:1` |
| **Webhook event** | `provider` + `event_id` | `moyasar` + `evt_...` |
| **Provider intent** | `provider_intent_id` | Moyasar charge ID stored in `membership_payment_intents.provider_intent_id` |
| **Manual fallback** | Existing admin RPCs | `admin_mark_membership_paid_manually` / `admin_mark_membership_payment_refunded_manually` remain available. |

All keys are enforced at the database layer (UNIQUE constraints) and checked before any mutation.

---

## 10. Security / Operational Notes

| Rule | Detail |
|---|---|
| Never log secret keys | Edge function logs must strip `MOYASAR_SECRET_KEY` and `MOYASAR_WEBHOOK_SECRET`. |
| Never expose raw payload | `membership_payment_webhook_events.payload` is for audit only; never rendered in UI. |
| Never trust client amount/currency | Edge function recalculates amount from `membership_plans` + `membership_subscriptions`. |
| Webhook is source of truth | Status updates from webhooks override polling results. |
| Confirm page is reconcile-only | The confirm/reconcile edge function polls Moyasar and reconciles against the webhook event log. |
| Edge functions return 200 OK JSON | All functions return a consistent JSON envelope, even on soft errors, to aid debugging without leaking secrets. |
| Manual fallback preserved | Admin manual mark-paid and mark-refunded RPCs remain operational for support scenarios. |

---

## 11. Implementation Phases After R4F-9B

| Phase | Deliverable |
|---|---|
| **R4F-9C** | `membership-payment-create-intent` edge function + checkout entry UI. |
| **R4F-9D** | `membership-payment-webhook` ingress + signature verification + event storage + idempotency. |
| **R4F-9E** | `membership-payment-confirm` + `membership-payment-reconcile` return flow + subscription activation. |
| **R4F-9F** | Admin live monitoring (real provider events, refund initiation UI). |
| **R4F-9G** | Production verification checklist + dry-run runbook + on-call doc. → See [`docs/membership-payments-production-runbook.md`](membership-payments-production-runbook.md) |

---

## Appendix: Existing Scaffolds Reused

The following scaffolds are already in place and will be wired during R4F-9C–R4F-9E:

- `membership_payment_intents` table — provider-agnostic intent record.
- `membership_payment_webhook_events` table — deduplicated webhook audit.
- `membership-payment-create-intent` wrapper — edge function skeleton.
- `membership-payment-confirm` wrapper — edge function skeleton.
- `membership-payment-reconcile` wrapper — edge function skeleton.
- `membership-payment-webhook` wrapper — edge function skeleton.
- Manual admin RPCs — `admin_mark_membership_paid_manually`, `admin_mark_membership_payment_refunded_manually`.

No schema changes or migrations are required to proceed from this document into R4F-9C.
