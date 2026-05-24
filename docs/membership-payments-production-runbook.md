# R4F-9G — Membership Payments Production Verification Checklist + On-Call Runbook

**Status:** Documentation only. No code, schema, migration, secret, or UI changes.

**Scope:** Pre-launch verification steps, Moyasar dashboard configuration, dry-run flow, admin monitoring guidance, incident response, rollback plan, and known limitations.

---

## 1. Overview

| Item | Value |
|---|---|
| **Current provider** | Moyasar |
| **Flow** | Create intent → hosted checkout → webhook → confirm/reconcile → status update → admin + user visibility |
| **Manual fallback** | Admin Mark Paid / Mark Refunded remains available for support scenarios |
| **Live edge functions** | `membership-payment-create-intent`, `membership-payment-webhook`, `membership-payment-confirm`, `membership-payment-reconcile` |
| **Return page** | `/membership/payment/return` (protected route) |
| **Admin monitoring** | `/admin/membership-payments` |

---

## 2. Required Secrets Checklist

All secrets are configured via the backend secrets system. **Do not commit values to the codebase.**

| Secret Name | Purpose |
|---|---|
| `MOYASAR_SECRET_KEY` | Server-side API calls to Moyasar (charges, status polls). |
| `MOYASAR_WEBHOOK_SECRET` | HMAC-SHA256 verification of incoming Moyasar webhooks. |
| `MEMBERSHIP_PAYMENTS_SUCCESS_URL` | Return URL after successful checkout. |
| `MEMBERSHIP_PAYMENTS_CANCEL_URL` | Return URL after cancelled/abandoned checkout. |
| `MEMBERSHIP_PAYMENTS_WEBHOOK_URL` | Public webhook ingress URL (derived from project URL). |

---

## 3. Supabase Secret Setup Commands

Run these commands **once** in your deployment environment. Replace `...` with real values from the Moyasar dashboard.

```bash
# Server-side secrets (edge functions only)
supabase secrets set MOYASAR_SECRET_KEY="..."
supabase secrets set MOYASAR_WEBHOOK_SECRET="..."

# Callback URLs (edge functions read these at runtime)
supabase secrets set MEMBERSHIP_PAYMENTS_SUCCESS_URL="https://www.qitaat.com/membership/payment/return?intent=<id>&status=success"
supabase secrets set MEMBERSHIP_PAYMENTS_CANCEL_URL="https://www.qitaat.com/membership/payment/return?intent=<id>&status=cancelled"
supabase secrets set MEMBERSHIP_PAYMENTS_WEBHOOK_URL="https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/membership-payment-webhook"
```

> **Note:** `<id>` is a placeholder. The edge function substitutes the actual `payment_intent_id` at runtime.

---

## 4. Moyasar Dashboard Setup

### 4.1 Webhook Endpoint

Register this URL in the Moyasar dashboard:

```
https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/membership-payment-webhook
```

- **Method:** `POST`
- **JWT verification:** `false` (the provider sends the request, not an authenticated user)
- **Signature header:** `x-moyasar-signature` (the edge function also accepts `moyasar-signature` and `x-signature` as fallbacks)

### 4.2 Callback URLs

Configure these in Moyasar as redirect URLs:

| Type | URL |
|---|---|
| **Success / Callback** | `https://www.qitaat.com/membership/payment/return?intent=<id>&status=success` |
| **Cancel** | `https://www.qitaat.com/membership/payment/return?intent=<id>&status=cancelled` |

### 4.3 Required Webhook Events

Ensure the following events are enabled in the Moyasar dashboard:

| Moyasar Event | Internal Mapping | Action |
|---|---|---|
| `paid` | `succeeded` | Activate subscription, send receipt, enqueue notification. |
| `failed` | `failed` | Mark intent failed, no subscription activation. |
| `expired` / `cancelled` / `voided` | `cancelled` | Clean up pending intent. |
| `refunded` (if supported) | `refunded` | Update subscription payment status, credit note available. |

---

## 5. Pre-Deploy Verification Checklist

Run these checks before any production traffic is accepted.

