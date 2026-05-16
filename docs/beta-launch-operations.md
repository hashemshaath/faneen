# Beta Launch Operations

Controlled beta launch for Qitaat.com (قِطاعات).

This document is the operational companion to `docs/contracts-launch-checklist.md`. It covers people, process, and runbooks for the beta; the contract checklist covers technical gates specific to the contracts subsystem.

---

## A. Launch Scope

### Included in beta

| Feature | Status | Notes |
|---------|--------|-------|
| Public landing pages | Ready | SEO + sitemap + llms.txt verified |
| Provider dashboard | Ready | Routes, links, and performance audited |
| Business profile (public) | Ready | v2 layout, membership badges, reviews |
| Contracts | Ready | PDF export, autosave, clone, amendments |
| Execution sites | Ready | Coordinates hidden from public analytics |
| Lead → Contract | Ready | Prefill, linking, idempotent audit rows |
| PDF export | Ready | Arabic text layer, privacy guards, QR hash |
| Provider analytics | Ready | Period chips, multi-business selector |
| Admin analytics | Ready | Leaderboard, geographic aggregates only |

### Excluded or deferred

| Item | Reason | Target |
|------|--------|--------|
| Visual regression baselines | Requires Playwright Docker on Linux x64 outside Lovable | Track as external; reseed before GA |
| Advanced payment collection | Not fully wired end-to-end | Post-beta if demand is confirmed |
| Audited admin drilldowns | Admin UI has many pages; contract drilldown is ready but full admin coverage is deferred | GA |
| Custom formula pricing | Intentionally not implemented | Only if 3+ providers request it |
| Per-lead detail route from contract source card | Not wired; card shows lead name only | Post-beta |

---

## B. Launch Roles

| Role | Responsibility | Ideal Owner |
|------|---------------|-------------|
| Product owner | Feature prioritization, beta scope decisions, go/no-go call | Business stakeholder |
| Technical owner | Deployment, CI/CD, rollback, migrations, Supabase grants, edge function health | Senior dev / DevOps |
| Support owner | First response to beta issues, triage, escalation | Community manager or support lead |
| QA owner | End-to-end contract flow, Arabic PDF visual QA, cross-tenant RLS probes | QA or technical owner |
| Admin/operator | Onboard providers, verify business docs, approve showcases | Operations or product owner |
| Provider onboarding owner | Demo calls, collecting feedback, driving adoption | Business development |

---

## C. Beta User Groups

### 1. Internal admin testers (2–3 people)
- Full admin access
- Test admin analytics, provider review, membership approvals
- Run every launch day checklist item

### 2. Trusted providers (3–5)
- Real businesses with active leads
- Goal: create at least one contract from a lead
- Goal: export at least one Arabic PDF
- Goal: add at least one execution site
- Collect structured feedback via a short form

### 3. Test customers / leads (5–10)
- Submit leads through the public site
- Accept contract invitations
- View PDF exports as client parties
- Provide feedback on the client experience

### 4. Full contract test (1 complete flow)
- Lead submitted by a test customer
- Provider receives the lead
- Provider creates a contract draft from the lead
- Provider adds BOQ line items and sets execution site
- Provider sends the contract to the client
- Client views and accepts
- Provider exports PDF
- PDF contains correct Arabic text, QR hash, and site info
- Provider views analytics and confirms the contract is counted

---

## D. Pre-Launch Checklist

Run these before announcing the beta to any external user.

- [ ] CI green (GitHub Actions `code-audit.yml`, `pdf-arabic-verify.yml`, `visual-regression.yml`)
- [ ] `bunx tsc --noEmit` green locally
- [ ] `bunx vitest run` green (308 tests)
- [ ] `bash scripts/contracts-prelaunch-smoke.sh` green
- [ ] `bash scripts/broken-links-audit.mjs` reports 0 broken internal links
- [ ] `bash scripts/sitemap-integrity-audit.mjs` green
- [ ] All Supabase migrations applied to production
- [ ] Supabase RPC grants verified (`prosecdef = true`, PUBLIC revoked, authenticated + service_role granted)
- [ ] RLS cross-tenant manual probes completed (provider A cannot read provider B data)
- [ ] PDF Arabic visual QA done (legacy, templated BOQ, amendments, QR, long clauses)
- [ ] Visual baselines reseeded or explicitly tracked as external risk

