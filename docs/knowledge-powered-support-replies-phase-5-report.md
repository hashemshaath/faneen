# KNOWLEDGE-POWERED SUPPORT REPLIES PHASE 5 REPORT

## 1. ما الذي تم إضافته؟
طبقة `support/` داخل وحدة المعرفة:
- `supportReply.types.ts` — أنواع `SupportIntent`, `SupportReplyChannel`, `SupportReplyTone`, `SupportReplyInput`, `SupportReplyDraft`.
- `supportReplyIntents.ts` — `classifySupportIntent` + `intentToSnippetTags` (قواعد بسيطة بدون AI).
- `supportReplyGuardrails.ts` — كشف المحتوى الداخلي، `detectMissingInformation`, `shouldEscalate`, `maxReplyLength`.
- `supportReplyTemplates.ts` — `renderReply` / `fallbackReply` لكل قناة ونبرة.
- `supportReplyBuilder.ts` — `buildSupportReplyDraft` نقطة الدخول الموحدة.

## 2. ما intents المدعومة؟
`account_access`, `password_reset`, `email_verification`, `rfq_status`, `quote_request`, `file_upload_issue`, `provider_visibility`, `provider_profile_completion`, `payments_invoices`, `membership_limits`, `technical_support`, `complaint_dispute`, `contract_award`, `unknown`.

## 3. كيف يتم بناء الرد؟
1. تصنيف النية من نص المستخدم.
2. استدعاء `buildAssistantKnowledgeAnswerContext` (Phase 4) للحصول على عناصر المعرفة المسموح بها للجمهور.
3. ترشيح العناصر التي تطابق tags النية.
4. اختيار أول عنصرين كحدّ أقصى وتمرير أجسامهم خلال `renderReply` المناسب للقناة/النبرة.
5. تطبيق `truncate` بحد طول القناة (`whatsapp 320`, `in_app 240`, `ticket 900`, `email 1200`).

## 4. كيف يتم منع اختراع الإجابة؟
- المصدر الوحيد لجسم الرد هو `r.item.body` من `knowledgeRegistry`.
- إذا `buildAssistantKnowledgeAnswerContext` يرجع `allowedToAnswer=false` أو لم يتبقَّ سطور بعد الترشيح، يُعاد `fallbackReply` وتُضبط `canAnswer=false` و`escalationRecommended=true` مع `sources=[]`.
- لا يوجد توليد نصي أو embeddings.

## 5. كيف يتم منع المحتوى الداخلي؟
طبقتان: (أ) `isItemAllowedForAudience` (Phase 4) يمنع وصول عناصر `internal-ops`/`status=internal` إلى المستخدم. (ب) `containsForbiddenInternalContent` يفلتر أي سطر يحتوي عبارات مثل "تشغيل داخلي"، "قاعدة البيانات"، `RLS`, `service_role` قبل تضمينه في الرد.

## 6. ما القنوات المدعومة؟
`email`, `whatsapp`, `ticket`, `in_app`. النبرات: `neutral | friendly | formal`. WhatsApp/in-app: فقرة واحدة قصيرة بدون تحية/إغلاق. Email/ticket: تحية + جسم + طلب معلومات ناقصة + إغلاق.

## 7. هل تم إرسال أي رسائل؟ **لا.**
## 8. هل تم حفظ أي مسودة؟ **لا.**
## 9. هل تم ربط لوحة `/admin/knowledge`؟ **لا — مؤجَّل إلى Phase 5B** (تم تسليم الـhelpers والاختبارات أولًا حسب البند 7).
## 10. هل تغير DB / RLS / RPC / migrations / edge؟ **لا.**

## 11. الملفات المعدلة
- `src/modules/knowledge/index.ts` — تصدير وحدة `support/`.

## 12. الملفات الجديدة
- `src/modules/knowledge/support/supportReply.types.ts`
- `src/modules/knowledge/support/supportReplyIntents.ts`
- `src/modules/knowledge/support/supportReplyGuardrails.ts`
- `src/modules/knowledge/support/supportReplyTemplates.ts`
- `src/modules/knowledge/support/supportReplyBuilder.ts`
- `src/__tests__/knowledgeSupportReplyPhase5.test.ts`
- `docs/knowledge-powered-support-replies-phase-5-report.md`

## 13. نتائج `tsc`
لا `any` / `as any` / `@ts-ignore` / `@ts-expect-error` / `eslint-disable` داخل وحدة `support/` (محقَّق بفحص ثابت).

## 14. نتائج الاختبارات
```
Test Files  1 passed (1)
Tests       14 passed (14)
```
يغطي: تصنيف النوايا (RFQ/كلمة مرور/ظهور المزود/الفواتير)، fallback للسؤال غير المعروف، منع المحتوى الداخلي، صياغة WhatsApp مختصرة وEmail رسمية، تواجد `sources` و`relatedRoutes`، طلب رقم الطلب ضمن `missingInformation`، غياب أي transport/DB/RPC/edge داخل الوحدة، ونقاء TypeScript.

## 15. القرار
`KNOWLEDGE-POWERED SUPPORT REPLIES PHASE 5 PASS`