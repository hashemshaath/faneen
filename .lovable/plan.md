
# RFQ → Award → Sample → Contract — Audit & Design Plan

Read-only audit of the current RFQ stack, gap analysis vs the target professional procurement journey, and a 5-phase execution plan. Arabic-first labels, no URL changes.

---

## 1. Current State Inventory

### Pages & routes
- `src/pages/dashboard/DashboardRfqHub.tsx` — tabbed shell (Requests / Inbox).
- `src/pages/dashboard/DashboardRfq.tsx` (180 lines) — customer list of their RFQs.
- `src/pages/dashboard/DashboardRfqInbox.tsx` (451 lines) — provider inbox of matched RFQs.
- `src/pages/dashboard/DashboardRfqDetail.tsx` (318 lines) — RFQ detail (client view).
- `src/pages/dashboard/QuoteRequestDetails.tsx` (519 lines) — admin/ops view.
- Public intake: `/quote` (see `docs/rfq-conversion-audit.md`) — 3-step wizard (sector+service → project → contact).

### Domain modules
- `src/modules/quotes/*` — submit/list/read services for the intake side.
- `src/modules/leads/*` — provider-side matching (`quote_request_leads`), reveal-contact, notifications, `adminConvertLeadToContract`, `lifecycle`, `conversion`.
- `src/modules/opportunities/*` — the *newer* layer that treats an RFQ as an "opportunity":
  - `bids/` — `opportunity_bids` (offer submission, statuses `draft|submitted|under_review|shortlisted|revised|withdrawn|rejected|awarded`, `awardOpportunityBid`).
  - `contracts/` — `convert_awarded_bid_to_contract` RPC + `getContractForOpportunity`.
  - `timeline/`, `status.ts`, `analytics/`.
- Legacy `src/modules/rfq/services.ts` — separate `rfq_requests` / `rfq_quotes` tables (parallel small marketplace flow, not the primary path).

### DB tables (public schema)
- `quote_requests` (41 cols) — the RFQ itself. Status text: currently only `new`/`matched` present. Award fields already exist: `awarded_bid_id`, `awarded_provider_business_id`, `awarded_at`, `awarded_by`, `award_status`. Rich intake fields (`preferred_brand_ids`, `brand_preference_mode`, `location_id`, `site_id`, `project_id`, `taxonomy_category_id`, `ref_id`).
- `quote_request_leads` (19 cols) — provider assignment/matching row, `contact_revealed`, `match_score`, statuses text (currently `new`).
- `quote_request_files` — attachments (name/path/size/type, no captions/categories).
- `quote_request_events` / `quote_request_lead_events` — audit trail (event_type + jsonb metadata).
- `opportunity_bids` (18 cols) — offer with price/currency/duration/scope/terms/warranty/status/expires_at/attachments_count. **No line-item breakdown, no payment_terms/validity/materials columns.**
- `contracts` (52 cols) — full contract model, already links via `opportunity_id`, `opportunity_bid_id`, `source_lead_id`. Enum `contract_status`: `draft, pending_approval, active, completed, cancelled, disputed`.

### RLS (already in place)
- `quote_requests`: owner select/update-when-open, admin ALL, anyone can INSERT.
- `quote_request_leads`: provider select/update own, admin ALL.
- `opportunity_bids`: submitter (provider) insert when assigned, client select on owned opp, staff select, admin ALL.
- `contracts`: parties select/update, clients & providers can INSERT, admin ALL.

### What already exists in code
- Award action: `awardOpportunityBid` + RPC + client UI (`ClientBidsSection`) with "تعميد العرض" CTA and winner lock-out.
- Contract conversion bridge: `convert_awarded_bid_to_contract` RPC + `OpportunityContractSection`.
- Timeline component: `OpportunityTimeline` (audit-log driven).
- Basic bid submission from provider side (`ProviderBidSection`).
- Attachment upload on RFQ intake.
- Notifications: `createNotification` hooks fire on award; lead-side notification services exist.

### What is missing or thin
- No **side-by-side comparison table** across bids (only vertical list of cards).
- No **weighted scoring / shortlist toggle** in UI (status `shortlisted` exists but no CTA writes it).
- No **line-item price breakdown** on bids (`opportunity_bids` has only `price_amount` scalar).
- No **payment terms / validity_until / materials-brand / delivery structured fields** on bids.
- No **clarification Q&A thread** attached to an RFQ (messages module is generic conversations; not wired here).
- No **revision request** action ("طلب تعديل العرض") — bid has `revised` status but no request/response flow.
- No **sample track** at all — no `rfq_samples` table, no UI, no status gate before contract conversion.
- No **polite auto-decline** notification to losing bidders on award.
- No **multi-step RFQ wizard** on the customer *dashboard* creation path (public `/quote` is 3-step; dashboard-side creation is thin).
- Notification coverage: award notifies winner, but transitions (shortlisted, revision requested, sample requested/approved, converted) are not systematically fanned out.

---

## 2. Gap Analysis vs Target Journey

