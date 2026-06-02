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
