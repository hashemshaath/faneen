## إعادة بناء الصفحة الرئيسية لـ qitaat.com

سأعيد بناء `src/pages/Index.tsx` لتطبيق الترتيب والنبرة المطلوبة (أسلوب Apple/IKEA: جمل قصيرة، رسالة واحدة لكل قسم، بدون مبالغة).

### الترتيب الجديد للأقسام (13 قسمًا)

```text
1. Hero            ← H1 + زر "اطلب عرض سعر" (أساسي) + "أضف منشأتك" (ثانوي)
2. شريط القطاعات السريع (chips قابلة للضغط)
3. قسم المشكلة (3 كروت قصيرة)
4. قسم الحل (4 نقاط) + CTA "ابدأ طلبك"
5. كيف تعمل قطاعات؟ (3 خطوات 01/02/03)
6. لمن قطاعات؟ (4 فئات)
7. القطاعات الرئيسية (6 كروت تفصيلية)
8. قسم العملاء       → CTA: اطلب عرض سعر
9. قسم المقاولين والمكاتب الهندسية → CTA: ابحث عن مزودين
10. قسم مزودي الخدمة  → CTA: أضف منشأتك
11. الثقة والوضوح + شارات + تنبيه ودي
12. الأسئلة الشائعة المختصرة (5 أسئلة + FAQPage JSON-LD)
13. CTA النهائي
Footer
```

### الملفات

**جديدة** في `src/components/home/v2/`:
- `HeroV2.tsx` — H1 «مزودو خدمات الصناعات الخفيفة في مكان واحد»، زرّان، نص داعم، 6 chips
- `SectorChipsBar.tsx` — شريط القطاعات الثمانية
- `ProblemSection.tsx` — 3 كروت
- `SolutionSection.tsx` — 4 نقاط + CTA
- `HowItWorksV2.tsx` — 3 خطوات بأرقام كبيرة
- `WhoIsItForSection.tsx` — 4 فئات
- `MainSectorsSection.tsx` — 6 كروت قطاعات
- `ForClientsSection.tsx` — قسم العملاء
- `ForContractorsSection.tsx` — قسم المقاولين
- `ForProvidersSection.tsx` — قسم المزودين
- `TrustSection.tsx` — 4 شارات + تنبيه
- `FAQSection.tsx` — 5 أسئلة accordion
- `FinalCTASection.tsx` — CTA نهائي بزرّين

**معدّلة**:
- `src/pages/Index.tsx` — استبدال كامل للأقسام القديمة، تحديث `usePageMeta` للـMeta Title/Description المطلوبين، إضافة FAQPage JSON-LD، إبقاء `Navbar`/`Footer`/`ScrollToTop` كما هي
- استخدام `<Bi>`/`useBi()` لكل النصوص (AR رئيسي + EN موازٍ)

### مبادئ التطبيق
- **زر أساسي** = `/auth?intent=quote` أو `/search` (سأستخدم `/search` كنقطة طلب — لا توجد صفحة "اطلب عرض سعر" مستقلة، لذا CTA يقود لمسار البحث/الاتصال). الزر الثانوي «أضف منشأتك» → `/auth?mode=signup&role=provider`.
- **تصميم**: tokens موجودة (`bg-card`, `text-foreground`, `bg-primary`, `rounded-xl`, `.hover-lift`)، خط `IBM Plex Sans Arabic`، RTL كامل، H1 واحد فقط (في Hero)، باقي الأقسام H2.
- **جوال**: container-app + grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`، أزرار `h-12` أو `size="appLg"`.
- **أداء**: الأقسام الجديدة خفيفة (نص + أيقونات lucide فقط)، lazy-load عبر `LazyOnView` للأقسام تحت الطية كما في النمط الحالي.
- **SEO**: Meta Title «قطاعات | مزودو خدمات الألمنيوم والحديد والخشب والزجاج في السعودية»، Description المطلوب، FAQPage JSON-LD، الكلمات المفتاحية مدمجة طبيعيًا في النصوص.
- **عدم المبالغة**: لن أستخدم «الأفضل/الأسرع/مضمون» في أي مكان.

### ما لن يُلمس
- `Navbar`, `Footer`, `HeroParticles` (يبقى للزينة)، نظام الترجمات، الـrouting، أي backend/RLS.
- المكونات القديمة (`HeroSection.tsx`, `WhyQitaatSection.tsx`, إلخ) تبقى في الكود لاستخدامها في صفحات أخرى إن وُجدت — فقط `Index.tsx` يتوقف عن استيرادها.

### التقرير النهائي
بعد التنفيذ سأقدم التقرير المطلوب (8 نقاط: الأقسام المعدّلة، النصوص، الرحلة، CTAs، SEO، الجوال، روابط، الخطوات التالية).
