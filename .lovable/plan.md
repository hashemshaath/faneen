
# تطوير نظام الفروع الاحترافي

## نظرة عامة
تطوير شامل لقسم الفروع مع ربط متكامل بالمنتجات والعروض والموظفين ومركز العناوين، مع صفحات تواصل لكل فرع.

## 1) تغييرات قاعدة البيانات (Migration واحدة)

### إضافة أعمدة على `business_branches`
- `slug` text — معرف URL فريد لكل فرع داخل المنشأة
- `whatsapp` text, `working_hours` jsonb — تواصل موسّع
- `sales_manager_staff_id` uuid → `business_staff(id)` — مدير المبيعات المعيّن
- `social_instagram`, `social_x`, `social_tiktok`, `social_linkedin`, `social_facebook`, `social_snapchat`, `social_youtube` (text) — سوشال خاص بالفرع
- `address_id` uuid → `business_addresses(id)` — ربط بمركز العناوين (الموقع التفصيلي)
- `short_address`, `floor_number`, `unit_number` text — متوافقة مع العنوان الوطني
- `description_ar`, `description_en` text

### قيود وفهارس
- `UNIQUE(business_id, slug)` و `UNIQUE(business_id) WHERE is_main = true` (فرع رئيسي واحد فقط)
- ترايجر `enforce_single_main_branch` يحوّل التعيين الجديد ويُلغي القديم ذرّياً
- ترايجر `ensure_main_branch_exists` يضمن وجود فرع رئيسي عند أول إدراج (هجين: يُنشأ تلقائياً ويمكن تبديله لاحقاً)
- ترايجر `validate_branch_sales_manager` يتأكد أن staff تابع لنفس business_id

### جداول جديدة
- `branch_products` (branch_id, product_id, business_id, created_at, PK مركّب) — ربط منتج بفرع
- `branch_offers` (branch_id, offer_id, business_id, created_at, PK مركّب) — ربط عرض بفرع
- جميعها مع GRANTs + RLS (مالك/مدير المنشأة يكتب، الجمهور يقرأ النشط)

### View عام
- `business_branches_public` يُحدَّث ليشمل الحقول الجديدة (بدون PII الحساسة كـ national_id)

## 2) طبقة الخدمات (`src/modules/catalog/services/branches/`)

### Reads
- `listBusinessBranches(businessId)` — مع join لـ staff (مدير المبيعات) والعنوان
- `getBranchBySlug(businessId, slug)` للصفحة العامة
- `listBranchProducts(branchId)`, `listBranchOffers(branchId)`

### Mutations
- `updateBranch`, `setMainBranch(branchId)` (يستخدم RPC ذرّي)
- `attachProductToBranch`, `detachProductToBranch` (+ مكافئها للعروض)
- `assignSalesManager(branchId, staffId)`

## 3) لوحة التحكم — إعادة تصميم

### صفحة `DashboardBranchesHub` جديدة
- شبكة بطاقات فرع (نمط dashboard-standard): شارة "رئيسي"، صورة/رمز، اسم، عنوان، عدد المنتجات/العروض، مدير المبيعات
- زر "+ إضافة فرع" inline (لا dialog)
- فلتر/بحث + ترتيب بالسحب (dnd-kit) لـ sort_order

### صفحة `DashboardBranchEdit/[branchId]` تفصيلية
تبويبات inline:
1. **الأساسية**: الاسم، الوصف، is_main toggle، is_active
2. **التواصل**: هاتف/جوال/واتس/إيميل + ساعات العمل
3. **الموقع**: اختيار من `business_addresses` (مركز العناوين) — لا إدخال يدوي
4. **مدير المبيعات**: Select من business_staff (موظفي نفس المنشأة) — يعرض الاسم/الجوال
5. **السوشال ميديا**: 7 حقول
6. **المنتجات**: متعدد الاختيار من منتجات المنشأة (checkbox grid)
7. **العروض**: متعدد الاختيار من عروض المنشأة + شرح: "إن لم تُحدَّد، تظهر عروض الكيان كاملة"

### تكامل مع `DashboardBusinessEdit`
- إزالة تبويب "الفروع" القديم → استبداله برابط لـ `DashboardBranchesHub`

