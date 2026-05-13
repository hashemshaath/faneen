# Contracts — Launch Checklist

Run through this list before announcing the contract system to
providers. Items marked **(automated)** are covered by CI; items marked
**(manual)** require human verification in a staging environment.

## Pre-launch technical checks

- [ ] `bunx tsc --noEmit` clean (automated in CI).
- [ ] `bunx vitest run` green, including:
  - `src/lib/__tests__/contract-pdf-export.test.ts` (privacy guards)
  - `src/lib/__tests__/contract-pdf-arabic-text.test.ts`
  - `src/components/contract/__tests__/ContractPdfExportHistory.privacy.test.tsx`
- [ ] Supabase linter has **no new** ERROR-level findings on contract
  tables/RPCs.
- [ ] `.github/workflows/pdf-arabic-verify.yml` green on `main`.

## Supabase migrations

- [ ] All `supabase/migrations/*` applied to staging and production.
- [ ] Verify presence of:
  - `get_contract_analytics_dashboard`
  - `get_admin_contract_analytics_dashboard`
  - `record_contract_pdf_export`
  - `list_contract_pdf_exports`
  - `admin_list_contract_pdf_exports`
  - `update_contract_draft_autosave`
  - `clone_contract_as_draft`
  - `set_contract_execution_site`
  - `prepare_contract_prefill_from_lead`
  - `link_lead_to_contract`
  - `create_contract_from_template`
  - `calculate_contract_line_item_total`
  - `validate_contract_line_item_price`
- [ ] All above functions: `prosecdef = t`, `EXECUTE` revoked from
  PUBLIC/anon, granted to `authenticated` + `service_role`.

## RLS verification (manual)

- [ ] Provider A cannot read Provider B's contracts, line items, sites,
  amendments, or PDF history.
- [ ] Client can read only contracts they are a party to.
- [ ] Admin can read all but only via the admin RPCs (no direct table
  access from the client).
- [ ] Anonymous users cannot read any contract row.

## PDF — Arabic & privacy

- [ ] `npm run verify:pdf-arabic` PASS locally.
- [ ] Manual export of: legacy contract, templated BOQ, contract with
  amendments, contract with `document_hash` (QR), Arabic-primary
  contract with long clauses (see `docs/contract-pdf-qa.md`).
- [ ] Privacy grep against generated PDF text: no `file_url`,
  `storage_path`, `getSignedUrl`, raw UUIDs, `internal_note`,
  `formula_inputs`, `actor_id`, `token_hash`, `audit_*`.

## Analytics privacy checks

- [ ] Provider analytics (`/dashboard/contracts/analytics`):
  payload contains no client name/email/phone/address.
- [ ] Multi-business selector limits results to allowed businesses.
- [ ] Admin analytics (`/admin/contracts/analytics`): payload contains
  no PII; geographic data is `city_name` only; monetary totals grouped
  by `currency_code`; leaderboards capped at 20.
- [ ] Non-admin caller hitting the admin RPC receives `42501 FORBIDDEN`.

## Lead → Contract QA

- [ ] Provider can prefill a draft from an owned lead.
- [ ] Provider cannot prefill from a lead they do not own.
- [ ] `link_lead_to_contract` is idempotent (re-link does not
  duplicate audit rows).
- [ ] After link, both lead and contract surfaces show the
  cross-reference.

## Execution site QA

- [ ] Provider can set/update execution site; coordinates persist.
- [ ] Public surfaces (and admin analytics) reveal only `city_name`.
- [ ] Client party can view site coordinates and supervisor info.

## Autosave QA

- [ ] Editing whitelisted fields triggers a debounced save.
- [ ] Attempt to autosave non-whitelisted fields (e.g. `status`,
  `client_user_id`, `business_id`) is rejected.
- [ ] Autosave is disabled once the contract leaves `draft`.

## Clone QA

- [ ] Clone produces a new `draft` for the same business with BOQ +
  template intact.
- [ ] Cloned contract has no client identity, no signatures, no
  approvals, no PDF history, no amendments, no document hash.
- [ ] Clone preserves currency and VAT flag.

## Provider/Admin analytics QA

- [ ] Period chips (7d / 30d / 90d / 12m / all) refetch and update.
- [ ] "Include demo" admin toggle changes RPC param and visible counts.
- [ ] Refresh button forces refetch.
- [ ] No console errors on either page (excluding known Lovable harness
  warnings).

## Known non-blocking risks

- Admin leaderboard "by value" ordering uses cross-currency sum at the
  SQL layer (cosmetic; per-currency badges shown). Defer until
  multi-currency volume grows.
- jsPDF Arabic glyph rendering is not asserted programmatically inside
  jsdom; covered by the CLI `verify-pdf-arabic.mjs` instead.
- Visual regressions for PDF layout (page breaks, RTL bidi, signature
  placement) are still manual.
- Payment schedule is fixed at 30/40/30. Configurable schedules are
  deferred.
- `custom_formula` pricing method is intentionally not implemented.
