# Database Deprecation Candidates — Phase C5A Product Decision Pack

_Docs-only output of `PHASE C5A` (2026-06). No database change, no schema
modification, no source code change has been performed for this pack. All
items below are tracked for product / technical sign-off before any future
rename or drop._

## 1. Phase C4 snapshot (recap)

Live counters captured during `PHASE C4 DATABASE DEPRECATION INVENTORY`
against the production `public` schema:

| Object class | Count |
|---|---:|
| Tables (`public`) | 301 |
| Views (`public`) | 12 |
| Materialized views | 0 |
| Functions / RPCs (`public`) | 542 |
| Triggers (`public`, user) | 330 |
| RLS policies (`public`) | 857 |
| Indexes (`public`) | 1,199 |
| Enums (`public`) | 47 |
| Storage buckets | 16 |
| Cron jobs | 17 |
| Edge functions (deployed) | 79 |

Outcome:

- **No `DROP CANDIDATE — SAFE AFTER BACKUP`** identified.
- **No `ARCHIVE THEN DROP CANDIDATE`** identified.
- Every name-flagged object (`legacy`, `migration`, `cleanup`, `backfill`,
  `_v2`, `placeholder`, …) retains either active client/edge references,
  RLS policies, triggers, cron usage, or audit-history responsibilities.
- All DB changes are **deferred** pending product sign-off (items in §2)
  and a follow-up second scan (`DB-C5-02`).

## 2. Items requiring product / technical decision

| Object | Current decision | Why flagged | Evidence | Product / technical question | Proposed next action |
|---|---|---|---|---|---|
| `public.get_placeholder_dashboard_stats()` | `NEEDS PRODUCT DECISION` | Function name contains `placeholder` — suggests interim wiring. | 2 source references; no cron binding observed. | Is this interim and must be replaced before the next milestone, or has it become the accepted production source? If it stays, should it be renamed to a non-`placeholder` identifier to reduce confusion? | Confirm with product owner. If kept → schedule rename via `ALTER FUNCTION … RENAME TO …` in C5B with a thin SQL shim that keeps the old name dispatching to the new one for one release. |
| `public.get_placeholder_owner_report()` | `NEEDS PRODUCT DECISION` | Same shape as above. | 2 source references; no cron binding observed. | Same as above. | Same as above. |
| `public.sync_primary_address_to_legacy()` | `NEEDS SECOND SCAN` | Function name contains `legacy`; 0 client / 0 edge source references; 1 migration reference. | Likely attached as a trigger (address sync). | Is the function currently bound to a trigger? Which table/event invokes it? Is the `legacy` suffix required for backward compatibility, or can it be renamed without consumer impact? | Run `pg_trigger` attachment scan (read-only). Document the answer in this file before any rename. Tracked as `DB-C5-02`. |

The three items are the **only** DB objects that the C4 scan moved out of
`KEEP — *`. They MUST NOT be renamed, replaced, or dropped until both the
question above is answered and the C5B/C5C/C5D gates pass.

## 3. Do-not-touch list (confirmed in C4)

The following objects MUST remain untouched until a stronger evidence pack
overrides this list. They appear because of name shape or because Knip-style
heuristics flag them, not because they are unused:

### Views (public contract)

- `businesses_public`
- `business_branches_public`
- `brands_public`
- `business_qa_public`
- `private_sectors_public`
- `provider_landing_settings_public`
- `reviews_public`
- `category_public_counts`
- `contract_template_versions_public`
- `contract_amendment_approvals_safe`
- `contract_amendment_audit_safe`
- `v_contract_attachments_unparsed`
- _every other `*_public` view_

### Compatibility / migration / audit tables

- `taxonomy_legacy_mappings`
- `legacy_contract_normalization_log`
- `migration_alerts_sent`
- `migration_alert_config`
- `cron_run_log`
- `phone_otps`
- `auth_temporary_login_codes`
- `auth_rate_limits`
- `password_reset_log`
- `security_audit_log`
- `access_violation_log`
- _all other `*_audit_log` / `*_audit` tables (business / brand / contract /
  amendment / enrichment / site / sector / system / branch)_

### Credits / financial / membership

- `provider_lead_credit_transactions`
- _all membership ledgers, payment intents, webhook events, upgrade audit
  and rejection tables_

### Contract history

- `contract_versions`
- `contract_amendments`
- `contract_amendment_audit`
- `contract_template_versions`
- `contract_template_snapshots`
- `contract_template_review_events`
- `contract_pdf_exports`
- `contract_pdf_analysis_log`

### Storage buckets (all 16)

`blog-images`, `brand-assets`, `business-assets`, `business-documents`,
`chat-attachments`, `client-site-images`, `contract-attachments`,
`ownership-claim-proofs`, `portfolio-images`, `project-images`,
`provider-lead-documents`, `qitaat-images`, `quote-request-files`,
`rental-images`, `showcase`, `work-order-files`. Empty buckets are kept
because they map to active product surfaces awaiting first uploads.

## 4. Phase C5 plan (documented only — NOT executed)

| Phase | Scope | Allowed | Forbidden | Rollback |
|---|---|---|---|---|
| **C5A** (this doc) | Decision pack + do-not-touch + backlog | Markdown only | Any DB / code change | `git revert` of this doc |
| **C5B** | After product sign-off: per-object `ALTER … RENAME TO _deprecated_<YYYYMM>_<name>` with pre-export `COPY` to `/mnt/documents/`. | One migration per rename; idempotent | `DROP`, data delete, RLS change, schema reshape | `ALTER … RENAME TO <original_name>` |
| **C5C** | Observe ≥ 1 full release. Watch `postgres_logs`, `function_edge_logs`, `analytics_query` for any reference to the deprecated names. | Monitoring only | Schema / data change | n/a |
| **C5D** | `DROP <object>` only after C5C reports zero runtime references AND backup is confirmed restorable. | One migration per drop | Mass drops; cross-object drops in one migration | Restore from the C5B `COPY` export |

No phase past C5A may begin without an explicit product sign-off recorded
against the relevant backlog entry below.

## 5. Backlog entries (Phase C5 follow-up work)

| ID | Owner | Title | Blocker? | Status |
|---|---|---|---|---|
| `DB-C5-01` | Product | Decide future of `get_placeholder_dashboard_stats()` and `get_placeholder_owner_report()`: replace, rename, or accept as production source. | No | Open |
| `DB-C5-02` | Backend | Read-only `pg_trigger` scan to identify the trigger(s) attached to `sync_primary_address_to_legacy()`; record consumer surface and confirm whether the `legacy` suffix is still load-bearing. | No | Open |
| `DB-C5-03` | Backend / DevEx | Create a reusable DB deprecation dashboard / query pack (object inventory + dependency probes + log search) so future audits do not re-derive the queries from scratch. | No | Open |
| `DB-C5-04` | Backend / Product | Define and publish the backup → rename → observe → drop policy (timing, who approves, what evidence is required, rollback drill cadence). | No | Open |

None of the above are release blockers. They unlock Phase C5B and beyond
but do not affect the current production build.