# AUTH + ACCOUNT ACTIVATION JOURNEY
## Phase 14A — Full Audit Report

**Type:** Audit-only. No code, DB, RLS, RPC, edge, migration, redirect, route, or behavior changes performed.
**Scope:** End-to-end registration → verification → profile/business creation → free membership → dashboard landing → invitations → smart help design.

---

## 1. Executive Summary

The auth journey is **functionally complete** but **operationally split across three philosophies**:

1. **Unified `/auth` view** (Auth.tsx) — single entry point that switches between `identity`, `register`, `forgot-password`, `email-sent` view modes via `?mode=`.
2. **Onboarding wizard** (`/onboarding`, 1170 LOC, ~10 steps) — runs after first login when `profile.is_onboarded = false`.
3. **Two parallel invite acceptance flows** — `/invite/:token` (entity/client access) and `/staff-invite/:token` (business staff).

Strengths:
- Single `/auth` view normalizes legacy `?mode=login|signin|reset|forgot` aliases.
- `handle_new_user()` trigger auto-creates `profiles` + `user_locale_settings` + (for `business`/`company` account_type) a draft `businesses` row with VAT/country defaults.
- `ensure_provider_subscription()` trigger auto-attaches a `free_launch` provider subscription on any new business row.
- Pending intent (`qitaat_pending_intent`, `qitaat_pending_invite_token`, `qitaat_pending_access_target/reason`) is captured pre-signup and consumed post-signup so the wizard resumes on the right step.
- `ProtectedRoute` blocks unauthenticated users, forces `/onboarding` when `is_onboarded=false`, and logs unauthorized access into `access_violation_log`.

Weaknesses (documented, **not fixed in this phase**):
- No dedicated "email verified — welcome" page; verified users land directly on `/onboarding` or `/dashboard` with no explicit success acknowledgement.
- The free **membership for individual users** is not explicit; only providers/businesses get an auto `free_launch` subscription.
- Intent picker exposes four options (`individual`, `create-entity`, `join-invite`, `request-access`) but `/onboarding` only branches on `individual` vs `business`; `join-invite` and `request-access` rely on `localStorage` handoffs that can drop if user clears storage between signup tab and verification tab.
- No in-app "resend verification" affordance on the dashboard for unverified users (only at the registration success view).
- `useRoleRedirect` always returns `/dashboard` for both individuals and providers — there is **no per-role landing differentiation** at the route level; differentiation happens *inside* `DashboardOverview` via Phase B dashboard views.
- Two routes target the same destination (`/join-as-provider` → `/for-providers`, `/providers/join` → `/join/qitaat`) — works, but adds cognitive load.
- Smart-help is absent from the auth journey today.

---

## 2. Current Auth/Registration Routes

| Route | Component | Auth required | Notes |
|-------|-----------|---------------|-------|
| `/auth` | `Auth.tsx` | No | Unified entry. `?mode=` aliases: `login|signin|sign-in` → identity, `register|signup` → register, `forgot|forgot-password|reset` → forgot-password. |
| `/login`, `/register` | — | — | **No `/login` or `/register` routes exist**. App relies on `/auth` exclusively. External links to `/login` 404 unless caught by router fallback. |
| `/onboarding` | `Onboarding.tsx` | Yes (`skipOnboarding`) | 1170 LOC wizard. Steps: `intent → account-type → business-details → details → phone-verify → documents → summary`. |
| `/reset-password` | `ResetPassword.tsx` | Public | Detects `type=recovery` in hash/search; supports `valid | expired | invalid` link states. |
| `/invite/:token` | `InviteAccept.tsx` | Mixed | Persists token in `sessionStorage` if unauthenticated, redirects to `/auth`; consumes via `accept_client_invitation(token)` RPC after login. |
| `/staff-invite/:token` | `StaffInviteAccept.tsx` | Mixed | Same pattern, business-staff specific. |
| `/for-providers` | `ForProviders` | Public | Marketing/landing for providers. |
| `/join-as-provider` | Redirect | — | → `/for-providers`. |
| `/join/qitaat` | `ProviderJoin.tsx` | Public | 794-LOC provider self-enrollment form (separate from onboarding wizard). |
| `/join/qitaat/edit` | `ProviderJoinEdit.tsx` | Yes | Edit provider-join submission. |
| `/providers/join` | Redirect | — | → `/join/qitaat`. |

