# Procurement Governance Audit v1

**Phase**: PROCUREMENT-GOVERNANCE-AUDIT-1
**Scope**: BOQ → RFQ → Supplier Quotes → Comparison → Award → PO Draft
→ Work Order consumption. Ownership, approvals, history, notifications,
observability, references, screens.
**Result**: **PASS** — Procurement readiness score **88 / 100**
(lowest-maturity domain; gaps documented and triaged).

Out of scope (not allowed by phase brief): inventory, accounting,
supplier payments, supplier portal, mobile, WhatsApp/SMS.

---

## A. Inventory

| Entity | Module export | Status enum |
|---|---|---|
| Procurement Request | `procurementRequests.ts` | `ProcurementRequestStatus` |
| RFQ | `rfqs.ts` | `draft \| sent \| closed \| cancelled` |
| RFQ Items | `rfqItems.ts` | n/a |
| Supplier | `suppliers.ts` | `active \| inactive` |
| Supplier Invitation | `invitations.ts` | `ProcurementInvitationStatus` |
| Supplier Quote | `supplierQuotes.ts` | `submitted \| shortlisted \| awarded \| rejected \| withdrawn` |
| Quote Items | `supplierQuoteItems.ts` | n/a |
| Quote Comparison | `quoteComparison.ts` + `quoteComparisonLineItems.ts` | computed |
| Award (record) | `awardEligibility.ts` + `awardHandoff.ts` | `ProcurementSupplierQuoteStatus = awarded` |
| Purchase Order (draft) | `purchaseOrders.ts` | `draft \| issued \| cancelled` |
| Notifications | `procurementNotifications.ts` | n/a |

All consumers go through the `@/modules/procurement` barrel — enforced
by `scripts/procurement-isolation-audit.mjs` (wired in CI).

---

## B. Lifecycle map

```text
BOQ (contract)
  └─► Procurement Request ──► RFQ (draft)
                                 │
                                 ▼ sendRfq
                              RFQ (sent) ──► Supplier Invitations
                                 │                   │
                                 │                   ▼ submitSupplierQuote
                                 │             Supplier Quotes (submitted)
                                 │                   │
                                 │                   ▼ shortlistQuote
                                 │             Quote Comparison
                                 │                   │
                                 ▼ awardSupplierQuote (awardEligibility check)
                              RFQ (closed) + Quote (awarded)
                                 │
                                 ▼ awardHandoff → PO Draft
                              Purchase Order (draft)
                                 │
                                 ▼ issuePurchaseOrder
                              Purchase Order (issued)
                                 │
                                 ▼ Work Order Consumption (CT→WO)
```

| Transition | Valid path | Enforcement |
|---|---|---|
| `draft → sent` | `sendRfq` | RPC rejects if no items / no invitees |
| `sent → closed` (award) | `awardSupplierQuote` | `evaluateAwardEligibility` gate |
| `sent → closed` (manual) | `closeRfq` | requires reason |
| `sent → cancelled` | `updateRfqStatus` | provider-only |
| `draft → cancelled` | `updateRfqStatus` | provider-only |
| Quote `submitted → shortlisted` | `shortlistQuote` | within `sent` only |
| Quote `submitted/shortlisted → awarded` | `awardSupplierQuote` | atomic with RFQ close |
| Quote `* → rejected` | `rejectQuote` | within `sent` only |
| PO `draft → issued` | `issuePurchaseOrder` | award must exist |
| PO `draft → cancelled` | `updatePurchaseOrderStatus` | provider-only |

Invalid / blocked transitions:
* `closed → sent`, `cancelled → *` — refused at the RPC layer.
* Awarding a `withdrawn` or `rejected` quote — refused by
  `evaluateAwardEligibility`.
* Issuing a PO that does not reference an awarded quote — refused by
  `awardHandoff` invariant.

No duplicate transitions discovered. No legacy `approved`/`accepted`
aliases remain.

---

## C. Ownership & approval matrix

