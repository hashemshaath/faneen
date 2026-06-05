# خطة SEO-TITLES-METADATA-OPTIMIZER-1

النظام الحالي يستخدم `usePageMeta` + `useMultiJsonLd` في `src/hooks/usePageMeta.ts`. سنبني فوقه بدلاً من استبداله، وننفّذ على 4 مراحل قابلة للموافقة منفصلة.

---

## المرحلة 1 — محرّك العناوين الموحّد (Frontend فقط، لا تغييرات DB)

**ملف جديد:** `src/modules/seo/seoTitleBuilder.ts`

يصدّر:
- `PageKind = 'company' | 'category' | 'brand' | 'service' | 'blog' | 'search' | 'project' | 'offer' | 'help' | 'home'`
- `buildSeoTitle({ kind, lang, name, activity?, city?, ... }) → string` يطبّق القواعد العربية/الإنجليزية المذكورة في الطلب مع fallback آمن.
- `buildSeoDescription(...)` يقص عند 155 حرفاً مع إزالة الحشو وإضافة CTA طبيعي.
- `truncate`, `cleanText`, `withSite` (لإضافة `| قطاعات` / `| Qitaat`).

**ملف جديد:** `src/modules/seo/useSeoPage.ts` — wrapper رقيق فوق `usePageMeta` يأخذ `{ kind, lang, ... }` ويستدعي `usePageMeta` + `useMultiJsonLd` بالنتائج.

**اختبار:** `src/tests/seoTitleBuilder.test.ts` — يتحقق من كل قاعدة لغة + fallback + عدم تجاوز الطول + عدم وجود UUID.

**لا تغييرات على الصفحات في هذه المرحلة** — فقط الأساس + الاختبارات.

---

## المرحلة 2 — ربط الصفحات العامة بالمحرّك

تحديث الصفحات لاستخدام `useSeoPage` بدل استدعاءات `usePageMeta` العامة:

- `src/pages/BusinessProfile.tsx` → `kind:'company'`
- `src/pages/BranchDetail.tsx` → `kind:'company'` (فرع)
- `src/pages/Category*.tsx` → `kind:'category'`
- `src/pages/BrandDetail*.tsx` → `kind:'brand'`
- `src/pages/ServiceDetail.tsx` / `ProductDetail.tsx` → `kind:'service'`
- `src/pages/Blog*.tsx` → `kind:'blog'`
- `src/pages/Search.tsx` → `kind:'search'`
- `src/pages/ProjectDetail.tsx` → `kind:'project'`
- `src/pages/Offers*.tsx` → `kind:'offer'`
- `src/pages/Help*.tsx` → `kind:'help'`

كل صفحة تمرّر اللغة الحالية (من `useBi`/AppDirectionShell) واسم المدينة/التصنيف/النشاط من بياناتها.

**fallback:** عند نقص أي حقل، يولّد المحرّك صياغة عامة آمنة بدل إفشال الـ render.

### تقدّم المرحلة 2 (دفعة 1)
- ✅ `src/pages/BusinessProfile.tsx`
- ✅ `src/pages/BranchDetail.tsx`
- ✅ `src/pages/BlogPost.tsx`
- ✅ `src/pages/ProjectDetail.tsx`
- ✅ `src/pages/ServiceDetail.tsx`

### تقدّم المرحلة 2 (دفعة 2)
- ✅ `src/pages/Categories.tsx`
- ✅ `src/pages/BrandDetail.tsx`
- ✅ `src/pages/Search.tsx`
- ✅ `src/pages/Offers.tsx`
- ✅ `src/pages/Blog.tsx`
- ✅ `src/pages/Projects.tsx`
- ✅ `src/pages/SectorLanding.tsx` (sector + sectors index)
- ✅ `src/pages/SectorCity.tsx`
- ✅ `src/pages/SectorBrief.tsx`
- ✅ `src/pages/SectorsHub.tsx`
- ✅ `src/pages/ProfileSystems.tsx`
- ✅ `src/pages/ProfileSystemDetail.tsx`
- ✅ `src/pages/Compare.tsx`
- ✅ `src/pages/CompareProfiles.tsx`
- ✅ `src/pages/PublicUserProfile.tsx`
- ✅ `src/pages/help/HelpCenterHome.tsx`
- ✅ `src/pages/help/HelpCategoryPage.tsx`
- ✅ `src/pages/help/HelpArticlePage.tsx`
- ⏳ متبقّي اختياري: `BrandsCatalog`, `SectorSeoLanding`, صفحات legacy.

تحديث المحرّك: `withSite` يتعرّف الآن على `قِطاعات` (بـ كسرة) كي لا يضاعف لاحقة الموقع للعناوين المخصصة القائمة.

---

## المرحلة 3 — حقول SEO في الإدارة + SEOPreviewCard

**Migration DB** (additive فقط، nullable):
- `businesses`: `seo_title_ar/en`, `seo_description_ar/en`, `seo_keywords text[]`, `og_image`
- `categories`: `seo_title_ar/en`, `seo_description_ar/en`, `featured_keywords text[]`
- `blog_posts`: `seo_title_ar/en`, `seo_description_ar/en`, `cover_alt_ar/en` (excerpt موجود)
- `brands`: `seo_title_ar/en`, `seo_description_ar/en`, `brand_keywords text[]`

**مكوّن جديد:** `src/components/seo/SEOPreviewCard.tsx` يعرض:
- معاينة Google (title + URL + description)
- شريط طول العنوان (50–60 جيد) + الوصف (140–160 جيد)
- تحذيرات: مفتاح ناقص، عنوان مكرر، slug طويل، OG image مفقود
- يقبل override يدوي + يستخدم نتيجة `buildSeoTitle` كـ fallback

