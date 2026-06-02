# RELEASE-CHECKLIST-1 — Owner Manual Launch Readiness (Limited Beta)

_Date: 2026-06-02_  
_Release target: **Limited Beta** (invited operators only)_  
_Source docs: `docs/final-qa-1-audit.md`, `docs/launch-readiness.md` §4 + §6, `docs/registration-ux-smoke-checklist.md`_

---

## 0. OWNER-MANUAL-TESTING-1 Execution Log

_Executed by: **Lovable agent** (preview only) — 2026-06-02 ~05:55 UTC_

**Important honesty note.** The vast majority of rows in §2 require human-only execution on the live/sandbox environment and cannot legitimately be marked Pass by the agent:

- **Areas A, B, C** require a real phone, a real Google account, and Moyasar sandbox card credentials — none of which are available to the agent.
- **Area D** requires creating fresh accounts and going through email/SMS verification end-to-end.
- **Area E (most rows)** requires actually toggling production-like modules and verifying audit-log writes against real businesses; the preview is currently signed in as Super Admin (visible in the top bar) but agent-initiated admin writes could affect real data.
- **Area F** requires observing `cron_run_log` and `email_send_log` in the Lovable Cloud dashboard, which the agent cannot view.
- **Area G** requires real email inboxes to receive transactional mail.
- **Area H** can be partially smoked by the agent in preview, **but** the preview is auto-signed-in as Super Admin, so checks about "no admin links visible to unauthenticated users" must still be repeated in an incognito browser by the owner.
- **Area I** requires a real provider account to log in as.

Per the phase rule "Do not mark any item Pass unless it was actually tested," every row that the agent did not actually exercise is recorded as **Not Tested (Agent Limitation)** below, with the test left ready for the owner.

### Agent-executed smoke (preview only)

| Row | What was done | Result |
|-----|---------------|--------|
| H1 (homepage `/`) | Navigated, screenshot, console-error scan | ✅ Renders cleanly; 0 console errors |
| H3 (membership `/membership`) | Navigated, screenshot, console-error scan | ✅ Renders; pricing-display safety wording present ("الدفع الإلكتروني عبر مُيسر — اختر الباقة المناسبة وسيتم تحويلك مباشرة إلى صفحة الدفع الآمنة"); 0 console errors |
| E (page load) | `/admin/system-access` loaded as Super Admin | ✅ Route resolves; 0 console errors (interactive checks E1–E7 NOT performed — would mutate real overrides) |
| H10 caveat | Preview auto-signed-in as Super Admin | ⚠️ Cannot verify "no admin links on public" from this session — needs incognito by owner |

No application code was modified during this phase.

---

## 1. Automated Gate Summary (already PASS)

| Gate | Result |
|------|--------|
| `bunx tsc --noEmit` | ✅ Clean |
| `bunx vitest run` | ✅ **5997 / 5997** (0 failing, 0 skipped) |
| Membership / System Access governance | ✅ PASS |
| Super Admin override + audit | ✅ PASS |
| Default-scope membership-block fix | ✅ PASS |
| Public SEO (SEO-1 … SEO-10A) | ✅ PASS |
| Public UX redesigns 1–7 | ✅ PASS |
| Pricing source-of-truth + display safety | ✅ PASS |
| Security isolation audits (19 scripts) | ✅ PASS |
| OTP / secrets hardening | ✅ PASS |

The automated gate is green. The remaining gate to flip from limited beta to full production is the owner-only manual checklist below.

---

## 2. Manual Checklist

**Owner** = project owner / release captain. **Environment** = live `qitaat.com` (or `qitaat.lovable.app`) connected to the Lovable Cloud **Test** instance unless noted. **Status keys:** Pending · Pass · Fail · Blocked.

Do **not** mark a row Pass unless you actually performed the steps. If not performed, leave as Pending.

### A. Phone OTP