- [ ] `npm run memberships-isolation-audit` passes.
- [ ] `npm run edge-functions-isolation-audit` passes.
- [ ] `npm run transactional-email-isolation-audit` passes.
- [ ] `npm run notifications-insert-isolation-audit` passes.
- [ ] `membership-payment-create-intent` is deployed.
- [ ] `membership-payment-webhook` is deployed.
- [ ] `membership-payment-confirm` is deployed.
- [ ] `membership-payment-reconcile` is deployed.
- [ ] `/admin/membership-payments` is reachable by admin users.
- [ ] `/membership/payment/return` is behind `ProtectedRoute`.
- [ ] `/membership/payment/return` is no-indexed (or does not appear in `robots.txt` allow list).
- [ ] `robots.txt` does not accidentally expose payment return paths.
- [ ] All four edge functions return `200 OK JSON` envelopes (no raw errors or secrets leaked).
- [ ] `MOYASAR_SECRET_KEY` is set and the create-intent function does **not** return `missing_payment_config`.
- [ ] `MOYASAR_WEBHOOK_SECRET` is set and the webhook function does **not** return `missing_webhook_config`.
- [ ] Manual mark-paid and mark-refunded RPCs still work from the admin page.

---

## 6. Dry-Run Test Flow

Follow these steps with a **test user / test subscription** before going live.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Pick a test user with a pending subscription and a plan that has a price + currency. | — |
| 2 | Navigate to the Membership page and click the checkout button. | Redirects to Moyasar hosted checkout. |
| 3 | Inspect the network tab or edge function logs. | `membership-payment-create-intent` returns `ok: true` with a `checkout_url`. |
| 4 | If Moyasar sandbox is available, complete a test payment. | Payment succeeds on Moyasar side. |
| 5 | Return to the platform via the success URL. | `/membership/payment/return` loads and calls `confirmMembershipPayment`. |
| 6 | Check `/admin/membership-payments`. | A new webhook event appears in the events panel. |
| 7 | Check the payment intent row. | Status transitions from `created` → `succeeded`. |
| 8 | Check the user's subscription. | `payment_status` shows `paid`. |
| 9 | Check the user's payment history. | The intent is visible with printable invoice. |
| 10 | Trigger the same webhook event again (replay). | Duplicate is detected; no duplicate emails or notifications sent. |
| 11 | Use the admin **Reconcile status** button on the intent. | Re-fetch from Moyasar succeeds; status stays `succeeded` (idempotent). |
| 12 | Use **Mark paid manually** on a separate test intent. | Manual flow works; subscription activates. |
| 13 | Use **Mark refunded manually** on a test intent. | Refund/credit note path works. |

---

## 7. Failure-Mode Checks

| Scenario | Detection | Expected System Response | Admin Action |
|---|---|---|---|
| Missing `MOYASAR_SECRET_KEY` | Create-intent returns `missing_payment_config` | Safe 200 JSON; no checkout URL created. | Set the secret and retry. |
| Missing `MOYASAR_WEBHOOK_SECRET` | Webhook returns `missing_webhook_config` | Safe 500 JSON; event not stored. | Set the secret and retry. |
| Invalid webhook signature | Webhook returns `invalid_signature` (401) | Event rejected; nothing persisted. | Verify `MOYASAR_WEBHOOK_SECRET` matches Moyasar dashboard. |
| Amount mismatch (provider vs internal) | Reconcile marks intent `failed` with `amount_mismatch` | No subscription activation. | Investigate plan price drift; use manual mark-paid if confirmed correct. |
| Currency mismatch | Reconcile marks intent `failed` with `currency_mismatch` | No subscription activation. | Investigate plan currency config. |
| Provider timeout / error | `provider_error` returned to caller | No status change; intent stays pending. | Wait for webhook or trigger manual reconcile. |
| Webhook reconcile failure | `processed_at` stays `NULL` in events table | Event stored but not processed. | Use admin **Reconcile status** or wait for cron. |
| Duplicate webhook delivery | `duplicate: true` returned (200) | No side effects; idempotency enforced. | No action needed. |
| User returns before webhook arrives | Return page calls `confirm` which polls Moyasar directly | Status reconciled via polling path. | No action needed; webhook will be a no-op duplicate. |

---

## 8. Admin Monitoring Workflow

### 8.1 Health Chips

| Chip | Meaning |
|---|---|
| **Succeeded** | Payment captured; subscription is active. |
| **Failed** | Payment declined or error; subscription is not active. |
| **Cancelled** | Checkout expired or was voided/abandoned. |
| **Refunded** | Refund processed; subscription payment status reflects refund. |
| **Needs follow-up** | Intent is pending and older than the stale threshold (currently 30 minutes). May indicate a stuck checkout or missed webhook. |

