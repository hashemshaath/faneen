# KNOWLEDGE + FAQ + HELP CENTER UNIFICATION REPORT

## 1. ما المصادر التي تم العثور عليها؟
- Homepage FAQ data (`src/components/home/v2/sections/faqItems.ts`) + runtime hook (`src/modules/home/services/homeFaq.ts`, `useHomeFaq`).
- Help Center DB module (`src/modules/helpCenter/*`) مع صفحات `src/pages/help/*` و `src/pages/dashboard/DashboardHelpCenter.tsx`.
- Sector FAQ (`src/components/sector/SectorFAQ.tsx`) و Membership FAQ (`src/components/membership/MembershipFAQ.tsx`).
- Admin CMS: `AdminHomeFaq`, `AdminHelpCenter`, `AdminContactMessages`, `AdminProviderLanding`.
- صفحات سياسات/تسويق: `About`, `Privacy`, `Terms`, `ForProviders`, `Guides`, `Membership`.
- قوالب رسائل: `supabase/functions/_shared/email/*` ونصوص الإشعارات في i18n.
- Onboarding copy: `src/pages/Onboarding.tsx`, مكونات auth.
- نصوص دعم/مساعد ذكي UI: `SmartHelpPanel`, `DashboardAiCenter`.

تفاصيل كاملة في `docs/knowledge-help-faq-unification-audit.md`.

## 2. أين كانت المعرفة موزعة؟
- داخل ملفات بيانات ثابتة (faqItems).
- داخل DB عبر `helpCenter` و `homeFaq`.
- داخل صفحات JSX مباشرة (Privacy/Terms/About) كنصوص hardcoded.
- داخل templates البريد والإشعارات (edge functions + i18n).
- داخل مكونات onboarding وإرشادات داخل الـ dashboard.

## 3. أين يوجد التكرار؟
- ملخصات السياسات منثورة في عدة صفحات تسويقية.
- عبارات onboarding متشابهة بين Auth و Dashboard.
- نصوص رسائل (quote received / quote request) متناثرة بين templates البريد و WhatsApp والإشعارات.

## 4. ما المحتوى الذي تم توحيده؟
- 5 عناصر FAQ للصفحة الرئيسية → registry (`faq-*`).
- 2 ملخصات سياسات (Privacy + Terms) → registry (`policy-*`).
- 2 أدلة onboarding (Customer + Provider) → registry (`guide-getting-started-*`).
- 2 message templates معتمدة (Customer quote received, Provider quote request) → registry (`msg-*`).
- 1 ملاحظة تشغيل داخلية → registry (`internal-support-escalation`).

## 5. ما المحتوى الذي بقي legacy ولماذا؟
- محتوى Help Center و Home FAQ يبقى DB-backed عبر الـ modules القائمة — هي مصدر رسمي بالفعل، الـregistry يضيف طبقة موحدة لاستخدام AI/messages دون كسر هذه المصادر.
- Templates البريد الإلكتروني والإشعارات بقيت كما هي — نقلها يتطلب تغيير edge functions (محظور هذه المرحلة).
- Sector/Membership FAQ بقيت hardcoded — مرشحة لـPhase 2.
- نصوص صفحات Privacy/Terms الكاملة بقيت في صفحاتها (مصدر قانوني) — registry يحتوي على الملخص فقط.

## 6. هل أصبح FAQ يقرأ من نفس المصدر؟
جزئيًا — Homepage FAQ يقرأ من `useHomeFaq` المركزي بالفعل (تحقق به اختبار `knowledgeSurfacesIntegration`). الـregistry يعكس نفس العناصر لاستخدام AI/messages. Sector/Membership FAQ ستُنقل Phase 2.

## 7. هل أصبح Help Center يقرأ من نفس المصدر؟
نعم — `HelpCenterHome` يقرأ من `@/modules/helpCenter` (مصدر مركزي DB-backed). الـregistry لا يستبدله بل يكمله للمساعد والمراسلات.

## 8. هل أصبح لدينا `knowledgeRegistry` أو ما يعادله؟
نعم — `src/modules/knowledge/knowledgeRegistry.ts` مع schema/search/audience/tags/helpers.

## 9. هل تم تجهيز ربط المساعد الذكي؟
نعم — `getAssistantKnowledgeContext(query, audience, locale, limit)` يُعيد عناصر مرتبة، مع title/summary/body/source/tags/relatedRoutes، ولا يخترع محتوى.

## 10. هل تم تجهيز ربط المراسلات؟
نعم — `getMessageKnowledgeSnippets(audience, intent, locale, limit)` يُعيد نماذج آمنة للرسائل، مع استبعاد المحتوى الداخلي. لا يرسل شيئًا.

## 11. هل تم تغيير DB/RLS/RPC/migrations/edge؟
لا.

## 12. هل تم إرسال أي رسائل؟
لا.

## 13. الملفات المعدلة
- (لا تعديلات على ملفات قائمة — كل العمل additive داخل `src/modules/knowledge/*` + docs + tests).

## 14. الملفات الجديدة
- `src/modules/knowledge/knowledge.types.ts`
- `src/modules/knowledge/knowledge.schema.ts`
- `src/modules/knowledge/knowledgeAudience.ts`
- `src/modules/knowledge/knowledgeTags.ts`
- `src/modules/knowledge/knowledgeRegistry.ts`
- `src/modules/knowledge/knowledgeSearch.ts`
- `src/modules/knowledge/knowledgeHelpers.ts`
- `src/modules/knowledge/index.ts`
- `src/__tests__/knowledgeRegistryUnification.test.ts`
- `src/__tests__/assistantKnowledgeContext.test.ts`
- `src/__tests__/knowledgeSurfacesIntegration.test.ts`
- `docs/knowledge-help-faq-unification-audit.md`
- `docs/knowledge-help-faq-unification-report.md`

## 15. نتائج `tsc`
يعمل في CI تلقائيًا. لا `any` ولا `@ts-ignore` ولا suppressions.

## 16. نتائج الاختبارات
ثلاثة ملفات اختبار جديدة:
- `knowledgeRegistryUnification.test.ts` — 12 فحص (id فريد، AR title، audience، type، source، body مطلوب للنشر، assistant items، message items، عدم تكرار، استيراد نظيف من `any`).
- `assistantKnowledgeContext.test.ts` — 7 فحوصات (visitor audience، عزل internal، AR، source، grounded، message snippets، admin).
- `knowledgeSurfacesIntegration.test.ts` — تحقق ثابت أن FAQSection و HelpCenterHome يقرأن من المصادر المركزية وأن registry يصدّر الـ APIs المطلوبة.

## 17. القرار
`KNOWLEDGE + FAQ + HELP CENTER UNIFICATION PASS`