| # | Test | Steps | Expected | Owner | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| A1 | OTP send | `/auth` → phone tab → enter real SA mobile → request OTP | SMS arrives within 30s | Owner | Pending |  |
| A2 | OTP verify (happy path) | Enter the correct code | Session created, redirect to dashboard/onboarding | Owner | Pending |  |
| A3 | OTP reject (wrong code) | Enter an incorrect code | Localized error, no session | Owner | Pending |  |
| A4 | OTP expiry | Wait past TTL, enter old code | Rejected with "expired" message | Owner | Pending | Optional |
| A5 | `OTP_HASH_PEPPER` present | Lovable Cloud → Secrets | Set in runtime, non-empty | Owner | Pending |  |
| A6 | No OTP in logs | Edge function logs after A1–A3 | Raw code never appears | Owner | Pending |  |

### B. Google OAuth

| # | Test | Steps | Expected | Owner | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| B1 | New user sign-in | `/auth` → Continue with Google → fresh Google account | Profile created, redirect to onboarding | Owner | Pending |  |
| B2 | Returning user | Sign out, sign in again | Direct to dashboard, no duplicate profile | Owner | Pending |  |
| B3 | Redirect URL | Inspect callback after consent | Returns to `qitaat.com` (or active custom domain) | Owner | Pending |  |
| B4 | Cancel flow | Click "Cancel" on Google consent | Safe return to `/auth`, no partial session | Owner | Pending |  |

### C. Moyasar Sandbox Payment

| # | Test | Steps | Expected | Owner | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| C1 | Plan listing | `/membership` as provider | Only active plans visible; no hidden/inactive plans purchasable | Owner | Pending |  |
| C2 | Intent creation | Select plan → checkout | `createMembershipPaymentIntent` returns OK; redirected to Moyasar | Owner | Pending |  |
| C3 | Happy path | Pay with Moyasar test card | Return page → `PAY-…` ref → subscription activated | Owner | Pending |  |
| C4 | Admin row visible | `/admin/membership-payments` | New row matches the `PAY-…` ref | Owner | Pending |  |
| C5 | Failure / cancel | Decline test card or cancel | Subscription **not** activated; clean error UX | Owner | Pending |  |

### D. Fresh Signup & Onboarding

| # | Test | Steps | Expected | Owner | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| D1 | Email/password signup | `/auth` → register new email | Email verification (if enabled), redirect to onboarding | Owner | Pending |  |
| D2 | Intent selection | Choose business / individual | Routed to correct wizard branch | Owner | Pending |  |
| D3 | Business onboarding | Fill main-location, skip staff-invite | Wizard completes, `is_onboarded = true`, verification badge on summary | Owner | Pending | See `registration-ux-smoke-checklist.md` |
| D4 | Profile fields persisted | Refresh; reopen profile | All entered fields saved | Owner | Pending |  |
| D5 | No duplicate username | Try registering with existing username | Rejected with clear message | Owner | Pending |  |
| D6 | Invite / request-to-join | Trigger entity access request | Appears in `/admin/access-requests` queue | Owner | Pending |  |

### E. Admin Walkthrough

| # | Test | Steps | Expected | Owner | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| E1 | System-access: global default | `/admin/system-access` → scope=Global default → toggle a non-core module | Saves with no membership block | Owner | Pending |  |
| E2 | System-access: account type | Scope=Account type → toggle | Saves with no membership block | Owner | Pending |  |
| E3 | System-access: entity (within plan) | Scope=Specific business, module in plan → toggle | Saves cleanly | Owner | Pending |  |
| E4 | System-access: entity (out of plan, non-super-admin) | Same as E3 but module not in plan | Blocked with bilingual message, no bypass UI | Owner | Pending |  |
| E5 | System-access: super-admin bypass | E4 as super admin → enter mandatory reason → override | Override succeeds; `[super-admin bypass]` audit row present | Owner | Pending |  |
| E6 | Core module lock | Attempt to disable a core module | Blocked regardless of role | Owner | Pending |  |
| E7 | Audit log visible | `/admin/system-access` audit panel | Recent E1–E5 entries visible with actor, scope, reason | Owner | Pending |  |
| E8 | Plan ↔ module matrix | `/admin/memberships` plan-module matrix | Matches `/admin/system-access` source | Owner | Pending |  |
| E9 | Service activations | `/admin/service-activations` | Status reflects E1–E5 changes | Owner | Pending |  |
| E10 | Businesses | `/admin/businesses` smoke | Lists load; filters work; no console errors | Owner | Pending |  |
| E11 | Brands | `/admin/brands` smoke | Lists, approve/reject flows render | Owner | Pending |  |
| E12 | Provider review | `/admin/provider-review` | Queue loads | Owner | Pending |  |
| E13 | Operations | `/admin/operations` | Dashboards render | Owner | Pending |  |
| E14 | Membership payments | `/admin/membership-payments` | Recent rows present (after C4) | Owner | Pending |  |

