# خطة: إزالة نظام التصنيفات القديم (Legacy Categories Sunset)

نطاق ضخم جدًا — سأنفّذه على مراحل مع التزام كامل بالقيود (لا حذف جداول/أعمدة، لا كسر صفحات، لا حذف SECTORS_SEO). قبل أي تعديل، سأبدأ بمرحلة الفحص لأعطيك خريطة دقيقة ثم نتفق على ما يُستبدل الآن وما يُؤجَّل.

---

## المرحلة 0 — الفحص الشامل (Read-only، بدون أي تعديل كود)

أشغّل subagent لمسح كامل المشروع وإصدار التقرير المطلوب في "أولًا":

- كل استدعاءات الجداول: `categories`, `tags`, `business_services.category_id`
- كل قراءة/كتابة للحقول: `businesses.category_id`, `businesses.sectors`, `businesses.sub_services`, `showcase_submissions.sector_slug`, `quote_requests.sector`, `projects.category_id`
- كل المكونات: `AdminCategories`, `AdminTags`, `CategoryTree`, `SectorPicker`, `ONBOARDING_SECTORS`, `SECTORS_SEO*`, `SECTOR_KEYWORDS`, `ALL_SECTORS`, `BrandsCatalogLegacy`, `BranchServicesSection`
- كل Edge Functions تلمس الحقول القديمة
- كل الـ hooks/services: `listActiveCategories`, queries القديم

**المخرج**: جدول لكل ملف يتضمن: الاستخدام القديم / البديل الجديد / إجراء الآن أم تأجيل / السبب.

**قرار التأجيل التلقائي** (لن أعدّلها الآن إلا بعد موافقتك):
- `SectorLanding`, `SectorCity`, `SectorBrief` — تعتمد على `SECTORS_SEO` للـ SEO وصفحات القطاعات العامة، خارج النطاق المسموح في المراحل السابقة.
- `sitemap` edge function — ممنوع تعديله.
- `match-quote-request` edge function — ممنوع تعديله.
- `quote_requests.sector` — يستخدمه RPC المطابقة.
- `projects.category_id` — يحتاج migration `project_taxonomy_categories` منفصلة، TODO فقط.

---

## المرحلة 1 — تعطيل صفحات الإدارة القديمة

- إزالة `/admin/categories` و `/admin/tags` من Sidebar.
- إبقاء الـ routes لكن استبدال محتواها بصفحة "تم استبدال هذه الصفحة" + زر "فتح مركز التصنيفات" → `/admin/taxonomy`.
- لا يُعرض `AdminCategories` أو `AdminTags` للأدمن نهائيًا.

## المرحلة 2 — الواجهات (Taxonomy-only display & write)

استبدال واجهة المستخدم في:

1. **Onboarding** — إخفاء `SectorPicker` نهائيًا (يبقى الكود fallback داخلي فقط). لا كتابة لـ `sectors`/`sub_services` من هنا.
2. **Business edit** (`/dashboard/business/edit` + `/admin/businesses` edit) — حذف بطاقة "التصنيف القديم"، إبقاء `BusinessTaxonomySection` فقط.
3. **BusinessCard** — عرض taxonomy فقط. غياب التصنيف → "غير مصنّف" (للأدمن: "تحتاج ربط تصنيف"). إزالة `category.name_*` fallback.
4. **BusinessProfile** — نفس قاعدة BusinessCard.
5. **Search filters** — `taxonomy_categories` فقط، حذف `CategoryTree` القديم من الـ UI. روابط `?sector=` تعمل عبر `taxonomy_legacy_mappings` فقط (موجودة).
6. **Showcase upload/admin** — كتابة `taxonomy_category_id` فقط، إخفاء `sector_slug` من الواجهة (يُقرأ للمطابقة الداخلية فقط).
7. **Dashboard Services** — اختيار التصنيف من taxonomy (service/product_category/product_type).

## المرحلة 3 — منع الكتابة للحقول القديمة

تنقيح كل mutations لتمرير `null` للحقول القديمة بدل قيم جديدة، مع تعليق:
```
// TODO(legacy-sunset): retained for rollback only. Do not write new data.
```

## المرحلة 4 — خدمات موحّدة

التأكد أن كل الشاشات الجديدة تمر عبر:
`getTaxonomyCategoriesForRegistration`, `…ForSearch`, `…ForServices`, `getBusinessTaxonomyDisplayBatch`, `setBusinessTaxonomyCategories`, `getShowcaseTaxonomyCategories`. إنشاء ما هو ناقص.

## المرحلة 5 — تقرير "استخدام النظام القديم" داخل `/admin/taxonomy`

كرت جديد بجانب كرت الاعتماد:
- عدد الصفوف في `categories` / `tags`
- عدد المنشآت ذات `category_id` غير null
- عدد المنشآت ذات `sectors`/`sub_services` غير فارغة
- آخر تاريخ كتابة (إن أمكن من `updated_at`)

## المرحلة 6 — Migration حذف مؤجَّلة (ملف TODO فقط)

إنشاء ملف توثيق: `docs/legacy-categories-deprecation-plan.md` يتضمن SQL النهائي للحذف **معلَّق كـ comments** ولا يُنفَّذ. خطوات الحذف:
1. `ALTER TABLE businesses DROP COLUMN category_id, DROP COLUMN sectors, DROP COLUMN sub_services;`
2. `ALTER TABLE business_services DROP COLUMN category_id;`
3. `ALTER TABLE showcase_submissions DROP COLUMN sector_slug;`
4. `DROP TABLE tags; DROP TABLE categories;`

شرط التنفيذ: تقرير اعتماد taxonomy 100% + موافقة صريحة منك.

## المرحلة 7 — اختبارات

إضافة/تحديث:
- `onboarding.legacy-hidden.test.tsx`
- `business-edit.taxonomy-only.test.tsx`
- `business-card.no-legacy-fallback.test.tsx`
- `admin-categories.replaced.test.tsx`
- `showcase-upload.taxonomy-only.test.ts`
- `no-legacy-writes.audit.test.ts` (grep يضمن عدم وجود `insert/update` على الحقول القديمة في `src/`)

---

## القيود المؤكَّدة (لن أكسرها)

- ✅ لا حذف جداول/أعمدة
- ✅ لا تعديل `SectorLanding`/`SectorCity`/`SectorBrief`
- ✅ لا تعديل `sitemap` / `match-quote-request` / أي Edge Function
- ✅ لا حذف `SECTORS_SEO` / `SECTOR_KEYWORDS`
- ✅ روابط `?sector=` القديمة تستمر بالعمل عبر `taxonomy_legacy_mappings`
- ✅ Onboarding/Showcase/Dashboard Services/إنشاء المنشأة لا تنكسر

---

## كيف نبدأ

نظرًا لضخامة المسح (عشرات الملفات) أقترح:

**خطوة 1 الآن**: أشغّل subagent للفحص الشامل وأعود إليك بتقرير "أولًا" الكامل (جدول لكل ملف).
**خطوة 2 بعد موافقتك على الجدول**: أنفّذ المراحل 1→7 بالترتيب في رسائل متتابعة قصيرة، كل مرحلة بتعديلات محدودة وقابلة للمراجعة.

هل أبدأ بمرحلة الفحص؟ أم تريد تعديل النطاق/الأولويات قبل ذلك؟
