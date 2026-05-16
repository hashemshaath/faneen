# Beta Launch Checklist

Concise checkbox version for daily use. For full context and runbooks, see `docs/beta-launch-operations.md`.

---

## Pre-Launch (before any external user)

- [ ] CI green (`code-audit.yml`, `pdf-arabic-verify.yml`, `visual-regression.yml`)
- [ ] `bunx tsc --noEmit` green
- [ ] `bunx vitest run` green (308 tests)
- [ ] `bash scripts/contracts-prelaunch-smoke.sh` green
- [ ] `bash scripts/broken-links-audit.mjs` → 0 broken
- [ ] `bash scripts/sitemap-integrity-audit.mjs` green
- [ ] All Supabase migrations applied to production
- [ ] Supabase RPC grants verified (`prosecdef = true`, PUBLIC revoked)
- [ ] RLS cross-tenant manual probes done
- [ ] PDF Arabic visual QA done
- [ ] Visual baselines reseeded or tracked as external risk

---

## Launch Day

### Deploy
- [ ] Merge beta branch to `main`
- [ ] CI passes on `main`
- [ ] Deploy to production

### Public Smoke (5 min)
- [ ] Homepage loads, no console errors
- [ ] Login page loads
- [ ] Search page loads
- [ ] Business profile loads
- [ ] `/contact`, `/about`, `/privacy`, `/terms` load

### Provider Smoke (10 min)
- [ ] Log in as test provider
- [ ] Dashboard loads
- [ ] `/dashboard/business-edit` loads
- [ ] `/dashboard/leads` loads
- [ ] `/dashboard/contracts` loads
- [ ] `/dashboard/contracts/analytics` loads

### Contract Smoke (15 min)
- [ ] Test customer submits a lead
- [ ] Provider sees lead in `/dashboard/leads`
- [ ] Provider creates contract draft from lead
- [ ] Draft prefills with lead info
- [ ] Provider adds BOQ line items
- [ ] Provider sets execution site
- [ ] Provider sends contract to client
- [ ] Client views and accepts contract
- [ ] Provider exports PDF
- [ ] Arabic text readable in PDF
- [ ] QR code scans to verification URL
- [ ] Analytics counts the contract

### Admin Smoke (5 min)
- [ ] Log in as admin
- [ ] `/admin/contracts/analytics` loads with data
- [ ] Period chips switch correctly
- [ ] "Include demo" toggle works

### Health Checks (5 min)
- [ ] No console errors on any tested page
- [ ] Supabase logs show no errors
- [ ] Edge function logs show no 500s
- [ ] `public/sitemap.xml` reachable
- [ ] `public/robots.txt` reachable

---

## Daily Beta Ritual

- [ ] Check Supabase logs for errors (2 min)
- [ ] Review provider/customer feedback (5 min)
- [ ] Re-run broken-links audit if pages changed (2 min)

---

## Weekly Review

- [ ] Count providers onboarded
- [ ] Count leads submitted
- [ ] Count contracts created
- [ ] Count PDFs exported
- [ ] Review any new console errors or failed RPCs
- [ ] Update known risks if anything changed

---

## Exit Criteria

- [ ] 3+ providers onboarded
- [ ] 5+ leads submitted
- [ ] 2+ contracts created from leads
- [ ] 2+ PDFs exported and verified
- [ ] 0 critical privacy issues
- [ ] 0 cross-tenant data leaks
- [ ] 0 broken public routes
- [ ] 2+ provider feedback forms received
- [ ] 2+ customer feedback forms received
- [ ] No "unusable" or "confusing" reports for contract flow

---

## Reference

- Full operations doc: `docs/beta-launch-operations.md`
- Contracts checklist: `docs/contracts-launch-checklist.md`
- Smoke script: `scripts/contracts-prelaunch-smoke.sh`
- Visual regression guide: `e2e/VISUAL_REGRESSION.md`
