# ASSISTANT KNOWLEDGE CONTEXT GUARDRAILS PHASE 4 REPORT

## 1. ما الذي تم إضافته؟
طبقة سياق آمنة للمساعد الذكي تربطه بالمصدر الموحد `knowledgeRegistry`:
- `assistant/assistantKnowledgeSynonyms.ts` — توسيع المرادفات العربية/الإنجليزية.
- `assistant/assistantKnowledgeGuardrails.ts` — `isInternalContent`, `isItemAllowedForAudience`, ورسائل fallback.
- `assistant/assistantKnowledgeRanking.ts` — `rankAssistantResults` (audience > category > title > tags > status > priority).
- `assistant/assistantKnowledgeContext.ts` — `buildAssistantKnowledgeAnswerContext(...)` كنقطة دخول وحيدة.
- `messaging/messageKnowledgeSnippets.ts` — `getSafeMessageKnowledgeSnippets` يرفع قوالب الرسائل ويمنع تسرّب internal.

## 2. كيف يتم تحديد الجمهور؟
الجمهور (`visitor | customer | provider | business_owner | admin | operations`) يُمرَّر صراحةً من المُستدعي. الفلترة تتم عبر `isAudienceVisible` (طبقة المعرفة) + `isItemAllowedForAudience` (طبقة المساعد الإضافية).

## 3. كيف يتم منع المحتوى الداخلي؟
`isInternalContent(item)` يعتبر العنصر داخليًا إذا كانت حالته `internal` أو فئته `internal-ops`. أي audience غير `admin/operations` يُحرم تلقائيًا من هذه العناصر، حتى لو كان `usableByAssistant=true` بطريق الخطأ.

## 4. كيف يتم منع اختراع الإجابات؟
- `getAssistantKnowledgeContext` يعمل فقط فوق عناصر `knowledgeRegistry`.
- `buildAssistantKnowledgeAnswerContext` يحسب `tokenHits = rawScore − priorityFloor`؛ إذا < `ASSISTANT_TOKEN_HIT_THRESHOLD = 10` (أي لم يطابق أي token فعلي)، تكون `allowedToAnswer = false` مع رسالة fallback عربية أو إنجليزية.
- لا توجد توليد أو embeddings.

## 5. كيف يتم ترتيب النتائج؟
ترتيب مُجمع: (1) تطابق الجمهور +5، (2) ذكر `categoryId` في السؤال +3، (3) تطابق tokens العنوان +4، (4) tag match +2، (5) `published` +1، (6) priority/100 كمكسر تعادل. الحد الأقصى 5 افتراضيًا (`ASSISTANT_DEFAULT_LIMIT=5`).

## 6. ما المرادفات العربية المدعومة؟
معجم `KNOWLEDGE_SYNONYMS` يشمل: عرض سعر/تسعيرة/RFQ/quote، مزود/مقدم خدمة/provider، منشأة/شركة/عمل/business، فاتورة/فواتير/دفع/payment، تسجيل الدخول/الحساب/كلمة المرور، ظهور/نشر/رابط عام/visibility.

## 7. هل المساعد يستخدم `knowledgeRegistry`؟ **نعم.**
## 8. هل المراسلات تستخدم snippets من `knowledgeRegistry`؟ **نعم.**
## 9. هل تم بناء chat UI؟ **لا.**
## 10. هل تم إرسال رسائل؟ **لا.**
## 11. هل تغير DB / RLS / RPC / migrations / edge؟ **لا.**

## 12. الملفات المعدلة
- `src/modules/knowledge/index.ts` — تصدير الطبقة الجديدة.

## 13. الملفات الجديدة
- `src/modules/knowledge/assistant/assistantKnowledgeSynonyms.ts`
- `src/modules/knowledge/assistant/assistantKnowledgeGuardrails.ts`
- `src/modules/knowledge/assistant/assistantKnowledgeRanking.ts`
- `src/modules/knowledge/assistant/assistantKnowledgeContext.ts`
- `src/modules/knowledge/messaging/messageKnowledgeSnippets.ts`
- `src/__tests__/assistantKnowledgeGuardrailsPhase4.test.ts`
- `src/__tests__/messageKnowledgeSnippetsPhase4.test.ts`
- `docs/assistant-knowledge-context-guardrails-phase-4-report.md`

## 14. نتائج `tsc`
لا `any` ولا `as any` ولا `@ts-ignore` ولا `@ts-expect-error` ولا `eslint-disable` داخل أي من الملفات الجديدة (محقَّق بفحص ثابت داخل الاختبارات).

## 15. نتائج الاختبارات
```
Test Files  2 passed (2)
Tests       21 passed (21)
```
- `assistantKnowledgeGuardrailsPhase4.test.ts` — 14 invariant (visitor isolation، operations isolation، provider/business_owner coverage، admin internal access، RFQ/payment/visibility queries، unknown-query fallback، source + relatedRoutes، حد 5 نتائج، grounding، purity).
- `messageKnowledgeSnippetsPhase4.test.ts` — 7 invariant (grounded، no internal للعميل/المزود، RFQ templates، support snippets، لا transport، لا fake data).

## 16. القرار
`ASSISTANT KNOWLEDGE CONTEXT GUARDRAILS PHASE 4 PASS`