## 4) الصفحات العامة

### تبويب "الفروع" داخل `BusinessProfile`
- قائمة فروع مدمجة (cards) مع switcher
- زر "صفحة الفرع" لكل بطاقة

### صفحة جديدة `BranchDetail` على `/b/:username/branch/:slug`
- Hero: اسم الفرع، شارة "رئيسي"، عنوان كامل، خريطة
- بطاقة تواصل: هاتف/جوال/واتس مع أزرار اتصال مباشر
- بطاقة "مدير المبيعات" مع الاسم والجوال
- شبكة السوشال ميديا
- قسم منتجات الفرع (يستخدم نفس بطاقات المنتجات)
- قسم عروض الفرع (أو كل عروض المنشأة عند الفراغ)
- JSON-LD `LocalBusiness` + breadcrumbs + canonical
- زر "تواصل" يفتح Sheet المراسلة الحالية مع تمرير branch_id

## 5) Route + SEO
- إضافة `/b/:username/branch/:slug` في `App.tsx` (lazy)
- تحديث `useSitemap` (إن وُجد) لإضافة فروع نشطة
- `useNoIndex` للفروع غير النشطة

## 6) الجودة والتنظيف
- اختبارات Vitest:
  - `branches.mutations.test.ts` — setMainBranch ذرّي
  - `branches.linking.test.ts` — منتج/عرض ↔ فرع
  - `branches.salesManager.test.ts` — staff isolation
  - `BranchDetail.test.tsx` — render + JSON-LD
- تشغيل `bunx eslint . --max-warnings=80` + `bunx tsc --noEmit`
- تحديث `mem://features/business-branches`

## التفاصيل التقنية

### حقول الفرع النهائية
```
الأساسية: id, business_id, ref_id (LOC-NNNN), slug, is_main, is_active, sort_order
الهوية: name_ar/en, description_ar/en
التواصل: phone, mobile, whatsapp, customer_service_phone, email, website, working_hours(jsonb)
السوشال: 7 حقول
الموقع: address_id → business_addresses
الفريق: sales_manager_staff_id → business_staff
```

### قيود RLS
- المالك/المدير: CRUD كامل
- موظفو المنشأة: SELECT فقط
- الجمهور (anon): SELECT عبر `business_branches_public` (بدون PII)
- مدير المبيعات: يجب أن يكون staff نشط في نفس business_id

### استراتيجية الفرع الرئيسي (هجين)
- ترايجر `BEFORE INSERT`: إن لم يوجد رئيسي للمنشأة → الجديد يصبح رئيسي
- RPC `set_main_branch(branch_id)`: ذرّياً يُلغي القديم ويُعيّن الجديد
- لا يمكن حذف الرئيسي إذا كانت هناك فروع أخرى (يجب تعيين بديل أولاً)

## الملفات الجديدة (تقدير)
- 1 migration
- 4 ملفات خدمة (reads/mutations جديدة)
- 3 صفحات (`DashboardBranchesHub`, `DashboardBranchEdit`, `BranchDetail`)
- 6 مكونات تبويبات
- 4 ملفات اختبار

## الملفات المعدّلة
- `src/App.tsx` (route جديدة)
- `src/pages/BusinessProfile.tsx` (تبويب الفروع)
- `src/pages/dashboard/DashboardBusinessEdit.tsx` (إزالة قسم الفروع القديم)
- `src/modules/catalog/services/branches/{reads,mutations}.ts` (توسيع)
- `src/integrations/supabase/types.ts` (يُولَّد تلقائياً بعد الـ migration)

## الحجم المتوقع
عمل كبير: ~25-30 ملف جديد/معدّل، migration واحدة كبيرة. سأنفذها على دفعات داخل نفس الجلسة:
1. **الدفعة 1**: Migration + types regeneration
2. **الدفعة 2**: خدمات + اختبارات الخدمة
3. **الدفعة 3**: لوحة التحكم (Hub + Edit)
4. **الدفعة 4**: الصفحة العامة + Route + SEO
5. **الدفعة 5**: تنظيف + ESLint/TSC + اختبارات + تحديث الذاكرة

اعتمد للبدء.