### 8.2 Event Panel Labels

| Label | Meaning |
|---|---|
| **Pending reconcile** | `processed_at` is `NULL`; the event has been stored but not yet reconciled into the payment intent / subscription state. |
| **Processed** | `processed_at` is set; the event has been applied (or was a no-op). |

### 8.3 Safe Actions

| Action | When to Use | How |
|---|---|---|
| **Reconcile status / مزامنة الحالة** | Intent is not terminal and you want to re-fetch the latest provider state. | Click the row action on `/admin/membership-payments`. |
| **Mark paid manually** | Provider confirms payment (e.g., bank transfer, cash) but webhook is delayed or missing. | Click **Mark Paid**; requires admin confirmation. |
| **Mark refunded manually** | Refund was handled outside the system (e.g., manual bank transfer); record it for audit. | Click **Mark Refunded**; requires admin confirmation. |

### 8.4 Unsafe Actions — Do Not Do

- **Do not** mark paid if the provider payment failed. Always verify with the provider dashboard first.
- **Do not** mark refunded unless the refund/credit note is actually handled. This is an audit record, not a payment initiation.
- **Do not** delete payment intent or webhook event records. They are the audit trail.
- **Do not** expose raw webhook payloads (`JSON.stringify`) in any UI. Only derived, whitelisted fields are safe.

---

## 9. Incident Response

### 9.1 Provider Outage

| | Detail |
|---|---|
| **Detection** | Create-intent returns `provider_error`; reconcile fails; webhooks stop arriving. |
| **Admin action** | Check Moyasar status page. Pause new checkout attempts if outage is prolonged. |
| **Safe fallback** | Use **Mark paid manually** for urgent activations after verifying payment via Moyasar dashboard. |
| **Escalation** | If outage exceeds 1 hour, inform stakeholders and switch to manual fallback for critical subscriptions. |

### 9.2 Webhook Signature Failures

| | Detail |
|---|---|
| **Detection** | Webhook edge function logs show `invalid_signature` (401) spikes. |
| **Admin action** | Verify `MOYASAR_WEBHOOK_SECRET` in backend secrets matches the value in the Moyasar dashboard. |
| **Safe fallback** | Reconcile all pending intents manually via `/admin/membership-payments` until signature issue is resolved. |
| **Escalation** | If signature failures persist after secret verification, check for proxy/CDN body re-encoding (the edge function reads `req.text()` raw body). |

### 9.3 Duplicate Payments

| | Detail |
|---|---|
| **Detection** | Two `succeeded` intents for the same subscription; user charged twice. |
| **Admin action** | The webhook event idempotency layer (`provider + event_id` UNIQUE) prevents duplicate side effects. If a duplicate charge exists at the provider, initiate a refund from the Moyasar dashboard. |
| **Safe fallback** | Use **Mark refunded manually** to record the refund in the platform. |
| **Escalation** | If duplicate payments are frequent, review the create-intent idempotency key logic (`mp:<subscription_id>:<plan>:<cycle>:<attempt>`). |

### 9.4 Payment Succeeded but Subscription Not Showing Paid

| | Detail |
|---|---|
| **Detection** | Moyasar dashboard shows `paid`, but platform subscription `payment_status` is still `pending`. |
| **Admin action** | Check `/admin/membership-payments` for the webhook event. If it exists with `processed_at = NULL`, trigger **Reconcile status**. If the event is missing, trigger reconcile anyway (polling path will catch it). |
| **Safe fallback** | Use **Mark paid manually** after confirming the charge ID in Moyasar. |
| **Escalation** | If the reconcile path consistently fails to transition status, check edge function logs for `applyProviderSnapshot` errors. |

### 9.5 User Paid but Return Page Shows Pending

| | Detail |
|---|---|
| **Detection** | User reports they completed payment but the return page shows a pending or failed message. |
| **Admin action** | This is usually a race condition: webhook has not arrived yet. The return page calls `confirmMembershipPayment` which polls Moyasar directly. Wait 10–30 seconds and refresh. |
| **Safe fallback** | If polling also fails, trigger **Reconcile status** from the admin panel. |
| **Escalation** | If this is a recurring UX complaint, consider adding a polling loop on the return page or a longer delay before showing failure. |