**Gap:** No `/auth/verify`, `/auth/email-confirmed`, `/auth/check-email` explicit success/handoff routes; everything is in-page state inside `Auth.tsx`.

---

## 3. Account Types & Registration Intents

### Account types (DB-level, `account_type` enum)
- `individual` — default. Personal user, no business row.
- `business` — triggers business-row auto-creation in `handle_new_user`.
- `company` — same handling as `business`.
- Admin roles (`admin`, `super_admin`) — assigned via `user_roles`, never via `account_type`.
- Business staff — separate `business_staff` table; `account_type` remains `individual`.

### Registration intents (UI-level, `RegisterForm.tsx`)
| Intent | Label | Side-effects |
|--------|-------|--------------|
| `individual` | فرد / Individual | `account_type=individual`. |
| `create-entity` | إنشاء منشأة / Create entity | `account_type=business`; `qitaat_pending_intent=create-entity`. |
| `join-invite` | الانضمام بدعوة / Join by invite | Stores `qitaat_pending_invite_token`; post-auth redirect to `/invite/:token`. |
| `request-access` | طلب انضمام / Request access | Stores `qitaat_pending_access_target` + `qitaat_pending_access_reason`. |

### Issues
- `request-access` has **no post-signup landing step**; stored values are dead weight today.
- Provider self-enrollment via `/join/qitaat` is fully separate from `intent=create-entity` — two paths, two tables (`provider_leads` vs `businesses`).
- `/for-providers` → `/join-as-provider` → `/auth?mode=register` vs `/join/qitaat` is not visually obvious to a new visitor.

---

## 4. Individual User Journey

1. `/auth?mode=register` → intent `individual` → fill name/email/password (+ optional phone).
2. `authService.signUp` → `supabase.auth.signUp({ emailRedirectTo: origin, data: { account_type: 'individual', ... } })`.
3. `handle_new_user` trigger inserts `profiles` (`is_onboarded=false`, country SA) + `user_locale_settings` (ar/Asia-Riyadh).
4. Fire-and-forget `welcome-signup` template, idempotency key `welcome-${userId}`.
5. UI swaps to `RegistrationSuccessView` ("check your inbox").
6. User clicks confirm link → returns to `window.location.origin`.
7. `useRoleRedirect` runs in `Auth.tsx`: `is_onboarded=false` → `/onboarding`.
8. Wizard: `intent → details → phone-verify (opt) → summary`. Sets `is_onboarded=true`, navigates `/`.
9. Next visit: `/dashboard` → `DashboardOverview` → user view.

**Gaps:** No free-membership row, no first-RFQ coaching, no dedicated "you're in" screen.

---

## 5. Provider Journey

Two entry paths:

### Path A — `/auth?mode=register` with `intent=create-entity`
1. Same flow; `account_type=business`.
2. `handle_new_user` creates draft `businesses` row (`username=biz-<uuid-prefix>`, `approval_status=draft`, `username_status=pending`, default VAT profile).
3. `ensure_provider_subscription` inserts `provider_subscriptions(plan=free_launch, status=active, lead_credits_balance=0)`.
4. Post-confirm → `/onboarding` → `business-details` → user fills name/username/taxonomy/region/logo/CR.
5. `authService.createBusiness` upserts business fields + `welcome-business` email.
6. After `summary`: `is_onboarded=true` → `/dashboard` → provider view + Phase B3 readiness card.
7. Admin reviews via `/admin/provider-review` → flips `approval_status=active` → `provider-approved` email.

### Path B — `/join/qitaat` (ProviderJoin.tsx)
- Public form that writes to `provider_leads`. Separate admin queue at `/admin/provider-leads`. Converted to a real business by admin action.
- No auto `free_launch` until conversion happens.

