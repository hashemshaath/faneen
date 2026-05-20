# مركز تحكم المواقع للأدمن

## الهدف
إنشاء مركز موحّد لإدارة كل ما يتعلق بالمواقع في قِطاعات، مع توزيع منطقي على صفحات فرعية.

## البنية المقترحة

```
/admin/locations                       → لوحة المركز (نظرة عامة + روابط)
/admin/locations/catalog               → كتالوج المدن/المناطق/الأحياء (مرجع مركزي)
/admin/locations/service-areas         → مناطق خدمة المنشآت (business_service_areas)
/admin/locations/business-coordinates  → إحداثيات المنشآت على الخريطة (lat/lng + عنوان)
```

### 1. صفحة المركز `/admin/locations`
- بطاقات إحصائية: عدد المدن المعتمدة، عدد مناطق الخدمة المسجلة، عدد المنشآت بإحداثيات/بدون إحداثيات.
- روابط سريعة للأقسام الثلاثة.

### 2. كتالوج المدن `/admin/locations/catalog`
- جدول قابل للبحث/التحرير: `region_ar/en`, `city_ar/en`, `district_ar/en`, `is_active`.
- إضافة/تعديل/تعطيل (لا حذف نهائي حفاظاً على المرجعية).
- استيراد/تصدير JSON (متوافق مع نمط إعدادات النظام الحالي).
- مصدر مركزي يحلّ مكان `src/lib/sa-cities.ts` تدريجياً.

### 3. مناطق خدمة المنشآت `/admin/locations/service-areas`
- جدول `business_service_areas` لكل المنشآت مع فلتر بالمنشأة/المدينة.
- تعديل/حذف/تعيين منطقة رئيسية inline.
- زر «إضافة منطقة لمنشأة».

### 4. إحداثيات المنشآت `/admin/locations/business-coordinates`
- قائمة المنشآت + خريطة Leaflet (نفس `LocationPicker`).
- تعديل lat/lng/region/district/address inline.
- زر «تعبئة تلقائية من الإحداثيات» (Nominatim موجود).
- فلتر: المنشآت بدون إحداثيات.

## التغييرات التقنية

### قاعدة البيانات (هجرة جديدة)
- جدول جديد `public.location_catalog` (region_ar/en, city_ar/en, district_ar/en nullable, is_active, sort_order).
- RLS: قراءة عامة، كتابة `has_role(admin/super_admin)` فقط.
- Seed أولي من `sa-cities.ts`.
- لا تغييرات على `businesses` أو `business_service_areas` (هيكلها كافٍ).

### الواجهة
- 4 صفحات جديدة تحت `src/pages/admin/locations/`.
- إضافة مدخلات في `dashboard-navigation-structure` مجموعة «المحتوى» أو «الإعدادات» للأدمن.
- استخدام `DashboardLayout` + `useNoIndex` + بطاقات/جداول inline (لا popups طبقاً لـ Core).
- إعادة استخدام `LocationPicker` للإحداثيات.

### حماية
- جميع المسارات داخل `RequireAdmin`.
- جميع الطفرات تتحقق من الدور عبر RLS.

## النطاق المستثنى
- لا تغيير على واجهة المستخدم/المزود (`ProviderServiceAreas`, `business-edit`).
- لا تعديل على منطق المصادقة أو أدوار `super_admin`.
- لا حذف للجدول `sa-cities.ts` الآن — يبقى fallback حتى يكتمل الترحيل.

## الملفات الرئيسية
- جديد: migration `location_catalog`
- جديد: `src/pages/admin/locations/AdminLocationsHub.tsx`
- جديد: `src/pages/admin/locations/AdminLocationsCatalog.tsx`
- جديد: `src/pages/admin/locations/AdminBusinessServiceAreas.tsx`
- جديد: `src/pages/admin/locations/AdminBusinessCoordinates.tsx`
- تعديل: `App.tsx` (مسارات)
- تعديل: ملف بنية تنقل الداشبورد (إضافة عناصر القائمة)
