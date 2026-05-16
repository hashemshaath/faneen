# Beta Launch — Final Go / No-Go Checklist

Decision document for the Qitaat.com (قِطاعات) controlled beta launch.

For full operational context, see `docs/beta-launch-operations.md`.  
For the concise daily checklist, see `docs/beta-launch-checklist.md`.  
For communication templates, see `docs/beta-launch-communications.md`.

---

## 1. Launch Decision Summary

| Field | Value |
|-------|-------|
| **Recommended status** | **CONDITIONAL GO** |
| **Target status** | **GO** once visual regression baselines are reseeded and manual RLS / PDF checks are completed |
| **Decision owner** | Product owner (business stakeholder) |
| **Date** | 2026-05-16 |
| **Scope** | Controlled beta launch: public pages, provider dashboard, contracts, analytics |
| **Excluded from beta** | Advanced payment collection, full admin drilldowns, custom formula pricing, per-lead detail route from contract source card |

### Why CONDITIONAL GO?

All automated gates pass. The remaining blockers are **manual verification steps** that cannot be automated inside Lovable:

1. **Visual regression baselines** require Playwright Docker on Linux x64 outside Lovable. Tracked as an external task; manual smoke tests are the fallback during beta.
2. **RLS cross-tenant manual probes** require a second staging account; procedure is documented but not yet executed.
3. **Manual PDF Arabic visual QA** requires human eyeballing of exported PDFs for RTL bidi, page breaks, and font coverage.

These are **procedural gaps**, not product defects. If the manual checks are completed before external users are invited, status upgrades to **GO**.

---

## 2. Mandatory GO Criteria

All items must be checked before any external beta user is invited.

### Automated gates (must all pass)

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 2.1 | CI green (`code-audit.yml`, `pdf-arabic-verify.yml`, `visual-regression.yml`) | **PASS** | GitHub Actions green on `main` |
| 2.2 | `bunx tsc --noEmit` | **PASS** | No type errors |
| 2.3 | `bunx vitest run` | **PASS** | 31 files / 308 tests passed |
| 2.4 | `bash scripts/contracts-prelaunch-smoke.sh` | **PASS** | Type-check + vitest + PDF privacy + Arabic + perf all green |
| 2.5 | `bash scripts/broken-links-audit.mjs` | **PASS** | 0 broken links (128 routes, 48 unique) |
| 2.6 | `bash scripts/sitemap-integrity-audit.mjs` | **PASS** | Sitemap valid and consistent with routes |
| 2.7 | `bash scripts/meta-titles-audit.mjs` | **PASS** | 18/18 pages, no duplicates |
| 2.8 | `bash scripts/canonical-sitemap-audit.mjs` | **PASS** | Canonical tags consistent with sitemap |

### Product gates (must all pass)

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 2.9 | Public SEO pass | **PASS** | Meta titles, descriptions, canonical, JSON-LD, `llms.txt`, `robots.txt` verified in prior phases |
| 2.10 | Dashboard links audit | **PASS** | Phase 1: all broken `/dashboard/business*` links fixed; 0 broken reported |
| 2.11 | Dashboard performance audit | **PASS** | Phase 2: lazy loading, stable keys, data-fetch cleanup applied; no regressions |
| 2.12 | Contracts system QA pass | **PASS** | PDF export, Arabic text layer, privacy guards, QR hash, autosave, clone, amendments all green in vitest |
| 2.13 | Provider analytics QA pass | **PASS** | Period chips, multi-business selector, no PII in payload, RPC latency within budget |
| 2.14 | Admin analytics QA pass | **PASS** | Leaderboard, geographic aggregates, "Include demo" toggle, period switching all verified |

