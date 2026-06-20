# Knowledge + FAQ + Help Center Unification — Inventory Audit

Date: 2026-06-20
Scope: frontend-only inventory; no DB / RLS / edge changes.

## Inventory table

| المصدر | النوع | المسار | الجمهور | اللغة | هل مكرر؟ | هل يصلح للمساعد؟ | ملاحظات |
| ------ | ----- | ------ | ------- | ----- | -------- | ---------------- | ------- |
| Homepage FAQ data | FAQ | `src/components/home/v2/sections/faqItems.ts` | visitor / customer / provider | AR + EN | نعم — يظهر في `FAQSection` و JSON-LD homepage | نعم | منقول إلى `knowledgeRegistry` كمصدر موحّد. الملف يبقى لأنه fallback لـ `useHomeFaq`. |
| Homepage FAQ runtime | FAQ | `src/modules/home/services/homeFaq.ts` + `useHomeFaq.ts` | visitor / customer | AR + EN | لا — هو المصدر الجاري (DB-first, fallback ثابت) | نعم | المصدر الرسمي للعرض. يقرأه `FAQSection` و JSON-LD. |
| Sector FAQ | FAQ | `src/components/sector/SectorFAQ.tsx` | visitor / customer | AR + EN | جزئي — نسخ متخصصة لكل قطاع | نعم | يبقى كما هو حاليًا؛ يمكن نقله Phase 2. |
| Membership FAQ | FAQ | `src/components/membership/MembershipFAQ.tsx` | visitor / customer | AR + EN | لا | نعم | يبقى كما هو — مرشح للنقل Phase 2. |
| Help Center home | Help article index | `src/pages/help/HelpCenterHome.tsx` | visitor / customer / provider / admin | AR + EN | لا — يقرأ من `@/modules/helpCenter` (DB) | نعم (محتوى منشور) | يبقى DB-backed. الـregistry لا يستبدله بل يكمله. |
| Help article page | Help article | `src/pages/help/HelpArticlePage.tsx` | visitor / customer / provider | AR + EN | لا | نعم | عرض فقط — يقرأ من `helpCenter` module. |
| Help category page | Help article | `src/pages/help/HelpCategoryPage.tsx` | visitor / customer / provider | AR + EN | لا | نعم | عرض فقط. |
| Report issue form | Support copy | `src/pages/help/ReportIssuePage.tsx` | visitor / customer / provider | AR + EN | لا | لا (نموذج) | بقي كما هو. |
| Feature request | Support copy | `src/pages/help/FeatureRequestPage.tsx` | visitor / customer / provider | AR + EN | لا | لا | بقي كما هو. |
| Email not arriving | Help article | `src/pages/help/EmailNotArriving.tsx` | visitor / customer | AR + EN | جزئي مع Help Center | جزئيًا | يمكن نقله Phase 2 إلى guide داخل registry. |
| Dashboard Help Center | Help article (internal) | `src/pages/dashboard/DashboardHelpCenter.tsx` | provider / business_owner | AR + EN | لا | نعم | يقرأ من `helpCenter` module. |
| Admin Help Center mgmt | Internal CMS | `src/pages/admin/AdminHelpCenter.tsx` | admin | AR + EN | لا | لا | لوحة إدارة (لا تحتاج registry). |
| Admin Home FAQ mgmt | Internal CMS | `src/pages/admin/AdminHomeFaq.tsx` | admin | AR + EN | لا | لا | لوحة إدارة (DB-backed). |
| Admin Contact messages | Operational | `src/pages/admin/AdminContactMessages.tsx` | admin | AR + EN | لا | لا | تشغيل. |
| Smart Help Panel | UI help | `src/components/help/SmartHelpPanel.tsx` | customer / provider | AR + EN | جزئي | جزئيًا | مرشح للقراءة من registry Phase 2. |
| About page | Policy/Marketing | `src/pages/About.tsx` | visitor | AR + EN | جزئي مع registry policy | نعم | ملخص النصوص الأساسية في registry. |
| Privacy page | Policy | `src/pages/Privacy.tsx` | visitor / customer | AR + EN | منعكس في `policy-privacy-summary` | نعم (الملخص فقط) | الصفحة الكاملة تبقى المصدر القانوني. |
| Terms page | Policy | `src/pages/Terms.tsx` | visitor / customer | AR + EN | منعكس في `policy-terms-summary` | نعم | كما أعلاه. |
| Email templates | Message template | `supabase/functions/_shared/email/*` | customer / provider | AR + EN | جزئي مع registry message_template | لا (محتوى الرسائل، ليس الإجابات) | inventoried — Phase 2 سينقلها إلى registry. |
| Notification copy | Message template | `src/i18n/__tests__/notificationLabels.test.ts` (مرجع) | customer / provider / admin | AR + EN | جزئي | لا | inventoried — Phase 2. |
| Onboarding copy | Onboarding | متفرق داخل `src/components/auth/*`, `src/pages/Onboarding.tsx` | customer / provider | AR + EN | جزئي | نعم | الملخصات في registry: `guide-getting-started-*`. الأصل يبقى للسياق التفاعلي. |
| Blog post FAQ | FAQ | `src/pages/BlogPost.tsx` | visitor | AR + EN | لا (محتوى مقال) | جزئيًا | يبقى مقالًا — ليس مرشحًا للنقل. |
| Operations alerts copy | Internal | `src/modules/operations/constants/alerts.ts` | operations / admin | AR + EN | لا | لا (نصوص أنظمة) | بقي. |

## مفتاح الأعمدة

- **النوع**: `FAQ`, `Help article`, `Knowledge article`, `Guide`, `Policy`, `Message template`, `Notification`, `Empty state`, `Onboarding copy`, `Public content`, `Internal guide`.
- **الجمهور**: `visitor`, `customer`, `provider`, `business_owner`, `admin`, `operations`.

## أين كان التكرار

1. عناصر FAQ للصفحة الرئيسية كانت موجودة كـ`FAQ_ITEMS_BI` و`HOME_FAQ_FALLBACK` و JSON-LD — لكنها مركزية حاليًا عبر `useHomeFaq` (لا تكرار فعلي بعد توحيد سابق).
2. ملخصات السياسات (`Privacy`, `Terms`) منثورة داخل صفحات HTML — تم استخراج ملخص واحد لكل سياسة إلى registry لتغذية المساعد.
3. عبارات onboarding متكررة بين بطاقات لوحة التحكم وصفحات Auth — تم اختزالها إلى dual guides في registry.
4. قوالب رسائل (email/WhatsApp/notifications) متفرقة — تم تسجيل عينة (`msg-quote-received-customer`, `msg-quote-request-provider`) كنماذج معتمدة دون تغيير منطق الإرسال.

## التصميم المقترح لـ Admin Knowledge Management (Phase 2)

- صفحة `/admin/knowledge` تعرض registry + DB-backed help/FAQ في جدول موحّد.
- فلاتر: النوع، الجمهور، الحالة، tags، usableByAssistant، usableInMessages.
- بحث (يستخدم `searchKnowledge`).
- معاينة (Preview).
- لا يُسمح بحذف عناصر published من واجهة UI (سياسة آمنة) — فقط نقل إلى `internal`.

## تغييرات DB

لا توجد. كل ما سبق طبقة فرونت-إند فوق المصادر القائمة.