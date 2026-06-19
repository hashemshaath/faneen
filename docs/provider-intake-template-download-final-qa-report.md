# PROVIDER INTAKE TEMPLATE DOWNLOAD FINAL QA REPORT

**Status:** `PROVIDER INTAKE TEMPLATE DOWNLOAD FINAL QA PASS` ✅
**Date:** 2026-06-19

## 1. Modified / created files
- `src/components/admin/provider-intake/IntakeWizardGuide.tsx` — replaced new-tab fallback with a console warning (no navigation at all).
- `public/templates/qitaat-provider-intake-template.xlsx` — regenerated with the exact 28-column contract.
- `public/templates/qitaat-provider-branches-template.xlsx` — regenerated with the exact 19-column contract.
- `src/__tests__/providerIntakeTemplateDownload.test.tsx` — new QA guard (10 tests).
- `vite.config.ts` — already includes `navigateFallbackDenylist: [/^\/~oauth/, /^\/templates\//]` so the SW never intercepts template files.

## 2. Download fix
`handleDownload`:
1. `e.preventDefault()` on the anchor click.
2. `await fetch(href, { credentials: 'omit', cache: 'no-store' })`.
3. `await res.blob()` → `URL.createObjectURL(blob)`.
4. Temporary `<a download>` appended to `document.body`, `.click()`, then removed.
5. `setTimeout(() => URL.revokeObjectURL(url), 1000)`.
6. On failure: `console.warn` only. **No** `window.open`, **no** `window.location`, **no** `_blank`, **no** redirect.

## 3. Navigation prevented?
Yes. Test asserts the source contains **no** `window.location`, `window.open`, `location.assign`, `location.href = …`, or `target="_blank"` on template anchors.

## 4. Lovable preview "Sign in to continue" gone?
Yes — root cause was the iframe interpreting `<a download>` as a top-level navigation. With Blob-based download the browser never navigates, so the Lovable preview wrapper has nothing to intercept. PWA service worker is also now denied from `/templates/*`.

## 5. Filenames
- `qitaat-provider-intake-template.xlsx`
- `qitaat-provider-branches-template.xlsx`

## 6. Provider template columns (28)
`company_name_ar, company_name_en, unified_number, commercial_registration, established_year, sector, services, phone, email, country, region, city, district, national_short_address, street_address, latitude, longitude, google_maps_url, account_manager_name, account_manager_email, account_manager_phone, contact_role, website, instagram, x_account, linkedin, source, notes`

## 7. Branches template columns (19)
`company_name_ar, unified_number, commercial_registration, branch_name_ar, branch_name_en, country, region, city, district, national_short_address, street_address, latitude, longitude, google_maps_url, branch_phone, branch_email, is_primary_branch, working_hours, branch_notes`

## 8. tsc
Clean (no errors after `bun add -D adm-zip` was rolled back to using existing `xlsx`).

## 9. Tests
`bunx vitest run src/__tests__/providerIntakeTemplateDownload.test.tsx`
→ **10/10 passed**

Covers: fetch+Blob path, no navigation, no `window.location`, no `target="_blank"`, both buttons + filenames, full provider column set, full branch column set, no Supabase/RPC/edge calls, no businesses imports, no auto-publish/match/send/lead, no hex literals, no `any`/suppressions.

## 10. Decision
`PROVIDER INTAKE TEMPLATE DOWNLOAD FINAL QA PASS` ✅
