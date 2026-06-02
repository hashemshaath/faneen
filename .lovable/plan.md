
## الهدف
معالجة بروفايل الجهة (مثل `qitaat.com/bayanat`) ليكون احترافيًا ومتكاملًا، مع تحكم كامل في إظهار/إخفاء الأقسام من قبل **صاحب الحساب** و**الأدمن**، وعرض **الخدمات المقدّمة** و**الطلبات/الأعمال المطروحة** بدور المزوّد والمستفيد.

---

## 1) قاعدة البيانات — جدول رؤية أقسام البروفايل

إنشاء جدول `business_profile_visibility` (مماثل لـ `client_site_visibility_settings`) للتحكم بكل قسم على حدة:

```text
business_profile_visibility
├── business_id          (FK businesses)
├── section_key          (enum: overview, services, projects, portfolio,
│                                branches, reviews, contact, phone, email,
│                                address, map, requests_as_provider,
│                                requests_as_beneficiary, ratings, social)
├── visibility_level     (public | members_only | after_request | hidden)
├── locked_by_admin      (boolean — لو true يمنع المالك من التعديل)
├── admin_note           (text)
└── updated_by / updated_at
```

- RLS: المالك يقرأ/يكتب لجهته، الأدمن يقرأ/يكتب الكل، العامة تقرأ فقط.
- دالة `get_business_visibility(business_id) → jsonb` لاسترجاع الإعدادات الفعّالة (مع defaults).
- Trigger يمنع المالك من تعديل صف مقفول بـ `locked_by_admin=true`.

## 2) جلب طلبات/أعمال الجهة

استعلامات جديدة في `business-profile.data.ts`:

- `useBusinessRequestsAsBeneficiary(business_id)` — يجلب من `lead_requests` + `quote_requests` + `rfq_requests` حيث الجهة هي **طالبة الخدمة**.
- `useBusinessRequestsAsProvider(business_id)` — يجلب الطلبات التي ردّت/تقدّمت لها الجهة (rfq_quotes, quote_request_leads).
- فلترة على الحالات العامة فقط (مفتوحة/منجزة) وإخفاء الحساسة.

## 3) إعادة تصميم صفحة البروفايل

`src/pages/BusinessProfile.tsx` + `BusinessProfileTabs.tsx`:

- إضافة تبويبَين:
  - **«الطلبات المطروحة»** (كمستفيد) — بطاقات احترافية لكل طلب: العنوان، الفئة، الميزانية، الموعد، الحالة، زر «تقديم عرض».
  - **«أعمال كمزود»** (مشاريع/عروض منفذة) — مدمج/جنبًا لجنب مع المشاريع الحالية.
- إخفاء التبويب تلقائيًا إذا كان `section_key` = `hidden` أو لا يوجد محتوى.
- شارة 🔒 بجانب أقسام `members_only` / `after_request` للضيوف.
- تحسين الـ Header: شريط ثقة، شارات BNPL، إحصائيات حية (عدد الطلبات، عدد المشاريع، التقييم).

## 4) لوحة تحكم المالك

`src/pages/dashboard/DashboardBusinessProfileHub.tsx` — إضافة قسم **«إعدادات الظهور»**:

- شبكة inline (بدون مودال) لكل قسم: مفتاح Switch + قائمة منسدلة لمستوى الرؤية.
- معاينة مباشرة (preview) للبروفايل بعين الزائر.
- شارة «مقفول من الأدمن» للأقسام المقفلة (تظهر للقراءة فقط).

## 5) لوحة تحكم الأدمن

صفحة جديدة `src/pages/admin/AdminBusinessVisibility.tsx` (مرتبطة من مركز الموافقات):

- اختيار الجهة → عرض مصفوفة الأقسام × مستويات الرؤية.
- زر **«قفل/إلغاء قفل»** لكل قسم — يمنع المالك من تغيير الإعداد.
- ملاحظة الأدمن (مرئية للمالك في الـ Hub).
- سجل تدقيق مدمج (من `activity_log` للحركات على `business_profile_visibility`).

## 6) التفاصيل التقنية

- تطبيق الـ visibility على الـ JSON-LD أيضًا (لا تنشر phone/email إذا كان hidden).
- استخدام `<Bi>` و `useBi()` للنصوص ثنائية اللغة.
- استخدام `surface` و `btn-ds` و `.hover-lift` من نظام التصميم.
- استخدام `dir="auto"` و `.tech-content` للأرقام (مبالغ/تواريخ).
- لا مودالات: كل التعديلات inline (وفق سياسة قِطاعات).
- اختبارات: 
  - وحدة لـ `get_business_visibility` (Defaults + overrides + lock).
  - تكامل لـ visibility-aware rendering في `BusinessProfile`.

---

## الملفات المتأثرة (تقديريًا)
- **جديدة**: 1 migration, `AdminBusinessVisibility.tsx`, `BusinessVisibilitySettings.tsx` (component للـ Hub), `useBusinessVisibility.ts`, اختبارَين.
- **تعديل**: `BusinessProfile.tsx`, `BusinessProfileTabs.tsx`, `business-profile.data.ts`, `DashboardBusinessProfileHub.tsx`, `AdminApprovalsCenter.tsx` (إضافة رابط).

أبدأ التنفيذ بمجرّد الموافقة. هل تود تنفيذ الكل دفعة واحدة، أم نبدأ بالأولوية: (أ) عرض الطلبات/الخدمات، ثم (ب) تحكم الرؤية للمالك، ثم (ج) تحكم الأدمن؟
