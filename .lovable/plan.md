
# تصنيف المشاريع — توسعة شاملة

سننفذ خمسة محاور مترابطة، كلها فرونت-إند بدون أي تغييرات في قاعدة البيانات أو RLS. نعتمد على البنية الموجودة: `project_taxonomy_categories` + RPC `set_project_taxonomy_categories` + جدول `taxonomy_categories` (يُدار بالفعل من `/admin/taxonomy`).

---

## 1) تعيين تصنيفات للمشروع داخل شاشة الإنشاء/التعديل

- مكوّن جديد `ProjectCategoryPicker.tsx`:
  - يجلب التصنيفات من `getProjectTaxonomyPickerCategories()`.
  - حقل بحث فوري (يبحث بالاسم العربي/الإنجليزي + alias).
  - عرض كقائمة شِبس قابلة للاختيار: تصنيف أساسي واحد + ثانويات متعددة.
  - عداد لما هو مختار + زر إلغاء الكل.
  - RTL-aware، يلتزم بسياسة "لا منبثقات" (Inline panel فقط).
- ندمجه في فورم إنشاء/تعديل المشروع داخل `DashboardProjects.tsx` (محل أي حقل category مفرد قديم) ويحفظ عبر `setProjectTaxonomyCategories`.

## 2) فرز داخل تبويبات التصنيفات + حفظ للمستخدم

- نوسّع `ProjectCategoryTabs` ليقبل `sortValue` و `onSortChange` اختياريين، ويعرض قائمة فرز مُدمجة بجانب التبويبات (Inline Select بسيط، بدون Dialog).
- خيارات الفرز:
  - `newest` — الأحدث
  - `top_rated` — الأعلى تقييماً (متوسط `profile_reviews.rating` للمشروع)
  - `most_completed` — الأكثر إنجازاً (status = completed أولاً ثم updated_at)
- حفظ الاختيار لكل مستخدم في `localStorage` بمفتاح `qitaat_project_sort_<scope>` (scopes: `dashboard`, `profile`, `public`). نقدّم Hook `useProjectSortPref(scope)`.
- يُطبَّق الفرز محلياً على المصفوفة الموجودة في الصفحات الثلاث (`DashboardProjects`, `BusinessProfileTabs`, `Projects`).

## 3) اختبارات Playwright للموبايل والتابلت

- ملف جديد `e2e/project-category-tabs-responsive.spec.ts`:
  - viewports: 390×844 (موبايل) و 820×1180 (تابلت).
  - الانتقال بين التبويبات وتطابق العدّاد مع عدد البطاقات الظاهرة.
  - تمرير أفقي للتبويبات عند التجاوز (assert `scrollLeft` يتغيّر).
  - فحص اتجاه RTL: `dir="rtl"` على الحاوية والشِبس لا تتجاوز الـ viewport.
  - فحص عدم وجود أخطاء كونسول.

## 4) SEO ديناميكي لصفحات التصنيفات

- في `src/pages/Projects.tsx`:
  - عند تغيّر `selectedCategory`، نُحدِّث `usePageMeta` (العنوان/الوصف/canonical يتضمن اسم التصنيف + كاش-باستر آمن) ونُحدِّث `useMultiJsonLd` ليُصدر:
    - `BreadcrumbList` (الرئيسية ← المشاريع ← اسم التصنيف).
    - `CollectionPage` يلفّ `ItemList` للمشاريع المرئية حالياً (حتى 20).
  - عند `__all__` نعود إلى ميتا الصفحة العامة.

## 5) صفحة إدارة تصنيفات المشاريع في لوحة التحكم

- مسار جديد `/dashboard/project-categories` (للمالك/المسؤول)، يُلفّ في `DashboardLayout`.
- جدول إدارة (Inline forms حسب سياسة لا-منبثقات):
  - إنشاء/تعديل (الاسم AR/EN، slug، sort_order).
  - تفعيل/تعطيل الظهور (`is_active` + `show_in_search`).
  - حذف (soft via `is_archived = true` إن متاح، وإلا حذف فعلي مع تأكيد inline).
  - السحب لإعادة الترتيب أو حقول `sort_order` سريعة (نختار الحقول لتجنّب اعتماد إضافي على dnd-kit في هذا الجزء).
- نقطة دخول من `DashboardSidebar` ضمن مجموعة "المشاريع".

> ملاحظة: التصنيفات نفسها يُديرها admin مركزياً في `/admin/taxonomy`. هذه الصفحة تكميلية للمزوّد/المسؤول لإدارة الظهور/الترتيب الخاص بتصنيفات المشاريع فقط — ستستخدم نفس الـ RPC/جداول الحالية ولن تنشئ أي جدول جديد. لو الـ RLS الحالي لا يسمح للمزوّد بالكتابة، ستظهر الصفحة للمسؤول فقط (read-only للمزود) بدون أي تغيير في policies.

---

## التحقق

- `tsc --noEmit` بدون أخطاء.
- اختبار Playwright يمر محلياً على الفيوبورتين.
- مراجعة JSON-LD يدوياً عبر devtools (block واحد لكل filter).

## ما لن نلمسه

- لا تعديلات على DB، RLS، أو migrations.
- لا تغيير على `projects.category_id` (يبقى legacy).
- لا منبثقات/Dialogs — كل الواجهات inline.