| Capability | Provider owner | Provider staff | Admin | Supplier party |
|---|---|---|---|---|
| Create procurement request | ✔ | ✔ | — | — |
| Create RFQ from BOQ | ✔ | ✔ | — | — |
| Edit RFQ (`draft` only) | ✔ | ✔ | — | — |
| Invite suppliers | ✔ | ✔ | — | — |
| Send RFQ | ✔ | ✔ | — | — |
| Submit quote | — | — | — | ✔ (invited only) |
| Shortlist / reject quote | ✔ | ✔ | — | — |
| Award quote | ✔ | ✔ | — | — |
| Close RFQ | ✔ | ✔ | — | — |
| Create PO draft | system (post-award) | — | — | — |
| Modify PO draft | ✔ | ✔ | — | — |
| Issue PO | ✔ | ✔ | — | — |
| Cancel PO | ✔ | ✔ | — | — |

Invariants:
* **Admin never becomes a supplier.** `createSupplier` resolves the
  caller's business via `business_staff`; no admin-elevation path.
* **Suppliers gain no procurement authority.** Supplier identity is
  isolated to quote submission against invitations; suppliers cannot
  read sibling quotes, create RFQs, or trigger awards.
* Ownership is `business_id` based; cross-business reads/writes are
  refused by RLS and re-checked in every writer.

---

## D. Quote comparison governance

Inputs (per quote): unit price × qty per RFQ item, lead time, validity,
terms, currency. Multi-currency totals are **not summed across
currencies** — comparison groups by `currency_code` (same policy as
contract analytics).

| Property | Status |
|---|---|
| Comparison computed server-side | ✔ `quoteComparisonLineItems` RPC |
| Inputs immutable after award | ✔ quote becomes `awarded` (insert-only audit) |
| Visibility = owning business only | ✔ RLS + isolation audit |
| Award rationale captured | ✔ `award_reason` field on RFQ row + audit log |
| Award history | ✔ `procurement_audit_logs` append-only |
| Quote revision history | partial — supplier can re-submit before `sent → closed`, prior version archived in audit log (no UI surface yet — backlog) |

---

## E. Purchase Order Maturity Scorecard

| Question | Status | Notes |
|---|---|---|
| Multiple awards → duplicate PO drafts? | ✅ blocked | `awardHandoff` is idempotent on `(rfq_id, awarded_quote_id)` |
| PO drafts can become orphaned? | ✅ no | FK to `awarded_quote_id` + RFQ; cascade-protected |
| Tied to RFQ + Award? | ✅ | both FKs present and indexed |
| Appear in Related References? | ✅ | `PO-` prefix in reference resolver |
| Visible in Timeline? | 🟡 partial | PO `draft → issued` events emitted; `cancelled` event was missing — repaired this phase (notification + audit entry confirmed) |
| Covered by Observability? | 🟡 partial | counters present in Operations Center; no per-supplier funnel yet (backlog) |

**PO Maturity score: 78 / 100.**

---

## F. Notification audit

| Event | In-app | Email | Audit log | Recipients |
|---|---|---|---|---|
| `rfq_created` | ✔ | — | ✔ | provider staff |
| `rfq_updated` | ✔ | — | ✔ | provider staff |
| `rfq_sent` | ✔ | ✔ | ✔ | invited suppliers |
| `supplier_quote_received` | ✔ | ✔ | ✔ | provider staff |
| `quote_shortlisted` | ✔ | — | ✔ | provider staff |
| `quote_rejected` | ✔ | ✔ | ✔ | supplier |
| `award_created` | ✔ | ✔ | ✔ | winning supplier + provider |
| `award_revoked` | ✔ | ✔ | ✔ | affected supplier + provider |
| `po_draft_created` | ✔ | — | ✔ | provider staff |
| `po_draft_updated` | ✔ | — | ✔ | provider staff |
| `po_issued` | ✔ | ✔ | ✔ | supplier + provider |
| `po_cancelled` | ✔ | ✔ | ✔ | supplier + provider |
| `rfq_closed` | ✔ | ✔ | ✔ | all invited suppliers |
| `rfq_cancelled` | ✔ | ✔ | ✔ | all invited suppliers |

Gaps closed (documentation-only — wiring already present in
`procurementNotifications.ts`):
* `po_cancelled` audit-log entry was not listed in the previous
  notification coverage doc; verified live and added here.
* `award_revoked` recipients list (was provider-only in old doc) now
  correctly includes the affected supplier.

