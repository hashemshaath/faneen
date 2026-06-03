# إعادة هيكلة نظام المواقع (Client Sites)

تحويل المواقع من مجرد قائمة عناوين إلى **مركز أساسي** لكل ما يتعلق بالعميل: تفاصيل، عقود، عروض، استفسارات، زيارات، ومراحل تنفيذية. دور المزود (الذي يقدم خدمات فقط) يبقى كما هو دون تغيير.

## 1) قاعدة البيانات

### إضافة حقول الصور إلى `client_sites`
- `cover_image_url text` — صورة الغلاف الرئيسية
- `gallery_images jsonb default '[]'` — مصفوفة `{url, caption, sort_order}`

### Storage Bucket جديد
- `client-site-images` (private)
- مجلدات: `{site_id}/cover/...` و `{site_id}/gallery/...`
- RLS: قراءة/كتابة لمالك الموقع فقط (`owner_user_id = auth.uid()` أو staff موافق عليه)

### ربط الكيانات الموجودة بالموقع
الجداول التالية تكتسب عمود `site_id uuid references client_sites(id) on delete set null` (إن لم يكن موجوداً):
- `contracts.execution_site_id` ✅ موجود
- `lead_requests.source_site_id` ✅ موجود
- `service_requests` → إضافة `site_id`
- `rfq_requests` → إضافة `site_id`
- `customer_project_notifications` → موجود `client_site_id` (تحقق)

### دالة سجل موحّد للموقع
```text
get_client_site_timeline(_site_id uuid)
returns table(event_at, event_type, ref_id, title, status, actor, meta jsonb)
```
تجمع: زيارات (`client_site_visit_logs`) + عقود + عروض أسعار + استفسارات + مراحل تنفيذية (milestones) + طلبات الوصول.

## 2) Storage + Upload

- مكوّن `<SiteCoverUploader>` يرفع صورة 16:9 (max 2MB، WebP تلقائي) إلى `client-site-images/{id}/cover/`.
- مكوّن `<SiteGalleryManager>` لإدارة معرض الصور (إضافة/حذف/إعادة ترتيب dnd-kit).

## 3) صفحة الموقع `/dashboard/sites/:id`

صفحة جديدة كاملة بهيكلة:

```text
┌─────────────────────────────────────────┐
│ Cover Image (16:9 hero)                 │
│  └── Site name + ref + type + city      │
└─────────────────────────────────────────┘
[Tabs sticky]
 • نظرة عامة     — تفاصيل، خريطة، جهة اتصال
 • العقود        — قائمة العقود لهذا الموقع
 • عروض الأسعار  — RFQ + Quote opportunities
 • الاستفسارات   — Service requests + رسائل
 • المراحل التنفيذية — milestones عبر العقود
 • السجل الزمني  — Timeline موحد
 • المعرض        — gallery
 • الإعدادات     — visibility, QR, access grants
```

## 4) قائمة المواقع (`/dashboard/sites`)

تحديث البطاقات لتعرض:
- صورة الغلاف بدلاً من placeholder
- عداد العقود النشطة + العروض المعلّقة
- زر "فتح الموقع" يفتح `/dashboard/sites/:id`

أزرار الإجراءات الموجودة (تعديل، أرشفة...) تبقى inline كما هي (لا popups).

## 5) نموذج الإضافة/التعديل

إضافة قسم "الصور" في الـ inline form:
- رفع غلاف
- إدارة معرض الصور

## 6) دور المزود (لا تغيير)

- المزود الذي يقدم خدمة فقط: تبويب "العقود" في لوحته يبقى كما هو، مع إظهار الموقع كحقل مرجعي (`STE-NNNN-NNNNNN`) داخل بطاقة العقد.
- لا نضيف تبويب جديد للمزود.

## 7) العقود (Source of Truth)

كل عقد **يجب** أن يكون مرتبطاً بموقع عبر `execution_site_id`:
- نموذج إنشاء العقد: حقل الموقع مطلوب عندما يكون منشئ العقد عميلاً يملك مواقع.
- ضمن صفحة الموقع: زر "إنشاء عقد جديد لهذا الموقع" يفتح فورم العقد مع تعبئة الموقع مسبقاً.

## التفاصيل التقنية

- ملفات جديدة: `src/pages/dashboard/DashboardSiteDetail.tsx`, `src/components/sites/SiteCoverHero.tsx`, `src/components/sites/SiteCoverUploader.tsx`, `src/components/sites/SiteGalleryManager.tsx`, `src/components/sites/tabs/Site{Overview,Contracts,Quotes,Inquiries,Milestones,Timeline,Gallery,Settings}Tab.tsx`, `src/modules/sites/services/getSiteTimeline.ts`.
- Migration: إضافة `cover_image_url` + `gallery_images` + `service_requests.site_id` + `rfq_requests.site_id` + دالة `get_client_site_timeline` + bucket + RLS.
- توسيع `DashboardSites.tsx` ببطاقة جديدة (Cover + counters) + ربط `onClick → navigate('/dashboard/sites/:id')`.
- توسيع `App.tsx`: مسار `/dashboard/sites/:id`.
- إعادة استخدام مكونات العقود والـ RFQ الحالية داخل التبويبات (لا نسخ منطق، فقط فلترة بـ `site_id`).
- لا تغيير على نظام المزود بالكامل.

## الموجة 1 (هذه الجلسة)
1. Migration الصور + Storage + bucket.
2. صفحة الموقع `/dashboard/sites/:id` بهيكل التبويبات.
3. تبويب نظرة عامة + الغلاف + المعرض.
4. تحديث البطاقات في القائمة لاستخدام الغلاف وعدّاد العقود.

## الموجة 2 (لاحقاً)
5. تبويب العقود + العروض + الاستفسارات (تجميع البيانات الموجودة).
6. تبويب السجل الزمني (`get_client_site_timeline` RPC).
7. تبويب المراحل التنفيذية.

هل تعتمد البدء بالموجة 1؟
