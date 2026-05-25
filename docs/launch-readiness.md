# Launch Readiness — Qitaat

_Last updated: phase **LAUNCH-FREEZE-1**._

This document freezes the launch scope for Qitaat and records the state of the
app at the point we cut over to **limited beta**. It supersedes ad-hoc status
notes from prior phases and is the single source of truth for what is
green, what is deferred, and what still requires a human operator before full
production sign-off.

---

## 1. Current Automated Status

All automated gates are green as of the close of
`APP-LAUNCH-AUTONOMOUS-SMOKE-AND-FIX-1`:

| Gate | Result |
|------|--------|
| `bunx tsc --noEmit` | ✅ Clean |
| `bunx vitest run` | ✅ **2553/2553** |
| `npm run broken-links-audit` | ✅ 0 broken |
| `npm run sitemap-integrity-audit` | ✅ Pass |
| 19 isolation audits | ✅ All pass |
| Autonomous source/DB/route smoke | ✅ No automated P0/P1 |

No files were changed during the autonomous smoke phase. The codebase is
frozen for launch except for P0 / quick-P1 fixes surfaced during owner
manual smoke.

---

## 2. Completed Major Tracks

- **Homepage cleanup** — dead code removed, integrity tests in place.
- **Assets / public audit** — `publicAssetsAudit` + `assetsAudit` green.
- **Edge functions inventory** — `supabaseFunctionsInventory` + `edgeCronInventory`
  source tests authoritative.
- **Cron repair / observability** — `cron_run_log`, admin aggregate RPC
  (`get_cron_run_health`), and observability tests landed.
- **Memberships / payment flow** — canonical `createMembershipPaymentIntent`,
  Moyasar return page, admin membership payments view.
- **Barcode registry lifecycle** — operations + privacy + QA docs frozen.
- **Reference-ID rebuild (BM-REF-REBUILD)** — **closed.** Steps A–I complete,
  `docs/reference-id-architecture.md` authoritative,
  `referenceIdArchitectureDoc.test.ts` enforces invariants.
- **Autonomous smoke (APP-LAUNCH-AUTONOMOUS-SMOKE-AND-FIX-1)** — green.

---

## 3. Limited Beta Decision

🟡 **Decision: ship to limited beta.**

- All automated gates pass; no automated P0 or P1 blockers remain.
- BM-REF-REBUILD is closed; reference-ID surfaces are consistent and the
  resolver `/r/:refId` route is verified.
- Public / resolver routes return 200 in browser smoke.
- No synthetic-phone email leakage in user-facing surfaces.

Beta is gated to invited operators only until the human-only checklist
below is signed off.

---

## 4. Production Blockers Remaining (human-only)

These items cannot be exercised by the agent and must be signed off by the
owner on the live / sandbox environment before flipping to full production:

1. **Phone OTP** — real phone number, full round trip via `/auth`.
2. **Google OAuth** — sign-in + redirect + role resolution.
3. **Moyasar sandbox payment** — full happy path through
   `createMembershipPaymentIntent` → return page → `PAY-…` ref →
   `/admin/membership-payments` row.
4. **Fresh onboarding** — new account → onboarding wizard → dashboard,
   confirm `is_onboarded` and ref-id provisioning.
5. **Admin walkthrough** — admin pages, cron runs, email center, membership
   events, contact center.
6. **Cron / email queue activity confirmation** — confirm `cron_run_log`
   shows recent successful runs across scheduled jobs and `email_send_log`
   pending queue drains in the Lovable Cloud dashboard.

---

## 5. P2 Backlog (deferred, do not start during freeze)

- Cron drilldown views / sparklines on the admin cron dashboard.
- Barcode advanced enhancements (beyond current lifecycle).
- PVS / STI detail routes (resolver currently routes to parents).
- TKT / contact reference-id integration.
- DOC / NTF optional reference IDs.
- Supabase linter hardening backlog (pre-existing ~400 warnings:
  security-definer views, function `search_path`, RLS-enabled-no-policy
  on a few tables, public bucket listing).

---

## 6. Manual Checklist (owner)

Run on the live / sandbox environment. Record results in the beta launch
log; only P0 / quick-P1 fixes are permitted during freeze.

- [ ] Phone OTP sign-in via `/auth` (real number).
- [ ] Email/password sign-in + redirect to correct dashboard.
- [ ] Google OAuth round trip.
- [ ] Fresh signup → onboarding → dashboard, `is_onboarded = true`.
- [ ] Moyasar sandbox membership purchase → return page → `PAY-…` ref
      visible → admin sees row in `/admin/membership-payments`.
- [ ] Quote submission end-to-end (customer + admin sides, `/r/QTE-…`).
- [ ] Provider lead flow (if test data exists).
- [ ] Staff invitation creation — invitation token never displayed as an
      official ref-id.
- [ ] Admin walkthrough: contracts analytics, membership events, email
      center, contact center, cron runs.
- [ ] Notifications / email: in-app action URLs resolve;
      `email_send_log` pending → sent transitions observed.
- [ ] Cron / email queue activity confirmed in Lovable Cloud dashboard.

Once every box is checked and any P0 / quick-P1 issues are resolved,
flip from limited beta to full production.