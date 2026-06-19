# PROVIDER INTAKE TEMPLATE UPDATE REPORT

Status: **PASS ✅**

## Files delivered
- `public/templates/qitaat-provider-intake-template.xlsx` — main provider intake template
- `public/templates/qitaat-provider-branches-template.xlsx` — separate branches template

Both downloadable from `/admin/data-enrichment` via the new "Intake templates (Excel)" block inside `IntakeWizardGuide`.

## Provider template columns (`Template` sheet)
legal_name_ar, legal_name_en, brand_name_ar, brand_name_en,
sector, sub_sector, services_summary,
cr_number, unified_number, vat_number, **establishment_year**,
**country**, **region**, city, district, street_name, building_number,
**short_national_address**, full_address, postal_code,
**latitude**, **longitude**,
primary_phone, whatsapp, email, website,
**account_manager_name**, **account_manager_phone**, **account_manager_email**,
logo_url, notes

## Branches template columns (`Template` sheet)
provider_cr_number, provider_legal_name_ar,
branch_name_ar, branch_name_en, branch_type, is_main, is_active,
**country**, **region**, city, district, street_name, building_number,
**short_national_address**, full_address, postal_code,
**latitude**, **longitude**,
phone, mobile, unified_number, email,
contact_person, working_hours_summary, notes

## Conventions (README sheet in both files)
- UTF-8 encoding, header row protected.
- Phones in E.164 (`+9665XXXXXXXX`).
- Booleans: `TRUE` / `FALSE`.
- Coordinates: decimal degrees (lat, lng).
- One row per record. No PII in shared copies.

## Compliance
- No DB / RLS / migrations / RPC / edge changes.
- No new admin route — wired into existing `/admin/data-enrichment` only.
- No auto-import to `businesses`, no auto-publish, no auto-matching, no automatic provider leads, no automatic outreach.
- Conversion remains manual after admin review.

## Files modified / created
- created `public/templates/qitaat-provider-intake-template.xlsx`
- created `public/templates/qitaat-provider-branches-template.xlsx`
- edited  `src/components/admin/provider-intake/IntakeWizardGuide.tsx` (download block)
- created `docs/provider-intake-template-update-report.md`

## Decision
`PROVIDER INTAKE TEMPLATE UPDATE PASS`