**Gaps:**
- Two pipelines (`businesses` vs `provider_leads`) with different admin queues → operator confusion (documented in 13D).
- `lead_credits_balance=0` until `grant_monthly_provider_credit` cron next runs → day-1 zero credits.
- Public visibility requires both `approval_status=active` AND readiness gate (Phase B3).

---

## 6. Business Owner Journey

Identical to Provider Path A. No distinct "business owner" account type — `account_type=business` covers both provider-side and buyer-side businesses. The implicit difference is whether they later add services/portfolio items.

**Gap:** A buyer-side business sees a provider-oriented dashboard (KPI strip, readiness checklist) it doesn't need.

---

## 7. Staff / Invitation Journey

1. Owner invites staff via `/dashboard/staff` → `business_staff_invitations` row → `business-staff-invitation` email.
2. Email contains `/staff-invite/:token`.
3. Unauthenticated → token to sessionStorage → `/auth`.
4. After login → `StaffInviteAccept` RPC accepts and creates `business_staff` row.
5. Staff sees owner's dashboard, scoped by `is_business_staff` RLS.

Client invitations: same pattern via `/invite/:token` → `accept_client_invitation(token)` → `client_site_access_grants`.

`entity_access_requests` exists as a table but the `request-access` intent never writes to it.

**Gaps:** No expired-invite page; no "wrong email" diagnostic; `entity_access_requests` flow incomplete.

---

## 8. Admin Journey

- Role assigned via `user_roles(role=admin|super_admin)`.
- `useRoleRedirect` short-circuits to `/admin/activity-log`, bypassing `is_onboarded`.
- `/admin/*` wrapped in `<ProtectedRoute requireAdmin>` (or `requireSuperAdmin`); Phase B Final Sweep confirmed all admin routes also use `<AdminRoute>` / `<DashboardLayout>` wrapper.
- Admin does not see user/provider dashboard unless they navigate to `/dashboard`, which then resolves via role inside `DashboardOverview`.

**Gap:** First-time admin sees `/admin/activity-log` with no orientation card.

---

## 9. Verification Mechanics

- **Email confirm:** Supabase default. `emailRedirectTo=window.location.origin`. No custom landing.
- **Phone OTP:** Two channels — `send-login-otp`/`verify-login-otp` (passwordless login) and `send-otp`/`verify-otp` (onboarding phone verification).
- **Magic link:** `verifyOtp` accepts `magiclink` type but no UI emits one today.
- **Reauthentication:** Template exists, not invoked.
- **Resend confirmation:** `authService.resendConfirmation` only surfaced in `RegistrationSuccessView`; no dashboard affordance.
- **Expired/invalid link:** `ResetPassword` handles `otp_expired` distinctly. **Signup-confirm expired** has no equivalent handler — falls through to `/`.

---

## 10. Profile / Business / Member Creation

| Entity | Created by | When |
|--------|------------|------|
| `auth.users` | Supabase Auth | On signUp |
| `profiles` | `handle_new_user` | Immediately. `is_onboarded=false` |
| `user_locale_settings` | `handle_new_user` | Same |
| `businesses` (draft) | `handle_new_user` (when business/company) | Same |
| `business_service_countries`, `business_tax_profiles` | `handle_new_user` (same) | Same |
| `provider_subscriptions` (`free_launch`) | `ensure_provider_subscription` | On business INSERT |
| `businesses` (filled) | `authService.createBusiness` | At onboarding business-details |
| `business_taxonomy_categories` | `set_business_taxonomy_categories` RPC | Inside wizard after business exists |
| `business_staff` | `accept_business_staff_invitation` | On invite accept |
| `client_site_access_grants` | `accept_client_invitation` | On invite accept |
| `notification_preferences` | Lazy | On first preference write |
| `membership_subscriptions` | Not auto for individuals | Only on paid plan subscribe |

