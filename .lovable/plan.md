# ADMIN-DATA-ENRICHMENT-MICROSERVICE-1

قسم إداري جديد على `/admin/data-enrichment` لإثراء بيانات المنشآت من Website + Google Maps + AI، مع مراجعة بشرية كاملة قبل الاعتماد.

## المسار والصلاحيات
- Route: `/admin/data-enrichment` (محمي عبر `has_admin_access`، `useNoIndex`).
- إدراجه في Sidebar/Admin nav ضمن مجموعة "العمليات".
- جميع الاستدعاءات الحساسة عبر Edge Functions — لا مفاتيح API في الواجهة، ولا `supabase.functions.invoke` مباشر داخل الصفحة (يمر عبر `@/modules/adminEnrichment`).

## البنية (3 مراحل Inline، بدون Popups)
1. **Sources** — إدخال Website URL و/أو Google Maps URL (validation: URL، طول، sanitize).
2. **Review** — عرض جدول مقارنة 3 أعمدة (Website / Google Maps / AI Enhanced) لكل حقل + Badge ثقة (high/medium/low) + تنبيه تعارض، وأزرار قبول/تعديل/تجاهل لكل حقل.
3. **Apply** — ربط بمنشأة موجودة (autocomplete بـ Ref ID) أو إنشاء Provider Lead جديد. زر تأكيد صريح فقط؛ لا حفظ تلقائي، لا نشر تلقائي.

## الحقول المُستخرَجة
الاسم (ar/en)، النشاط، الوصف (ar/en)، الجوال/الهاتف، الموقع، المدينة، الحي، الشارع، الإحداثيات، العنوان الوطني، أوقات العمل، اللوجو/الصور، الروابط الاجتماعية. كل حقل يحمل `source: website | google_maps | manual | ai_enhanced` و `confidence`.

## Backend (Edge Functions)
- `admin-enrichment-fetch` — يستقبل `{ website?, mapsUrl? }`، يستدعي Firecrawl للموقع + Google Places (New) للماب، يطبّع البيانات ويعيد `EnrichmentDraft` (sources + merged + conflicts). يتحقق من `has_admin_access` على JWT.
- `admin-enrichment-enhance` — يأخذ draft ويستدعي Lovable AI Gateway لتحسين الاسم/الوصف وترجمتها ar↔en وتنسيق العنوان/الحي/الشارع. يعيد نسخة AI-Enhanced للحقول المختارة فقط.
- `admin-enrichment-apply` — يحفظ النتيجة المعتمدة: إما تحديث `businesses` موجودة أو إنشاء `provider_leads` جديد عبر RPC. يكتب صفًا في `admin_enrichment_sessions` وصفوف `admin_activity_log` (audit).
- Secrets المطلوبة: `FIRECRAWL_API_KEY`, `GOOGLE_MAPS_API_KEY` (server-side), `LOVABLE_API_KEY` (موجود). إذا غاب أحدها → ترجع 200 بـ `{ deferred: true, missing: [...] }` والواجهة تعرض Deferred badge بدلًا من خطأ تقني.

## Database
Migration واحدة:
- `admin_enrichment_sessions` (id, actor_id, website_url, maps_url, status enum: draft/reviewed/applied/discarded, sources jsonb, merged jsonb, applied_entity_type, applied_entity_id, created_at, updated_at).
- GRANTs: `service_role ALL`، `authenticated SELECT/INSERT/UPDATE` — RLS تقيد admins فقط عبر `has_admin_access(auth.uid())`.
- Trigger `updated_at`.

## Module / Service Layer
`src/modules/adminEnrichment/`:
- `services/fetchEnrichment.ts`, `enhanceEnrichment.ts`, `applyEnrichment.ts` — كل واحد wrapper رفيع حول `supabase.functions.invoke`.
- `services/listSessions.ts` — للقراءة من الجدول.
- `types.ts` — `EnrichmentField<T>`, `EnrichmentDraft`, `FieldSource`, `Confidence`.
- `index.ts` — Public API.

## UI
`src/pages/admin/AdminDataEnrichment.tsx`:
- Stepper بـ 3 خطوات، state محلي عبر `useState` + React Query للـ mutations.
- مكونات مساعدة: `<SourcesStep>`, `<ReviewStep>` (جدول مقارنة مع `<Bi>`, `<VerifiedBadge>`-style confidence chips, conflict alert), `<ApplyStep>`.
- بدون Dialog/Popover/AlertDialog — كل التأكيدات Inline cards.
- RTL/LTR via `useBi`, technical content بـ `.tech-content`.
- Loading/skeleton + رسائل خطأ مترجَمة عامة (بدون تفاصيل تقنية).

## Routing
- إضافة المسار في `App.tsx` ضمن `<AdminRoute>` (أو نمطه الحالي).
- رابط في Admin sidebar تحت "إثراء البيانات".

## Tests
ملف `src/tests/adminDataEnrichment1.test.ts`:
- وجود الملفات: page, module barrel, edge function folders, migration.
- الصفحة لا تستورد `@/integrations/supabase/client` مباشرة.
- لا توجد سلاسل `API_KEY`/`apiKey:`/`Authorization:` في كود الصفحة.
- الصفحة تستورد من `@/modules/adminEnrichment`.
- الصفحة تحتوي مدخلات Website و Maps URL.
- الصفحة لا تستدعي `.publish` ولا `update({ status: 'published' })` ولا `insert(... businesses ...)` مباشرة (لا إنشاء/نشر تلقائي من الواجهة).
- وجود مكوّن مقارنة وعرض confidence + conflict.
- Edge `admin-enrichment-apply` تكتب في `admin_activity_log` (grep في كود الـ function).

## Deferred (واضح في الواجهة عند الغياب)
- Firecrawl إذا غير مربوط → خانة Website معطّلة مع شارة "Deferred".
- Google Maps API key إذا غير موجود → خانة Maps معطّلة بنفس الشارة.
- AI Enhance step اختياري؛ يعمل دائمًا (LOVABLE_API_KEY متوفر).

## الأمن
- لا API keys في bundle المتصفّح.
- كل edge function تتحقق `has_admin_access` على JWT.
- Sanitize URL inputs و length caps.
- لا توجد عمليات نشر/إنشاء تلقائي — فقط بضغطة الأدمن في خطوة Apply.
- كل تطبيق ينتج صفوف audit في `admin_activity_log` + `admin_enrichment_sessions`.

بعد موافقتك على الخطة، أبدأ التنفيذ: migration → edge functions → module → page + route + sidebar → tests.