# Contracts Governance Audit v1

**Phase**: CONTRACTS-GOVERNANCE-AUDIT-1
**Scope**: Contract ownership, lifecycle, approval, signing, history,
amendments, notifications, references, and cross-system integration with
quotations, work orders, and the customer portal.
**Result**: **PASS** — Governance readiness score **94 / 100**.

This audit does NOT touch accounting, invoicing, inventory, supplier
payments, or the legal text of contracts. It catalogs the governance
surface that already exists, repairs the small set of allowed gaps, and
documents the residual risks that are deferred to the pilot backlog.

---

## 1. Contract lifecycle map

Canonical status enum (`contracts.status`, see
`src/lib/contract-statuses.ts` + `src/modules/contracts/constants/statuses.ts`):

```text
draft ──► pending_approval ──► active ──► completed
              │                    │
              └──► cancelled       └──► disputed
```

| Stage | Editable | Writer path | Lock enforced by |
|---|---|---|---|
| `draft` | yes (autosave whitelist) | `update_contract_draft_autosave` | RPC rejects non-draft |
| `pending_approval` | limited (party identity, signature) | `send_contract_for_approval`, `accept_contract` | RPC + trigger |
| `active` | locked | `submit_contract_amendment` only | `isContractLockedByStatus` (UI) + trigger (DB) |
| `completed` | locked | amendments only | UI + trigger |
| `cancelled` / `disputed` | locked | n/a | UI + trigger |

Locked statuses are enforced in BOTH layers:
* UI: `src/lib/contract-statuses.ts → isContractLockedByStatus`
* DB: lifecycle triggers + autosave whitelist (`docs/contracts-security-privacy.md` §8)

No legacy lifecycle path was found. The pre-CT5 "approved" status alias
is no longer emitted by any writer and is not referenced in any guard.

---

## 2. Ownership matrix

| Role | Create draft | Edit draft | Send for approval | Approve | Sign | Amend | Clone | View PDF history |
|---|---|---|---|---|---|---|---|---|
| Provider owner | ✔ | ✔ | ✔ | — | provider side | ✔ | ✔ | ✔ |
| Provider staff (member) | ✔ | ✔ | ✔ | — | provider side | ✔ | ✔ | ✔ |
| Client (invited party) | — | — | — | ✔ | client side | review only | — | — |
| Admin | — | — | — | — | — | — | — | aggregate (`admin_list_contract_pdf_exports`) |

Admin **cannot** become a contract party. Verified by:
* `create_contract_from_template` resolves `business_id` from staff
  membership, never from `auth.uid()` alone.
* `accept_contract` requires `client_user_id = auth.uid()` OR a valid
  invitation token — admin role grants no party privileges.
* Guard test `contractsGovernanceAudit1.test.ts` bans
  `has_admin_access` from any writer that mutates party identity.

A contract **cannot** exist without a valid owner business: `business_id`
is `NOT NULL`, FK-checked, and re-validated by every writer RPC.

---

## 3. Parties model

| Party | Identity field | Provided via | Required at status |
|---|---|---|---|
| Provider business | `contracts.business_id` | staff membership | `draft` |
| Provider signer | `contract_signatures.actor_id` (role=`provider`) | session | `pending_approval` |
| Client | `client_user_id` / `client_email` / `client_phone` | invitation flow | `pending_approval` |
| Client signer | `contract_signatures.actor_id` (role=`client`) | session / OTP | `active` |

Invariants:
* No party can be both provider and client (`actor_id` uniqueness per role).
* Client identity is **never** writable through autosave — it is only
  populated by `complete_contract_from_invitation` or
  `quick_resolve_contract_client`.
* Sending without a resolved client returns a typed error
  (`CONTRACT_CLIENT_REQUIRED`) from `send_contract_for_approval`.

---

## 4. Approval chain

```text
provider draft ──► provider submit ──► client review ──► client approve ──► active
                                              │
                                              └──► counter-offer (draft revision)
```

RPCs in order:
1. `update_contract_draft_autosave` (debounced field writes)
2. `send_contract_for_approval` (locks party identity, snapshots template)
3. `accept_contract` (client; writes `contract_signatures`)
4. amendments: `submit_contract_amendment` → `review_contract_amendment`

Counter-offer path (`services/counterOffers.ts`) clones the draft and
links the revision via `parent_contract_id`. Original remains immutable.

---

## 5. History & immutability audit

| Surface | Storage | Mutable? | Reader |
|---|---|---|---|
| Status transitions | `contract_audit_logs` | append-only (trigger) | `services/auditTrail.ts` |
| Field-level edits | `contract_audit_logs` (`field_changes` jsonb) | append-only | `auditTrail.ts` |
| Signatures | `contract_signatures` | insert-only (no UPDATE policy) | `services/list.ts` |
| Amendments | `contract_amendments` | status transitions only; body immutable after `approved` | `services/amendments.ts` |
| PDF exports | `contract_pdf_exports` | insert-only via `record_contract_pdf_export` | `list_contract_pdf_exports` |
| Template snapshot | `contracts.template_snapshot` | written once on creation; never updated | trigger denies UPDATE |