### Security & privacy gates (must all pass)

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 2.15 | No known P0 or P1 bugs | **PASS** | Launch Phase 1 QA sweep found zero blockers |
| 2.16 | No known privacy blocker | **PASS** | Privacy grep clean; no PII in analytics payloads or PDF surfaces; `signed_url`, `internal_notes`, `client_email` etc. not exposed |
| 2.17 | RLS cross-tenant manual probes | **BLOCKED** | Procedure documented in `docs/contracts-launch-checklist.md`; requires staging second-account test |
| 2.18 | Supabase RPC grants verified | **BLOCKED** | `prosecdef = true`, PUBLIC revoked, `authenticated` + `service_role` granted — requires manual `\df+` check in production |
| 2.19 | Manual PDF Arabic visual QA | **BLOCKED** | Needs human verification of exported PDFs for RTL bidi, page breaks, font coverage; `docs/contract-pdf-qa.md` has reference cases |
| 2.20 | Visual regression baseline status documented | **PASS** | Documented as external risk in `docs/beta-launch-operations.md` and `e2e/VISUAL_REGRESSION.md` |

---

## 3. Conditional GO Criteria

The beta may proceed even if these items are not fully closed, provided the listed mitigations are in place.

| # | Condition | Current State | Mitigation Required |
|---|-----------|---------------|---------------------|
| 3.1 | Visual regression baselines not yet reseeded | External; requires Docker outside Lovable | Manual smoke tests on every deploy; track as explicit risk; reseed before GA |
| 3.2 | 18 admin pages use `useNoIndex` but not `usePageMeta` | Cosmetic — no functional impact | Documented in Launch Phase 1; admin routes are already noindexed; defer until GA |
| 3.3 | Non-blocking cosmetic issues (e.g. decorative image alt warnings) | 10 known decorative warnings in `image-alt-audit.mjs`; 1 intentional XSS test fixture | No action needed; accessibility is not degraded for users |
| 3.4 | Manual monitoring not yet replaced by automated alerting | No Sentry / automated alerting configured | Assign daily beta ritual owner (see `docs/beta-launch-operations.md` section G) |
| 3.5 | Admin leaderboard cross-currency sort | Cosmetic — per-currency badges shown; purely visual | Documented as known non-blocking risk |
| 3.6 | No per-lead detail route from contract source card | Provider clicks card → navigates to Leads list, not lead detail | Documented as deferred; card shows lead name |

---

## 4. NO-GO Criteria

**If any of the following is true, do not invite external beta users. Pause and fix first.**

| # | Trigger | How to Detect | Escalation |
|---|---------|-------------|------------|
| 4.1 | Cross-tenant data leak suspected | RLS probe shows Provider A can read Provider B contracts/leads/analytics | Immediate NO-GO; technical owner fixes RLS policies before any external access |
| 4.2 | PDF exposes sensitive fields | Privacy grep finds `file_url`, `storage_path`, `internal_notes`, raw UUIDs, `client_email`, `client_phone` in generated PDF text | Immediate NO-GO; fix `contract-pdf-export.ts` privacy guards |
| 4.3 | Contract creation fails | Smoke test: draft does not save; autosave throws; 500 on create | Immediate NO-GO; technical owner checks RPC + edge function logs |
| 4.4 | Login or auth fails | Test provider/admin cannot log in; OTP or OAuth broken | Immediate NO-GO; check Supabase auth logs and `user_roles` table |
| 4.5 | Provider dashboard inaccessible | `/dashboard` redirects unexpectedly; 404 on provider routes | Immediate NO-GO; check route definitions and `ProtectedRoute` guards |
| 4.6 | Lead → contract linking fails | Prefill from lead does not populate; `link_lead_to_contract` throws; duplicate audit rows | Immediate NO-GO; check `prepare_contract_prefill_from_lead` and `link_lead_to_contract` RPCs |
| 4.7 | Public pages have broken primary CTAs | "Create Request", "Contact Us", "Search" buttons do nothing or 404 | Immediate NO-GO; check route targets and broken-links audit |
| 4.8 | RPC grants are incorrect | `\df+` shows `prosecdef = false`, PUBLIC has EXECUTE, or `authenticated` missing | Immediate NO-GO; revoke and re-grant before external users access |
| 4.9 | Unresolved P0 or P1 bug exists | Any issue tagged P0/P1 in tracker, or QA sweep found a blocker | Immediate NO-GO; fix and re-run smoke tests |
| 4.10 | Privacy leak in analytics payload | Provider/admin analytics response contains `client_email`, `client_phone`, `address_line1`, `map_url` | Immediate NO-GO; fix aggregation RPC to strip PII |