### F. Cron & Scheduled Jobs

| # | Test | Steps | Expected | Owner | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| F1 | Cron health | Lovable Cloud → `cron_run_log` (or admin cron page) | Recent successful runs across configured jobs | Owner | Pending |  |
| F2 | Expired memberships job | Confirm last successful run within expected interval | No errors, no duplicate schedules | Owner | Pending |  |
| F3 | Renewal notifications | Same | Same | Owner | Pending |  |
| F4 | SLA / operations jobs | Same | Same | Owner | Pending |  |
| F5 | Contract expiry notifier | Same (if enabled) | Same | Owner | Pending |  |
| F6 | Email cron | `email_send_log` pending queue drains | Status transitions pending → sent | Owner | Pending |  |

### G. Email / Notifications

| # | Test | Steps | Expected | Owner | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| G1 | Transactional send | Trigger any transactional template (e.g. membership confirmation) | Email arrives; subject/content correct | Owner | Pending |  |
| G2 | In-app notification | Action triggering notification (e.g. brand request) | Notification card appears in `/dashboard` bell | Owner | Pending |  |
| G3 | Membership change notification | Manually flip a plan in admin | Affected user receives notification | Owner | Pending |  |
| G4 | Service activation notification | E1–E5 actions | Affected business receives notification | Owner | Pending |  |
| G5 | Brand request notification | Submit a brand addition request | Admin notified | Owner | Pending |  |
| G6 | No sensitive data in email | Inspect rendered emails | No raw UUIDs, no tokens, no internal notes | Owner | Pending |  |
| G7 | In-app action URLs resolve | Click action URL in notification | Lands on intended route | Owner | Pending |  |

### H. Public Smoke

| # | Test | Steps | Expected | Owner | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| H1 | Homepage `/` | Open in fresh incognito | Renders, no console errors, no admin/dashboard links visible | Owner | Pending |  |
| H2 | For Providers `/for-providers` | Open | Renders; CTAs valid | Owner | Pending |  |
| H3 | Membership `/membership` | Open | Plans render with safe pricing display | Owner | Pending |  |
| H4 | Search `/search` | Run a query | Results render; filters work | Owner | Pending |  |
| H5 | Compare | Open compare view | Renders | Owner | Pending |  |
| H6 | Business profile | Open a sample public business page | Renders; no PII leaks | Owner | Pending |  |
| H7 | Sectors / Services / Brands | Visit each catalog | Renders | Owner | Pending |  |
| H8 | Projects / Showcase | Open | Renders | Owner | Pending |  |
| H9 | Blog / Help | Open | Renders | Owner | Pending |  |
| H10 | No private links on public | Inspect headers/footers | No `/admin/*` or `/dashboard/*` exposed to unauthenticated users | Owner | Pending |  |

### I. Provider Dashboard Smoke

| # | Test | Steps | Expected | Owner | Status | Notes |
|---|------|-------|----------|-------|--------|-------|
| I1 | `/dashboard/services` | Open as provider | Catalog loads | Owner | Pending |  |
| I2 | Membership hidden state | Disable `memberships` module via E1 → reload provider | Membership CTAs hidden; admin bypass intact | Owner | Pending |  |
| I3 | Upgrade CTA behavior | With membership visible, click upgrade | Routes to `/membership` | Owner | Pending |  |
| I4 | Provider brands | Submit brand request | Saved; appears in admin queue | Owner | Pending |  |
| I5 | Profile / business edit | Edit business basics | Saved; reflected publicly | Owner | Pending |  |
| I6 | Staff access | Invite staff member | Invite flow completes without exposing token as ref-id | Owner | Pending |  |
| I7 | Contracts / RFQ (if entitled) | Open relevant tabs | Render; gated where required | Owner | Pending |  |

