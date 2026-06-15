# Email Template Registry — Phase 15D

Single source of truth for every email Qitaat sends. Generated from
`supabase/functions/_shared/email-templates/` (auth, 6) and
`supabase/functions/_shared/transactional-email-templates/` (app, 60), plus the
two edge functions that dispatch them.

**Sender paths**

- **Auth queue** = `auth-email-hook` → `pgmq:auth_emails` → `process-email-queue` → Resend.
- **Transactional wrapper** = `src/modules/notifications/services/sendTransactionalEmail.ts` → `send-transactional-email` edge → Resend (synchronous).

**Sender identity (all templates)**

- `from`: `قِطاعات / Qitaat <noreply@qitaat.com>` (constructed in the edge functions, never per-template).
- `reply_to`: not set — replies go to the sender domain inbox; system mail only.
- Subjects are bilingual `AR · EN — Qitaat` per the design system; no IDs or secrets in subject lines.
- `List-Unsubscribe` + `List-Unsubscribe-Post` headers injected by `send-transactional-email`. Auth emails do not carry unsubscribe (account-lifecycle, exempt by RFC 8058).
- All sends are logged in `public.email_send_log` (statuses: `pending`, `sent`, `rate_limited`, `failed`, `dlq`, `suppressed`). Retry/DLQ semantics are uniform across queues (5 attempts → DLQ; 429 → cooldown; 403 → DLQ).
- Tokens (`unsubscribeToken`, password reset / magic link tokens) are never written to `console.*`; only `message_id`, masked recipient, and sanitized error slices are logged.

---

## 1. Auth queue templates (6)

| Template ID | Event | Audience | Trigger | Sender path | Subject AR · EN | Body source | Variables | Sensitive? | Logged | Retry/DLQ | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `signup` | Email confirmation on signup | New user | Supabase Auth `signup` | Auth queue | أكّد بريدك الإلكتروني · Confirm your email — Qitaat | `_shared/email-templates/signup.tsx` | `recipient`, `confirmationUrl`, `token`, `siteName`, `siteUrl` | token (URL only) | ✅ message_id + status | ✅ 5x → DLQ | Canonical |
| `invite` | Account invitation | Invited user | Supabase Auth `invite` | Auth queue | دعوة للانضمام إلى قِطاعات · You've been invited to Qitaat | `_shared/email-templates/invite.tsx` | `recipient`, `confirmationUrl`, `token` | token (URL only) | ✅ | ✅ | Canonical |
| `magiclink` | Passwordless login link | Returning user | Supabase Auth `magiclink` | Auth queue | رابط تسجيل الدخول · Your login link — Qitaat | `_shared/email-templates/magic-link.tsx` | `recipient`, `confirmationUrl`, `token` | token (URL only) | ✅ | ✅ | Canonical |
| `recovery` | Password reset | Existing user | Supabase Auth `recovery` | Auth queue | إعادة تعيين كلمة المرور · Reset your password — Qitaat | `_shared/email-templates/recovery.tsx` | `recipient`, `confirmationUrl`, `token` | token (URL only) | ✅ | ✅ | Canonical |
| `email_change` | Confirm new email | User changing email | Supabase Auth `email_change` | Auth queue | أكّد تغيير البريد الإلكتروني · Confirm your new email — Qitaat | `_shared/email-templates/email-change.tsx` | `recipient`, `oldEmail`, `newEmail`, `confirmationUrl`, `token` | token + old/new email | ✅ | ✅ | Canonical |
| `reauthentication` | Step-up OTP | Authenticated user | Supabase Auth `reauthentication` | Auth queue | رمز التحقق · Your verification code — Qitaat | `_shared/email-templates/reauthentication.tsx` | `recipient`, `token` (6-digit code) | OTP (in body) | ✅ status only | ✅ | Canonical |

## 2. Transactional wrapper templates (60)

Grouped by surface. Every entry is dispatched by `send-transactional-email`. Subject lines below are the AR · EN concatenation used in the template (static or returned from the subject function).

### 2.1 Identity & welcome (3)

