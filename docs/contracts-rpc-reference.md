# Contracts — RPC Reference

All RPCs are `SECURITY DEFINER` with `SET search_path = public`.
`EXECUTE` is revoked from `PUBLIC` and `anon`; granted to
`authenticated` and `service_role`. Every RPC re-validates the caller
via `auth.uid()` plus the appropriate role/ownership check.

Legend: **R** = read-only, **W** = writes, **A** = admin-only.

---

## create_contract_from_template (W)

- **Purpose**: Atomically create a new contract from a published
  template version, freezing the snapshot onto the contract row.
- **Caller**: Provider staff of the owning business.
- **Security**: Validates `business_id` membership; requires the
  template version to be `published`.
- **Excluded fields**: No client PII required at creation; client is
  invited later. No internal admin metadata is exposed back.

## update_contract_draft_autosave (W)

- **Purpose**: Debounced field-level save for `draft` contracts.
- **Caller**: Provider staff of the owning business.
- **Security**: Rejects writes when status ≠ `draft`. Strict field
  whitelist (see `docs/contracts-security-privacy.md` §8). Server
  trigger overrides BOQ totals.
- **Excluded fields**: `status`, `client_*`, `business_id`,
  `template_snapshot`, `signatures`, `document_hash`, amendments.

## clone_contract_as_draft (W)

- **Purpose**: Create a new `draft` from an existing contract,
  preserving template + BOQ but stripping identity and approvals.
- **Caller**: Provider staff of the source contract's business.
- **Security**: Ownership check on source contract; new contract
  inherits the same `business_id`.
- **Excluded fields**: Client identity, signatures, approvals,
  document hash, PDF history, amendments, lead links, internal notes.

## set_contract_execution_site (W)

- **Purpose**: Create/update the execution site for a contract.
- **Caller**: Provider staff of the owning business.
- **Security**: Ownership check; refuses changes on locked statuses
  unless invoked through the amendment path.
- **Excluded from public surfaces**: street address, coordinates,
  supervisor name/phone, access notes — only `city_name` is exposed
  publicly and to admin analytics.

## prepare_contract_prefill_from_lead (R)

- **Purpose**: Read-only prefill payload to seed a contract draft from
  a qualified lead.
- **Caller**: Provider staff of the lead-owning business.
- **Security**: Ownership check on the lead; returns nothing for leads
  outside the caller's businesses.
- **Excluded fields**: Lead internal scoring/audit fields; only
  prefill-relevant fields are returned.

## link_lead_to_contract (W)

- **Purpose**: Atomically create a `lead_contract_links` row and append
  to the audit log.
- **Caller**: Provider staff of both the lead and contract.
- **Security**: Idempotent — re-linking the same pair is a no-op. Both
  ownership checks must pass.
- **Excluded fields**: No PII echoed back; returns IDs + timestamps.

## get_contract_analytics_dashboard (R)

- **Purpose**: Provider analytics payload (KPIs, trend, status mix,
  currency totals, leaderboards).
- **Caller**: Provider staff (any role).
- **Security**: Limits results to businesses the caller belongs to.
  When `_business_id` is `NULL`, aggregates across all allowed
  businesses.
- **Excluded fields**: All PII; monetary totals grouped by
  `currency_code`.

## get_admin_contract_analytics_dashboard (R, A)

- **Purpose**: Platform-wide aggregate analytics for admins.
- **Caller**: Admins only (`has_admin_access(auth.uid())`).
- **Security**: Returns `42501 FORBIDDEN` to non-admins. Aggregate-only
  payload. `_include_demo` defaults to `false`; `_business_id` scopes
  every internal CTE.
- **Excluded fields**: All client PII; supervisor data; coordinates;
  internal notes; PDF actor IDs (`exported_by`, `ip_hash`,
  `user_agent_hash`); document hashes. Geographic granularity =
  `city_name`. Leaderboards capped at 20.

## record_contract_pdf_export (W)

- **Purpose**: Append a privacy-safe row to `contract_pdf_exports`
  after a successful PDF build.
- **Caller**: Any authenticated user with read access to the contract.
- **Security**: Server resolves `exported_by`, `ip_hash`,
  `user_agent_hash`, `contract_number`, and `document_hash_prefix`.
  Caller may pass only `_contract_id`, `_source`, `_export_locale`.
- **Returns**: `export_id`, `exported_at`, `contract_number`,
  `document_hash_prefix` only.

## list_contract_pdf_exports (R)

- **Purpose**: Provider-facing PDF history feed.
- **Caller**: Owner business staff.
- **Security**: Ownership check; never returns `exported_by`,
  `email`, `ip_hash`, `user_agent_hash`.
- **Returns**: `exported_at`, `contract_number`,
  `document_hash_prefix`, `source`, `locale`.

## admin_list_contract_pdf_exports (R, A)

- **Purpose**: Admin-facing audit feed for PDF exports.
- **Caller**: Admins only.
- **Security**: Re-validates `has_admin_access`. Returns aggregate
  counters and row metadata; **excludes** raw exporter UUIDs and
  hashes from any UI render path (`AdminPdfExportAudit` page enforces).
- **Returns**: timestamps, contract numbers, hash prefixes, source,
  locale, aggregate counters.

## calculate_contract_line_item_total (R)

- **Purpose**: Server-authoritative pricing calculator used by both
  the trigger and the dry-run RPC.
- **Caller**: System / `validate_contract_line_item_price`.
- **Security**: Pure function; no row access.

## validate_contract_line_item_price (R)

- **Purpose**: Dry-run validator surfaced to the provider UI.
- **Caller**: Provider staff.
- **Security**: No writes; mirrors trigger error codes for UX.

## Legal review RPCs

These cover template lifecycle and amendment review:

- `publish_contract_template_version` (W, A) — Admin: flips a draft
  template version to `published`; immutable thereafter.
- `create_contract_template_version` (W, A) — Admin: clones a published
  version into a new editable draft.
- `submit_contract_amendment` (W) — Provider: creates a `pending`
  amendment for a locked contract.
- `review_contract_amendment` (W) — Client/admin: approves or rejects a
  pending amendment; on approval, appends to the rendered PDF and
  records the effective date.

All legal RPCs validate role + ownership, never expose draft template
content to non-admins, and never echo back signed-URL or storage paths.
