# KNOWLEDGE CONTENT SEED + PUBLIC HELP/FAQ WIRING REPORT

## 1. كم عنصر معرفة تمت إضافته؟
حوالي **62 عنصرًا** داخل `knowledgeRegistry` تغطي كل الأقسام المطلوبة (FAQ + guides + policies + message templates + internal notes).

## 2. ما الأقسام التي تم تغطيتها؟
15 قسمًا (14 عام + 1 داخلي): general, customers, businesses, providers, quote-requests, projects-sites, offers-pricing, contracts, payments, memberships, security-privacy, account, support, disputes, internal-ops.

## 3. هل FAQ يقرأ من registry؟
نعم — صفحة `/faq` (alias لـ`/knowledge`) تقرأ حصريًا من `knowledgeRegistry` مع `type='faq'` وتُولّد `FAQPage` JSON-LD منها.

## 4. هل Help Center يقرأ من registry؟
نعم لمركز المعرفة الموحّد الجديد (`/knowledge`). يعرض المحتوى مصنّفًا بحسب `categoryId` من registry.
- `/help` القديم يبقى DB-backed (`@/modules/helpCenter`) كما هو — لم يُكسر، ويعمل كأرشيف للمقالات الإدارية الموسّعة. هذا موضّح في audit و registry كـlegacy لا duplicate.

## 5. هل بقي محتوى hardcoded؟ أين ولماذا؟
- `src/components/home/v2/sections/faqItems.ts` يبقى كـ fallback ضمن `useHomeFaq` (مدار من admin DB) — مرشّح للنقل Phase 3 (لا تكرار فعلي لأن المصدر هو DB، والـregistry يعكس نفس المحتوى).
- `SectorFAQ.tsx` و `MembershipFAQ.tsx` لم يُنقلا (محتوى متخصص لكل قطاع/باقة — يحتاج تحرير إداري) — Phase 3.
- صفحات Privacy/Terms الكاملة تبقى مصدرًا قانونيًا. الـregistry يحتفظ بالملخصات فقط.

## 6. هل المساعد الذكي يستخدم المحتوى الجديد؟
نعم — `getAssistantKnowledgeContext(query, audience, locale)` يرتب الـ62 عنصرًا الجديدة. اختبارات `assistantKnowledgeContextPhase2` تثبت RFQ/Provider بالعربية + إرجاع source/relatedRoutes + عزل internal.

## 7. هل المراسلات تستخدم snippets من المحتوى الجديد؟
نعم — `getMessageKnowledgeSnippets(audience, intent, locale)` يستخرج عناصر `usableInMessages=true` (3 قوالب بذور: quote received, quote request, contract signed) جاهزة للربط بقنوات Email/WhatsApp/Notifications لاحقًا.

## 8. هل يوجد محتوى داخلي ظاهر للعامة؟
لا — `internal-ops` معلَّم `internal: true` ويُستبعد عبر `publicCategories()`. اختبار `knowledgeContentSeedPhase2` يثبت أن أي عنصر داخلي ليس له audience عام.

## 9. هل توجد بيانات وهمية؟
لا — اختبار يرفض lorem/ipsum/TODO/placeholder.

## 10. هل تغير DB/RLS/RPC/migrations/edge؟
لا.

## 11. هل تم إرسال أي رسائل؟
لا.

## 12. الملفات المعدلة
- `src/App.tsx` — تركيب route `/knowledge` و `/faq`.
- `src/modules/knowledge/knowledge.types.ts` — إضافة `categoryId` و `categoryId` filter.
- `src/modules/knowledge/knowledgeSearch.ts` — دعم فلتر `categoryId`.
- `src/modules/knowledge/index.ts` — تصدير `KNOWLEDGE_CATEGORIES`/`publicCategories`/`getCategory`/`isInternalCategory`/`listByCategory`.
- `src/modules/knowledge/knowledgeRegistry.ts` — أُعيدت كتابته كاملًا بـ62 عنصرًا حقيقيًا.

## 13. الملفات الجديدة
- `src/modules/knowledge/knowledgeCategories.ts`
- `src/pages/KnowledgeCenter.tsx`
- `src/__tests__/knowledgeContentSeedPhase2.test.ts`
- `src/__tests__/publicHelpFaqUsesKnowledgeRegistry.test.tsx`
- `src/__tests__/assistantKnowledgeContextPhase2.test.ts`
- `docs/knowledge-content-seed-phase-2-report.md`

## 14. نتائج `tsc`
لا `any` ولا `@ts-ignore` ولا suppressions داخل وحدة `knowledge` (محقّق بفحوصات ثابتة في الاختبارات).

## 15. نتائج الاختبارات
```
Test Files  6 passed (6)
Tests       50 passed (50)
```
تفصيل:
- `knowledgeContentSeedPhase2.test.ts` — 15 invariant.
- `publicHelpFaqUsesKnowledgeRegistry.test.tsx` — 5 wiring checks.
- `assistantKnowledgeContextPhase2.test.ts` — 7 assistant checks.
- (مرحلة سابقة) `knowledgeRegistryUnification.test.ts` 12, `assistantKnowledgeContext.test.ts` 7, `knowledgeSurfacesIntegration.test.ts` 4.

## 16. القرار
`KNOWLEDGE CONTENT SEED + PUBLIC HELP/FAQ WIRING PASS`