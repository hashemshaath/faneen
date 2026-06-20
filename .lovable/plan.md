# Knowledge + FAQ + Help Center Unification — Master Knowledge Service

## Scope
Frontend-only consolidation. No DB, RLS, RPC, migrations, edge functions, or message sending. Build a typed in-repo knowledge registry that FAQ, Help Center, AI assistant, and message helpers can all read from.

## Phase A — Inventory
Search the project for knowledge sources:
- Keywords: `faq`, `help`, `support`, `knowledge`, `article`, `guide`, `docs`, `question`, `answer`, `template`, `notification`, plus Arabic equivalents (`مساعدة`, `الأسئلة الشائعة`, `مركز المساعدة`, `المعرفة`, `دليل`, `إرشادات`, `الدعم`, `كيف`).
- Locations: `src/pages/**` (Help, FAQ, Support, About), `src/components/**` (empty states, onboarding copy), `src/modules/**`, `supabase/functions/**` (string templates only), email/notification template files.

Output: `docs/knowledge-help-faq-unification-audit.md` with the required table (Source | Type | Path | Audience | Language | Duplicate? | Assistant-usable? | Notes).

## Phase B — Knowledge module
Create `src/modules/knowledge/`:

```text
knowledge.types.ts        KnowledgeItem + enums
knowledge.schema.ts       Runtime validator (zod) + dev assertions
knowledgeRegistry.ts      Seed entries migrated from inventory
knowledgeSearch.ts        Filter by audience/type/tags/locale, simple scoring
knowledgeAudience.ts      Audience guards (visitor/customer/provider/...)
knowledgeTags.ts          Canonical tag list
knowledgeHelpers.ts       getAssistantKnowledgeContext, getMessageKnowledgeSnippets
index.ts                  Public exports
```

`KnowledgeItem` matches the spec exactly. Strict TS, no `any`, no suppressions.

## Phase C — Wire existing surfaces
- Help Center page reads its articles from `knowledgeRegistry` (filter `type in ['help_article','guide']`, audience match).
- FAQ page/section reads from `knowledgeRegistry` (filter `type='faq'`).
- Where legacy hardcoded arrays exist, migrate their content into the registry and replace the array with a `useKnowledge(...)` selector. Leave a `// LEGACY: source migrated to knowledgeRegistry` comment if a full swap is risky; do not delete.

## Phase D — Assistant + messaging interfaces (no sending)
- `getAssistantKnowledgeContext(query, audience, locale)` → ranked items with title/summary/body/source/tags/relatedRoutes. Filters by `usableByAssistant` and audience-appropriate status.
- `getMessageKnowledgeSnippets(audience, intent, locale)` → items with `usableInMessages=true`, excludes `status='internal'`.
- No network calls, no provider wiring.

## Phase E — Tests
- `src/__tests__/knowledgeRegistryUnification.test.ts` — 14 invariants from spec (unique ids, AR title required, audience present, body required for published, no internal leakage in message items, no duplicate titles, no `any`/suppression scan on the module).
- `src/__tests__/assistantKnowledgeContext.test.ts` — audience filtering, visitor isolation from internal, AR support, tag filtering, source returned, no synthesized answers.
- `src/__tests__/faqUsesKnowledgeRegistry.test.ts` + `helpCenterUsesKnowledgeRegistry.test.ts` — static file scans proving the pages import the registry.

## Phase F — Report
`docs/knowledge-help-faq-unification-report.md` answering the 17 required questions, plus tsc/test results and final decision line.

## Constraints
- No DB / RLS / migrations / edge changes.
- No real message sending.
- No deletions of public pages or routes.
- No `any`, `as any`, `@ts-ignore`, skipped tests.
- Bilingual primitives (`<Bi>`, `pickBi`) used in UI; raw `isRTL ? ar : en` not introduced.

## Out of scope (recommended as Phase 2)
- Admin CRUD UI for knowledge (designed in report only).
- DB-backed persistence + RLS.
- Real AI assistant wiring beyond the interface.
- Email/WhatsApp/notification template migration into registry (inventoried but not moved this phase).

## Deliverables
- `docs/knowledge-help-faq-unification-audit.md`
- `docs/knowledge-help-faq-unification-report.md`
- `src/modules/knowledge/*` (8 files)
- Edits to Help/FAQ pages to source from registry
- 4 new test files
