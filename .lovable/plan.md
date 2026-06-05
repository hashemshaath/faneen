## نطاق العمل لصفحة الفرع `/{username}/{branch-slug}`

سأنفذ خمس مجموعات تحسينات على ملف `src/pages/BranchDetail.tsx` ومكوناته، مع ترحيلات قاعدة بيانات لازمة. التنفيذ مرتب حسب التبعية.

### 1) الأداء والتحميل الكسول + OpenGraph دقيق
- إضافة `loading="lazy"` و`decoding="async"` و`width/height` لجميع صور الخدمات والمعرض والشعار (ما عدا صورة الهيرو = `eager` + `fetchpriority=high`).
- تقسيم المكونات الثقيلة عبر `React.lazy` + `Suspense`: `ShareMenu`, `BranchVisitCounter`, `BranchReviews` (جديد), `BranchInquiryForm` (جديد), خريطة Leaflet.
- إضافة Helmet ديناميكي لكل فرع: `title`, `description` (من `about_ar/en` أو خدمات الفرع)، `og:title`, `og:description`, `og:image` (شعار/صورة الفرع)، `og:url` (canonical)، `og:locale` (ar_SA / en_US)، `twitter:card=summary_large_image`.

### 2) نموذج "استفسار / طلب خدمة"
- جدول جديد `branch_inquiries` (branch_id, business_id, user_id, service_id?, name, phone, email?, message, budget?, status[`pending|in_review|responded|closed`], created_at, updated_at).
- RLS:
  - INSERT: مفتوح للمستخدمين المسجلين (auth.uid()).
  - SELECT: المستخدم يرى استفساراته فقط، ومالك المنشأة/الطاقم يرى استفسارات منشأته (`has_business_access`).
  - UPDATE (تغيير الحالة): مالك المنشأة/الطاقم فقط.
- مكون `BranchInquiryForm.tsx` (inline، بدون popup) + قسم "استفساراتي" داخل لوحة المستخدم لاحقًا (سأضيف الكارد + الجدول الآن).
- إشعار للمنشأة عند إنشاء استفسار جديد (insert في `notifications` عبر trigger).

### 3) نظام تقييم ومراجعات
- جدول جديد `branch_reviews` (branch_id, business_id, user_id, rating[1-5], title?, comment, status[`pending|approved|rejected`], approved_by?, approved_at?, created_at, updated_at). Unique على (branch_id, user_id).
- RLS:
  - SELECT: عام للمراجعات `approved`؛ المالك/الطاقم يرى الكل.
  - INSERT/UPDATE: مستخدم مسجل على مراجعته فقط.
  - APPROVE/REJECT: مالك المنشأة/الطاقم أو admin.
- View `branch_review_stats_view` (branch_id, avg_rating, total_approved, dist_5..1).
- مكونات: `BranchReviews.tsx` (قائمة + متوسط نجوم + توزيع)، `BranchReviewForm.tsx` (inline)، `StarRating.tsx`.

### 4) قسم الخدمات داخل صفحة الفرع
- استخدام `business_services` المرتبطة بالمنشأة مع شريط فلترة بحسب `category` (نوع الخدمة).
- بطاقات خدمة بتصميم موحد + شارة "متاح" + CTA: "اطلب عرض سعر" → يفتح `BranchInquiryForm` مع `service_id` مملوء مسبقًا.
- بحث نصي محلي + ترتيب (الأحدث/السعر).

### 5) SEO لصفحة الفرع
- Helmet (البند 1) + JSON-LD `LocalBusiness` لكل فرع (الاسم، العنوان، الهاتف، `geo`، `openingHours` إن وجدت، `aggregateRating` من `branch_review_stats_view`).
- JSON-LD `BreadcrumbList`: الرئيسية → المنشأة → الفرع.
- ترقية `supabase/functions/sitemap/index.ts` لإضافة روابط الفروع `/{username}/{branch.slug}` بلغتين (`hreflang` ar/en) واستبعاد slugs الرقمية القديمة.
- `<link rel="alternate" hreflang="ar" />` و`hreflang="en"` للفرع.

### الملفات المعدلة/المنشأة
- ترحيل واحد: `branch_inquiries`, `branch_reviews`, `branch_review_stats_view`, trigger للإشعار.
- جديد: `src/components/branch/BranchInquiryForm.tsx`, `BranchReviews.tsx`, `BranchReviewForm.tsx`, `BranchServicesSection.tsx`, `src/components/ui/StarRating.tsx`, `src/hooks/useBranchReviews.ts`, `src/hooks/useBranchInquiries.ts`.
- معدّل: `src/pages/BranchDetail.tsx`, `supabase/functions/sitemap/index.ts`.

### ملاحظات تقنية
- بدون popups (التزامًا بقاعدة المشروع): النماذج inline داخل بطاقات قابلة للطي.
- بدون `any`، أخطاء كـ `unknown` مع `instanceof Error`.
- `tech-content` لأرقام الهواتف والأسعار، `dir="auto"` للمدخلات.
- VAT/تنسيق العملات يتبع الإعدادات الحالية.
- جميع GRANTs الإلزامية لجداول `public` ستضاف في نفس الترحيل.