| Template ID | Event | Audience | Subject AR · EN | Variables | Sensitive? | Status |
|---|---|---|---|---|---|---|
| `welcome-signup` | Account created (post-confirmation) | New user | مرحباً بك في قِطاعات · Welcome to Qitaat | `firstName`, `dashboardUrl` | none | Canonical |
| `welcome-business` | Business workspace created | Business owner | منشأتك جاهزة في قِطاعات · Your business is ready | `businessName`, `dashboardUrl` | businessName | Canonical |
| `provider-lead-confirmation` | Provider self-registration received | Prospective provider | تم استلام طلب الانضمام · Join request received — قِطاعات | `name` | none | Canonical |

### 2.2 Contact form (2)

| Template ID | Event | Audience | Subject | Variables | Sensitive? | Status |
|---|---|---|---|---|---|---|
| `contact-confirmation` | Contact form submitted | Submitter | شكراً لتواصلك معنا · We received your message — قِطاعات | `name`, `subject?` | none | Canonical |
| `contact-admin-notification` | Contact form submitted | Admin inbox (`template.to`) | رسالة تواصل جديدة · New contact message · `{name}` | `name`, `email`, `phone?`, `subject`, `message` | submitter PII (admin-only) | Canonical |

### 2.3 Provider onboarding (3)

| Template ID | Event | Audience | Subject | Variables | Sensitive? | Status |
|---|---|---|---|---|---|---|
| `provider-approved` | Admin approved provider | Provider owner | تم اعتماد حساب منشأتك في قِطاعات · Provider account approved | `businessName`, `dashboardUrl` | businessName | Canonical |
| `provider-rejected` | Admin rejected provider | Provider owner | لم يتم اعتماد حساب منشأتك في قِطاعات · Provider account not approved | `businessName`, `reason?` | businessName, reason | Canonical |
| `provider-revision-requested` | Admin asked for changes | Provider owner | مطلوب تحديث بيانات منشأتك في قِطاعات · Updates required | `businessName`, `notes` | businessName | Canonical |

### 2.4 Leads / RFQ (7)

| Template ID | Event | Audience | Subject (dyn AR · EN) | Sensitive? | Status |
|---|---|---|---|---|---|
| `lead-confirmation` | Customer submitted lead | Customer | تأكيد استلام طلبك · Lead received | leadId | Canonical |
| `lead-notification` | New lead routed | Provider | لديك طلب جديد · New lead available | leadId | Canonical |
| `lead-accepted` | Provider accepted lead | Customer | تم قبول طلبك · Your lead was accepted | providerName | Canonical |
| `lead-rejected` | Provider declined lead | Customer | اعتذار عن الطلب · Lead declined | reason | Canonical |
| `lead-needs-info` | Provider asked for clarification | Customer | نحتاج معلومات إضافية · We need more info | notes | Canonical |
| `lead-quoted` | Provider sent a quote | Customer | عرض سعر جديد · New quote available | quoteId, amount | quoteId, amount | Canonical |
| `lead-cancelled-provider-notice` | Customer cancelled lead | Provider | تم إلغاء الطلب · Lead cancelled | leadId | Canonical |

### 2.5 Contracts (17)

| Template ID | Event | Audience | Sensitive? | Status |
|---|---|---|---|---|
| `contract-draft-created-client` | Draft created | Client | contractId | Canonical |
| `contract-draft-created-provider` | Draft created | Provider | contractId | Canonical |
| `contract-signed` | Contract activated | Both parties | contractId, amount | Canonical |
| `contract-status-update` | Status changed | Both parties | contractId, status | Canonical |
| `contract-milestone-completed` | Milestone done | Client | contractId, milestone | Canonical |
| `contract-payment-recorded` | Payment logged | Client | contractId, amount | Canonical |
| `contract-payment-due` | Payment due | Client | contractId, amount, dueDate | Canonical |
| `payment-reminder` | Late payment reminder | Client | contractId, amount | Canonical |
| `contract-amendment-created` | Amendment drafted | Counterparty | contractId | Canonical |
| `contract-amendment-pending-approval` | Awaiting approval | Counterparty | contractId | Canonical |
| `contract-amendment-approved` | Amendment approved | Both | contractId | Canonical |
| `contract-amendment-applied` | Amendment applied | Both | contractId | Canonical |
| `contract-amendment-rejected` | Amendment rejected | Initiator | contractId, reason | Canonical |
| `contract-amendment-cancelled` | Amendment cancelled | Counterparty | contractId | Canonical |
| `client-contract-invite` | Email-invited client | External client | tokenized URL | Canonical |
| `client-invite-reminder` | Reminder | External client | tokenized URL | Canonical |
| `client-invite-accepted` | Client accepted | Provider | clientName | Canonical |