يُضاف داخل: `AdminBusinesses`, `AdminCategories`, `AdminBrands`, `DashboardBlog` (محرر).

**أولوية القراءة:** `seo_title_*` المخصّص → `buildSeoTitle` التلقائي.

### تقدّم المرحلة 3
- ✅ `src/components/seo/SEOPreviewCard.tsx` — معاينة Google ثنائية اللغة + شريط طول العنوان/الوصف + تحذيرات OG/canonical/keyword.
- ✅ Migration additive: أضافت حقول SEO إلى `businesses`, `categories`, `blog_posts`, و `brand_catalog`، وحدّثت `brands_public` لإظهار حقول العلامات المعتمدة فقط.
- ✅ أمان الواجهة العامة: تم ضبط `brands_public` كـ `security_invoker` بعد تحديثها.
- ✅ مدمج في `src/pages/dashboard/DashboardBlog.tsx` (تبويب SEO) يقرأ من `meta_title_*` و `meta_description_*` و `og_image_url`.
- ✅ مدمج في `src/pages/admin/AdminBusinesses.tsx` عبر تبويب SEO inline مع `seo_title_*`, `seo_description_*`, `seo_keywords`, و `og_image`.
- ✅ مدمج في `src/pages/admin/AdminCategories.tsx` داخل نموذج التصنيف inline مع `seo_title_*`, `seo_description_*`, و `featured_keywords`.
- ✅ مدمج في `src/pages/admin/AdminBrandDetail.tsx` مع حفظ `seo_title_*`, `seo_description_*`, `brand_keywords`, و `og_image_url`.
- ⏳ تحسين لاحق اختياري: إضافة مولدات AI لهذه الحقول في شاشات الأعمال/التصنيفات/العلامات كما هو موجود في محرر المدونة.

---

## المرحلة 4 — JSON-LD / Canonical / Sitemap / noindex + اختبارات

- مراجعة JSON-LD في الصفحات: `LocalBusiness`, `Brand`, `BlogPosting`, `BreadcrumbList`, `ItemList`, `Service`, `FAQPage` — التأكد من تطابق `name/headline` مع لغة الصفحة، ولا UUIDs، ولا تقييمات وهمية.
- `useNoIndex` على كل صفحات `/admin/*` و `/dashboard/*` و `/auth/*` (تحقّق فقط — موجود غالباً).
- `scripts/generate-sitemap.ts` / edge sitemap: تأكيد استبعاد الصفحات الخاصة + استبعاد أي UUIDs.
- اختبارات: `src/tests/seoTitlesMetadataOptimizer1.test.ts` يغطّي القواعد، اللغة، الطول، عدم وجود UUID، وجود OG/Twitter/JSON-LD، fallback، sitemap لا يحوي خاص.

### تقدّم المرحلة 4
- ✅ `src/tests/seoTitlesMetadataOptimizer1.test.ts` — 18 اختباراً ناجحاً يغطّي:
  - قواعد اللغة (ar/en) لكل `PageKind`.
  - حدود الطول `TITLE_MAX=60` و `DESCRIPTION_MAX=158` على كل المسارات (بما فيها custom titles طويلة جداً).
  - تنظيف UUID و Ref IDs من العناوين المخصّصة + التأكد من عدم تسرّبها في العناوين التلقائية.
  - أولوية `customTitle`/`customDescription`، ثم `rawDescription`، ثم القالب العام.
  - دمج keywords مع dedupe وحد أعلى 12 عنصراً.
  - فحص المصدر لـ `supabase/functions/sitemap/index.ts`: لا أنواع `admin`/`dashboard`/`auth`، فلاتر `businesses` (is_active + approval_status='published' + is_demo=false)، `blog_posts.status='published'`، رؤوس `Content-Type=application/xml` و `Cache-Control` طويل.
  - تأكيد توفر `useNoIndex` كـ hook قابل للاستيراد (مستخدم بالفعل في كل صفحات admin/dashboard/auth).
- ✅ تحقّق `useNoIndex` على لوحات `admin/*` و `dashboard/*` و auth: `rg` يظهر استخدامه في ~150 شاشة خاصة (شامل `ProtectedRoute` و كل `Admin*`/`Dashboard*`).
- ✅ sitemap edge function تم تدقيقها: لا تنشر أي مسار `/admin/*` أو `/dashboard/*`؛ كل القوائم تستخدم slugs عامة (ما عدا `/projects/:id` و `/search?...` المُمررة عمداً).
- ⏳ مراجعة فردية لـ JSON-LD لكل صفحة (مطابقة `name/headline` للّغة + إزالة أي تقييمات وهمية) — اختياري في دفعة منفصلة عند الحاجة، خارج نطاق الاختبار الآلي.

---

## التنفيذ

سأبدأ فوراً بالمرحلة 1 بعد موافقتك على هذه الخطة. كل مرحلة لاحقة تأتي في رسالة منفصلة لتسهيل المراجعة والرجوع.

## نقاط تحتاج قراراً منك

1. **Slugs الحالية:** الطلب يمنع تغييرها بدون redirect. هل تريد إضافة جدول `slug_redirects` لاحقاً، أم نكتفي بعدم لمس الـ slugs القائمة؟
2. **og:image الافتراضية:** نُبقي `qitaat.com/og-image.jpg` الحالية، أم تريد توليد صورة افتراضية لكل `PageKind`؟
3. **حقول DB في المرحلة 3:** هل أوافق على إنشاء الهجرة عند الوصول لها، أم تفضّل تخطّيها والاكتفاء بـ fallback تلقائي من البيانات الحالية فقط؟