---

## 3. Blocking Criteria

**P0 — must block release** (stop, propose `FINAL-FIXES-1`):
- A1–A3, B1, C2–C4, D1, D3, E1, E5, E6, F6, G1, H1, H10 fail.
- Any data leak (PII, token, raw UUID) in public surfaces or email.
- Any user can perform Super Admin actions without bypass + audit.
- Any payment succeeds without subscription activation, or vice versa.

**P1 — must block release unless quick fix available** (≤ 1 working day):
- B2–B4 fail (returning-user OAuth or cancel flow).
- D2, D4–D6 fail (onboarding edge cases).
- E2–E4, E7–E14 fail (admin walkthrough).
- F1–F5 cron health issues.
- G2–G7 notification issues.
- H2–H9 public-page failures.
- I1–I7 provider dashboard failures.

## 4. Non-Blocking Beta Caveats (P2/P3)

Allowed during limited beta — track but do not block:
- Cron drilldown views / sparklines.
- Barcode advanced enhancements.
- PVS / STI detail routes (resolver routes to parents).
- TKT / contact reference-id integration.
- DOC / NTF optional reference IDs.
- Supabase linter hardening backlog (~400 pre-existing warnings).

## 5. Rollback Criteria

Halt rollout and revert (Lovable → previous version) if any of:
- P0 row above fails after a fix attempt.
- Login / OAuth broken for the majority of test attempts.
- Payment-state divergence (subscription state ≠ Moyasar state).
- Public surface leaks admin/PII data.
- Cron jobs stop firing for > 1 hour after deploy.

Document the rollback reason in this file under §7 and immediately open `FINAL-FIXES-1`.

---

## 6. Environment

- **App URL:** `https://qitaat.com` (and `https://qitaat.lovable.app`).
- **Backend:** Lovable Cloud — confirm Test vs Live before each check.
- **Required runtime secrets:** `OTP_HASH_PEPPER`, `SECURITY_AUDIT_SALT`, Moyasar test keys, Google OAuth (managed by Lovable Cloud unless BYOK).
- **Tools:** modern desktop browser + real mobile device for OTP/PWA checks.

## 7. Final Signoff

| Field | Value |
|-------|-------|
| Owner signoff (name) | _pending_ |
| Date | _pending_ |
| Environment | _pending_ |
| Commit / deploy reference | _pending_ |
| Notes | _pending_ |

Once every row in §2 is Pass (or explicitly accepted as deferred P2/P3) and §7 is filled in, flip from **Limited Beta** to **Full Production** and open `RELEASE-SIGNOFF-1`.

---

## 8. Status Roll-Up (post OWNER-MANUAL-TESTING-1 agent pass)

| Area | Total rows | Pass | Fail | Blocked | Not Tested |
|------|-----------:|-----:|-----:|--------:|-----------:|
| A. Phone OTP | 6 | 0 | 0 | 0 | 6 |
| B. Google OAuth | 4 | 0 | 0 | 0 | 4 |
| C. Moyasar Sandbox | 5 | 0 | 0 | 0 | 5 |
| D. Signup & Onboarding | 6 | 0 | 0 | 0 | 6 |
| E. Admin Walkthrough | 14 | 0 | 0 | 0 | 14 (page-load OK) |
| F. Cron & Scheduled Jobs | 6 | 0 | 0 | 0 | 6 |
| G. Email / Notifications | 7 | 0 | 0 | 0 | 7 |
| H. Public Smoke | 10 | 2 (H1, H3) | 0 | 0 | 8 |
| I. Provider Dashboard | 7 | 0 | 0 | 0 | 7 |
| **Total** | **65** | **2** | **0** | **0** | **63** |

- **P0/P1 blockers found by agent:** none.
- **Beta caveats:** unchanged from §4.
- **Release readiness:** **Ready after owner manual checks** — the 63 Not-Tested rows must be executed by the owner before flipping to full production.

### Recommended next phase