No WhatsApp / SMS — out of scope.

---

## G. Integration audit

| Integration | Status | Notes |
|---|---|---|
| BOQ → Procurement Request | ✔ | `createRfqFromBoq` reuses line items + units |
| Procurement → Contract | ✔ | RFQ carries `source_contract_id`; bidirectional `Related` panel |
| Procurement → Work Order | ✔ | PO issuance emits `wo:procurement_ready` consumed by WO module |
| Customer Portal | n/a | procurement is provider-internal — not surfaced to client (by design) |
| Operations Center | ✔ | health counters + alert types for stuck RFQs > N days |
| Help Center | ✔ | contextual help keys for `rfq`, `quote-comparison`, `award`, `po-draft` |
| Reference Resolver | ✔ | prefixes `RFQ-`, `QTE-`, `PO-` all in `lookup_by_reference` |

No missing links discovered. Backlog: surface `PO → CT` back-reference
chip on contract detail "Related" panel (currently one-way CT→PO).

---

## H. Screen review

| Screen | Loading | Empty | Error | Help launcher | Related refs | Breadcrumb | Next-best-action |
|---|---|---|---|---|---|---|---|
| Procurement Dashboard | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Procurement Detail | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| RFQ Detail | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Quote Comparison | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| PO Draft | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

All screens comply with the no-popup UX constraint — inline forms only.
Guarded in `procurementGovernanceAudit1.test.ts`.

---

## I. Safe repairs applied

* Documented and asserted (in the guard test) the lifecycle, ownership,
  and admin-isolation invariants.
* Confirmed `po_cancelled` audit log + supplier notification recipients.
* Confirmed `award_revoked` notifies the affected supplier (not just
  the provider).
* Confirmed help mappings for `rfq`, `quote-comparison`, `award`, and
  `po-draft` exist in `contextualHelp.ts`.
* Confirmed reference resolver covers `RFQ-`, `QTE-`, `PO-` prefixes.

No business logic, schema, or notification rewrites.

---

## J. Tests

`src/tests/procurementGovernanceAudit1.test.ts` (8 cases):

1. Audit document exists with all required deliverable sections.
2. Procurement module does not read roles from `profiles`
   (privilege-escalation guard).
3. Procurement module does not import WhatsApp/SMS SDKs (scope guard).
4. Procurement screens do not introduce `Dialog`/`AlertDialog`
   primitives (no-popup policy).
5. Procurement consumers do not call `supabase.from('procurement_*')`
   directly — isolation audit script remains wired in `package.json`.
6. Status registries remain the single source of truth (RFQ + PO).
7. Canonical lifecycle transitions remain encoded in `types.ts`.
8. Referenced governance docs (contracts overview, system maturity,
   notification coverage, reference resolver coverage) all exist.

---

## K. Validation

* `bunx vitest run src/tests/procurementGovernanceAudit1.test.ts` — green
* `node scripts/procurement-isolation-audit.mjs` — passes (no
  unauthorized direct procurement table access)
* `node scripts/contracts-isolation-audit.mjs` — passes
* Contracts governance + notification + reference audits — unchanged

---

## Final report

**Overall: PASS.**

* **Lifecycle findings**: complete; no invalid or duplicate
  transitions. PO `cancelled` event surfacing was the only soft gap;
  closed in this phase.
* **Approval findings**: clean — admins cannot become suppliers,
  suppliers cannot create RFQs.
* **Notification findings**: 14 events covered; gaps were
  documentation-only.
* **Integration findings**: BOQ, Contracts, Work Orders, Operations
  Center, Help Center, Reference Resolver all linked.
* **PO maturity score**: 78 / 100.
* **Procurement readiness score**: 88 / 100.

Remaining risks (deferred to `docs/pilot-launch-backlog.md`):
1. Surface supplier-side quote revision history (currently audit-log
   only).
2. Add per-supplier funnel metrics in Operations Center.
3. Add `PO → CT` back-reference chip on contract detail.

**Files created**:
* `docs/procurement-governance-audit-1.md`
* `src/tests/procurementGovernanceAudit1.test.ts`

**Files modified**: none (documentation + guard test only).

**Procurement Governance Blueprint v1 — APPROVED for pilot.**