**Failure handling:**
- `handle_new_user` wraps business-side INSERTs in `EXCEPTION WHEN OTHERS THEN NULL` → silent failure possible.
- Welcome emails fire-and-forget; no UI retry.
- No orphan reconciliation job. If `profiles` insert ever fails, `ProtectedRoute` loader spins forever because `fullyLoaded = !loading && (!user || profile !== null)` never resolves.

---

## 11. Free Membership Mechanics

- **Plan:** `provider_plans.code='free_launch'` ("خطة الإطلاق / Launch"), price 0/0.
- **Granted to:** Businesses only — `ensure_provider_subscription` trigger on `businesses` INSERT.
- **Granted when:** Immediately at signup if `account_type=business`; after admin conversion if via `/join/qitaat`.
- **Visible:** `/dashboard/provider/membership`.
- **Limits:** Mostly placeholder. `lead_credits_balance=0` initially.
- **Individual users:** No membership row. (Customers don't need one in v1 — free RFQs.)
- **End-of-period:** No `expires_at` on free_launch. Upgrade via `membership_upgrade_requests`.

**Gaps:** Invisible during onboarding; provider sees 0 credits day 1; no badge on dashboard hero.

---

## 12. Dashboard Routing by Role

- All non-admin authenticated users → `/dashboard` → `DashboardOverview` → resolves to `UserDashboardView` / `ProviderDashboardView` / `AdminDashboardView`.
- Admin / super_admin → `/admin/activity-log`.
- Provider hidden until `approval_status=active` AND readiness met → Phase B3 `ProviderVisibilityStatusCard`.
- Business staff → owner dashboard with `is_business_staff` scoping.
- Unverified user can still reach `/dashboard` (Supabase default), no banner.
- Phase B Final Regression Sweep PASS (7664/7664) — no empty-state regressions.

---

## 13. Current System Messages

Channels: **Email** (transactional via `send-transactional-email`), **in-app `notifications`**, **OTP SMS** (via `send-otp`).

Auth-journey-relevant templates that exist today:
`welcome-signup`, `welcome-business`, `business-staff-invitation`, `client-contract-invite`, `client-invite-reminder`, `client-invite-accepted`, `provider-approved`, `provider-rejected`, `provider-revision-requested`, `membership-subscription-activated`, `membership-upgrade-request-*`, `membership-renewal-*`, `membership-tier-changed-by-admin`. Supabase-built signup-confirm/magic-link/recovery/invite/email-change/reauthentication available via `auth-email-hook` if scaffolded (not currently scaffolded).

---

## 14. Missing Messages

1. Email-verified confirmation (in-app + email): "حسابك مفعّل — أكمل ملفك".
2. Onboarding-started nudge at 24h.
3. Onboarding-abandoned reminder at 48h.
4. Free-launch granted ("تم تفعيل خطة الإطلاق المجانية").
5. Business draft pending review.
6. Staff-invite-expired template (currently generic toast).
7. Wrong-email-on-invite explanation.
8. Password-changed-confirmation email (security signal).
9. First-login welcome in-app card.
10. Request-access-submitted + request-access-decided (for `entity_access_requests`).

---

## 15. Password Recovery — Success/Failure States

| State | Trigger | UX today | Gap |
|-------|---------|----------|-----|
| Request sent | `ForgotPasswordForm` submit | Inline confirmation | OK |
| Email delivered | Supabase email | Default template unless `auth-email-hook` scaffolded | No branded copy by default |
| Link valid | `/reset-password` + `type=recovery` + token | `linkStatus=valid`, form shown | OK |
| Link expired | `error_description=otp_expired` | `linkStatus=expired`, explicit copy + resend | OK |
| Link invalid | No recovery params | `linkStatus=invalid` | Friendlier copy needed |
| Password set | `updatePassword` success | `PasswordResetSuccessView` + `password_reset_log` | OK |
| Success redirect | After 3s | `/dashboard` via `useRoleRedirect` | OK |
| Network failure | Supabase error | Toast, stays on form | Retry guidance missing |

**Gaps:** No security email after reset; no rate-limit guidance.

---

## 16. Invitations & Joining

- `/invite/:token` and `/staff-invite/:token`: same pattern (sessionStorage handoff → post-auth RPC).
- `entity_access_requests` table exists; `request-access` intent saves target but never creates a row → **end-to-end wiring missing**.
- No "different email than invite" diagnostic.
- No expired-invite branded page; RPC errors bubble as toasts.
- No "who invited you" summary before accepting.

---

## 17. Current Confusion Points

1. Two provider entry pipelines.
2. `/for-providers` vs `/join-as-provider` vs `/join/qitaat` — three routes, two destinations.
3. Intent picker has 4 options, only 2 wired end-to-end.
4. No explicit "email verified" handoff.
5. Individuals have no membership concept but membership pages exist in nav.
6. Provider sees 0 credits day 1.
7. `request-access` is a dead-end intent.
8. `welcome-business` may fire with placeholder name (idempotency prevents replay but first shot looks raw).
9. No distinction "buyer business" vs "provider business".
10. `useRoleRedirect` always returns `/dashboard` for non-admins; differentiation is implicit.

---

## 18. Top 10 Risks

| # | Risk | Severity | Notes |
|---|------|----------|-------|
| 1 | `handle_new_user` swallows business-insert exceptions | High | Profile exists, business missing → onboarding loop. |
| 2 | `request-access` intent stored but never executed | High | User believes request was sent. |
| 3 | Provider sees 0 lead credits day 1 | Medium | Looks like a bug. |
| 4 | Email-verify expired link silently lands on `/` | Medium | No error surface. |
| 5 | Two provider pipelines diverge | Medium | Operator confusion, duplicates. |
| 6 | Staff invite email mismatch error is generic | Medium | Hard to diagnose. |
| 7 | `entity_access_requests` writer missing | Medium | Dead feature. |
| 8 | Unverified user may reach `/dashboard` | Medium | No banner. |
| 9 | `welcome-business` may send with placeholder name | Low | First-shot copy raw. |
| 10 | `ProtectedRoute` can spin forever on profile insert failure | Low | Unlikely with `ON CONFLICT`, possible. |

---

## 19. Top 10 Improvements

1. `/auth/verified` post-confirm landing (success + role-aware CTA).
2. Banner on `/dashboard` when `email_confirmed_at IS NULL` with resend.
3. Wire `request-access` intent end-to-end.
4. Grant initial lead credits on `ensure_provider_subscription`.
5. "خطة الإطلاق المجانية مفعّلة" badge on provider dashboard hero.
6. Replace generic invite errors with diagnostic pages (`expired`, `wrong-email`, `already-accepted`).
7. Distinguish buyer vs provider business intent — or unify dashboards minimally.
8. Consolidate provider entry (`/join/qitaat` becomes a CTA into `/auth?mode=register&intent=create-entity`, or vice-versa).
9. Send "password changed" security email post-reset.
10. Onboarding-abandoned reminder cron (24h + 72h).

---

## 20. Proposed Smart Help Assistant Design

**Constraint:** No real AI in this phase. Design only. Any future AI assistant must run with scoped read-only permissions (its own service role with `has_role(_, 'help_assistant')` check), **never** the user's session.

**Placement strategy** — layered, not a single chat widget:

| Surface | Mechanism | Trigger |
|---------|-----------|---------|
| Auth pages | Inline contextual cards under form (no popup) | Always visible |
| Registration intent step | One-line tooltip per intent | Hover/focus |
| Email-sent view | Static checklist + "Didn't receive it?" expandable | Always |
| Onboarding wizard | Persistent right-rail "Why am I asking this?" panel | Always, per step |
| Dashboard first-visit | "Getting started" card (dismissable, `qitaat_help_onboarding_v1_dismissed`) | First load post-onboarding |
| Provider readiness card | Extend Phase B3 card with "Why isn't my profile visible?" | When `approval_status != active` |
| Help center | `/help` + `/dashboard/help` already exist | User-initiated |
| Errors | Inline diagnostic with suggested next step | On error |

**Forbidden behaviors for the future AI layer:**
- Never reveal other users' data, draft businesses, or admin queue contents.
- Never act on the user's behalf (no auto-submit RFQ, no auto-fill business name).
- Never expose admin actions or routes.
- Never echo passwords, OTPs, or reset tokens.
- Must respect `is_business_staff` and RLS — queries via dedicated read-only RPCs, never raw table reads.
- Must localize AR/EN and refuse to operate outside SA in v1.

**Suggested copy (AR):**
- Auth: «هل تنشئ حسابًا لأول مرة؟ اختر "فرد" إذا كنت تطلب خدمات، أو "إنشاء منشأة" إذا كنت تقدّمها.»
- Onboarding business-details: «اسم المنشأة كما في السجل التجاري. سيظهر للزوار بعد اعتماد الفريق.»
- Dashboard (provider hidden): «ملفك لم يظهر بعد لأن: ① المراجعة جارية، ② تنقص صور للأعمال، ③ لم تحدّد منطقة الخدمة.»
- Reset: «الرابط ينتهي خلال ساعة من إرساله — اطلب رابطًا جديدًا إذا انتهى.»

---

## 21. DB / RLS / RPC Changes Needed (Future Phases Only)

- New RPC `request_entity_access(target_ref, reason)` — Phase 14E.
- Modify `ensure_provider_subscription` to seed initial lead credits — Phase 14D.
- New `onboarding_abandoned_reminders` cron + `email_send_state` rows — Phase 14D.
- Modify `handle_new_user` to surface (not swallow) business-insert errors and write to `security_audit_log` — Phase 14D.
- Optional: scaffold `auth-email-hook` for branded auth emails — Phase 14C.

**None implemented now.**

---

## 22. Proposed Phase Plan

| Phase | Scope | Touches code? | Touches DB? |
|-------|-------|---------------|-------------|
| **14B** Auth UX + Copy + Route Cleanup | Consolidate provider entry redirects, tighten intent picker copy, add `/auth/verified` landing | Yes (UI) | No |
| **14C** Verification + Password Recovery UX | Resend banner on dashboard, expired-confirm-link page, post-reset security email, optional auth-email-hook scaffold | Yes | Edge only |
| **14D** Account Activation + Free Membership Flow | "Launch plan activated" cue, initial credits grant, onboarding-abandoned reminders, `handle_new_user` error surfacing | Yes | Yes (additive) |
| **14E** Provider/Business Onboarding Completion | Wire `request-access`, distinguish buyer vs provider business, unify provider pipelines | Yes | Yes (additive) |
| **14F** Smart Help Assistant Design | Inline cards + tooltips + first-visit dashboard card. No AI yet. | Yes (UI) | No |
| **14G** Full Auth Regression | E2E + unit + Playwright sweep across all flows | Tests only | No |

---

## 23. Forbidden in Upcoming Phases

- No silent `handle_new_user` changes — every change must include explicit error surfacing.
- No new account types without UX justification.
- No removing existing routes — only redirects.
- No popups/dialogs (project core rule).
- No `any`/`as any`/`@ts-ignore` in any auth-touching file.
- No real AI in 14F — design + copy only.
- No changes to membership tier source-of-truth trigger.
- No bypass of `ProtectedRoute` for convenience.
- No storing tokens or passwords outside Supabase auth.
- No sending real launch invitations until Phase 13H gate flips to PASS.

---

## 24. Decision

# ✅ `AUTH + ACCOUNT ACTIVATION JOURNEY PHASE 14A AUDIT COMPLETE`

**Next step (not started in this phase):** Pick the first 3 fixes from §19, then open Phase 14B with a tightly-scoped patch list.

**Suggested first 3 (for user approval before 14B kickoff):**
1. `/auth/verified` post-confirm landing with role-aware CTA (§19.1).
2. Unverified-email banner with one-click resend on `/dashboard` (§19.2).
3. "Launch plan activated" badge on provider dashboard hero (§19.5).

UI-only, no DB, low-risk, day-1 launch experience improvement.

---

**Compliance:** No code, DB, RLS, RPC, migration, edge, redirect, route, or auth-behavior changes performed. Audit-only.
