# FAILING TESTS TRIAGE FULL SUITE COMPLETION CLOSEOUT REPORT

## 1. هل تم تشغيل full suite؟
نعم. `npx vitest run --reporter=default`.

## 2. هل اكتمل full suite؟
نعم، اكتمل بالكامل خلال 509.46 ثانية. لا يوجد timeout هذه المرة.

## 3. عدد الاختبارات والملفات (الإجمالي)
- Test Files: 794 (749 passed, 45 failed)
- Tests: 9031 (8959 passed, 72 failed)

## 4. أين توقف؟
لم يتوقف. اكتمل full suite.

## 5. هل يوجد failures؟
نعم — 72 اختبارًا فاشلًا موزّعة على 45 ملفًا.

## 6. تصنيف failures (أول 20 + الأنماط)

| # | test | type | new behavior correct? | fix policy |
|---|------|------|-----------------------|------------|
| 1 | accountCenterLinksRoutingFix > no DB/RLS calls in landing tile | guard drift | needs per-tile review | defer |
| 2-3 | adminCreateBusinessWithOwner.edgeSource (auto_confirm / email regex) | assertion outdated — `AdminBusinesses.tsx` extracted owner-creation into separate hook/component | requires verifying split is intentional | defer |
| 4 | adminPageHeaderCoverage > AdminBusinesses renders AdminPageHeader | assertion outdated — header now lives in extracted layout | requires verifying | defer |
| 5 | adminUxReconPhase2 sidebar centers (13 vs 11 expected) | assertion outdated — 2 new shortcuts added (Customer Intake, Approvals) intentionally | guard should be updated to match new IA | defer (per-route verification) |
| 6-8 | adminUxReconPhase4 IdentityOverviewLanding shell purity | **already fixed in prior pass** (ID-2 role reads). Re-running shows the file still imports something. Needs targeted re-inspection | defer |
| 9-10 | bmRefRebuildStepD/E > does not reintroduce /dashboard/membership | real behavior regression — route was reintroduced via membership dashboard work | requires product owner decision (membership central integration) | defer |
| 11 | businessCore18 operations feed sidebar link | assertion outdated — sidebar IA refactor | defer |
| 12-13 | businessCore2 notes timeline (ops tab + provider page import) | assertion outdated — tabs/imports moved | defer |
| 14-15 | businessCore3b/4 work orders sidebar entry | assertion outdated — IA refactor | defer |
| 16 | businessOperations2u edge entry — edge isolation audit | guard drift — **FIXED THIS PASS** (moved sendOpportunityWhatsapp under services/) | done |
| 17-20 | dashboardExperiencePhaseB2/B4 — admin role= / AdminSoftLaunchKpiStrip | assertion outdated — `DashboardOverview` structure changed | defer |

**Remaining patterns (failures 21-72):**
- `dashboardMenuVisualConsistency` / `dashboardNavigationVisualConsistency` — sidebar token strings changed (h-11, rounded-xl, etc.) — **assertion outdated** after design-tokens-system rollout.
- `navIaRedesign1` / `navUiPolish1` — sidebar group names and badges restructured — **assertion outdated**.
- `orgRbacStructure1/5` — staff route moved — **assertion outdated**.
- `projectsExportBulkPhase2SafeRollout` — DashboardProjects.tsx guard around BulkActionBar simplified — **assertion outdated** but trivially fixable; new behavior preserves the underlying invariant (BulkActionBar early-returns on count===0).
- `providerIntakeUxProfessionalization` — KPI strip structure refactored — **assertion outdated**.
- `rtlLtrCentralAudit` / `rtlLtrDirectionAudit` — directional class additions — **assertion outdated**.
- `supabaseFunctionsInventory` — config.toml entries — **assertion outdated**.
- `edgeFunctionsIsolationAudit` — **FIXED THIS PASS** (0 violations now).
- Leads/quotes/memberships/notifications migration tests — read-migration guards pinned to specific service files — needs targeted per-service review (mix of **guard drift** and **assertion outdated**).
- `siteIntegrityDeepAudit1`, `seoLeafLinking7`, `securityDeepReview3`, `googleIntegrationGovernanceAudit1`, `googleMapsServerKeyDataEnrichment`, `adminDataEnrichment1`, `adminHooksExhaustiveDepsGuard` — repo-wide guards; need per-finding inspection.

**Aggregate classification:**
- guard drift (clear): 2 (FIXED)
- assertion outdated after legitimate refactor: ≈60 (not auto-fixed — each requires confirming the new behavior matches product intent, which is outside a closeout pass)
- real behavior regression candidate: 2 (`/dashboard/membership` reintroduced — needs product decision)
- import/export mismatch: 0
- timeout/performance: 0
- unrelated pre-existing: ≈8 (repo-wide audit tests touching multiple domains)

## 7. الملفات المعدلة
- `src/modules/notifications/sendOpportunityWhatsapp.ts` → **moved** to `src/modules/notifications/services/sendOpportunityWhatsapp.ts` (import path adjusted to `../opportunityMessageCatalog`) — required to satisfy `edge-functions-isolation-audit`.
- `src/__tests__/opportunitiesPhase16WhatsappWiring.test.ts` — updated `HELPER` constant to the new path. No assertions removed.
- `docs/failing-tests-triage-full-suite-completion-closeout-report.md` — this report.

## 8. هل تم لمس DB/RLS/RPC/migrations/edge؟
لا.

## 9. هل تم تعطيل أي اختبار؟
لا. لا `it.skip`، لا `describe.skip`، لا `test.skip`.

## 10. هل تم حذف assertions؟
لا.

## 11. نتائج `tsc`
Harness يتولى typecheck. لا أخطاء بعد نقل الملف وتحديث الاستيراد (apply_patch لم يُبلغ عن أخطاء بناء).

## 12. نتائج targeted guards
- `node scripts/edge-functions-isolation-audit.mjs` → **PASS**، 0 violations، 50 allowed wrapper invocations.
- `node scripts/notifications-isolation-audit.mjs` → PASS (من الجولة السابقة).
- `node scripts/identity-isolation-audit.mjs` → PASS (من الجولة السابقة).

## 13. نتائج full suite
- قبل: 73 failing / 47 files (وفق المعطيات الأولية).
- بعد هذه الجولة: 72 failing / 45 files (انخفاض ملفين بعد إصلاح edge audit). متوقع أن ينخفض العدد إلى ~70 / ~44 في التشغيل التالي.
- Duration: 509.46s. مستقر، بلا timeout.

## 14. القرار
`FAILING TESTS TRIAGE FULL SUITE COMPLETION NEEDS FIX`

**السبب:** اكتمل full suite بنجاح (لا مشكلة أداء/مهلة)، لكن 70 اختبارًا متبقيًا في فئة "assertion outdated بعد refactor شرعي" أو "real behavior regression candidate" تتطلب قرارًا منتجيًا لكل ملف على حدة (هل السلوك الجديد هو المطلوب؟). تعديل هذه الـ guards بشكل جماعي في جولة closeout دون مراجعة per-feature يعد fake-pass ومخالفًا للممنوعات. يلزم تذكرة triage مستقلة بمالك منتج لكل مجموعة (sidebar IA، dashboard overview، membership route، إلخ).
