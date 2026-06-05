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
- ⏳ متبقّي: `Category*`, `BrandDetail*`, `Search`, `Offers*`, `Help*`, `Sector*`, `Blog` (قائمة)، `Projects` (قائمة)، `Compare*`، `PublicUserProfile`، `ProfileSystem*`.

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

---

## المرحلة 4 — JSON-LD / Canonical / Sitemap / noindex + اختبارات

- مراجعة JSON-LD في الصفحات: `LocalBusiness`, `Brand`, `BlogPosting`, `BreadcrumbList`, `ItemList`, `Service`, `FAQPage` — التأكد من تطابق `name/headline` مع لغة الصفحة، ولا UUIDs، ولا تقييمات وهمية.
- `useNoIndex` على كل صفحات `/admin/*` و `/dashboard/*` و `/auth/*` (تحقّق فقط — موجود غالباً).
- `scripts/generate-sitemap.ts` / edge sitemap: تأكيد استبعاد الصفحات الخاصة + استبعاد أي UUIDs.
- اختبارات: `src/tests/seoTitlesMetadataOptimizer1.test.ts` يغطّي القواعد، اللغة، الطول، عدم وجود UUID، وجود OG/Twitter/JSON-LD، fallback، sitemap لا يحوي خاص.

---

## التنفيذ

سأبدأ فوراً بالمرحلة 1 بعد موافقتك على هذه الخطة. كل مرحلة لاحقة تأتي في رسالة منفصلة لتسهيل المراجعة والرجوع.

## نقاط تحتاج قراراً منك

1. **Slugs الحالية:** الطلب يمنع تغييرها بدون redirect. هل تريد إضافة جدول `slug_redirects` لاحقاً، أم نكتفي بعدم لمس الـ slugs القائمة؟
2. **og:image الافتراضية:** نُبقي `qitaat.com/og-image.jpg` الحالية، أم تريد توليد صورة افتراضية لكل `PageKind`؟
3. **حقول DB في المرحلة 3:** هل أوافق على إنشاء الهجرة عند الوصول لها، أم تفضّل تخطّيها والاكتفاء بـ fallback تلقائي من البيانات الحالية فقط؟
