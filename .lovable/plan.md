# HOME PAGE FULL PERFORMANCE + CODE QUALITY AUDIT

## النطاق

الصفحة الرئيسية `/` ‏(`src/pages/Index.tsx`) وكل ما تعتمد عليه:

- `src/components/home/v2/HomeV2.tsx` (Hero LCP)
- `src/components/home/v2/sections/*` (HomeSectorGrid, HomeAudienceSplit, HomeCategoryRows, FAQSection)
- `src/components/home/v2/data/homeTaxonomy.ts`
- `src/components/layout/{Navbar,Footer}.tsx` + ScrollToTop
- `src/hooks/{usePageMeta,useImagePerfTracking}.ts`, `src/components/{LazyOnView,ErrorBoundary}.tsx`, `src/lib/lazyRetry.ts`
- `src/modules/home/*` (FAQ loader)
- أي أصول/صور مرتبطة (hero, sector tiles)

## مرحلة 1 — Audit فقط (لا تعديل)

تقرير داخلي يجيب عن الـ15 سؤال المطلوبة:

1. خريطة الملفات المرتبطة (أعلاه).
2. أكبر المكونات (سطور/تعقيد) — HeroV2, HomeCategoryRows.
3. تكرار sections/cards/CTA helpers بين Sectors↔CategoryRows↔Audience.
4. Fetching: `useHomeFaq` فقط (DB-first + static fallback) — هل يتم في eager أم lazy؟
5. N+1: فحص استعلامات homeFaq.
6. Lazy loading: تحقق من صحة `LazyOnView` + `Suspense` لكل قسم تحت الطية.
7. صور بدون أبعاد (width/height/aspect-ratio).
8. صور كبيرة/غير محسّنة (hero + sector tiles).
9. Animations ثقيلة (HeroParticles, framer-motion على mount).
10. CLS محتمل (skeleton/reserved heights).
11. LCP bottleneck (hero image preload, fetchpriority).
12. Re-renders زائدة (useMemo deps في Index).
13. Hardcoded hex / ألوان خارج tokens.
14. مسميات/روابط قديمة (Faneen, روابط مكسورة).
15. Dead code / imports غير مستخدمة.

## مرحلة 2 — تنظيف الكود

- إزالة imports/مكونات/helpers غير مستخدمة في نطاق home فقط.
- توحيد أي card/CTA مكرر داخل `home/v2/sections/` في primitive مشترك إن وُجد تكرار حقيقي.
- توحيد loading/empty states (SectionFallback موجود — تحقق من استخدامه الكامل).
- لا إعادة هيكلة كبيرة إذا الهيكل الحالي نظيف.

## مرحلة 3 — تحسينات الأداء

- التحقق من `<link rel="preload" as="image">` لصورة hero LCP في `index.html` أو الاكتفاء بـ `fetchpriority="high"` على `<img>`.
- إضافة `width`/`height` (أو `aspect-ratio`) لكل صورة hero/sector لا تملكها.
- ضمان `loading="lazy"` + `decoding="async"` لكل صورة خارج الطية، و `loading="eager"` + `fetchpriority="high"` لـ LCP فقط.
- التحقق من `content-visibility: auto` (موجودة عبر `cv-auto`).
- منع overflow أفقي على الموبايل في `HomeCategoryRows` (horizontal scroll rows).
- تقليل re-renders: useMemo على JSON-LD موجود — التحقق من ثبات `faqItems` reference.

## مرحلة 4 — SEO

- تأكيد H1 واحد (داخل HeroV2).
- title/description/canonical/og:* موجودة عبر `usePageMeta`.
- 5 كتل JSON-LD موجودة (WebSite, ItemList sectors, SiteNav, BreadcrumbList, FAQPage) — تحقق من صحة الـURLs والروابط.
- روابط القطاعات إلى `/search?category=<slug>` — تحقق من عدم وجود slugs ميتة.

## مرحلة 5 — Accessibility

- alt على كل صورة، aria-label للأزرار icon-only.
- Heading hierarchy (h1 → h2 → h3).
- Focus-visible على CTAs.
- contrast باستخدام semantic tokens فقط.
- `<main>` واحد (موجود في Index).

## مرحلة 6 — Mobile

- hero لا يأخذ `100dvh` كامل بلا داعٍ.
- search/CTA tappable ≥44px.
- بدون نصوص <12px.
- لا overflow.

## مرحلة 7 — Tests

ملف جديد: `src/__tests__/homePagePerformanceCleanup.test.tsx`

يثبت (بقراءة source string، نمط الاختبارات الحالية في المشروع):

1. `Index.tsx` يحتوي على `<main>` واحد فقط.
2. كل صورة في hero/sections لها `width` أو `aspect-` class.
3. hero image ليست `loading="lazy"`.
4. أقسام تحت الطية ملفوفة بـ `LazyOnView` + `Suspense`.
5. روابط slugs القطاعات موجودة في `homeTaxonomy.ts`.
6. لا hex literals (`#[0-9a-f]{3,8}`) في ملفات home/v2/.
7. لا duplicate `Section`/`CTA` JSX patterns بنفس النص.
8. لا `is_demo`/`demo`/`fake` data references في ملفات home.
9. لا `@ts-ignore` / `@ts-expect-error` / `eslint-disable` في home scope.
10. JSON-LD يحتوي على WebSite + FAQPage + BreadcrumbList.
11. `usePageMeta` يُستدعى مرة واحدة فقط.

## ممنوعات (التزام صارم)

- لا DB / migrations / RLS / RPC / edge functions.
- لا تغيير Auth / RFQ / membership / provider matching.
- لا حذف routes / كسر redirects.
- لا dependencies جديدة.
- لا `any` / `@ts-ignore` / `eslint-disable` / skipped tests.
- لا hardcoded hex.
- لا تغيير منطق تجاري.

## التقرير النهائي

سأقدم تقرير `HOME PAGE FULL PERFORMANCE + CODE QUALITY AUDIT REPORT` بالـ22 بند المطلوب، مع قرار `PASS` أو `NEEDS FIX`.

## خطة التنفيذ المتسلسلة

1. قراءة كل ملفات home في batch واحد (HeroV2, sections, hooks).
2. كتابة Audit findings.
3. تطبيق التنظيف + التحسينات في حدود frontend home فقط.
4. كتابة + تشغيل الاختبار الجديد.
5. تشغيل `tsc --noEmit` + اختبارات home + suite كامل إن أمكن.
6. تسليم التقرير النهائي.

---

**ملاحظة**: نظرة سريعة على `Index.tsx` تُظهر أنه **محسّن جيداً مسبقاً** (lazyRetry, LazyOnView, Suspense fallbacks, useMemo JSON-LD, tokens, semantic). أتوقع أن معظم التحسينات ستكون داخل الـsections وليس في Index نفسه، وأن النتيجة الأرجح `PASS` مع تعديلات نقطية صغيرة.

هل أبدأ التنفيذ؟