---

## 5. Launch Day Sign-Off Table

Every area owner must sign off before the beta is announced.

| Area | Owner | Status | Evidence / Link | Notes |
|------|-------|--------|-----------------|-------|
| **Product** | Product owner | ☐ Signed off | `docs/beta-launch-operations.md` section A | Confirms scope, exclusions, and success criteria |
| **Engineering** | Technical owner | ☐ Signed off | CI green, `bunx vitest run` 308 tests, smoke script green | Confirms deploy pipeline and rollback plan ready |
| **QA** | QA owner | ☐ Signed off | Launch Phase 1 sweep PASS; manual PDF QA checklist | Confirms end-to-end contract flow tested; visual regression tracked as external risk |
| **Security / Privacy** | Technical owner + QA owner | ☐ Signed off | Privacy grep clean; `docs/contracts-security-privacy.md` | RLS probes and RPC grants verified (or explicitly scheduled before external users) |
| **Support** | Support owner | ☐ Signed off | `docs/beta-launch-operations.md` section H (Support Playbook) | Confirms triage paths, escalation contacts, and feedback form links ready |
| **Operations** | Admin / operator | ☐ Signed off | Provider onboarding pipeline ready; admin panel accessible | Confirms at least 2 test providers and 2 test customers are set up |
| **Marketing / Content** | Business development | ☐ Signed off | `docs/beta-launch-communications.md` | Confirms provider invitation, customer message, and WhatsApp short versions ready |

---

## 6. Post-Launch First 24h Monitoring

Run this checklist continuously during the first 24 hours after the beta goes live.

### Immediate (0–2h)

- [ ] Deploy smoke tests pass (public, provider, contract, admin)
- [ ] No uncaught frontend exceptions in browser console
- [ ] No 500s in edge function logs
- [ ] No `42501` (RLS denied) spikes in Supabase DB logs
- [ ] First test provider login succeeds
- [ ] First test customer lead submission succeeds

### Short interval (2–8h)

- [ ] At least one contract created from a lead
- [ ] At least one PDF exported
- [ ] Arabic text in exported PDF is readable
- [ ] Analytics pages load in under 3 seconds
- [ ] No auth errors reported by test users
- [ ] No broken-link reports from test users

### End of day (8–24h)

- [ ] At least 2 providers have logged in and accessed dashboard
- [ ] At least 2 leads submitted
- [ ] At least 1 contract accepted by a client party
- [ ] Zero privacy or security issues reported
- [ ] Feedback forms received (target: at least 2 provider + 2 customer)
- [ ] Supabase logs reviewed for anomalies
- [ ] Broken-links audit re-run if any pages changed (should still be 0)

### Signals to watch

| Signal | Check | Alert Threshold |
|--------|-------|-----------------|
| Auth errors | Supabase auth logs + user reports | Any OAuth or OTP failure |
| Contract creation errors | Console + RPC logs | Any 500 or autosave failure |
| PDF export errors | Provider feedback + console | Blank PDF, missing Arabic, or wrong contract data |
| Lead submission errors | Public site + `/dashboard/leads` | Lead not visible to provider within 5 min |
| Analytics RPC errors | Supabase logs + network tab | >3 `42501` or function errors in 10 min |
| Supabase logs | DB + edge function logs | Any ERROR or FATAL level |
| Frontend console errors | Browser devtools | Any uncaught exception |
| Provider feedback | Form submissions + WhatsApp | Any "unusable" or "confusing" report |
| Customer feedback | Form submissions + WhatsApp | Any "unusable" or "confusing" report |

---

## 7. Emergency Rollback Trigger

**If any of the following occurs, pause the beta immediately. Do not attempt a hotfix without QA owner sign-off.**

