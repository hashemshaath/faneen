# Client Sites — Manual Real Data Activation Checklist

## Purpose

Activate the Client Sites / Project Locations system with **real users and real data** through the UI. This is a manual, step-by-step checklist for the QA team, admin, and stakeholders.

**Rules:**
- No automated user creation.
- No bulk DB modifications.
- No demo or seed data used.
- All QR tokens, access grants, and contracts created through the UI.

---

## 1. Preconditions

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1.1 | Super admin account verified (e.g., `hshaath@gmail.com`) and can access `/admin/client-sites` | Admin | ☐ |
| 1.2 | At least one verified provider account exists (non-demo, non-seed) | Admin | ☐ |
| 1.3 | At least one verified owner/client account exists (non-demo, non-seed) | Admin | ☐ |
| 1.4 | Owner account has a verified business profile | Admin | ☐ |
| 1.5 | Test contract creation is permitted and does not trigger real billing | Admin | ☐ |
| 1.6 | All existing demo/seed client sites archived (e.g., `STE-2026-100001` archived) | Admin | ☐ |
| 1.7 | `broken-links-audit` passes and `/s/:token` route is live | QA | ☐ |

---

## 2. Create Real Site

| # | Step | Owner | Status |
|---|------|-------|--------|
| 2.1 | Owner/manager logs in with real account credentials | Owner | ☐ |
| 2.2 | Navigate to Client Sites section in dashboard | Owner | ☐ |
| 2.3 | Click "Create New Site" | Owner | ☐ |
| 2.4 | Fill `site_name` with a real project name (e.g., "Villa Al-Faisal — Riyadh") | Owner | ☐ |
| 2.5 | Select `site_type` from dropdown (Residential / Commercial / Industrial / Other) | Owner | ☐ |
| 2.6 | Select `city` and `district` from dropdowns | Owner | ☐ |
| 2.7 | Enter full `address_line` | Owner | ☐ |
| 2.8 | Optionally set `latitude` / `longitude` via map pin | Owner | ☐ |
| 2.9 | Set `contact_name` and `contact_phone` (optional, for owner reference) | Owner | ☐ |
| 2.10 | Keep `visibility` = `private` initially | Owner | ☐ |
| 2.11 | Save site and confirm `site_ref` was auto-generated (format: `STE-YYYY-NNNNNN`) | Owner | ☐ |
| 2.12 | Verify site appears in owner's site list with correct summary | Owner | ☐ |

---

## 3. QR Activation

| # | Step | Owner | Status |
|---|------|-------|--------|
| 3.1 | Review site data for accuracy before sharing | Owner | ☐ |
| 3.2 | Change `visibility` to `shared_by_qr` only after review | Owner | ☐ |
| 3.3 | Click "Issue QR Code" from site detail | Owner | ☐ |
| 3.4 | Download or print QR sticker | Owner | ☐ |
| 3.5 | Copy the public `/s/:token` URL from the QR panel | Owner | ☐ |
| 3.6 | In an incognito browser, open the `/s/:token` URL as anonymous visitor | QA | ☐ |
| 3.7 | Confirm public page shows **only** limited summary: `site_name`, `site_type`, `city`, `district` | QA | ☐ |
| 3.8 | Confirm **no** `address_line`, `contact_phone`, `map_url`, `latitude`, `longitude`, `contact_name` on public page | QA | ☐ |
| 3.9 | Confirm `qr_token_hash` is **never** visible in page source, network response, or console | QA | ☐ |
| 3.10 | Revoke QR from owner dashboard and confirm `/s/:token` now returns 404/unauthorized | QA | ☐ |
| 3.11 | Re-issue QR and confirm old rotated token no longer works | QA | ☐ |

---

## 4. Provider Flow

| # | Step | Provider | Status |
|---|------|----------|--------|
| 4.1 | Provider logs in with real account | Provider | ☐ |
| 4.2 | Provider scans QR code (or opens `/s/:token` while authenticated) | Provider | ☐ |
| 4.3 | Provider sees limited summary (same as anon) plus "Request Access" or "Submit Interest" CTA | Provider | ☐ |
| 4.4 | Provider clicks "Submit Interest" and fills the interest form | Provider | ☐ |
| 4.5 | Provider optionally requests site access at a specific level (view / limited / full) | Provider | ☐ |
| 4.6 | Owner opens inbox/notifications and sees provider interest + access request | Owner | ☐ |
| 4.7 | Owner reviews provider profile and interest details | Owner | ☐ |
| 4.8 | Owner approves or rejects access request | Owner | ☐ |
| 4.9 | If approved, provider can now see the site detail page according to granted access level | Provider | ☐ |
| 4.10 | If rejected, provider sees "Access Denied" and can re-apply later | Provider | ☐ |

---

## 5. Contract Flow