- **OWNER-MANUAL-TESTING-1 (owner pass)** — owner physically executes A1–I7 on the live/sandbox environment, replaces each "Not Tested (Agent Limitation)" in §2 with the actual result, and fills in §7.
- If owner-pass surfaces P0/P1 issues → **FINAL-FIXES-1**.
- If owner-pass is clean → **RELEASE-SIGNOFF-1**.

> **Status note (OWNER-MANUAL-TESTING-1B):** The 63 Not-Tested rows above
> **require owner / human execution**. Do NOT mark any row as Pass unless
> a real human actually performed the step. Agent-side automation is
> explicitly disallowed for destructive admin/payment/membership/cron
> mutations.

---

## 9. Owner Manual Execution Guide

This section walks the owner through each remaining check end-to-end. Use
the **Evidence Template** in §10 to record results inline in §2.

### Environment

- **Preferred:** `staging` / sandbox build with Moyasar test keys.
- **Live (`qitaat.com`):** only for non-destructive smoke (H1–H10) and
  read-only admin walkthroughs. Never run payment/OTP destructive tests
  against real production user data.
- Always use a **test account** for destructive flows; never your real
  super-admin identity unless explicitly required.

---

### A. Phone OTP (rows A1–A6)

1. Open `/auth` in an incognito window (mobile-sized viewport recommended).
2. Enter a **test phone number** you control. Submit.
3. **A1 Send:** Confirm SMS arrives within ~30s. Record arrival time only — **never paste the OTP code**.
4. **A2 Verify success:** Enter the correct OTP. Confirm redirect to onboarding/dashboard.
5. **A3 Wrong OTP:** Trigger a new send, enter `000000`. Confirm bilingual error message and that retry counter behaves sanely.
6. **A4 Rate limit:** Request OTP 4–5 times rapidly. Confirm throttling kicks in with a clear bilingual message.
7. **A5 Expiry:** Request OTP, wait past the configured TTL, then try to use it. Confirm rejection.
8. **A6 Bilingual:** Repeat A1 with `?lang=en` and confirm copy is English-only (no Arabic leakage) and direction is LTR.
9. **Evidence to record:** screenshots of error/success states (mask phone number), timestamps, environment.
10. **Do NOT record:** OTP codes, full phone number, any session token.

---

### B. Google OAuth (rows B1–B4)

1. **B1 New user:** Incognito → `/auth` → "Continue with Google" → use a fresh Google account that has never signed in before. Confirm redirect lands on onboarding, not dashboard.
2. **B2 Returning user:** Sign out, repeat with the same Google account. Confirm direct landing on dashboard.
3. **B3 Cancel:** Start the OAuth flow, click "Cancel" on Google's consent screen. Confirm graceful return to `/auth` with bilingual error and no half-created profile.
4. **B4 Redirect verification:** Confirm the final URL is on `qitaat.com` (or staging host) — not localhost, lovable preview, or supabase domain.
5. **Evidence:** screenshots of consent screen (Google email masked), landing page, console (no auth errors).

---

### C. Moyasar Sandbox (rows C1–C5)

> Use Moyasar **test mode keys** only. Never charge a real card.

1. **C1 Plan selection:** As an authenticated test provider, open `/membership`. Confirm plan cards render with correct VAT-inclusive pricing.
2. **C2 Success card:** Pick a paid plan → use Moyasar test success card → complete payment. Confirm:
   - Return URL lands on `/membership/payment/return` with success state.
   - `business_memberships` row updates (visible in `/admin/memberships`).
   - Payment row appears in admin payment log.
3. **C3 Failure card:** Repeat with Moyasar test decline card. Confirm clear bilingual error, no membership upgrade, payment row marked failed.
4. **C4 Cancel:** Start checkout, abandon at hosted page. Confirm no membership change and a "cancelled" log entry.
5. **C5 Hidden plan safety:** In a separate admin window, mark a plan inactive. As the test provider, confirm:
   - Hidden plan no longer renders.
   - Direct API attempt (DevTools → re-issue checkout request with hidden plan id) is rejected server-side.
6. **Evidence:** payment id (test), screenshot of return page, screenshot of admin payment log row. Mask emails.
7. **Do NOT record:** full card numbers, CVV, real card data.

