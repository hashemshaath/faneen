# RFQ Brand Model Audit — RFQ-BRAND-MODEL-AUDIT-1

Status: **Audit / design only.** No schema, RLS, service, or UI changes.
Owner: Brands Governance track. Blocks: `RFQ-BRAND-PICKER-1`.

---

## Part A — Current data model

### Customer-facing RFQ surfaces

| Table | Has items? | Brand column? | Notes |
|-------|------------|---------------|-------|
| `quote_requests` | **No item table** — single `project_description` blob | None | Customer free-text RFQ. Brand intent today is only expressible in `metadata` jsonb or prose. |
| `quote_request_files` | n/a (attachments) | None | Reference drawings/spec sheets. |
| `quote_request_leads`, `quote_request_events`, `quote_request_lead_events` | n/a (workflow + lead routing) | None | Lead distribution; brand filtering not modelled. |
| `rfq_requests` | **Header-only** (`title`, `description`, `budget_min/max`) | None | Cross-industry buyer RFQ; quotes attached as `rfq_quotes` (single amount). No line items. |
| `rfq_quotes` | One row per provider response | None | Pure price/delivery/message — no per-item or per-brand data. |

### Procurement (provider-side) surfaces

| Table | Items model | Brand column? |
|-------|-------------|---------------|
| `procurement_rfqs` | Header + `procurement_rfq_items` | None |
| `procurement_rfq_items` | `name`, `description`, `quantity`, `unit`, `target_price` | None |
| `procurement_supplier_quotes` | Header per supplier response | None |
| `procurement_supplier_quote_items` | `rfq_item_id` + price/quantity | None — no "proposed brand" field |
| `procurement_rfq_invitations` | Routing | n/a |

### Work orders / BOQ

| Table | Items model | Brand column? |
|-------|-------------|---------------|
| `work_order_boqs` | Header | None |
| `work_order_boq_items` | `item_type`, `title_ar/en`, `quantity`, `unit`, `unit_price`, `metadata` jsonb | None (could be stuffed in metadata, but not modelled) |

### Brand registry (reference)

| Table | Purpose |
|-------|---------|
| `brand_catalog` | Governed brand registry (status, verification, sector, country). |
| `brands_public` (view) | Approved-only public projection. |
| `business_service_brands` | Provider ↔ brand link, with `authorization_status` (verified/pending/rejected) per **service**. |

**Key finding:** there is currently *no* representation of brand intent on **any** RFQ, quote, BOQ, or supplier-quote row. Every brand-aware feature in this audit is greenfield.

---

## Part B — Business scenarios

| # | Scenario | Actor | Surface | Required expressiveness |
|---|----------|-------|---------|--------------------------|
| 1 | Customer requires **exact** brand (e.g. "Schüco only") | Customer | `quote_requests` | Brand + `preference = required` |
| 2 | Customer **prefers** brand but open to equivalent | Customer | `quote_requests` | Brand + `preference = preferred` |
| 3 | Customer accepts any of {A, B, C} | Customer | `quote_requests` | List of brand IDs + `preference = any_of` |
| 4 | BOQ line specifies a brand | Provider | `work_order_boq_items` | Brand per item |
| 5 | Supplier proposes an **equivalent** brand | Supplier | `procurement_supplier_quote_items` | `proposed_brand_id` + `is_equivalent` + justification |
| 6 | Procurement compares quotes across brands | Procurement | `procurement_rfq_items` + supplier quote items | Both sides item-level brand |
| 7 | Provider filters incoming opportunities by brand authorization | Provider | Leads / RFQ feed | Match `requested_brand_id` against `business_service_brands.authorization_status = 'verified'` |

Scenarios 4–7 require **item-level** brand. Scenarios 1–3 can live at RFQ header **or** item level. Scenario 5 specifically requires *two* brand fields per supplier-quote item (requested vs proposed).

---

## Part C — Option analysis

Scoring 1 (poor) – 5 (excellent).

Legend: Option A = RFQ header-level; Option B = customer RFQ item-level; Option C = BOQ item-level; Option D = procurement item-level; Option E = hybrid of A header + C + D with supplier `proposed_brand_id`.

| Option | Accuracy | Flexibility | Reporting | Procurement | Inventory-ready | Migration cost | Total |
|--------|---------:|------------:|----------:|------------:|----------------:|---------------:|------:|
| **A. RFQ-level brand** (`quote_requests.preferred_brand_id`) | 2 | 1 | 2 | 1 | 1 | **5** (1 col) | 12 |
| **B. RFQ item-level** (`quote_request_items.brand_id`) — requires new items table | 4 | 4 | 4 | 3 | 4 | 2 (new table + UI) | 21 |
| **C. BOQ item-level** (`work_order_boq_items.brand_id`) | 4 | 4 | 4 | 3 | 5 | 4 (1 col + UI) | 24 |
| **D. Procurement item-level** (`procurement_rfq_items.requested_brand_id` + `procurement_supplier_quote_items.proposed_brand_id`) | 5 | 5 | 5 | 5 | 5 | 3 (2 cols, 2 UIs) | 28 |
| **E. Hybrid** (header preference on customer RFQ + item-level on BOQ + item-level on procurement, supplier proposes equivalent) | 5 | 5 | 5 | 5 | 5 | 3 | **28** |

Option A is a tempting one-liner but collapses multi-line requests, blocks comparison, and breaks the moment a customer has more than one product type. Option E captures the real workflow without forcing a `quote_request_items` table that the rest of the product does not yet need.

---

## Part D — Recommendation

**Adopt Option E (Hybrid).**

Concretely, the future model adds:

1. **Customer RFQ header preference** on `quote_requests`:
   - `preferred_brand_ids uuid[]` (nullable; references `brand_catalog.id`)
   - `brand_preference_mode text check in ('required','preferred','any_of','none')` default `'none'`
   - `brand_notes text`
   *(Kept at header until/unless we introduce `quote_request_items`. Today the customer RFQ is single-scope, so header is sufficient.)*
2. **BOQ item-level brand** on `work_order_boq_items`:
   - `brand_id uuid` nullable; `brand_lock text check in ('exact','equivalent_allowed')` default `'equivalent_allowed'`.
3. **Procurement item-level brand** on `procurement_rfq_items`:
   - `requested_brand_id uuid`, `brand_lock text` (same enum).
4. **Supplier proposed brand** on `procurement_supplier_quote_items`:
   - `proposed_brand_id uuid`, `is_equivalent boolean default false`, `equivalence_notes text`.
5. **No new join tables.** Many-of relationships handled either by `preferred_brand_ids uuid[]` (customer) or by repeating items (procurement/BOQ).

### Rationale

- Matches the seven real scenarios with the fewest moving parts.
- Header preference on `quote_requests` avoids prematurely creating a `quote_request_items` table — the customer RFQ is intentionally a single description today.
- Item-level coverage on BOQ + procurement is where comparative pricing and substitution actually happen.
- Supplier `proposed_brand_id` enables real equivalence workflows without a separate "equivalent groups" table.
- All `brand_id` columns reference the same governed `brand_catalog` registry — no second source of truth.

### Future migration approach

1. **Additive only.** Every column is nullable with a safe default; nothing in existing reads breaks.
2. **Server validation triggers** (not CHECK on FKs to view) ensure referenced brands exist and are `status = 'approved'` at write time.
3. **Backfill is a no-op** — historic rows simply carry NULL/`'none'`.
4. **Cutover is per-surface**: ship customer header first, then BOQ, then procurement+supplier in one paired migration so quote items always have somewhere to put `proposed_brand_id`.

---

## Part E — Implementation blueprint for `RFQ-BRAND-PICKER-1`

**Do not implement in this phase.** This blueprint is the contract the next ticket must follow.

### Migration strategy (3 timestamped migrations)

1. `quote_requests` — add `preferred_brand_ids`, `brand_preference_mode`, `brand_notes`; trigger validates each id ∈ approved brands.
2. `work_order_boq_items` — add `brand_id`, `brand_lock`; same approval trigger.
3. `procurement_rfq_items` + `procurement_supplier_quote_items` — paired migration adding `requested_brand_id`/`brand_lock` and `proposed_brand_id`/`is_equivalent`/`equivalence_notes`; supplier trigger blocks `proposed_brand_id` when parent item's `brand_lock = 'exact'` and brands differ.

No RLS changes — new columns inherit the existing per-row policies on each table.

### Service wrappers (added to existing modules — no new module)

- `@/modules/brands/services/brandsService.ts` (already exists):
  - `listApprovedBrandsForPicker(filter)` — already exists as `listApprovedBrandsForProviderPicker`; reuse, do not duplicate.
  - `validateBrandIdsApproved(ids: string[]): Promise<{ valid: string[]; invalid: string[] }>` — new, client-side preflight only; server trigger is the source of truth.
- `@/modules/procurement/services/...` and `@/modules/workOrders/services/...` set the new columns through existing item upsert wrappers. **No direct supabase calls in pages.**

### UI integration points

| Surface | Component | Behaviour |
|---------|-----------|-----------|
| Customer RFQ form | `<BrandPreferencePicker>` | Multi-select from `brands_public`, mode selector (required/preferred/any_of/none), free-text notes. |
| BOQ item editor | `<BrandPicker variant="single">` inside each row | Single brand + lock toggle. |
| Procurement RFQ item editor | same `<BrandPicker>` + lock toggle | |
| Supplier quote item editor | `<BrandPicker>` with `mode="propose"` | Shows requested brand read-only; allows proposing equivalent if lock ≠ `exact`. |
| Provider opportunity feed | filter chip "matches my authorized brands" | Joins requested brand against `business_service_brands` (verified). |

All pickers source brands via `brandsService` only — never direct supabase calls from pages. Picker enforces no-popup rule (inline combobox).

### Validation rules

- All `*_brand_id` columns nullable; non-null values must be `approved` brands at write time (trigger).
- `brand_preference_mode = 'required' OR 'any_of'` requires non-empty `preferred_brand_ids`.
- `brand_preference_mode = 'preferred'` requires exactly one id.
- Supplier `proposed_brand_id` blocked when parent item is `brand_lock = 'exact'` AND `proposed_brand_id <> requested_brand_id`.

### Permissions

- Customers may set their own `quote_requests` brand columns (existing RLS already gates this).
- Providers may set BOQ / procurement brand columns within their own business (existing RLS).
- Suppliers may set `proposed_brand_id` only on their own quote items (existing RLS).
- No new role, no new policy.

### Tests required for `RFQ-BRAND-PICKER-1`

- Migration smoke: every new column nullable, defaults safe, trigger blocks unapproved brand ids.
- Service: `validateBrandIdsApproved` returns correct split.
- UI: each picker uses `brandsService` (no `supabase.from`), no popups, RTL labels present.
- Equivalence: supplier cannot propose different brand when lock = `exact`.
- Provider feed: opportunity matching uses verified `business_service_brands` only.

---

## Part F — Out of scope for this audit

- No schema migration files.
- No RLS edits.
- No new tables or columns.
- No picker UI.
- No edits to existing RFQ / BOQ / procurement code paths.

Approval of this document unblocks `RFQ-BRAND-PICKER-1`.