| # | Trigger | Immediate Action |
|---|---------|----------------|
| 7.1 | **Privacy leak** — cross-tenant data visible, PII exposed in API response or PDF | Stop all external access. Technical owner investigates. Notify all roles. Do not resume until root cause fixed and re-tested. |
| 7.2 | **Data corruption** — contract values wrong, status transitions incorrect, duplicate records | Pause beta. Technical owner checks autosave, clone, and amendment logic. Verify against last known-good backup. |
| 7.3 | **Contract status transition bug** — draft auto-approves, signed contract reverts to draft, or client can modify provider terms | Immediate NO-GO. Check `contract-statuses.ts`, `contract-approval-timeline.ts`, and RLS UPDATE policies. |
| 7.4 | **PDF exports wrong contract data** — wrong client name, wrong BOQ, wrong total, or missing clauses | Stop PDF exports. Check `contract-pdf-export.ts` data binding. Re-run `verify-pdf-arabic.mjs`. |
| 7.5 | **Widespread auth failure** — multiple providers or customers cannot log in | Check Supabase auth logs, OAuth provider status, and `user_roles` table. If outage is external (e.g. OAuth provider down), communicate to users. |
| 7.6 | **Major route outage** — homepage, dashboard, or contracts page returns 404/500 for all users | Check deployment status and route definitions. Roll back to last known-good published version if needed. |
| 7.7 | **Supabase edge function 500 spike** — multiple RPCs or functions failing | Check edge function logs. If a recent migration caused it, evaluate rollback feasibility (note: data migrations are one-way). |

### Rollback procedure

1. **Pause** — Announce to all beta users that the system is under maintenance.
2. **Assess** — Identify whether the issue is deploy-related (revert publish) or data-related (cannot revert migrations).
3. **Revert** — If deploy-related, revert to the last known-good published version in Lovable.
4. **Verify** — Re-run public + provider smoke tests on the reverted version.
5. **Communicate** — Notify beta users when the issue is resolved or if the beta is extended.

---

## 8. Final Recommendation

### Current State Summary

| Category | Score | Notes |
|----------|-------|-------|
| Automated test gates | **Green** | 308 tests, tsc, smoke, links, sitemap, meta, canonical all pass |
| Product readiness | **Green** | Public pages, dashboard, contracts, analytics all audited and pass |
| Security / privacy | **Green** | Privacy grep clean, no known leaks, no P0/P1 bugs |
| Manual verification gaps | **Yellow** | RLS probes, RPC grant verification, and PDF visual QA require human steps outside Lovable |
| Visual regression | **Yellow** | Baselines external; manual smoke is the fallback |

### Recommendation

| Scenario | Status |
|----------|--------|
| **If manual RLS probes, RPC grants, and PDF visual QA are completed before inviting external users** | **GO** |
| **If those manual checks are outstanding but tracked with owners and deadlines** | **CONDITIONAL GO** — proceed with internal admin testers and trusted providers only; defer public customer invites until checks close |
| **If any NO-GO trigger from section 4 is active** | **NO-GO** |

### Next Actions to Upgrade from CONDITIONAL GO to GO

1. [ ] Complete RLS cross-tenant manual probes (provider A vs provider B data isolation).
2. [ ] Verify Supabase RPC grants (`prosecdef`, PUBLIC revoked, `authenticated`/`service_role` granted).
3. [ ] Run manual PDF Arabic visual QA per `docs/contract-pdf-qa.md` reference cases.
4. [ ] Confirm visual regression baseline reseed is scheduled (tracked as external task).
5. [ ] Obtain launch day sign-off from all area owners (section 5 table).

### Risk Acceptance

If the product owner accepts the conditional state and assigns owners + deadlines for the remaining manual checks, the beta may proceed with a **restricted user list** (internal admins + 2–3 trusted providers) while the gaps close. No public customer invites until status upgrades to **GO**.

---

## Reference Files

- `docs/beta-launch-operations.md` — Full operational runbook
- `docs/beta-launch-checklist.md` — Concise daily checklist
- `docs/beta-launch-communications.md` — Communication templates
- `docs/contracts-launch-checklist.md` — Contract-specific technical gates
- `e2e/VISUAL_REGRESSION.md` — Baseline reseed guide
- `scripts/contracts-prelaunch-smoke.sh` — Automated smoke test

---

*Document version: 1.0*  
*Last updated: 2026-05-16*