### 9.6 Failed Payment Still Shows Pending

| | Detail |
|---|---|
| **Detection** | Moyasar shows `failed`, but platform intent status is still `created` or `requires_action`. |
| **Admin action** | Wait for the `failed` webhook. If it does not arrive within the stale threshold (30 mins), trigger **Reconcile status**. |
| **Safe fallback** | Reconcile will poll Moyasar and transition to `failed`. No manual action needed unless the user insists on retrying. |

### 9.7 Refund Webhook After Manual Refund

| | Detail |
|---|---|
| **Detection** | Admin already used **Mark refunded manually**, then a `refunded` webhook arrives. |
| **Admin action** | The webhook event is stored idempotently. The reconcile step will see the intent is already `refunded` and treat it as a no-op. |
| **Safe fallback** | No action needed. The event remains in the audit log. |

---

## 10. Rollback Plan

### 10.1 Emergency Disable Checkout

If a critical bug is discovered post-launch:

| Method | Steps |
|---|---|
| **Feature flag (if exists)** | Toggle off the checkout CTA in the Membership page. |
| **No feature flag** | Remove or hide the checkout CTA via a quick UI patch. Manual mark-paid remains operational. |
| **Nuclear option** | Remove `MOYASAR_SECRET_KEY` from backend secrets. `create-intent` will return `missing_payment_config` safely. |

### 10.2 Preserve Data During Rollback

- **Do not** delete `membership_payment_intents` records.
- **Do not** delete `membership_payment_webhook_events` records.
- **Do not** delete `membership_subscriptions` records.
- Manual mark-paid and mark-refunded remain available for support.

### 10.3 Re-Enable

1. Fix the bug.
2. Re-deploy edge functions if changed.
3. Re-add secrets if removed.
4. Run the dry-run test flow (Section 6) before re-enabling.

---

## 11. Known Limitations

| Limitation | Detail | Planned Resolution |
|---|---|---|
| No recurring billing automation | Subscriptions do not auto-renew. Each term requires a new checkout. | **R4F-9J** — scheduled reconcile + renewal automation. |
| No provider refund initiation API | Refunds must be issued from the Moyasar dashboard; the platform only records them. | Future — Stripe or Moyasar refund API integration. |
| No bulk reconcile | Admins must reconcile intents one at a time. | Future — batch reconcile UI + cron. |
| No CSV export | Payment and event data cannot be exported from the admin page. | Future — admin export feature. |
| No live HMAC round-trip test | Webhook signature verification cannot be fully validated until Moyasar sends a real event. | **R4F-9H** — sandbox dry run with real Moyasar credentials. |
| Stale threshold fixed at 30 minutes | Pending intents older than 30 minutes show "Needs follow-up". Not configurable per plan. | Future — plan-level threshold config. |
| Single provider (Moyasar) | No fallback provider if Moyasar is down. | **Future** — Stripe as second provider. |
| Manual refund only | No automatic refund workflow if a payment is disputed. | Future — dispute handling workflow. |

---

## 12. Recommended Next Phases

| Phase | Deliverable |
|---|---|
| **R4F-9H** | Sandbox dry run with real Moyasar credentials (complete the dry-run checklist with a live test payment). |
| **R4F-9I** | Failed / cancelled email copy (optional UX enhancement for abandoned checkouts). |
| **R4F-9J** | Recurring renewal automation / scheduled reconcile cron job. |
| **CAT-1** | Return to Provider Catalog Isolation hardening if not already complete. |

---

## Appendix: Quick Reference Links

| Resource | URL / Path |
|---|---|
| Admin monitoring | `/admin/membership-payments` |
| Payment return page | `/membership/payment/return` |
| Provider setup doc | `docs/membership-payments-provider-setup.md` |
| Edge function: create-intent | `supabase/functions/membership-payment-create-intent/index.ts` |
| Edge function: webhook | `supabase/functions/membership-payment-webhook/index.ts` |
| Edge function: confirm | `supabase/functions/membership-payment-confirm/index.ts` |
| Edge function: reconcile | `supabase/functions/membership-payment-reconcile/index.ts` |
| Shared reconciliation logic | `supabase/functions/_shared/membership-payments/index.ts` |
