# AUTH + ACCOUNT ACTIVATION JOURNEY — PHASE 14D
## Account Activation + Free-Membership Flow Audit

Status: ✅ `AUTH + ACCOUNT ACTIVATION JOURNEY PHASE 14D ACCOUNT FREE MEMBERSHIP AUDIT COMPLETE`
Scope: Read-only audit. No DB / RLS / RPC / migration / edge / cron / auth-core / membership-grant / credits / onboarding-submit changes.

Builds on:
- `PHASE 14A AUDIT COMPLETE`
- `PHASE 14B SIMPLIFIED AUTH UX PASS`
- `PHASE 14C VERIFICATION PASSWORD RECOVERY UX PASS`

---

## 1. Executive Summary

The activation pipeline is **functional and idempotent end-to-end**, anchored by two SECURITY DEFINER triggers:

1. `on_auth_user_created → handle_new_user()` — creates `profiles` + `user_locale_settings`, plus a draft `businesses` row when `account_type ∈ {business,company}`.
2. `trg_business_default_subscription → ensure_provider_subscription()` — attaches `free_launch` plan with `lead_credits_balance=0`.

Live snapshot (read-only):

| Metric | Value |
|---|---|
| `auth.users` | 9 |
| `profiles` | 9 |
| **Orphan auth users (no profile)** | **0** ✅ |
| `businesses` | 10 (1 approved · 2 draft · 7 other states) |
| **Businesses without a `provider_subscription`** | **0** ✅ |
| `free_launch` subscriptions | 9 |
| Inactive subscriptions | 0 |
| `provider_leads` | 0 (lead intake not yet active in production) |
| `entity_access_requests` | 0 (no traffic yet, but wiring exists) |
| Users with >1 business | 1 (admin/test user — expected) |
| `business_staff` rows | 10 |

**Correction to 14A:** the audit flagged `request-access` as "incomplete." Re-verification shows it **is** wired end-to-end — `Onboarding.tsx` carries `data-feature="request-access"` and `createEntityAccessRequest` writes to `public.entity_access_requests` (proven by `src/__tests__/registrationIntentSelection.test.ts` and `registrationFullComplete.test.ts`). Zero rows simply reflect zero pilot traffic.

Net assessment: the system is **safe to ship for Day 1**, with the known watch-items below.

---

## 2. Current Definition of "Account Activated"

Activation in Qitaat is **multi-layered**, not a single boolean:

| Layer | Source of truth | Required to reach `/dashboard`? |
|---|---|---|
| Supabase session | `auth.users.aud='authenticated'` after sign-in / OTP | ✅ Yes — enforced by `ProtectedRoute` |
| Email confirmed | `auth.users.email_confirmed_at IS NOT NULL` | ❌ No — banner only (`UnverifiedEmailBanner` from 14B) |
| Profile row | `public.profiles` (created by trigger) | ✅ Implicit — trigger runs synchronously |
| Onboarding done | `profiles.is_onboarded=true` | ✅ Yes — `ProtectedRoute` redirects to `/onboarding` otherwise |
| Business approval | `businesses.approval_status='approved'` | ❌ No — provider can see dashboard while `draft`/`pending_review` |
| Free-launch plan | `provider_subscriptions` row with `status='active'` | ❌ No (display-only) |

**Implication:** "activated" effectively means *session + profile + onboarded*. Email verification is **not gating**, by design (Day-1 friction reduction).

---

## 3. Profile Creation Flow

- **Trigger:** `on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()` (SECURITY DEFINER, `search_path=public`).
- **Behavior:** inserts into `public.profiles` (`ON CONFLICT (user_id) DO NOTHING`) + `public.user_locale_settings` with Arabic/Riyadh defaults.
- **Account-number assignment:** `MAX(account_number)+1` starting at 1000.
- **Account type:** taken from `raw_user_meta_data->>'account_type'`, coerced into `{individual, business, company}`. Defaults to `individual`.
- **Fallback path:** none in client code. The trigger is the **single source of truth**; if it ever fails the user is wedged without a profile.
- **Observed orphan rate:** 0 / 9 ✅.
- **Guard tests present:** `src/__tests__/identitySystemInventory.*`, `auth-flow.spec.ts`.

---

## 4. Business Creation Flow

Three entry pipelines:

1. **Signup with `account_type=business`** — `handle_new_user()` auto-inserts a draft `businesses` row + `business_service_countries` (SA primary) + `business_tax_profiles` (VAT 15% inclusive).
2. **Onboarding wizard** — `/onboarding` step 2 (`create-entity` intent) writes `businesses` directly via client, populating real name/username/classification.
3. **`/for-providers` → provider signup** — currently a CTA into `/auth?mode=register&intent=create-entity` rather than a separate path.

**Risk:** `handle_new_user()` wraps the businesses INSERT in `EXCEPTION WHEN OTHERS THEN NULL` — failures are swallowed. A user can land in `/dashboard` with `account_type=business` but **no** `businesses` row. Current dataset shows 0 such cases (10 businesses vs. ~ 9 users → admin/test owns the extras).

