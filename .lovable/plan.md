# Home Management P2 — المرحلة الأولى: Admin CMS للقطاعات

## الهدف
السماح للمشرف بتعديل بلاطات قطاعات الصفحة الرئيسية (10 بلاطات في `HomeSectorGrid`) من واجهة admin، بدلاً من تعديل كود `HomeSectorGrid.tsx` و `homeTaxonomy.ts` يدويًا في كل مرة. مع الحفاظ على:
- نظام الـ guard test الصارم (`HOME_ALLOWED_SLUGS`).
- استقرار الـ LCP (لا صور، أيقونات Lucide فقط).
- التوافق مع slugs الـ canonical الـ 13 لـ `primary_activity`.

## ما لن يتغير الآن (مؤجل لمراحل لاحقة)
- Partner Showcase CMS (P2.2)
- Hero Slider CMS (P2.3)
- ربط counts ديناميكية من `businesses` (P2.4)
- إضافة قطاعات جديدة خارج الـ 13 canonical (يبقى عبر TaxonomyAdminPage الحالي)

## النطاق الفعلي (P2.1)
المشرف يستطيع من شاشة واحدة `/admin/home-sectors`:
1. اختيار أيّ 10 من الـ 13 primary_activity الـ canonical تظهر على الصفحة الرئيسية.
2. ترتيب البلاطات بالسحب والإفلات (dnd-kit، متّسق مع `Classification System`).
3. تعديل اسم البلاطة (ar/en) ووصفها القصير (ar/en) وأيقونتها (اختيار من قائمة Lucide مدعومة).
4. حفظ مباشر (inline) — بدون popups (التزامًا بـ UX Constraint).

## التصميم التقني

### 1) تخزين بدون migration جديدة
نستخدم العمود الموجود `taxonomy_categories.metadata jsonb` لتخزين إعدادات الصفحة الرئيسية:
```jsonc
// metadata.home_grid
{
  "home_grid": {
    "show": true,           // يظهر في HomeSectorGrid
    "position": 1,          // ترتيب البلاطة (1..10)
    "icon": "Square",       // اسم Lucide icon
    "title_ar": "الألمنيوم",          // override للاسم في البلاطة
    "title_en": "Aluminum",
    "body_ar": "نوافذ وأبواب…",        // النص القصير الظاهر تحت العنوان
    "body_en": "Windows, doors…"
  }
}
```
المزايا: لا migration، RLS الحالي لـ `taxonomy_categories` يكفي (admin only writes)، الـ guard test يبقى يتحقق من الـ slugs.

### 2) Hook موحد
`useHomeSectorTiles()` في `src/modules/home/hooks/`:
- يجلب الـ primary_activity rows عبر `taxonomy_categories` حيث `metadata->home_grid->>show = 'true'`.
- يرتّب حسب `metadata->home_grid->>position`.
- ينقص أو يزيد عن 10 → يكمل من الـ hardcoded `SECTORS` كـ fallback.
- يفشل الـ fetch → يستخدم الـ hardcoded fully (الصفحة لا تتعطل).

### 3) تعديل `HomeSectorGrid.tsx`
- يستهلك `useHomeSectorTiles()`.
- يحوّل `icon: string` إلى مكوّن Lucide عبر `iconRegistry.ts` (whitelist محدود ~30 أيقونة).
- الـ guard assertion يبقى يتحقق من أن كل slug ضمن `HOME_ALLOWED_SLUGS`.

### 4) شاشة admin جديدة
`src/pages/admin/AdminHomeSectors.tsx` + route `/admin/home-sectors` داخل `<AdminRoute>` (التزامًا بـ AdminRoute Wrapper memory):
- كاردات قابلة للسحب (dnd-kit).
- inline fields: title_ar, title_en, body_ar (140 char max), body_en, icon picker (combobox).
- toggle "إظهار على الرئيسية" لكل قطاع من الـ 13.
- Save فوري بـ React Query mutation → invalidate `home-sector-tiles` query.
- معاينة مباشرة لصفّ البلاطات أعلى الشاشة.

### 5) ربط بالـ navigation
إضافة لينك "قطاعات الصفحة الرئيسية" داخل مجموعة "إدارة المحتوى" في dashboard sidebar.

## ملفات سيتم إنشاؤها / تعديلها
- جديد: `src/modules/home/hooks/useHomeSectorTiles.ts`
- جديد: `src/modules/home/data/iconRegistry.ts`
- جديد: `src/pages/admin/AdminHomeSectors.tsx`
- جديد: `src/components/admin/home-sectors/SectorTileEditor.tsx`
- تعديل: `src/components/home/v2/sections/HomeSectorGrid.tsx` (يستهلك الـ hook + fallback)
- تعديل: `src/App.tsx` أو `routes` (إضافة route)
- تعديل: dashboard navigation config (لينك جديد)
- تعديل: `mem://index.md` (إضافة memory جديدة `home-sectors-cms`)

## التحقق بعد التنفيذ
- `homeTaxonomyLinkGuard.test.ts` يجب أن يبقى أخضر.
- بدون DB overrides → الصفحة الرئيسية مطابقة 100% للوضع الحالي.
- مع override واحد (مثلاً تغيير ترتيب الألمنيوم من 1 إلى 3) → ينعكس فورًا بعد invalidate.
- لا أخطاء console، لا regressions في Hero/Search/RFQ/Onboarding.
- النشر، ثم Post-Publish Home Check.

## ما خارج النطاق (تأكيد)
- لا تغيير على `homeTaxonomy.ts` (يبقى source of truth للـ slugs والـ guard).
- لا تغيير على `taxonomy_categories` schema (نستخدم `metadata` jsonb).
- لا فتح Partner Showcase / Hero / counts ديناميكية الآن.
- لا migrations جديدة.