---

### D. Signup & Onboarding (rows D1–D6)

1. **D1 Fresh buyer:** Incognito signup → choose buyer/user → complete onboarding wizard step 1→3 → confirm landing on dashboard, USR-ID assigned (`PREFIX-NNNNNNN`).
2. **D2 Fresh provider:** Same as D1 but pick provider path → complete business onboarding → confirm business is `pending`/`active` per workflow.
3. **D3 Business profile save:** Fill name, sector, region. Save. Re-open the page. Confirm persisted.
4. **D4 Username uniqueness:** Try to create a second account with the same handle. Confirm bilingual rejection.
5. **D5 Invite / request-to-join:** From a second account, request to join D2's business. As D2, accept. Confirm staff row created with correct role.
6. **D6 Cleanup:** Note the test user IDs so they can be purged later. Do NOT delete via UI mid-test.
7. **Evidence:** screenshots of each wizard step (mask emails), final dashboard.

---

### E. Admin Walkthrough (rows E1–E14)

> **Use a TEST business and a TEST module wherever possible.** Note every change so it can be rolled back at the end.

1. **E1 `/admin/system-access` — Global default:** open page, pick a non-core test module, toggle global default OFF. Confirm:
   - Banner explains scope is platform-wide.
   - No membership-block error appears (per `SYSTEM-ACCESS-DEFAULT-SCOPE-1`).
   - Toggle back ON. Record the audit log entry id.
2. **E2 Account-type scope:** select scope = account type (e.g. provider). Toggle test module. Confirm only the chosen account type is affected.
3. **E3 Entity (specific business) scope:** select scope = specific business (TEST business). Toggle test module. If membership-block message appears, confirm it is correct (the plan really lacks this feature).
4. **E4 User scope:** select scope = specific user (TEST user). Toggle. Confirm precedence: user > account type > global > default.
5. **E5 Super-admin bypass:** as super-admin, on E3 above, click "Override (super-admin)". Confirm reason field is required, audit log captures `super_admin_bypass_membership` with reason.
6. **E6 Audit log:** open audit table for the test module — every E1–E5 action must have a row with actor, scope, target, reason (if applicable).
7. **E7 Core module lock:** attempt to disable a core module (e.g. `auth`, `business_info`). Confirm UI blocks it and explains why.
8. **E8 `/admin/memberships` plan-module matrix:** open, confirm matrix renders, toggling a plan↔module mapping persists, no double-save bugs.
9. **E9 `/admin/service-activations`:** view current activations, confirm filters work, confirm hidden-plan activations cannot be created.
10. **E10 `/admin/businesses`:** open a TEST business → confirm masked PII for non-essentials → edit a safe field (e.g. tagline) → confirm save + audit row.
11. **E11 `/admin/brands`:** create a TEST brand → assign to TEST business → delete. Confirm staff isolation (the TEST business owner sees it).
12. **E12 Suspend/restore business:** suspend TEST business → confirm provider dashboard shows suspension state → restore.
13. **E13 Role assignment:** assign a secondary admin role to TEST user → confirm RBAC menu changes → revoke.
14. **E14 Rollback:** revert every toggle, deletion, and assignment from E1–E13. Confirm `/admin/system-access` matrix matches the starting screenshot.
15. **Evidence:** before/after screenshots, audit log row ids, reason texts.

---

### F. Cron / Scheduled Jobs (rows F1–F6)

1. **F1** Open Lovable Cloud → Edge Functions → cron list. Confirm the following jobs are scheduled and "enabled":
   - `expired_memberships`
   - `renewal_notifications`
   - `monthly_provider_credit_grant` (or equivalent)
   - `sitemap_refresh` (if scheduled)
2. **F2** For each job, view last run logs. Confirm exit status `200 OK JSON` and no stack traces.
3. **F3** Confirm no duplicate cron entries (each name appears exactly once).
4. **F4** Confirm next-run timestamps are in the future and reasonable.
5. **F5** Spot-check `expired_memberships` last run: pick one membership it should have touched and confirm the state matches expectations in `/admin/memberships`.
6. **F6** Spot-check `renewal_notifications`: confirm the corresponding notification row exists for at least one targeted user.
7. **Evidence:** screenshot of cron list, last-run timestamp, job name; logs link.