| # | Stage | State | Evidence |
|---|---|---|---|
| a | Multi-step RFQ wizard (sector→site→measurements/drawings→specs→timeline/warranty→review) | PARTIAL | `/quote` 3-step exists; sections for measurements/warranty/conditions absent. `quote_requests` schema supports it (site_id, project_id, brand prefs). |
| b | Structured provider offer (price lines, delivery, warranty, materials brand, payment terms, validity, notes) | PARTIAL | `opportunity_bids` has price/duration/warranty/terms/scope only. No line items, no `payment_terms`, no `valid_until`, no `materials_brand_ids`. |
| c | Offer clarification Q&A on RFQ | MISSING | No table, no UI. Generic `conversations/messages` not linked to `opportunity_bids`. |
| d | Side-by-side comparison + scoring + shortlist | MISSING (list only) | `ClientBidsSection` renders vertical cards; no matrix, no `weightedScore`, no shortlist toggle. |
| e | Quotation revision request | PARTIAL | `revised` status enum exists; no "Request revision" action or reason column. |
| f | Award with reason + winner notify + polite decline losers + RFQ close | PARTIAL | Award works; winner toast + notification. No `award_reason`, no bulk decline notifications, RFQ status not auto-closed. |
| g | Sample track (request → sent → received → approved/rejected + photos/notes, gate before contract) | MISSING | No `rfq_samples` table, no UI, `convert_awarded_bid_to_contract` runs immediately. |
| h | Convert-to-contract prefill from RFQ + winning bid | EXISTS (basic) | RPC `convert_awarded_bid_to_contract` + `OpportunityContractSection`. Prefill breadth (attachments carry-over, brand prefs → contract, warranty text) not verified — likely partial. |
| i | Journey timeline / audit trail on RFQ page | EXISTS | `OpportunityTimeline` reads `quote_request_events`. |
| j | Notifications at each transition | PARTIAL | Wired on submit/award; not on shortlist/revise/sample/decline/convert. |

---

## 3. Design Proposal

### 3.1 Status machines

**quote_requests.status** (text, keep column, extend allowed values):

```text
draft → published → receiving_bids → under_review
   → (shortlisted) → awarded → sample_pending → sample_approved → contract_drafted → contract_active
   ↘ cancelled            ↘ sample_rejected → (back to under_review or cancelled)
```

Skip path (no sample required): `awarded → contract_drafted → contract_active`.

**opportunity_bids.status** (already text, extend enum values used):

```text
draft → submitted → under_review → shortlisted → revision_requested
   → revised → awarded
   ↘ rejected / withdrawn / expired
```

**rfq_samples.status** (NEW): `requested → shipped → received → approved | rejected`.

### 3.2 Minimal schema changes (require separate migration approval)

All flagged — none applied in this pass.

```sql
-- Bid: structured commercial fields (nullable, backward-compatible)
ALTER TABLE public.opportunity_bids
  ADD COLUMN payment_terms text,
  ADD COLUMN valid_until timestamptz,
  ADD COLUMN materials_brand_ids uuid[],
  ADD COLUMN vat_inclusive boolean NOT NULL DEFAULT true,
  ADD COLUMN price_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{label, qty, unit, unit_price, total}]
  ADD COLUMN revision_of uuid REFERENCES public.opportunity_bids(id),
  ADD COLUMN revision_reason text,
  ADD COLUMN decline_reason text,
  ADD COLUMN shortlisted_at timestamptz;

-- RFQ: award reason + close timestamps + sample requirement flag
ALTER TABLE public.quote_requests
  ADD COLUMN award_reason text,
  ADD COLUMN closed_at timestamptz,
  ADD COLUMN requires_sample boolean NOT NULL DEFAULT false;

-- Clarification thread (one thread per RFQ; messages inside)
CREATE TABLE public.rfq_clarifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  bid_id uuid REFERENCES public.opportunity_bids(id) ON DELETE CASCADE, -- nullable = general
  author_user_id uuid NOT NULL,
  author_role text NOT NULL,          -- 'client' | 'provider' | 'admin'
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sample track
CREATE TABLE public.rfq_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  bid_id uuid NOT NULL REFERENCES public.opportunity_bids(id) ON DELETE CASCADE,
  provider_business_id uuid,
  status text NOT NULL DEFAULT 'requested',    -- requested|shipped|received|approved|rejected
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  shipped_at timestamptz, tracking_ref text,
  received_at timestamptz,
  decision_at timestamptz, decision_by uuid, decision_notes text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- + standard GRANT block + RLS (client of RFQ, awarded provider, admin) + updated_at trigger.
```

All new tables follow the mandatory GRANT-then-RLS-then-POLICY structure.

### 3.3 UI proposal