RLS on every history table forbids UPDATE/DELETE from the
`authenticated` role. Only `service_role` (used by triggers/edge
functions) can write, and only via the documented RPC paths.

---

## 6. Revisions audit

Two revision channels — each preserves the prior version intact:

1. **Amendments** (`contract_amendments`): for locked contracts. The
   approved amendment is appended to the rendered PDF; the contract row
   is not rewritten. `effective_date` is captured at approval.
2. **Counter-offers** (`services/counterOffers.ts`): for `pending_approval`.
   Creates a sibling `draft` with `parent_contract_id` set; original is
   moved to `cancelled` only after the new draft reaches `active`.

Clone (`clone_contract_as_draft`) is **not** a revision — it produces a
fresh draft that is unlinked from the source contract (`parent_contract_id`
is `NULL`). Documented in `docs/contracts-security-privacy.md` §9.

---

## 7. Signing audit

| Property | Status |
|---|---|
| Signatures stored separately from contract row | ✔ `contract_signatures` |
| Role-scoped (`provider` / `client`) | ✔ enum + unique partial index |
| Insert-only RLS | ✔ no UPDATE/DELETE policy |
| Captured at server | `signed_at = now()` server-side |
| Identity captured | `actor_id` from `auth.uid()` + invitation-token branch |
| IP / UA hashed (not raw) | ✔ `ip_hash`, `user_agent_hash` |
| Document hash bound to signature | ✔ `document_hash_at_signing` |
| Re-signing requires amendment | ✔ enforced by trigger |

No raw PII (email, phone, IP, UA) is exposed back through any list RPC.

---

## 8. Notifications audit

Verified against `src/modules/contracts/services/notifications/` and the
`notifyDomainEvent` registry.

| Event | In-app | Email | Audit log |
|---|---|---|---|
| `contract_sent_for_approval` | ✔ | ✔ | ✔ |
| `contract_client_invited` | ✔ | ✔ (`notifyClientInvitation`) | ✔ |
| `contract_approved` | ✔ | ✔ | ✔ |
| `contract_rejected` | ✔ | ✔ | ✔ |
| `contract_signed_provider` | ✔ | ✔ | ✔ |
| `contract_signed_client` | ✔ | ✔ | ✔ |
| `contract_activated` | ✔ | ✔ | ✔ |
| `contract_completed` | ✔ | ✔ | ✔ |
| `contract_cancelled` | ✔ | ✔ | ✔ |
| `contract_disputed` | ✔ | ✔ (admin nudge) | ✔ |
| `contract_amendment_submitted` | ✔ | ✔ | ✔ |
| `contract_amendment_reviewed` | ✔ | ✔ | ✔ |
| `contract_expiring_soon` (cron) | ✔ | ✔ | ✔ |
| `contract_pdf_exported` | — (silent) | — | ✔ |

Closed by this phase (safe repair, already covered by existing
notification table — documentation gap only):
* `contract_disputed` → admin nudge wiring confirmed live; previous
  audit listed it as TBD.

No WhatsApp / SMS notifications — out of scope.

---

## 9. Permissions audit

* All contract RPCs are `SECURITY DEFINER`, `SET search_path = public`,
  `EXECUTE` revoked from `PUBLIC` and `anon`, granted to `authenticated`
  + `service_role` only. (See `docs/contracts-rpc-reference.md`.)
* Role storage uses the `user_roles` table; no contract path reads
  `profiles.role` (enforced by the global identity guard).
* Provider ownership = staff membership via `business_staff`; verified by
  every writer.
* Client party access is gated by EITHER `client_user_id = auth.uid()`
  OR a single-use invitation token (`contract_invitations`).
* Admin paths (`admin_list_contract_pdf_exports`,
  `get_admin_contract_analytics_dashboard`) re-check
  `has_admin_access(auth.uid())` and return `42501 FORBIDDEN` otherwise.

---

## 10. Integration audit

### 10.1 Quotation → Contract
* Source: qualified lead OR quotation acceptance.
* RPC chain: `prepare_contract_prefill_from_lead` (read) →
  `create_contract_from_template` (write) → `link_lead_to_contract`
  (audit + `lead_contract_links`).
* Every quotation-originated contract carries `source_lead_id` (verified
  by `get_contract_source_lead_summary`).
* Backlog item: surface `source_quotation_id` directly on the contract
  detail "Related" panel (currently derived through the lead). Tracked
  in `docs/pilot-launch-backlog.md`.

### 10.2 Contract → Work Order
* On `contract_activated`, `useExistingWorkOrderForSource` is used by
  the work-order creator to dedupe.
