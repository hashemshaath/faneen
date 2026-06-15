# AUTH + ACCOUNT ACTIVATION JOURNEY — PHASE 14F
## Smart Help Assistant — DESIGN ONLY

> Status: design + documentation only. **No code, no AI integration, no API,
> no DB/RLS/RPC, no edge function, no message sending.** This file is the
> single source of truth for what the future help assistant may and may not
> do across the account/auth/activation surface.

---

## 1. Assistant Purpose

The assistant exists to **guide**, never to act. Concretely it should:

- Help the user pick the right account type (individual vs business vs join existing).
- Explain registration steps (intent → details → phone-verify → documents → summary).
- Explain the email-verification flow and what to do when the link expires.
- Guide a provider on what to complete next (profile, services, images, region).
- Explain *why* a profile is not yet publicly visible.
- Help a customer compose their first RFQ.
- Explain the Free Launch (soft-launch) membership for providers.
- Walk users through password recovery without disclosing account existence.
- Recognise sensitive cases and **hand them off to human support**.

The assistant is a **read-only co-pilot**: it observes, suggests, and routes.
It never approves, grants, sends, or changes state.

---

## 2. Assistant Placement Map

### Auth / Register (`/auth`, `/auth/verified`, `/reset-password`)
- **Below account-type selection** — explain individual vs provider vs join.
- **On sign-in error** — non-leaking guidance (no "user not found").
- **On forgot-password screen** — privacy-safe phrasing.
- **On expired/invalid verification link** — explain re-send + handoff.