Customer journey (`DashboardRfqDetail`):
- Hero header shows status chip + progress stepper (استلام العروض → مقارنة → ترسية → عيّنة → عقد).
- **BidComparisonTable** component (sticky first column: criterion; columns: each bid; rows: السعر الإجمالي, بنود السعر, مدة التنفيذ, الضمان, شروط الدفع, صلاحية العرض, الماركات/الخامات, التقييم, ملاحظات; footer row: نقاط الترجيح weightedScore + actions "ضم للقائمة القصيرة / طلب تعديل / ترسية").
- **AwardDialog** inline card (no popup per project rule → inline expand): reason field + checkbox "طلب عيّنة قبل العقد".
- **SampleTracker** panel appears when `requires_sample` — timeline (طلب → إرسال → استلام → اعتماد/رفض) + photo upload + decision notes.
- **ConvertToContractCard** — visible only when award done AND (sample not required OR sample approved). Single CTA "تحويل إلى عقد" → routes into existing contract flow with prefilled draft.
- **ClarificationThread** — inline chat card scoped per bid (tab per bid) using `rfq_clarifications`.

Provider journey (`DashboardRfqInbox` + bid detail):
- Structured **BidSubmitForm** with line-items repeater, payment terms select, validity date, materials-brand multi-select, warranty text.
- **RevisionRequestBanner** when `status = revision_requested` with client reason; "تقديم عرض معدّل" opens form pre-seeded from previous bid, creates new row with `revision_of` FK.
- Polite decline notification on losing (auto-generated).
- Sample-request card mirroring customer tracker for the awarded provider.

Shared timeline: extend `OpportunityTimeline` with new event types (`bid.shortlisted`, `bid.revision_requested`, `bid.revised`, `bid.rejected`, `rfq.award_reason_set`, `sample.requested/shipped/received/approved/rejected`, `contract.drafted_from_rfq`).

### 3.4 Notifications matrix (in-app + email where available)

| Trigger | To | Channel |
|---|---|---|
| Bid submitted | RFQ owner | in-app |
| Shortlisted | provider | in-app |
| Revision requested | provider | in-app + email |
| Bid revised | client | in-app |
| Awarded | winner | in-app + email |
| Awarded — losers | each losing provider | in-app (polite decline) |
| Sample requested / decision | provider / client | in-app |
| Converted to contract | both parties | in-app + email |

---

## 4. Phased Plan

Each phase is independently smoke-testable. **Schema-change phases are called out and require separate migration approval.**

### R1 — Comparison + Award polish  *(no schema change)*
- New `BidComparisonTable` component (Arabic-first, RTL, sticky criterion column).
- Add "قائمة قصيرة" toggle (writes existing `shortlisted` status via existing update path).
- `AwardDialog` inline card with `award_reason` — will store in event metadata for now (real column added in R2 if approved).
- Polite-decline notification fan-out on award (loop over non-winning bids in existing award mutation).
- Extend `OpportunityTimeline` event labels for shortlist/decline.
- Verify: build + existing opportunities tests still green; manual click-through in `DashboardRfqDetail`.

### R2 — Convert-to-contract bridge hardening  *(schema: small ALTERs)*
Requires migration:
- `ALTER quote_requests ADD award_reason, closed_at, requires_sample`.
- `ALTER opportunity_bids ADD payment_terms, valid_until, materials_brand_ids, vat_inclusive, price_breakdown, shortlisted_at, decline_reason`.
- Extend `convert_awarded_bid_to_contract` RPC to prefill new fields into `contracts` (payment terms → `terms_ar`, materials brand → contract line items snapshot, warranty carry-over, attachments cloned).
- UI: `ConvertToContractCard` gate uses `requires_sample`.

### R3 — Sample track  *(schema: new table)*
Requires migration:
- `CREATE TABLE rfq_samples` + GRANT + RLS + trigger.
- Storage folder for sample photos (`rfq-samples/`).
- Service module `src/modules/rfq-samples/` (types + services barrel).
- UI: `SampleTracker` (customer + provider mirror).
- Convert-to-contract CTA disabled until `sample.status = 'approved'` when `requires_sample = true`.

### R4 — Clarifications Q&A + revision requests  *(schema: new table + bid FK)*
Requires migration:
- `CREATE TABLE rfq_clarifications` + GRANT + RLS + trigger.
- `ALTER opportunity_bids ADD revision_of uuid, revision_reason text`.
- UI: `ClarificationThread` (per-bid tabs), `RequestRevisionDialog` inline.
- Revised bid = new row with `revision_of` FK, superseding parent visually.

### R5 — Wizard polish + notification completeness  *(no schema change)*
- Rebuild dashboard-side RFQ create as 6-step wizard mirroring `/quote` but richer (measurements/drawings/warranty/conditions).
- Fill every notification matrix row above; write `notification_event_templates` entries.
- Ops/admin dashboards: add filters (status ∈ new values), analytics for time-to-award, time-to-contract, sample approval rate.
- Backfill Arabic labels & bilingual tests.

---

## Risks & Assumptions
- **Assumption**: primary path is `quote_requests` + `opportunity_bids`; legacy `rfq_requests`/`rfq_quotes` stays untouched.
- **Assumption**: existing RPC `convert_awarded_bid_to_contract` can be extended without breaking Phase-7 tests.
- Award/status extensions are additive text values — no enum ALTER pain since these columns are `text`, not enums.
- `contract_status` enum is unchanged.
- No route/URL changes anywhere.
