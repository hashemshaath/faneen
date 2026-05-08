# خطة: صفحة هبوط احترافية لمزودي الخدمات + لوحة تحكم إدارية

## الهدف
بناء صفحة هبوط `/for-providers` (وكذلك `/join-as-provider` كـ alias) مُحسّنة لمحركات البحث ومحركات الذكاء الاصطناعي (GEO/AEO) لاستقطاب أصحاب ورش ومصانع الألمنيوم والحديد والزجاج والخشب للتسجيل في قِطاعات، مع لوحة تحكم كاملة لتعديل المحتوى والصور وقياس الأداء.

---

## 1) الواجهة الأمامية — صفحة `/for-providers`

تصميم Apple-like صناعي، RTL/LTR، Mobile-first، خط IBM Plex Sans Arabic، استخدام `<Bi>` للنصوص ثنائية اللغة.

**الأقسام بالترتيب:**

1. **Hero** — عنوان H1 قوي بالكلمات المفتاحية: "انضم لأكبر دليل ورش الألمنيوم والحديد والزجاج في السعودية والخليج". CTA مزدوج (سجّل الآن / شاهد جولة)، شارة ثقة (عدد الورش، عدد المشاريع، عدد العملاء — Live من DB)، خلفية متحركة `HeroParticles` خفيفة.
2. **شريط الإحصائيات** — أرقام حقيقية (عدد الورش، الفروع، العقود، المشاهدات الشهرية).
3. **لماذا قِطاعات؟** — 6 بطاقات (وصول لعملاء جدد، ملف احترافي، إدارة عقود وضمانات، رسائل وحجوزات، تحليلات، AI مساعد).
4. **كيف تعمل المنصة؟** — 4 خطوات: سجّل → فعّل ملفك → أضف خدماتك ومشاريعك → استقبل العملاء.
5. **الميزات الكاملة** — شبكة ميزات (ملف عمل، خدمات، مشاريع/معرض، عقود وفواتير VAT، حجوزات، رسائل، ضمانات، تقييمات، مدونة، AI Center، تحليلات Recharts).
6. **مقارنة العضويات** — Free / Premium / Pro مع الحدود الفعلية من `membership-limits.ts`.
7. **شهادات حقيقية** — Carousel من جدول `provider_testimonials` (جديد).
8. **القطاعات المخدومة** — Grid (ألمنيوم، حديد، زجاج، خشب، مطابخ، ديكورات، حدادة) كروابط داخلية لـ `/sectors/*` لتعزيز الـ internal linking SEO.
9. **FAQ** — 8-10 أسئلة شائعة لمزودي الخدمات (JSON-LD FAQPage).
10. **CTA نهائي قوي** — "ابدأ مجاناً اليوم" مع نموذج تسجيل سريع inline.

**SEO و AI Search Optimization:**
- `usePageMeta` بعنوان ووصف مُحسّنين (<60/<160).
- JSON-LD متعدد: `WebPage` + `Organization` + `Service` + `FAQPage` + `BreadcrumbList` + `AggregateOffer` للعضويات.
- صورة OG ديناميكية عبر edge function `og-image`.
- روابط داخلية لـ `/sectors`, `/categories`, `/projects`, `/blog`.
- محتوى نصي غني (>1500 كلمة عربي) بكلمات مفتاحية: "دليل ورش ألمنيوم", "تسجيل ورشة حديد", "منصة مزودي خدمات صناعات خفيفة".
- ملف `public/llms.txt` يُحدَّث ليشمل وصف الصفحة لمحركات AI (ChatGPT, Claude, Perplexity).
- `aria-*` كاملة + `<section>` semantic.
- صور WebP <80KB مع `loading="lazy"` و `alt` وصفية.
- Preload للـ hero image.

---

## 2) قاعدة البيانات — جداول جديدة

```text
provider_landing_content   (KV لمحتوى الصفحة قابل للتحرير)
  - id, section_key, lang (ar|en), title, subtitle, body_md,
    image_url, cta_label, cta_href, sort_order, is_active

provider_landing_features  (بطاقات الميزات)
  - id, icon_name, title_ar, title_en, desc_ar, desc_en, sort_order, is_active

provider_landing_faq       (أسئلة شائعة)
  - id, question_ar, question_en, answer_ar, answer_en, sort_order, is_active

provider_landing_testimonials
  - id, business_id (FK), quote_ar, quote_en, author_name, author_role,
    avatar_url, rating, is_featured, sort_order

provider_landing_metrics   (event tracking)
  - id, event_type (view|cta_click|signup|scroll_depth|video_play),
    section, cta_id, session_id, user_id, referrer, utm_source,
    utm_medium, utm_campaign, device, country, created_at

provider_landing_settings  (إعدادات SEO + Google)
  - id (singleton), seo_title_ar, seo_title_en, seo_desc_ar, seo_desc_en,
    keywords, og_image_url, ga4_measurement_id, gtm_container_id,
    gsc_verification, hero_video_url, updated_at, updated_by
```

