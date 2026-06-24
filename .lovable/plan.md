## Scope

This is a large, multi-surface refactor of the contract creation flow covering terminology, party model, site-selection bug, central helper, RPC validation, and tests. Before I touch code, I need to confirm scope and gather facts so I don't break the provider/admin flows or contract lifecycle.

## What I need to investigate first (read-only)

1. The exact source of the `حدد المنشأة أولاً` message — likely in a site picker component used inside `DashboardContracts.tsx` or a shared SitePicker. Grep `حدد المنشأة` across `src/`.
2. All "العميل" labels in the contract create UI (`DashboardContracts.tsx`, `WorkspaceContractsTab`, `ClientPicker`, `SelfClientCard`, project/site-triggered create flows).
3. Existing central helpers: `useContractListDerivations`, `contract-completeness`, `contract-pricing`, any `create_contract` RPC, and `ensure-business`.
4. All contract-creation entry points: dashboard, workspace tab, project detail, site detail, quote/RFQ — to see how many flows exist and whether they already share a service.

## Proposed implementation (phased)

### Phase A — Site picker fix (highest user impact, smallest blast radius)
- Locate the `حدد المنشأة أولاً` guard in the site selector and gate it on `isClientOnlyAccount`. For client-only accounts, query `client_sites` by `auth.uid()` (via existing `siteFilesService`/`client_sites` query) instead of `businessId`.
- Replace empty-state copy with `لا توجد مواقع مرتبطة بحسابك. أضف موقعًا أولًا.`
- Provider/admin path unchanged.

### Phase B — Party terminology (client-only UI only)
- In `DashboardContracts.tsx` + `SelfClientCard.tsx`, swap "العميل (أنت)" → "الطرف الثاني (أنت)" / "صاحب الحساب", and any "اختر العميل / البحث عن عميل / إضافة عميل" hidden labels behind `isClientOnlyAccount`.
- Provider/admin keep `اختيار الطرف الثاني` (renamed from "اختر العميل" globally per spec — confirm with user before doing global rename, see Questions).

### Phase C — Central party helper
- New `src/lib/contracts/resolveContractPartiesAndEligibility.ts` returning the shape in the spec (`firstPartyBusinessId`, `secondPartyUserId`, `executionSiteId`, `sectorId`, `templateId`, `isEligible`, `missingRequirements[]`).
- Refactor `DashboardContracts.tsx` and `WorkspaceContractsTab` create paths to consume it. Project/site detail create buttons already delegate to these pages, so no duplication added.

### Phase D — Sector → Provider → Site ordering
- Add a small stepper state on the create panel so the user picks sector first, then provider (for non-client flows), then site, then template. For client-only accounts where provider is fixed by the linked project, sector and provider are pre-filled and locked.
- Template list filtered by `sectorId/categoryId` using existing `contract_templates` taxonomy.

### Phase E — Tests
- New `src/__tests__/contractPartyModelAndCreationFlow.test.ts` covering all 18 acceptance points via source-level regex on the refactored files (matching the existing test style in `contractCreationClientAutoFill.test.ts`).
- Update legacy tests only if labels they assert change.

### Out of scope (explicitly excluded per spec)
- No DB / RLS / RPC / migrations / edge changes.
- No `service_role` in frontend.
- No lifecycle / signature / approval flow changes.
- No new client creation.

## Risk

This refactor touches a hot, well-tested area (~10+ existing contract test files). Each phase will be verified with `tsc` + targeted tests before moving on; full suite at the end.

## Questions before I start

I need 2 confirmations to avoid wasted work — see follow-up.
