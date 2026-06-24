## CONTRACT CREATION PURPOSE-FIRST FLOW — Plan

Large frontend-only refactor of the create-contract wizard. Reorders steps to `purpose → parties → template → details/terms → review`, adds template filtering by purpose, and locks the rules with three new test files. No DB/RLS/RPC/lifecycle/payload changes.

### Phase 1 — Read-only audit
Read in parallel: `src/pages/dashboard/DashboardContracts.tsx`, `ContractCreateStepper.tsx`, `ContractPartiesPanel.tsx`, `WorkTypeSection.tsx`, `TemplateSelectionSection.tsx`, `ContractReviewSummary.tsx`, `ContractDetailsSection.tsx`, `ContractTermsSection.tsx`, `resolveContractActivity.ts`, `contractParties.ts`, `contractSummary.ts`, and existing tests. Identify:
- Current step order in `ContractCreateStepper` (today: `client → site → work → template → details → pricing → review`).
- Where activity/work-type is collected and whether template list is filtered by it.
- Current `DashboardContracts.tsx` line count vs cap (3192).

### Phase 2 — New helpers (pure, testable)
1. `src/modules/contracts/services/resolveContractPurpose.ts`
   Returns `{ purposeId, purposeLabelAr, purposeLabelEn, source: 'project'|'quote'|'business'|'manual'|null, sectorId, serviceTypeId, isManual, confidence }`. Precedence: project → quote/opportunity → business → manual. Wraps `resolveContractActivity` for the categoryId; adds sector/serviceType/labels.
2. `src/modules/contracts/services/filterContractTemplates.ts`
   Pure function: `filterContractTemplates(templates, { sectorId, serviceTypeId, purposeId })` → `{ specialized: T[], general: T[] }`. Excludes non-published / inactive. Specialized first (sector + serviceType match), general fallback only when no specialized match. Annotates each row with `matchReason`.

### Phase 3 — Wizard reorder (frontend only)
1. In `ContractCreateStepper`, change `CreateStepKey` order to: `purpose → parties → template → details → pricing → review`. Update labels (ar/en).
2. In `DashboardContracts.tsx`:
   - Add a `purpose` step container that renders `WorkTypeSection` + the manual category picker from `ContractActivitySection`, and shows resolved source badge from `resolveContractPurpose`.
   - Move `ContractPartiesPanel` and client picker into a `parties` step that is only visible after purpose is chosen.
   - Pipe `{ sectorId, serviceTypeId, purposeId }` from purpose into `TemplateSelectionSection` via the new `filterContractTemplates` helper; render specialized first, general as labeled fallback, hide unpublished.
   - Keep `ContractReviewSummary` last and add purpose + template-kind (specialized/general) to the summary rendering only.
3. Extract any new JSX into small components under `src/components/contracts/dashboard/create/` to keep `DashboardContracts.tsx` under the 3192 line cap. Candidates: `ContractPurposeStep.tsx`, `ContractPartiesStep.tsx`, `ContractTemplateStep.tsx`.

### Phase 4 — Party rules enforcement (UI only, no payload change)
- Provider/owner: first party auto, no picker; second party = ClientPicker / guest (existing).
- Personal client: first party = project-linked provider (existing message when missing); second party auto-filled (already implemented), no self picker.
- Admin: both pickers visible with explicit "الطرف الأول / الثاني" labels.
- Invite-entity CTA: only render when a picker is shown AND no candidates exist; deferred CTA (no new DB).

### Phase 5 — Tests (new)
1. `src/__tests__/contractCreationPurposeFirstFlow.test.tsx` — RTL test that mounts `DashboardContracts` route, asserts step order and party-step gating, provider/client/admin role-aware rendering.
2. `src/__tests__/contractTemplateFilteringByPurpose.test.ts` — pure tests for `filterContractTemplates` (6 assertions from spec).
3. `src/__tests__/contractPurposeResolution.test.ts` — pure tests for `resolveContractPurpose` precedence (6 assertions).

Source-level regex guards in (1) for: stepper order array, no provider picker for provider, no client picker for client, unpublished templates excluded.

### Phase 6 — Verification
1. `tsgo --noEmit`
2. `bunx vitest run` on the three new files + existing `contractPartyFlowAndActivitySelection`, `contractPartyModelPhaseB..G`, `contractCreationClientAutoFill`.
3. Verify `DashboardContracts.tsx` line count ≤ 3192; extract more if needed.
4. Full suite if time permits.

### Out of scope (forbidden)
DB, RLS, RPC, migrations, edge functions, lifecycle, signatures, acceptance, payload schema, service_role, hardcoded defaults, `any` / suppressions / skipped tests.

### Deliverable
`CONTRACT CREATION PURPOSE-FIRST FLOW REPORT` answering all 19 questions, ending with PASS or NEEDS FIX.