RLS: قراءة عامة للمحتوى النشط، كتابة/حذف للأدمن فقط (`has_role(auth.uid(), 'admin')`).

---

## 3) لوحة التحكم — `/admin/provider-landing`

تبويبات داخلية (بدون popups — inline forms حسب القاعدة):

1. **المحتوى** — تحرير كل قسم (Hero, Why, How, CTA) بالعربي والإنجليزي مع معاينة مباشرة. محرر Markdown خفيف، رفع صور WebP مضغوطة، Drag & drop ترتيب.
2. **الميزات** — CRUD لبطاقات الميزات مع picker من Lucide icons.
3. **الشهادات** — ربط مع businesses موجودين، تفعيل/تعطيل، ترتيب.
4. **الأسئلة الشائعة** — CRUD مع AI generation (`blog-ai-tools` edge function reuse) لتوليد إجابات SEO-friendly.
5. **SEO & Meta** — تحرير العنوان/الوصف/الكلمات/OG image، فحص طول، Score panel (شبيه `SeoScorePanel`).
6. **التحليلات** — Recharts dashboard:
   - Funnel: مشاهدات → CTA clicks → signups
   - أعلى المصادر (UTM)
   - Heatmap للأقسام (scroll depth)
   - معدل التحويل اليومي/الأسبوعي
   - مقارنة قبل/بعد التغييرات
7. **التكاملات** — حقول إدخال: GA4 ID, GTM Container, Search Console verification, IndexNow key، زر "ping search engines" (يستدعي `ping-search-engines` edge function)، عرض حالة الفهرسة من `audit-sitemap-status`.
8. **AI Tools** — توليد عناوين بديلة، اقتراح كلمات مفتاحية، A/B variants لنصوص الـ Hero عبر Lovable AI (`google/gemini-2.5-flash`).

كل التحرير inline، عرض completeness bar، حفظ تلقائي مع toast.

---

## 4) التتبع والتكامل مع Google

- مكون `<AnalyticsLoader>` يحقن GA4 + GTM ديناميكياً من `provider_landing_settings` (بدون hardcode).
- Edge function `track-landing-event` يستقبل events ويكتب في `provider_landing_metrics` + يدفعها لـ GA4 Measurement Protocol (server-side للأمان وتجاوز ad-blockers).
- Hook `useLandingTracking()` يتتبع: page view, scroll depth (25/50/75/100%), CTA clicks, form starts/submits.
- ربط Search Console: عرض meta tag في `<head>` تلقائياً + إضافة الصفحة في sitemap edge function.
- IndexNow: إشعار Bing/Yandex فوراً عند تحديث المحتوى من الأدمن.
- `robots.txt` يتأكد من `Allow: /for-providers` و `/join-as-provider`.

---

## 5) التفاصيل التقنية

- ملفات جديدة:
  - `src/pages/ForProviders.tsx` (الصفحة الرئيسية، lazy-loaded sections)
  - `src/components/for-providers/` (HeroProviders, WhyProviders, HowItWorksProviders, FeaturesGrid, MembershipCompare, TestimonialsCarousel, SectorsGrid, ProvidersFAQ, FinalCTA, AnalyticsLoader)
  - `src/pages/admin/AdminProviderLanding.tsx` (لوحة التحكم بـ tabs)
  - `src/components/admin/provider-landing/` (ContentEditor, FeaturesManager, FaqManager, TestimonialsManager, SeoEditor, AnalyticsDashboard, IntegrationsPanel, AiAssistant)
  - `src/hooks/useLandingTracking.ts`
  - `src/services/providerLandingService.ts`
  - `supabase/functions/track-landing-event/index.ts`
  - `supabase/functions/provider-landing-ai/index.ts`
- Routes في `src/App.tsx`: `/for-providers`, `/join-as-provider` (alias), `/admin/provider-landing` (محمي بـ admin).
- إضافة رابط في `Navbar` + `Footer` (قسم "للأعمال") + `DashboardSidebar` للأدمن.
- Migration واحد لكل الجداول + RLS + seed initial content.
- تحديث `useNoIndex` لاستثناء الصفحة العامة، و noindex على لوحة الأدمن.
- تحديث `mem://features/` بمذكرة جديدة `provider-landing-page`.

---

## 6) ما لن يتم في هذه الجولة (للحفاظ على التركيز)
- A/B testing فعلي بـ split traffic (سيتم فقط تخزين الـ variants).
- Heatmap فيديوهات (Hotjar/Clarity) — يمكن إضافته لاحقاً عبر GTM.
- Multi-variant landing pages (يدعم variant واحد فقط الآن).

---

## التقدير
~12 ملف جديد + migration + 2 edge functions. سيتم البناء على دفعات: (1) DB + RLS + seed، (2) الصفحة العامة + SEO، (3) لوحة الأدمن + التحليلات + التكاملات.

هل تعتمد الخطة لأبدأ التنفيذ؟