---

## E. Launch Day Checklist

Run in order. Do not skip.

### 1. Deploy
- [ ] Merge beta branch to `main`
- [ ] Verify GitHub Actions CI passes on `main`
- [ ] Deploy to production (Lovable publish)

### 2. Public smoke (5 minutes)
- [ ] Load homepage — verify no console errors
- [ ] Verify login page loads
- [ ] Verify search page loads
- [ ] Verify business profile loads
- [ ] Verify `/contact`, `/about`, `/privacy`, `/terms` loads

### 3. Provider smoke (10 minutes)
- [ ] Log in as a test provider
- [ ] Verify provider dashboard loads
- [ ] Verify `/dashboard/business-edit` loads
- [ ] Verify `/dashboard/leads` loads
- [ ] Verify `/dashboard/contracts` loads
- [ ] Verify `/dashboard/contracts/analytics` loads

### 4. Contract smoke (15 minutes)
- [ ] Create a lead as a test customer
- [ ] Provider sees the lead in `/dashboard/leads`
- [ ] Provider clicks "Create Contract" from the lead
- [ ] Draft loads with lead info prefilled
- [ ] Provider adds BOQ line items
- [ ] Provider sets execution site
- [ ] Provider sends contract to client
- [ ] Client receives invitation and views contract
- [ ] Client accepts
- [ ] Provider exports PDF
- [ ] Downloaded PDF opens and Arabic text is readable
- [ ] QR code on PDF scans to verification URL
- [ ] Provider analytics shows the contract in counts

### 5. Admin smoke (5 minutes)
- [ ] Log in as admin
- [ ] Verify `/admin/contracts/analytics` loads with data
- [ ] Verify period chips switch correctly
- [ ] Verify "Include demo" toggle works

### 6. Health checks (5 minutes)
- [ ] No console errors on any tested page
- [ ] Check Supabase logs for errors
- [ ] Check edge function logs for 500s
- [ ] Verify `public/sitemap.xml` is reachable
- [ ] Verify `public/robots.txt` is reachable

---

## F. Rollback Plan

### Where rollback happens
- Deployment is via Lovable publish; rolling back means reverting to the last known-good published version.
- Database changes (migrations) are **not** reversible by a simple deploy rollback. Treat migrations as one-way.

### Non-reversible data changes
- Contract records created during beta
- PDF export history rows
- Lead → contract links
- Analytics aggregates (they are derived, but raw audit rows persist)

### Migrations that should not be rolled back casually
- Any migration that drops a column or table
- Any migration that changes a data type with data loss
- Contract-related migrations (they contain production contract data once beta starts)

### Emergency contact
- Technical owner is the first responder
- If a critical privacy or security issue is found, pause the beta immediately and notify all roles
- Do not attempt a hotfix during active beta testing without QA owner sign-off

---

## G. Monitoring Plan

### What to watch

| Signal | How to check | Alert threshold |
|--------|-----------|----------------|
| Frontend errors | Browser console during smoke tests; Sentry if configured | Any uncaught exception |
| Supabase function errors | Supabase edge function logs | Any 500 or 401 spike |
| Failed RPC calls | Supabase DB logs for `42501` (RLS denied) or function errors | >3 failures in 10 min |
| Auth / login issues | Supabase auth logs; user reports | Any OAuth or OTP failure |
| PDF export failures | Provider feedback; console errors on export click | Any report of blank or broken PDF |
| Lead conversion failures | `/dashboard/leads` does not show expected leads; contract creation fails | Provider reports missing lead |
| Contract creation failures | Draft does not save; autosave errors | Console error or 500 on save |
| Analytics RPC latency | Supabase analytics query; provider report of slow loading | >5 seconds for analytics page |

### Daily beta ritual
- [ ] Check Supabase logs for errors (2 min)
- [ ] Review any provider or customer feedback (5 min)
- [ ] Verify no new broken links (re-run `broken-links-audit.mjs` if pages changed) (2 min)

---

## H. Support Playbook

### 1. Provider cannot access dashboard
- **Likely cause:** Not logged in; not a provider role; business not created.
- **First check:** Ask them to go to `/dashboard`. If redirected to onboarding, they need to complete provider setup.
- **Escalation:** Technical owner checks auth logs and `user_roles` table.