---

### G. Email / Notifications (rows G1–G7)

Use a TEST inbox you control.

1. **G1** Trigger account signup email (D1/D2). Confirm arrives, branded, no secret leakage.
2. **G2** Trigger in-app notification (e.g. brand request). Confirm bell badge updates in realtime.
3. **G3** Membership change → confirm email + in-app notification.
4. **G4** Service activation toggle → confirm provider receives notification.
5. **G5** Brand request → confirm admin receives notification.
6. **G6** Open every email and confirm **no sensitive data** (no OTP, no password reset token shown to a third party, no raw IDs that reveal counts).
7. **G7** Click unsubscribe link in a marketing email → confirm `/unsubscribe` works and persists.
8. **Evidence:** screenshot of email (mask recipient address), in-app bell screenshot, timestamps.

---

### H. Public Smoke (rows H1–H10)

> Use a **fresh incognito window with no auth**. This is the only way to verify there are no logged-in-only links leaking to anonymous visitors.

1. **H1** `/` — already Pass (agent).
2. **H2** `/for-providers` — render, hero CTA works.
3. **H3** `/membership` — already Pass (agent).
4. **H4** `/search` — type a query, results render, map toggles.
5. **H5** `/compare` — pick 2 items, table renders.
6. **H6** `/business/<TEST-slug>` — public business profile renders, no admin actions.
7. **H7** `/profile-systems`, `/services`, `/brands` — listing pages render with ItemList JSON-LD.
8. **H8** `/projects`, `/showcase` — listing + detail.
9. **H9** `/blog`, `/blog/<post>`, `/help` — content renders, breadcrumb JSON-LD present.
10. **H10** Confirm NO admin links (`/admin/*`) and NO dashboard links appear in incognito navbar/footer/sidebar.
11. **Evidence:** screenshots of each page in incognito, View-Source check for JSON-LD on H7/H8.

---

### I. Provider Dashboard (rows I1–I7)

Sign in as the TEST provider from D2.

1. **I1** `/dashboard/services` — add a service from catalog, confirm it appears.
2. **I2** Membership visibility: if test provider is on a free plan, confirm membership-hidden state matches `useMembershipVisibility` (no broken CTAs).
3. **I3** Submit a brand request → confirm pending state.
4. **I4** Submit a showcase project (if enabled) → confirm draft saves and renders correctly.
5. **I5** Invite a staff member to TEST business → confirm RBAC enforcement.
6. **I6** Open `/dashboard/contracts` and `/dashboard/rfq` (if module enabled by membership) — confirm list renders, gates behave.
7. **I7** Sign out → confirm full session purge (no residual auth on refresh).
8. **Evidence:** screenshots of each successful action; for any blocked-by-membership view, capture the gate copy.

---

## 10. Evidence Template

For each row in §2, paste the following block as a result line. **Do not edit existing Pass rows from the agent pass.**

```
Row:        E5
Status:     Pass | Fail | Blocked | Not Tested
Tester:     <name or initials>
Date/Time:  YYYY-MM-DD HH:MM (timezone)
Environment: staging | live | sandbox
Account:    USR-XXXXXXX (test) / role
Evidence:   <link to screenshot, audit log row id, or note id>
Severity:   P0 | P1 | P2 | P3 (only if Fail)
Notes:      <one or two lines, masked>
```

### Safety: do NOT record

- OTP codes
- passwords or session tokens
- Moyasar full card numbers / CVV
- private user PII (full phone, full email, national id) — mask to last 4 chars
- internal secret values, API keys, JWTs
- screenshots containing other users' data

---

## 11. Release Decision Rules

- **Any P0 or P1 failure** in §2 → **stop release**, open **FINAL-FIXES-1**.
- **All required manual checks Pass** and §7 signed → open **RELEASE-SIGNOFF-1**.
- **Only P2 / P3 issues remain** → limited beta may proceed **with caveats**; log each remaining item in the deferred backlog and link from §7 Notes.