| # | Step | Owner/Admin | Status |
|---|------|-------------|--------|
| 5.1 | Create a new draft contract (or use test contract flow) | Owner | ☐ |
| 5.2 | In "Execution Site" section, open the site picker | Owner | ☐ |
| 5.3 | Select the real client site created in Step 2 | Owner | ☐ |
| 5.4 | Confirm the `execution_address_snapshot` auto-populates with: `site_ref`, `site_name`, `site_type`, `city`, `district` | Owner | ☐ |
| 5.5 | Verify snapshot **does not** include `address_line`, `contact_phone`, `latitude`, `longitude` | Owner | ☐ |
| 5.6 | Send or approve contract (if test environment allows) | Owner | ☐ |
| 5.7 | Export contract PDF | Owner | ☐ |
| 5.8 | Open PDF and confirm execution site section shows safe snapshot (no PII) | QA | ☐ |
| 5.9 | Confirm contract detail page displays execution site safely in sidebar/stats | QA | ☐ |

---

## 6. Admin Monitoring

| # | Step | Admin | Status |
|---|------|-------|--------|
| 6.1 | Admin navigates to `/admin/client-sites` | Admin | ☐ |
| 6.2 | Verify the real site appears in the monitoring table | Admin | ☐ |
| 6.3 | Verify KPI cards show: total sites, total QR issued, total visits, total interests | Admin | ☐ |
| 6.4 | Click site row to open detail drawer | Admin | ☐ |
| 6.5 | Verify summary tab shows: `site_ref`, `site_name`, `site_type`, `city`, `district`, `visibility`, `status` | Admin | ☐ |
| 6.6 | Confirm **no** `address_line`, `contact_phone`, `map_url` in default drawer view | Admin | ☐ |
| 6.7 | Open "Sensitive Details" panel | Admin | ☐ |
| 6.8 | Enter reveal reason (min 5 characters, e.g., "Follow-up call with owner") | Admin | ☐ |
| 6.9 | Click "Reveal" and confirm sensitive fields now visible: `address_line`, `contact_phone`, `contact_name`, `map_url` | Admin | ☐ |
| 6.10 | Verify an audit row was created in `admin_client_site_access_audit` with `action = 'sensitive_detail_revealed'` | Admin | ☐ |
| 6.11 | Test "Add Operations Note" — enter category (`follow_up`, `security_review`, etc.) and note text | Admin | ☐ |
| 6.12 | Verify note appears in operations notes list | Admin | ☐ |
| 6.13 | Test "Log Contact Action" — select channel (`phone`, `whatsapp`, `email`) and purpose | Admin | ☐ |
| 6.14 | Verify contact action appears in audit log | Admin | ☐ |

---

## 7. Privacy Checks

| # | Check | Expected | Status |
|---|-------|----------|--------|
| 7.1 | Public `/s/:token` page | No `address_line`, `contact_phone`, `map_url`, `latitude`, `longitude`, `contact_name` | ☐ |
| 7.2 | Provider before access approval | Cannot see private fields (same as anon) | ☐ |
| 7.3 | Provider after full access approval | Can see site detail according to access level; still no raw `qr_token_hash` | ☐ |
| 7.4 | `qr_token_hash` in any UI/API | Never visible to any role | ☐ |
| 7.5 | Signed QR URLs in DOM/network | Never exposed to client JS | ☐ |
| 7.6 | Revoked QR token | Returns 404 or unauthorized | ☐ |
| 7.7 | Rotated QR token | Old token immediately invalid | ☐ |
| 7.8 | Admin monitoring table | Default columns exclude all sensitive fields | ☐ |
| 7.9 | Contract PDF | Execution site snapshot excludes PII | ☐ |

---

## 8. Sign-Off Table

| Role | Name | Date | Result | Notes |
|------|------|------|--------|-------|
| Owner | | | ☐ PASS / ☐ FAIL | |
| Provider | | | ☐ PASS / ☐ FAIL | |
| Admin | | | ☐ PASS / ☐ FAIL | |
| QA | | | ☐ PASS / ☐ FAIL | |

**Overall Result:** ☐ PASS / ☐ FAIL

---

## 9. When to Re-Run Phase 4 Dry Run

| Trigger | Action |
|---------|--------|
| After 3–5 real sites created by owners | Run dry run to validate site_ref uniqueness and contract linking readiness |
| After first 2 real contracts with execution sites | Run dry run to validate `execution_address_snapshot` correctness and PDF safety |
| Before wider beta launch | Full regression: this checklist + Phase 4 dry run + broken-links-audit |
| After any schema change to `client_sites`, `contracts`, or access grants | Re-run dry run before production deploy |

---

## Quick Reference

| URL | Purpose | Role |
|-----|---------|------|
| `/admin/client-sites` | Admin monitoring dashboard | Admin / super_admin |
| `/s/:token` | Public QR scan page | Anonymous / Provider |
| `/dashboard/client-sites` | Owner site management | Owner / Manager |
| `/dashboard/contracts` | Contract list and creation | Owner / Provider |
| `/dashboard/notifications` | Owner inbox for interests/requests | Owner |

---

*Document version: Phase 4B — Real Data Activation Checklist*
*Last updated: 2026-05-20*
