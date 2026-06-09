## الهدف
تحويل `/` إلى واجهة سوق نظيفة بهوية قطاعات، بدون كسر static hero، ولا تحميل vendor-charts/pdf، ولا تعديل التصنيفات.

## ما سيُحذف من الصفحة الحالية (Index.tsx)
الصفحة الحالية فيها 11 قسم متراكمة وتكرارات واضحة:
- `WhoIsItForSection` — مكرّر مع `ForClients` + `ForProviders`.
- `SolutionSection` — يكرر رسالة الـ Hero/Trust.
- `PlatformFeaturesSection` — كرت كثير ورموز كثيرة.
- `TrustSection` — يُدمج في Hero strip صغير بدل قسم كامل.
- `FinalCTASection` — مكرّر مع CTA المزدوج.
- `SectorChipsBar` — يُستبدل بشكل أنظف داخل Hero.
- أيقونات الزينة الزائدة داخل كروت القطاعات (top-right icon badge).

## البنية الجديدة (نفس Index.tsx، نفس HeroV2 الموجود — فقط تنظيم الـ sections)

1. **HeroV2** (موجود، لا يُلمس — يحافظ على static hero + LCP).
2. **HomeSectorGrid** *(جديد)* — يستبدل `MainSectorsSection`. شبكة قطاعات رئيسية من 6 بطاقات نظيفة، صورة + اسم + سطر واحد + سهم. يقرأ من taxonomy إن أمكن مع fallback ثابت للـ slugs الستة الحالية (`aluminum/iron/wood/glass/stainless/fabrication`) لضمان عدم كسر روابط `/search?category=...`.
3. **HomeAudienceSplit** *(جديد)* — قسم واحد مقسوم نصفين (عميل / مزود) بدل قسمين منفصلين. يحل محل `ForClientsSection` + `ForProvidersSection` + `WhoIsItForSection`.
4. **HomeCategoryRow** *(جديد، reusable)* — صفوف متخصصة على نمط سلة/نون:
   - عنوان + عنوان فرعي + زر "عرض الكل"
   - chips تصفية (subcategories)
   - scroll أفقي على الجوال، grid على الديسكتوب
   - كل chip = `/search?category=<slug>` أو `/search?q=<term>` إذا لا يوجد slug
5. **Rows data** عبر ملف `src/components/home/v2/data/categoryRows.ts`:
   - أ. الحديد والستانلس (`iron`, `stainless`, درابزين, أبواب حديد, هياكل)
   - ب. الألمنيوم والزجاج والسيكوريت (`aluminum`, `glass`, سيكوريت, واجهات, شبابيك)
   - ج. الواجهات والكلادينج (واجهات تجارية, زجاجية, كلادينج, مظلات)
   - د. المطابخ والخشب (`wood`, مطابخ ألمنيوم/ستانلس/خشب, أبواب خشبية)
   - هـ. الطاقة والاستدامة (طاقة شمسية, ترشيد, كهرباء, عزل) — Phase 2 إن لم تتوفر تصنيفات
   - و. تأجير المعدات (يربط بـ `/rentals`)
   - ز. المصاعد والصيانة
   - كل صف يستهلك taxonomy عبر hook خفيف؛ ما لا يوجد له تصنيف لا يُعرض (لا روابط مكسورة).
6. **HomeFeaturedShowcase** *(جديد)* — مزودون/أعمال مميزة من `businesses` (verified + featured flag إن وُجد) أو fallback لأحدث verified. لا dummy data. تعليق `TODO: connect to ads microservice / sponsored placements`.
7. **HowItWorksV2** (موجود، يبقى — مفيد وقصير).
8. **FAQSection** (يبقى — مهم لـ JSON-LD).
9. **Footer**.

## التنفيذ
- ملفات جديدة تحت `src/components/home/v2/sections/`:
  - `HomeSectorGrid.tsx`
  - `HomeAudienceSplit.tsx`
  - `HomeCategoryRow.tsx`
  - `HomeFeaturedShowcase.tsx`
  - `data/categoryRows.ts` (mapping خفيف — taxonomy slugs → row group)
- تعديل `src/pages/Index.tsx`: تقليل الـ sections من 11 إلى 7، نفس نمط `lazyRetry` + `LazyOnView` + `Suspense`.
- لا تغيير على `HeroV2`, `SectorChipsBar` (سيُحذف من Index لكن يبقى الملف)، taxonomy، image pipeline، vite.config.
- النصوص: H1 واحد في الهيرو، H2 لكل صف، لغة عربية بيضاء بدون "أفضل/حلول مبتكرة".
- الصور: استخدام نفس `sector-*-{480,768,1024}.webp` الموجودة. لا صور جديدة كبيرة.

## ما لن يتغير
- `index.html` (static hero / preload / critical CSS).
- `vite.config.ts` (chunking).
- `MainSectorsSection.tsx` (سيُترك ولكن لن يُستورد — حذف لاحقًا).
- نظام التصنيفات، الإعلانات، التسجيل، Dashboard.
- meta/JSON-LD/canonical/hreflang.

## مخاطر
- بعض الصفوف (الطاقة، المصاعد، المعدات) قد لا توجد لها taxonomy → سأخفيها بدلاً من عرض روابط مكسورة، وأضع TODO.
- الصفحة ستصبح أطول؛ كل صف lazy تحت الـfold لمنع تراجع LCP.

## التقرير بعد التنفيذ
- ما حُذف / ما أُضيف / mapping الصفوف / مصدر "مميز" / responsive images / build status.

أكمل بالتنفيذ؟