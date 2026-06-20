## Phase 5 — Bids / Offers (Opportunities System)

### Decision: create new `opportunity_bids` table (NOT reuse `rfq_quotes`)

Audit results:
- `rfq_quotes` is **empty** (0 rows). `rfq_requests` is also empty.
- `rfq_quotes.rfq_id` FK → `rfq_requests(id)`, a parallel/abandoned system. Repointing it to `quote_requests` would either (a) break the FK semantically or (b) require a polymorphic column — both fragile.
- Naming collision: "rfq_quotes" reads as the old «RFQ» surface, exactly the legacy term Phase 2 renamed away from.
- A clean `opportunity_bids` table maps 1:1 to the new domain, has zero migration cost (no rows to move), and keeps `rfq_*` untouched for legacy compatibility.

### Migration (`opportunity_bids`)

Columns: `id`, `opportunity_id` → `quote_requests(id) ON DELETE CASCADE`, `assignment_id` → `quote_request_leads(id) ON DELETE SET NULL` (nullable), `provider_business_id` → `businesses(id)`, `submitted_by` → `auth.users(id)`, `price_amount numeric`, `currency text default 'SAR'`, `duration_value int`, `duration_unit text` (day/week/month), `scope_summary text`, `terms text`, `warranty text`, `status text` (constrained), `submitted_at timestamptz`, `expires_at timestamptz`, `attachments_count int default 0`, `created_at`, `updated_at`.

Status CHECK: `draft|submitted|under_review|shortlisted|revised|withdrawn|rejected|awarded`.

Indexes: `(opportunity_id)`, `(provider_business_id)`, `(submitted_by)`, `(status)`.

GRANTS: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`; `ALL` to `service_role`. No `anon`.

RLS policies:
- **SELECT (provider)**: `submitted_by = auth.uid()` OR provider is staff on `provider_business_id`.
- **SELECT (client)**: `auth.uid() = (SELECT user_id FROM quote_requests WHERE id = opportunity_id)`.
- **SELECT (admin)**: `has_role(auth.uid(),'admin')`.
- **INSERT**: `submitted_by = auth.uid()` AND a matching `quote_request_leads` row exists for the opportunity+provider (assignment-gated).
- **UPDATE**: `submitted_by = auth.uid()` AND `status IN ('draft','submitted','revised')` (no edits after shortlist/award); admin always.
- **DELETE**: admin only.

`updated_at` trigger via existing `public.update_updated_at_column()`.

### Domain layer (`src/modules/opportunities/bids/`)
- `types.ts` — `OpportunityBid`, `OpportunityBidStatus` (literal union matching CHECK).
- `services.ts` — `listOpportunityBidsForClient(opportunityId)`, `listMySubmittedBidsForProvider(userId)`, `listOpportunityBidsForOpportunity(opportunityId)` (admin/server-side RLS-respecting), `submitOpportunityBid(input)`, `updateDraftOpportunityBid(id, patch)`, `withdrawOpportunityBid(id)`. All real Supabase calls — no mocks.

### UI (minimal, additive — no route changes)
- **Provider** (`DashboardRfqDetail.tsx` / lead details surface): new `<ProviderBidSection opportunityId assignmentId />` — shows current bid or `تقديم عرض` button → inline form (price, duration, scope, terms, warranty) → submit sets status `submitted`. No popup.
- **Client** (existing opportunity detail page): new `<ClientBidsSection opportunityId />` — list of bids (price, provider name, status, submitted_at) or empty state «لا توجد عروض بعد». No award action.
- **Admin** (admin opportunity detail): same `<ClientBidsSection>` reused (RLS filters), no award action.

Bilingual labels reused from `opportunityLabels.ts` (`submitBid`, `submittedBids`).

### Notifications
Phase 5A scope: insert a `notifications` row to the opportunity owner on bid `submitted` via `submitOpportunityBid` service. Idempotency: unique partial index on `(notifications.user_id, type, related_id)` already covers most cases; pass `related_id = bid.id` with `type='opportunity_bid_submitted'`. Full notification template UI deferred to Phase 5B (documented).

### Tests
- `opportunitiesPhase5BidModelMigration.test.ts` — static SQL guards (FKs, status CHECK, indexes, RLS enabled, no `provider_leads` reference, `rfq_quotes` untouched).
- `opportunitiesPhase5BidServices.test.ts` — type/import guards (no `any`, services exist, use central status map).
- `opportunitiesPhase5BidUi.test.tsx` — provider section renders «تقديم عرض», client section renders bids list / empty state, no award button rendered, canonical routes still mounted.

### Out of scope (explicitly NOT touched)
DB enums on `quote_requests`, matching, credits/reveal, awarding, contract conversion, route deletions, `rfq_quotes` table.

### Execution order
1. Create migration (this requires user approval).
2. After approval + types regen → add domain `types.ts` + `services.ts`.
3. Add UI sections + wire into existing detail pages.
4. Add 3 test files.
5. Run `tsc` + targeted vitest.

Proceeding with step 1 (migration) on approval.
