# Contracts System — Overview

Internal reference for the Qitaat contract system. Covers lifecycle,
templates, pricing, execution sites, lead conversion, PDF export, and
analytics. Written for engineers and admins; not user-facing.

## 1. Lifecycle & statuses

Contract status enum (`contracts.status`):

| Status | Meaning | Editable? |
|---|---|---|
| `draft` | Provider is composing the contract. Autosave active. | Yes |
| `pending_approval` | Sent to client; awaiting client approval. | Limited |
| `active` | Approved and in execution. | Locked* |
| `completed` | All milestones delivered. | Locked |
| `cancelled` | Terminated before completion. | Locked |
| `disputed` | Client/provider raised a dispute. | Locked |

*Locked statuses (`active`, `completed`, `cancelled`) are enforced at the
UI layer via `isContractLockedByStatus` (see `src/lib/contract-statuses.ts`)
and at the DB layer via lifecycle triggers. Changes after lock require an
**amendment**.

Lifecycle transitions:

```text
draft ──► pending_approval ──► active ──► completed
                  │                  │
                  └──► cancelled     └──► disputed
```

## 2. Legal templates

- Templates live in `contract_templates` with versions in
  `contract_template_versions`.
- Each version goes through draft → published. Drafts are editable;
  published versions are immutable.
- Pricing rules per version live in `contract_template_pricing_rules`
  (see `docs/contract-pricing-engine.md`).
- Categories include `general`, `kitchens`, `aluminum_doors_windows`,
  `wood_doors`, `fire_doors`, `upvc`, `iron_doors_windows`, `facades`,
  `glass_securit`, `gates_structures`, `wardrobes_closets`.

### Snapshots

When a contract is created from a template, the published version is
**frozen** onto the contract row (`template_version_id`,
`template_snapshot` JSON). Subsequent template edits never mutate
existing contracts — the snapshot is the legal source of truth.

### Versioning

- Admins create a new draft version, edit, and publish.
- Old versions remain queryable for historical contracts.
- Provider UI surfaces only the latest published version per template.

## 3. Amendments

After lock, modifications use `contract_amendments`:

- Each amendment captures `change_summary`, `effective_date`, and a
  signed appendix that is rendered in the PDF.
- Amendment status mirrors approval (`pending` / `approved` / `rejected`).
- Amendments never rewrite the original snapshot — they append.

## 4. BOQ, pricing, VAT

- Line items: `contract_line_items` with 7 pricing methods
  (`unit`, `linear_meter`, `square_meter`, `cubic_meter`, `kilogram`,
  `ton`, `lump_sum`).
- Server-authoritative totals via
  `calculate_contract_line_item_total()` and trigger
  `trg_validate_contract_line_item_pricing`.
- BOQ groups via `boq_group_key` (cabinets / countertops / accessories /
  appliances / installation / materials / labor / delivery / other).
- VAT 15% inclusive by default; controlled by `vat_inclusive` flag.
- Payment schedule: 30 % start / 40 % milestone / 30 % delivery (fixed
  in CT5; configurable later).

Full reference: `docs/contract-pricing-engine.md`.

## 5. Execution sites

- `contract_execution_sites` stores the physical site(s) where work is
  executed.
- Coordinates and full address are **provider/client-only**. Public and
  admin-analytics surfaces only see `city_name`.
- Set via `set_contract_execution_site` RPC.

## 6. Lead → Contract

- Providers convert qualified leads into contract drafts using
  `prepare_contract_prefill_from_lead` (read-only prefill) followed by
  `link_lead_to_contract` (atomic link + audit log).
- The conversion preserves lead → contract traceability without copying
  client PII into analytics.

## 7. PDF export

- Builder: `src/lib/contract-pdf-export.ts` (`buildContractPDF` pure;
  `exportContractPDF` saves).
- Arabic text layer is verified by `scripts/verify-pdf-arabic.mjs` and
  CI workflow `.github/workflows/pdf-arabic-verify.yml`.
- Every export is logged via `record_contract_pdf_export` (privacy-safe
  metadata only — see `docs/contract-pdf-qa.md`).
- Public verification page: `/v/c/<number>?h=<hash>` (QR target).

## 8. Autosave & Clone

- **Autosave**: `useContractDraftAutosave` debounces draft writes to
  `update_contract_draft_autosave` (whitelisted fields only — see the
  privacy doc).
- **Clone**: `clone_contract_as_draft` produces a new draft preserving
  BOQ/template/pricing while stripping client identity, signatures,
  approvals, PDF history, and amendments.

## 9. Analytics

- **Provider**: `get_contract_analytics_dashboard(_period, _business_id)`
  → page `DashboardContractAnalytics`. Provider sees only their own
  businesses (multi-business selector).
- **Admin**: `get_admin_contract_analytics_dashboard(_period,
  _business_id, _include_demo)` → page `AdminContractAnalytics`. Admin
  sees aggregate-only platform metrics (no PII).

Both RPCs are `SECURITY DEFINER`, aggregate-only, and group monetary
totals by `currency_code` (never sum across currencies).