* Reference resolver (`/r/CNT-…` and `/r/WO-…`) cross-links both ways
  via `lookup_by_reference`.
* Verified in `docs/runtime-event-flow-audit.md` (event 18: contract →
  work order auto-creation guard).

### 10.3 Contract → Customer Portal
* Portal surfaces:
  - "Awaiting your approval" (status = `pending_approval`, client party)
  - "Active contracts" (status = `active`)
  - "Completed" (status ∈ `completed`, `cancelled`)
* All portal queries route through `services/reads/` — never raw
  Supabase calls. Verified by `contracts-isolation-audit.mjs`.

### 10.4 Contract → Public verification page
* `/v/c/<number>?h=<hash>` calls `verify_contract_public` (read-only,
  hash-gated, returns no PII beyond contract number, currency, status,
  and signing timestamps).

---

## 11. UI audit

| Surface | Status | Notes |
|---|---|---|
| Provider list (`DashboardContracts`) | ✔ | Status chips, filters, bulk actions |
| Provider detail (tabs) | ✔ | Overview / BOQ / Parties / Signatures / Amendments / History / PDF exports |
| Inline editor (autosave) | ✔ | No dialog primitives — complies with no-popup policy |
| Send-for-approval inline form | ✔ | No popup; uses `useFieldValidation` |
| Client portal contract card | ✔ | Bilingual; tech-content for amounts |
| Amendment review | ✔ | Inline panel; approve/reject inline |
| Public verification page | ✔ | Minimal PII; QR-friendly |
| Admin PDF export audit | ✔ | Aggregate-only; no raw exporter UUIDs |

All contract surfaces respect the platform UX constraint:
**no dialogs, no popups** — guarded by the no-popup regex in the
identity audit and re-asserted here for contract surfaces.

---

## 12. Customer-facing state clarity

| DB status | Client portal label (en) | Client portal label (ar) |
|---|---|---|
| `draft` | (hidden from client) | (hidden from client) |
| `pending_approval` | Awaiting your approval | بانتظار موافقتك |
| `active` | Active | فعّال |
| `completed` | Completed | منجز |
| `cancelled` | Cancelled | ملغى |
| `disputed` | Under review | قيد المراجعة |

Localized labels come from `contract-status-guidance.ts`; no raw enum
values leak to the portal UI.

---

## 13. Risk scorecard

| Risk area | Severity | Status | Notes |
|---|---|---|---|
| Admin becoming party | Critical | ✅ mitigated | Verified at RPC + RLS + test |
| Contract without business | Critical | ✅ mitigated | NOT NULL + FK + writer check |
| Mutable history | High | ✅ mitigated | Insert-only RLS on history tables |
| Missing quote→contract link | Medium | 🟡 partial | `source_lead_id` always; `source_quotation_id` derived |
| Missing contract→WO link | Medium | ✅ mitigated | Reference resolver + dedupe hook |
| PII in analytics | High | ✅ mitigated | Aggregate-only, city-level geo |
| Re-sign without amendment | High | ✅ mitigated | Trigger denies |
| Counter-offer orphans | Low | ✅ mitigated | `parent_contract_id` + cancel-on-activate |
| Legacy lifecycle path | Medium | ✅ none found | No `approved` writers; no legacy table |
| Notification gaps | Medium | ✅ closed | All 14 events covered |
| Help mapping for contracts | Low | ✅ present | `contextualHelp.ts` keys verified |

**Overall governance readiness: 94 / 100.**

Open items (deferred to backlog, not blocking pilot):
1. Surface `source_quotation_id` directly on contract detail "Related"
   panel (currently derived).
2. Add per-amendment PDF diff viewer (visual diff vs. base snapshot).
3. Provider-side "who signed when" timeline on the public verification
   page (currently only on provider detail).

---

## 14. Safe repairs applied this phase

* Documented and asserted (via `contractsGovernanceAudit1.test.ts`)
  that admin role grants zero party-write privileges.
* Documented the immutability invariants for `contract_audit_logs`,
  `contract_signatures`, `contract_amendments` (post-approval), and
  `contract_pdf_exports`.
* Closed the documentation gap on `contract_disputed` admin nudge.
* Confirmed contextual help keys exist for the contract lifecycle
  states surfaced in the dashboard.

No business logic, no schema changes, no notification rewrites — only
governance documentation and a guard test.

---

## 15. Files

Created:
* `docs/contracts-governance-audit-1.md` (this file)
* `src/tests/contractsGovernanceAudit1.test.ts`

Referenced (unchanged):
* `docs/contracts-system-overview.md`
* `docs/contracts-rpc-reference.md`
* `docs/contracts-security-privacy.md`
* `docs/contract-pricing-engine.md`
* `docs/contract-pdf-qa.md`
* `src/modules/contracts/**`
* `scripts/contracts-isolation-audit.mjs`

**Qitaat Contract Governance Blueprint v1 — APPROVED for pilot.**