### Onboarding (`/onboarding`)
- **Intent step** — clarify the four intents and the duplicate-entity warning.
- **Business-details step** — explain CR/unified number/region fields.
- **Documents / services step** — explain what counts toward visibility.
- **Awaiting-review banner** — set expectations (review SLA, what's next).

### Dashboard (`/dashboard`)
- **New customer** — "what to do next" checklist (search, RFQ, profile).
- **New provider** — readiness checklist + Free Launch explainer.
- **Provider not yet public** — explain missing items + review status.
- **Provider awaiting review** — explain review timeline, no ETA promises.
- **Invited staff** — explain scope of their access vs owner's.
- **Admin (soft launch)** — surface launch-day operator playbook links only.

### RFQ (`/rfq/*`)
- **First step** — what makes a strong RFQ.
- **File upload step** — supported formats, size limits, privacy reminder.
- **Summary step** — last-chance checklist.
- **Abandoned / incomplete** — suggest the missing pieces, no nagging tone.

---

## 3. Assistant Formats

| Format | When to use |
| --- | --- |
| **Inline help card** | First-time visit to a step; persistent until dismissed per session. |
| **Checklist** | Multi-item completion (profile readiness, RFQ requirements). |
| **Small tooltip** | Single-field explanation (CR number, unified number, username rules). |
| **FAQ accordion** | Long-tail questions on `/help` and at the bottom of onboarding. |
| **Chat-style helper** | Reserved for 14F5+ — never before role-aware safety lands. |
| **Smart next-step card** | Dashboard surfaces, derived from already-loaded state. |
| **Human support handoff** | Any sensitive / stuck / repeat-error path (see §7). |

No popups, no modal dialogs. All formats are inline, dismissible, and
keyboard-accessible.

---

## 4. Copy Library (AR / EN)

### 4.1 Account-type choice
- **AR:** «غير متأكد من الخيار المناسب؟ اختر "أبحث عن مزود خدمة" إذا كنت تريد تنفيذ عمل، واختر "أقدم خدماتي كمزود" إذا كنت مصنعًا أو ورشة أو معرضًا.»
- **EN:** "Not sure which to choose? Pick *I'm looking for a service provider* if you want work done, or *I provide services* if you run a factory, workshop, or showroom."

### 4.2 Email not verified
- **AR:** «فعّل بريدك حتى تستلم التنبيهات وتقدر تستعيد حسابك بسهولة.»
- **EN:** "Verify your email so you receive notifications and can easily recover your account."

### 4.3 Forgot password
- **AR:** «استخدم نفس البريد الذي سجلت به في قطاعات، وسنرسل لك رابط استعادة إذا كان الحساب موجودًا.»
- **EN:** "Use the same email you registered with on Qitaat. If an account exists, we will send a recovery link."

### 4.4 New provider
- **AR:** «ابدأ بإكمال بيانات منشأتك، الخدمات، المدينة، وصور الأعمال. بعدها يراجع فريق قطاعات الملف قبل الظهور للعملاء.»
- **EN:** "Start by completing your business details, services, city, and work photos. The Qitaat team will then review your profile before public visibility."

### 4.5 Profile not yet visible
- **AR:** «ملفك لا يظهر للعامة حتى يكتمل الحد الأدنى ويتم اعتماده. راجع النواقص وأكملها من لوحة التحكم.»
- **EN:** "Your profile is not publicly visible until the minimum requirements are met and it is approved. Review the missing items in your dashboard."

### 4.6 Free Launch plan
- **AR:** «خطة الإطلاق المجانية متاحة للمزودين المؤهلين خلال فترة التجربة. لا يتم احتساب رسوم خلال هذه المرحلة.»
- **EN:** "The Free Launch plan is available to eligible providers during the soft-launch period. No charges apply during this phase."

### 4.7 First-time RFQ
- **AR:** «اكتب وصفًا واضحًا للعمل المطلوب، وارفع صورًا أو ملفات تساعد المزود يفهم التفاصيل.»
- **EN:** "Write a clear description of the work needed, and attach photos or files that help the provider understand the details."

### 4.8 Incomplete RFQ
- **AR:** «نحتاج تفاصيل أكثر عشان نطابقك مع مزود مناسب. أضف المقاسات، الموقع، أو صورة توضح المطلوب.»
- **EN:** "We need more details to match you with the right provider. Add measurements, location, or a photo that shows the requirement."

### 4.9 Staff invitation
- **AR:** «إذا وصلك رابط دعوة، استخدم نفس البريد المرتبط بالدعوة حتى تنضم للمنشأة بشكل صحيح.»
- **EN:** "If you received an invitation link, sign in with the same email the invitation was sent to in order to join the entity correctly."

### 4.10 Human support handoff
- **AR:** «إذا واجهت مشكلة في الدخول أو الانضمام لمنشأة، تواصل مع فريق قطاعات وسنساعدك خطوة بخطوة.»
- **EN:** "If you run into trouble signing in or joining an entity, contact the Qitaat team and we will walk you through it step by step."

---

## 5. Safety & Privacy Rules (Hard Constraints)

The assistant **must not**:

1. Disclose whether a given email/phone is registered or not.
2. Show data belonging to another business, user, or staff member.
3. Reveal staff names, phone numbers, or contact info without permission.
4. Explain or expose RLS, internal permissions, or table structure to users.
5. Grant, modify, or hint at granting memberships, credits, or roles.
6. Approve, reject, or move a business through the verification pipeline.
7. Change visibility/approval state of any profile.
8. Send messages, RFQs, or notifications on behalf of the user.
9. Echo any sensitive data (CR, ID, tokens, OTP codes) back into chat / UI.
10. Promise prices, lead-times, ETAs, or guaranteed matches.
11. Promise a provider that orders will arrive.
12. Resolve payment issues — payment is **always** handed off to support.

If a draft response would violate any of the above, the assistant must
refuse and offer the human-support handoff instead.

---

## 6. Role-Aware Behavior

| Role | May see | Must NOT see |
| --- | --- | --- |
| **Customer** | Search tips, RFQ guidance, account help, membership-free explanation of providers. | Provider internals, approval queues, credits, admin tooling. |
| **Provider (owner)** | Readiness checklist, visibility status, Free Launch info, RFQ/leads guidance, profile/services tips. | Other businesses' data, admin queues, system roles, RLS details. |
| **Business owner (non-provider)** | Entity setup, staff invitation flow, contracts overview help. | Other entities, admin/system internals, payment ops. |
| **Manager** | Same as owner for entities they manage; staff scope reminders. | Owner-only actions, billing internals. |
| **Staff** | "What you can do here" scoped to their role; how to ask the owner for more. | Anything outside their RLS scope; sensitive entity fields. |
| **Admin** | Operator playbook references, soft-launch checklists, links to admin tools. | Direct moderation actions from the assistant; user PII unless already on-screen. |
| **Super Admin** | Same as Admin, plus pointers to system-settings docs. | The assistant still never acts on their behalf. |

All roles see the same privacy-safe copy for auth/password/verification.

---

## 7. Escalation to Human Support

The assistant must offer a human handoff (with a contact-form / WhatsApp /
email CTA — to be decided in 14F4) for any of the following:

1. Repeated sign-in failures (≥3 in a session) — without revealing reasons.
2. Expired or invalid invitation link.
3. Request to join an entity the user does not own.
4. A phone number that appears to be linked to a prior account.
5. Suspected duplicate business creation.
6. Any payment / refund / invoice problem.
7. Any privacy / data-deletion / rights request.
8. Repeated file-upload failure (logo, CR scan, RFQ attachment).
9. RFQ submission failure after a retry.
10. A provider asking for manual approval / expedited verification.
11. A customer with a complaint about a provider, contract, or service.

Handoff copy template (bilingual):
- **AR:** «هذه الحالة تحتاج فريق الدعم. تواصل معنا وسنساعدك مباشرة.»
- **EN:** "This case needs our support team. Reach out and we will help you directly."

---

## 8. Future AI Scope

When (and only when) the assistant is wired to a real model, the **allowed**
capabilities are:

- Read **the current user's own** account state (role, onboarding step, readiness summary).
- Suggest the next step based on already-loaded UI state.
- Read a readiness/visibility *summary* — never the underlying rows.
- Help the user **draft** an RFQ description (the user still submits).
- Explain the Free Launch plan in plain language.
- Help the user choose an account type.
- Capture the user's *intent* (for analytics / handoff routing).
- Hand off to human support on any rule-7 trigger.

The assistant is **never** allowed to:

- Approve or reject a business / provider / staff invitation.
- Grant, change, or refund a membership, plan, or credits.
- Reveal contact details (phone/email/address) of any other party.
- Send messages, RFQs, notifications, or emails.
- Change account, profile, visibility, or approval state.
- Query sensitive tables or columns (CR, ID, tokens, OTP, payment data).
- Bypass RLS or use a service-role context.

---

## 9. Implementation Phases (Later)

| Phase | Scope | Touches code? |
| --- | --- | --- |
| **14F1 — Static help cards** | Inline help cards using copy from §4. UI-only. | Yes (UI). No AI. |
| **14F2 — Role-aware checklist** | Derive next-step lists from already-loaded queries. | Yes (UI + hooks). No AI. |
| **14F3 — Smart RFQ copy suggestions** | Local heuristics (no model) to flag missing RFQ fields. | Yes (UI). No AI. |
| **14F4 — Human handoff flow** | Support CTA, prefilled context (user id, route, step). | Yes (UI + maybe one edge function). |
| **14F5 — AI assistant with safe context** | First model wiring; read-only summary context only. | Yes; gated behind 14F1–14F4. |
| **14F6 — Assistant security regression** | Guard tests for §5/§6/§7 rules. | Tests only. |

No phase here is started by 14F. 14F closes with this document approved.

---

## 10. Acceptance Criteria (Pre-Implementation Gate)

Before **any** code in 14F1+ is written, the following must hold:

1. No sensitive data is read, logged, or surfaced by the assistant.
2. No state-changing action is performed by the assistant.
3. No new permissions, roles, or RLS policies are introduced for it.
4. No DB / RPC / migration / edge function is added without explicit approval.
5. The assistant cannot send, approve, grant, or change anything.
6. All assistant copy ships bilingual (AR/EN) with `dir="auto"` for inputs.
7. Each role sees only what §6 allows; nothing more.
8. A human-support handoff exists and is reachable from every assistant surface.
9. Guard tests (14F6) lock §5/§6/§7 before §8/14F5 ships.
10. The assistant is dismissible per session and never blocks the underlying task.

---

## Phase 14F Compliance Summary

- Code touched: **no**.
- DB / RLS / RPC / migrations / edge touched: **no**.
- AI integration built: **no**.
- Messages sent: **no**.
- Sensitive data read: **no**.
- Output: this document only.

✅ `AUTH + ACCOUNT ACTIVATION JOURNEY PHASE 14F SMART HELP ASSISTANT DESIGN COMPLETE`