# Contracts — Security & Privacy

Internal reference for the privacy and access-control posture of the
contract system. Pair with `docs/contracts-system-overview.md` and
`docs/contracts-rpc-reference.md`.

## 1. RLS summary

All contract tables have RLS enabled.

| Table | Read | Write |
|---|---|---|
| `contracts` | Provider (owning business staff), client (party), admin | Provider draft / amendments only; locked statuses require RPC |
| `contract_line_items` | Same as parent contract | Provider only; trigger overrides totals |
| `contract_execution_sites` | Provider + client; admin sees `city_name` projection | Provider only via `set_contract_execution_site` |
| `contract_amendments` | Same as parent contract | Provider creates; client approves |
| `contract_pdf_exports` | Owner business staff via `list_contract_pdf_exports`; admin via `admin_list_contract_pdf_exports` | Insert only via `record_contract_pdf_export` |
| `contract_template_versions` | Public read (published) | Admin only |
| `contract_template_pricing_rules` | Public read (published) | Admin only |
| `lead_contract_links` | Provider + admin | RPC only |

Roles are checked via `has_role(uid, role)` and `has_admin_access(uid)`
(separate `user_roles` table — never on `profiles`).

## 2. SECURITY DEFINER RPCs

All contract RPCs are `SECURITY DEFINER` with `SET search_path = public`.
`EXECUTE` is revoked from `PUBLIC` and `anon`; granted to `authenticated`
and `service_role` only. Each RPC re-validates the caller via
`auth.uid()` and a role check before doing any work.

See `docs/contracts-rpc-reference.md` for the full list.

## 3. PDF export — excluded data

The PDF builder (`buildContractPDF`) and its test guards
(`src/lib/__tests__/contract-pdf-export.test.ts`) **forbid** the
following tokens in the rendered output:

- `file_url`, `storage_path`, `getSignedUrl`, `sign=`
- `/storage/v1/object/sign`, `X-Amz-Signature`
- `internal_note`
- `actor_id`, `approver_id`, `token_hash`
- `formula_inputs` (raw JSON)
- `draft_template`, `audit_metadata`, `audit_log`
- Any raw UUID

The QR/verification block contains only the public URL and the first 16
chars of `document_hash`.

## 4. Analytics — excluded data

Both provider and admin analytics RPCs return **aggregates only**.
Forbidden in payloads:

- Client name, email, phone, supervisor, exact address, lat/lng, map_url
- `internal_notes`
- Signed URLs, attachment paths
- PDF actor identifiers (`exported_by`, `ip_hash`, `user_agent_hash`)
- Document hashes

Allowed geographic granularity: `city_name` only.
Monetary metrics are grouped by `currency_code`; never summed across
currencies.

## 5. Execution site privacy

- Coordinates, street address, supervisor name/phone, and access notes
  are visible **only** to the contract parties (provider staff +
  invited client) and to admins for support.
- Public/embed surfaces and analytics receive only `city_name`.
- `set_contract_execution_site` validates ownership before writing.

## 6. Lead privacy

- `prepare_contract_prefill_from_lead` returns prefill data **only** to
  staff of the business owning the lead.
- `link_lead_to_contract` writes a row in `lead_contract_links` and
  appends to the audit log; the lead's PII is never copied into
  analytics tables.
- Analytics surface lead → contract conversion **counts only**.

## 7. PDF export history privacy

- `record_contract_pdf_export` accepts only `contract_id`, `source`,
  `locale`. All other metadata is server-resolved.
- `list_contract_pdf_exports` returns `exported_at`,
  `contract_number`, `document_hash_prefix`, `source`, `locale`. It
  never returns `exported_by`, `email`, `ip_hash`, or `user_agent_hash`.
- `admin_list_contract_pdf_exports` adds aggregate counters only.
- Privacy guard: `ContractPdfExportHistory.privacy.test.tsx`.

## 8. Autosave whitelist

`update_contract_draft_autosave` accepts only the following fields and
rejects anything else server-side:

- `title`, `description`, `notes`
- `start_date`, `end_date`
- `currency_code`, `vat_inclusive`
- `payment_terms`, `delivery_terms`, `warranty_terms`
- `boq_draft` (line items shape; trigger still recomputes totals on
  commit)
- `execution_site_draft` (no PII validated separately)

Status, signatures, approvals, template snapshot, document hash,
amendments, and `business_id` are **never** writable via autosave.

## 9. Clone exclusions

`clone_contract_as_draft` strips:

- Client identity (`client_user_id`, `client_email`, `client_phone`,
  `client_name`, supervisor fields)
- All signatures, approvals, and approval timestamps
- `document_hash`, signed PDF artifacts
- `contract_pdf_exports` history rows
- `contract_amendments` rows
- `lead_contract_links`
- Internal notes

It preserves: template snapshot + version, BOQ line items, pricing
method choices, VAT flag, currency, generic terms, execution-site
template fields (without coordinates/addresses).