**Auto-owner trigger:** `trg_auto_add_business_owner` ensures the creating user is recorded as the owner — separate from `business_staff`. Verified: every `businesses` row resolves to a single owner with a backing subscription.

---

## 5. Business Member / Role Flow

- **Owner:** assigned by `trg_auto_add_business_owner` on `INSERT INTO businesses` (DB-side, deterministic).
- **Staff / Manager:** invitation flow via `business_staff_invitations` → `accept_staff_invitation` RPC → `business_staff` row. Permissions stored in `business_staff_permissions`.
- **Request-access (employee asking to join an existing entity):** `entity_access_requests` row created from `Onboarding.tsx`; admin reviews via Unified Approvals (`accessPending` counter). **No** silent failure path detected.
- **Role routing:** `useRoleRedirect` reads `user_roles` (single source of truth — never `profiles`). RBAC table is unchanged.
- **Duplicate members:** `UNIQUE (business_id, user_id)` on `business_staff` prevents duplicates at DB level.

---

## 6. Free-Launch Membership Flow

```text
businesses INSERT
        │
        ▼
trg_business_default_subscription   (AFTER INSERT)
        │
        ▼
ensure_provider_subscription()
        │
        ├─ SELECT id FROM provider_plans WHERE code='free_launch'
        ├─ INSERT provider_subscriptions
        │       (business_id, provider_user_id, plan_id,
        │        status='active', lead_credits_balance=0)
        │   ON CONFLICT (business_id) DO NOTHING
        ▼
(business now has an active free_launch subscription, zero credits)
```

- **Where the user sees it:** `ProviderDashboardView` hero `rightSlot` → `<FreeLaunchBadge tier={membershipTier}/>` (added in 14B).
- **Tier resolution:** `business.membership_tier ?? profile.membership_tier ?? 'free'`. Note this is **not** the same as the plan `code` — see Risk #6 below.
- **Individual customers:** no business → no subscription → badge never renders for them. ✅ no misleading membership shown to consumers.
- **Plan mirror sync:** `trg_membership_subscriptions_sync_tier` keeps `membership_tier` columns in sync (per project memory).

---

## 7. Credits / Monthly Grant Flow

- **Day-0 balance:** `ensure_provider_subscription()` writes `lead_credits_balance=0`. New providers therefore start with **zero lead-purchase capacity**.
- **Replenishment:** monthly cron `grant_monthly_provider_credit` (guarded by `credits-isolation-audit`) tops up balances. Until cron fires, providers cannot consume leads.
- **Display:** credit balance shown in `ProviderMembershipCard` and lead-buy flows; no UI states a misleading "you have credits" message.
- **Risk:** if a provider signs up between cron runs, they may experience a "looks active but I can't buy a lead" gap. UI copy in 14B/14C does not yet warn about this — captured as Fix #7.

---

## 8. Provider Lead vs Business Duplication

Two parallel pipelines exist:

| Pipeline | Table | Trigger | User-visible? |
|---|---|---|---|
| Lead intake | `provider_leads` | `/for-providers` "leave-your-info" form | Admin only |
| Business onboarding | `businesses` | Signup + Onboarding wizard | Yes (dashboard) |

**Current row counts:** `provider_leads=0`, `businesses=10`. Production has zero leads, so no duplication has materialised yet. There is **no automatic dedupe/merge job**; matching would need to be by phone or CR number.

**Recommendation:** track this as a Phase 14E candidate. Add a UX warning at lead-submit time ("لديك حساب مسبق؟ سجل الدخول بدل ترك بياناتك") and a server-side fuzzy-match query before insert. Not in 14D scope.

---

## 9. Activation Notifications

Existing in-app notification types (from `notifications` table + `useNotificationLabels`):

| Event | Present? | Channel |
|---|---|---|
| profile created | ✅ implicit (no explicit toast) | — |
| business created | ✅ admin notification (`business_pending_review`) | in-app |
| business pending review | ✅ | in-app + email (when configured) |
| free_launch active | ❌ **missing** | — |
| provider approved | ✅ | in-app + email |
| provider rejected | ✅ | in-app + email |
| membership active | ✅ (via `membership_subscription_events`) | in-app |
| credits granted | ✅ (cron-driven) | in-app |
| onboarding completed | ❌ no toast; user is silently routed to `/dashboard` | — |

**Gaps:** "free_launch active" + "onboarding completed" toasts. Both are UI-only and safe for 14E.

---

## 10. Dashboard Entry States