### 2.6 Work orders / installations / projects (10)

| Template ID | Event | Audience | Status |
|---|---|---|---|
| `customer-work-order-created` | Work order created | Customer | Canonical |
| `customer-work-order-completed` | Work order finished | Customer | Canonical *(see §3 dup)* |
| `customer-quotation-ready` | Quotation ready | Customer | Canonical |
| `customer-quotation-approved` | Quotation approved | Customer | Canonical |
| `customer-installation-scheduled` | Install scheduled | Customer | Canonical |
| `customer-installation-confirmed` | Install confirmed | Customer | Canonical |
| `customer-installation-reschedule-requested` | Reschedule asked | Customer | Canonical |
| `customer-installation-completed` | Install completed | Customer | Canonical |
| `customer-project-completed` | Project completed | Customer | Canonical *(see §3 dup)* |
| `customer-project-confirmed` | Project confirmed | Customer | Canonical |

### 2.7 Warranty & feedback (2)

| Template ID | Event | Audience | Status |
|---|---|---|---|
| `customer-warranty-started` | Warranty active | Customer | Canonical |
| `customer-thank-you-feedback` | Feedback request | Customer | Canonical |

### 2.8 Bookings & maintenance (2)

| Template ID | Event | Audience | Status |
|---|---|---|---|
| `booking-confirmation` | Booking created | Customer | Canonical |
| `maintenance-status-update` | Maintenance state changed | Customer | Canonical |

### 2.9 Memberships & payments (13)

| Template ID | Event | Audience | Status |
|---|---|---|---|
| `membership-upgrade-request-submitted` | Upgrade request created | Business owner | Canonical |
| `membership-upgrade-request-approved` | Upgrade approved | Business owner | Canonical |
| `membership-upgrade-request-rejected` | Upgrade rejected | Business owner | Canonical |
| `membership-subscription-activated` | Subscription active | Business owner | Canonical |
| `membership-subscription-cancelled` | Cancellation scheduled | Business owner | Canonical |
| `membership-cancelled-immediately` | Hard cancel | Business owner | Canonical |
| `membership-subscription-expired` | Subscription expired | Business owner | Canonical |
| `membership-renewal-reminder` | Renewal upcoming | Business owner | Canonical |
| `membership-renewal-failed` | Renewal failed | Business owner | Canonical |
| `membership-tier-changed-by-admin` | Admin changed tier | Business owner | Canonical |
| `membership-promo-redeemed` | Promo code used | Business owner | Canonical |
| `membership-payment-marked-paid` | Manual paid mark | Business owner | Canonical |
| `membership-payment-marked-refunded` | Manual refund mark | Business owner | Canonical |

### 2.10 Staff (1)

| Template ID | Event | Audience | Status |
|---|---|---|---|
| `business-staff-invitation` | Staff invited | Invitee | Canonical |

---

## 3. Provenance & notes

- The 6 auth templates are dispatched only through the auth queue; no transactional override exists for any of them.
- The 60 transactional templates are dispatched only through `send-transactional-email`; the only registry is `supabase/functions/_shared/transactional-email-templates/registry.ts`.
- `customer-work-order-completed` and `customer-project-completed` overlap semantically ("project complete") — both are still wired to distinct triggers (work-order finalize vs project-confirm) so neither is a code-level duplicate, but the **subject copy is near-identical**. Flagged in §3 of the audit report as *Needs Copy Cleanup*, not as a code duplicate.
- The `parseEmailWebhookPayload` and `verifyWebhookRequest` imports from `@lovable.dev/*` inside `auth-email-hook` are **Supabase Auth webhook verification helpers**, not email-send libraries. Phase 15C removed all `@lovable.dev/email-js` send code from `process-email-queue`. This webhook-verification dependency is in-policy.

No API keys, secrets, or provider tokens appear in any template or in this registry.