### 2. Business not verified
- **Likely cause:** Business profile incomplete or still in draft.
- **First check:** Provider should visit `/dashboard/business-edit` and check the completeness bar.
- **Escalation:** Admin/operator reviews the business in the admin panel.

### 3. Contract PDF fails
- **Likely cause:** jsPDF library not loaded; large BOQ exceeds memory; Arabic font missing.
- **First check:** Ask for the browser console output. Try a small contract first.
- **Escalation:** Technical owner checks `contract-pdf-export.ts` and runs `verify-pdf-arabic.mjs`.

### 4. Arabic PDF looks wrong
- **Likely cause:** Font subset missing for specific glyphs; RTL bidi issues; page break cuts a clause.
- **First check:** Compare with the reference QA contract PDFs in `docs/contract-pdf-qa.md`.
- **Escalation:** QA owner performs manual visual diff against baseline.

### 5. Lead did not link to contract
- **Likely cause:** Lead was not created by the same provider; `link_lead_to_contract` failed.
- **First check:** Verify the lead owner matches the provider creating the contract. Check the contract detail page for a lead reference card.
- **Escalation:** Technical owner checks `link_lead_to_contract` RPC logs.

### 6. Execution site not showing in PDF
- **Likely cause:** Site not saved; site data not included in PDF template.
- **First check:** Confirm the site is set on the contract. Re-export PDF.
- **Escalation:** Technical owner checks `contract-pdf-export.ts` for site inclusion.

### 7. Analytics shows zero
- **Likely cause:** No contracts in selected period; wrong business selected; RPC returned empty.
- **First check:** Verify the provider has at least one non-draft contract. Try "All time". Check network tab for RPC response.
- **Escalation:** Technical owner runs `get_contract_analytics_dashboard` directly in Supabase SQL editor with the provider's `business_id`.

### 8. Invite email not received
- **Likely cause:** Email infrastructure not fully set up; email in spam; wrong email address.
- **First check:** Confirm email address. Check spam. Verify Lovable Cloud email domain is configured.
- **Escalation:** Technical owner checks email delivery logs in the admin email center.

---

## I. Beta Success Criteria

### Quantitative
- [ ] At least 3 providers fully onboarded (business verified + active)
- [ ] At least 5 leads submitted through the public site
- [ ] At least 2 contracts created from leads
- [ ] At least 2 PDFs exported and verified readable
- [ ] Zero critical privacy issues
- [ ] Zero cross-tenant data leaks
- [ ] Zero broken public routes

### Qualitative
- [ ] Provider feedback form completed by at least 2 providers
- [ ] Customer feedback form completed by at least 2 customers
- [ ] No reports of "unusable" or "confusing" for the contract flow
- [ ] Analytics pages load in under 3 seconds for typical data volumes

### Exit conditions
- If any critical privacy or security issue is found, pause the beta and fix before continuing.
- If zero contracts are created within 2 weeks, investigate adoption blockers.

---

## J. Known Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Visual regression baseline external | No automated layout regression detection | High | Manual smoke on every deploy; reseed baselines before GA |
| Manual PDF visual QA needed | Arabic layout or page-break issues slip through | Medium | QA owner verifies every Arabic PDF export during beta |
| Admin drilldowns deferred | Admin may need raw table access for debugging | Low | Admin RPCs cover 95% of needs; fallback is Supabase SQL editor |
| Cross-currency leaderboard sort | Leaderboard ordering may look odd with mixed currencies | Low | Per-currency badges shown; purely cosmetic |
| No per-lead detail route from contract source card | Provider must navigate to Leads page manually | Low | Card shows lead name; click opens leads list |
| Payment schedule fixed at 30/40/30 | Cannot accommodate custom schedules | Low | Documented as deferred; no provider has requested it yet |
| Custom formula pricing not implemented | Cannot support complex pricing models | Low | Not requested by beta users |

---

## Appendix: Reference Files

- `docs/contracts-launch-checklist.md` — Technical gates for the contract subsystem
- `e2e/VISUAL_REGRESSION.md` — How to reseed baselines outside Lovable
- `scripts/contracts-prelaunch-smoke.sh` — Automated smoke test
- `scripts/broken-links-audit.mjs` — Internal link health
- `scripts/sitemap-integrity-audit.mjs` — Sitemap validation
- `public/llms.txt` — AI search readiness reference
