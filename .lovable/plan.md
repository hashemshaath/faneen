# CONTRACT PARTY FLOW + ACTIVITY SELECTION — Plan

This task is an audit + targeted UX/logic fix across the contract creation surface for three account types (provider/business owner, personal client, admin). It spans `DashboardContracts.tsx` (3187 lines, at line cap 3192), `WorkspaceContractsTab.tsx`, the party model helpers, and the activity (sector/category) source. **No DB/RLS/RPC/lifecycle changes** unless the audit surfaces a real gap — I will report it, not silently change it.

## Phase 1 — Read-only audit (no code changes)

Investigate and document the **current** behavior for each account type:

1. `DashboardContracts.tsx` — read the create panel sections: how `firstParty` / `secondParty` are derived, where `selectedClient` / `guestClient` / provider come from, whether a provider picker exists for provider accounts, and whether the activity/sector source is wired.
2. `WorkspaceContractsTab.tsx` — confirm provider derivation (`linkedProviderBusinessId ?? businessId`) and that ClientPicker is hidden.
3. `contractParties.ts`, `sendForReviewEligibility.ts`, `ContractReviewSummary.tsx`, `ContractCreationOrderNotices.tsx`, `WorkTypeSection.tsx`, `TemplateSelectionSection.tsx` — confirm where "activity / sector / specialty" is read from and whether it currently falls back to project category, business primary activity, or is left blank.
4. RPC `create_contract_from_workspace_as_client` — confirm provider derivation already handled (Phase tests show it is).
5. Identify the **3 concrete gaps** behind the user's complaint:
   - (a) Provider account is still shown a provider/client picker for itself.
   - (b) Activity/sector source has no visible UI — user can't tell where it comes from or pick one when missing.
   - (c) "أطراف العقد" header is not labeled by role — labels say "العميل" generically.

## Phase 2 — Targeted UX fixes (frontend only)

Frontend-only changes; no payload/RPC/lifecycle edits.

1. **New presentational component** `src/components/contracts/dashboard/create/ContractPartiesPanel.tsx`
   - Renders a single `أطراف العقد / Contract parties` section with two labeled rows (الطرف الأول / الطرف الثاني) chosen by `accountKind`: `'provider' | 'client' | 'admin'`.
   - Provider: first party = current business (name + ref + city if available); never opens a provider picker.
   - Client: first party = linked provider business from project; if missing, shows the existing "اربط المشروع بمزود خدمة" message.
   - Admin: shows both pickers explicitly labeled "الطرف الأول" and "الطرف الثاني".
   - Pure props, no Supabase calls.

2. **New presentational component** `src/components/contracts/dashboard/create/ContractActivitySection.tsx`
   - Shows the resolved activity with its **source badge** (project / business / manual).
   - When no source, renders a `Select` over an already-loaded taxonomy categories list (reuse existing `useTaxonomyCategories` / `contract_taxonomy_categories` hook — read-only check; no new query if one exists).
   - Emits `onChange(categoryId)` upward; `DashboardContracts.tsx` stores it in existing `form.category_id` (or adds local state if not present — frontend only).

3. **`DashboardContracts.tsx`** — minimal wiring:
   - Compute `accountKind` from existing `isAdmin / isProvider / isClientOnlyAccount`.
   - Replace the existing first-party / second-party notice blocks with `<ContractPartiesPanel />`.
   - Insert `<ContractActivitySection />` above the template picker.
   - Stay under the 3192 line cap by extracting the replaced blocks (net delta should be negative).

4. **`WorkspaceContractsTab.tsx`** — no behavior change; confirm copy already matches new labels.

5. **Activity resolution helper** `src/modules/contracts/services/resolveContractActivity.ts` (new, pure):
   - Inputs: `{ projectCategoryId?, quoteRequestCategoryId?, businessPrimaryCategoryId?, manualCategoryId? }`.
   - Returns `{ categoryId, source: 'project'|'quote'|'business'|'manual'|null }`.
   - Pure TS, fully unit-testable.

## Phase 3 — Tests

New test file `src/__tests__/contractPartyFlowAndActivitySelection.test.ts` with source-level regex guards and pure-function tests covering the 15 acceptance points listed by the user (provider-never-picks-self, client-never-picks-self, activity source precedence, manual fallback shown when missing, no service_role / `any` / hex / hardcoded IDs).

Pure unit tests for `resolveContractActivity`.

## Phase 4 — Verification

1. `tsgo --noEmit`
2. Targeted vitest: new test + `contractPartyModelPhaseB/D/E/F/G`, `contractCreationClientAutoFill`, `enableContractCreationFromLinkedProject`, `dashboard-contracts-installments-badge-bilingual`.
3. Full vitest suite only if production code changed (it will), then report 0 failures.

## Out of scope (will not change)

- No DB / RLS / RPC / migrations / edge functions.
- No contract lifecycle, signature, acceptance, PDF, QR, send flow.
- No new client / business creation.
- No relabeling of "العميل ↔ الطرف الأول/الثاني" in legal contract model — only display labels in the create UI.

## Risk

`DashboardContracts.tsx` is at line cap. All net-new render must be offset by extracting the blocks it replaces — the new panel + activity section absorb existing JSX, so net delta is expected ≤ 0. If it goes over, I extract additional helpers before declaring PASS.

## Deliverable

A `CONTRACT PARTY FLOW + ACTIVITY SELECTION REPORT` answering all 20 numbered questions, ending with PASS or NEEDS FIX based on full-suite results.