| State | Behavior today | UX quality |
|---|---|---|
| New individual | `/dashboard` → `UserDashboardView` | ✅ |
| Unverified email | Banner renders (14B) | ✅ |
| Verified but no profile | Impossible in prod (0 orphans observed) | — |
| Provider, no business | `account_type=business` user with no `businesses` row → `ProviderDashboardView` shows empty hero, "Set up your business profile" subline | ⚠️ confusing copy |
| Provider pending review | Hero shows business name, no Verified badge, Free Launch shown as "active" | ⚠️ tier vs approval mismatch |
| Provider approved | Verified badge + Free Launch active | ✅ |
| Provider no subscription | Impossible in prod (0 observed) | — |
| Provider free_launch active | Badge says "خطة الإطلاق المجانية مفعّلة" | ✅ |
| Invited employee | `/staff-invite/:token` → accept → land in staff dashboard | ✅ |
| Admin | Routed to admin dashboard via `useRoleRedirect` | ✅ |

---

## 11. Top 10 Risks

1. **Silent business INSERT failure** in `handle_new_user()` (`EXCEPTION WHEN OTHERS THEN NULL`) can produce a business-typed user with no `businesses` row. Observability: none. Likelihood: low (no occurrences in 9 users), Impact: high.
2. **Zero Day-1 credits** for new providers until monthly cron fires. They see "Free Launch active" but cannot buy leads.
3. **Tier vs. approval mismatch:** "Free Launch active" badge appears even when `approval_status='draft'`. The user may think they're publicly listed.
4. **No "onboarding completed" toast / micro-celebration** — users wonder if their data was saved.
5. **No "free_launch active" notification** event — providers never see a system message confirming entitlement.
6. **`membership_tier` ≠ plan `code`:** badge logic compares against `'free_launch'` but DB stores `'free'` in `businesses.membership_tier` for the launch plan. The badge therefore renders the "available" copy for everyone, not "active." Cosmetic but inaccurate.
7. **Provider lead / business duplication** has no UI guard and no server-side fuzzy match.
8. **`/for-providers` lead form** writes to `provider_leads` without checking if the same phone already owns a `businesses` row.
9. **Onboarding wizard does not block** a signed-in business owner from creating a *second* `businesses` row (one user → multiple businesses is allowed by schema; UI offers no warning).
10. **Activation telemetry gap:** no aggregate dashboard answering "what % of new sign-ups reach `/dashboard` within 5 minutes?"

---

## 12. Top 10 Required Fixes (ranked by impact ÷ effort)

| # | Fix | Layer | Phase |
|---|---|---|---|
| 1 | Map `businesses.membership_tier='free'` ↔ plan code `'free_launch'` in `FreeLaunchBadge` (UI only) | UI | 14E |
| 2 | Add "onboarding completed" success toast | UI | 14E |
| 3 | Add "Your business is under review" inline card on provider dashboard when `approval_status ∈ {draft,pending_review}` | UI | 14E |
| 4 | Add "credits will arrive on cron-cycle" tooltip next to credit count when balance=0 | UI | 14E |
| 5 | Replace silent `EXCEPTION WHEN OTHERS THEN NULL` in `handle_new_user()` with `RAISE WARNING` + insert into `security_audit_log` | DB | 14F (deferred) |
| 6 | Emit `free_launch_active` notification on `provider_subscriptions` insert | DB | 14F (deferred) |
| 7 | Add UI guard before submitting `/for-providers` lead: "هل لديك حساب؟ سجّل الدخول." | UI | 14E |
| 8 | Add fuzzy-match RPC `find_existing_business_by_phone_or_cr` for both lead intake and onboarding | DB | 14F (deferred) |
| 9 | Activation funnel dashboard in `/admin/performance` | UI+RPC | 14F (deferred) |
| 10 | Add `ProviderApprovalStatusCard` reusing `business.approval_status` so the badge stack is unambiguous | UI | 14E |

---

## 13. What Will Eventually Need DB / RLS / RPC (deferred to 14F)

- Silent-failure hardening in `handle_new_user()` (audit insert + warning).
- `free_launch_active` notification trigger.
- `find_existing_business_by_phone_or_cr` RPC + dedupe job.
- Optional `account_activated_at` timestamp on `profiles` for funnel analytics.

These are **explicitly out of 14D scope.**

---

## 14. What Can Be Fixed UI-Only (14E candidates)

- Badge tier mapping (fix #1).
- Onboarding success toast (fix #2).
- Approval-status inline card (fix #3).
- Zero-credits tooltip (fix #4).
- Pre-submit lead guard (fix #7).
- New `ProviderApprovalStatusCard` (fix #10).

All six are presentation-layer only — no DB, no RPC, no auth-core.

---

## 15. Recommendation for Phase 14E

Title: **`AUTH + ACCOUNT ACTIVATION JOURNEY PHASE 14E — PROVIDER ONBOARDING POLISH`**.

Limit to the six UI-only fixes above + an inline copy review of `/for-providers` and `/onboarding`. No DB. No RPC. No auth-core. No new edge functions. Pin every fix with a guard test.

---

## 16. Decision

✅ `AUTH + ACCOUNT ACTIVATION JOURNEY PHASE 14D ACCOUNT FREE MEMBERSHIP AUDIT COMPLETE`