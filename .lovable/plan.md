## الهدف

دمج صفحتَي `/admin/users` (1681 سطر) و`/admin/businesses` (2076 سطر) في **مركز إدارة موحّد** يربط بين المستخدم وما يملكه من منشآت وصلاحيات وعقود في عرض واحد، مع تنظيف الكود وإعادة تصميم احترافية وآمنة.

## البنية الجديدة

مسار موحّد جديد: **`/admin/identity`** (مع إبقاء `/admin/users` و`/admin/businesses` كـ redirects).

```text
/admin/identity                      ← الصفحة الرئيسية (شل واحد)
  ?view=overview                     ← KPIs مدمجة (مستخدمين + منشآت + صلاحيات)
  ?view=users                        ← قائمة المستخدمين
  ?view=businesses                   ← قائمة المنشآت
  ?view=staff                        ← فريق الإدارة
  ?view=disabled                     ← المعطّلون
  ?view=analytics                    ← تحليلات مدمجة
  &focus=USR-1000017                 ← فتح بطاقة جانبية لأي كيان

/admin/identity/u/:userId            ← صفحة كاملة لمستخدم (تستبدل AdminUserDetail)
/admin/identity/b/:businessId        ← صفحة كاملة لمنشأة
```

## التصميم الاحترافي

شل ثلاثي الأقسام يعتمد على Brand Identity v1.0 + Design Tokens:

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: عنوان + KPI Strip (6 بطاقات صغيرة)          [+ جديد]│
├──────────┬──────────────────────────────┬───────────────────┤
│ Filters  │ List (Users أو Businesses)   │ Detail Drawer     │
│ Sidebar  │  ┌──────────────────────┐   │ (inline, ليس Popup)│
│          │  │ Row: avatar + اسم    │   │  - بيانات الحساب  │
│ - بحث    │  │ ref_id + شارات       │   │  - المنشآت        │
│ - الدور  │  │ روابط متبادلة:        │   │  - الصلاحيات      │
│ - النوع  │  │  USR → [BIZ-x,BIZ-y]  │   │  - العقود/الطلبات│
│ - الفئة  │  │  BIZ → USR-owner      │   │  - النشاط الإداري │
│ - الربط  │  │ [Actions منسقة]      │   │  [إغلاق ×]        │
│          │  └──────────────────────┘   │                    │
│ [مسح]    │  …                           │                    │
└──────────┴──────────────────────────────┴───────────────────┘
```

- استخدام `<Bi>` و`pickBi()` بدل `isRTL ? ar : en`.
- شارات الـ ref_id موحّدة عبر `<ReferenceBadge>`/`<ReferenceTag>`.
- شارات التحقق عبر `<VerifiedBadge>` (لا `BadgeCheck`).
- ألوان semantic فقط (success/info/warning/destructive)، بدون hex مباشر.
- Drawer جانبي ينزلق من الجهة (يحترم RTL)، يحل محل اللوحات الـ inline المكدّسة.
- جدول صفوف مضغوط مع وضع `comfortable` و`compact` (يبقى من الكود الحالي).

## الربط بين الكيانين

نقطة الانطلاق الأساسية: **العلاقة `profile ↔ businesses ↔ business_staff`** موجودة فعلياً، لكنها مبعثرة. الجديد:

1. **في صف المستخدم**: قائمة منشآته كأزرار قابلة للنقر → تفتح Drawer للمنشأة بدون مغادرة الصفحة.
2. **في صف المنشأة**: اسم المالك ومعرّفه USR كزر → يفتح Drawer للمستخدم.
3. **شريط التنقل الجانبي**: عند فتح Drawer لمستخدم، نعرض "مرتبط بـ N منشآت" مع شرائح تنقل سريعة.
4. **بحث موحّد** (`⌘K`): يبحث عبر الاسم/البريد/الهاتف/ref_id لكلا الكيانَين دفعة واحدة.

## ضمان عدم فقدان وظائف

جرد كامل لما يجب الاحتفاظ به من كلا الصفحتَين:

**من AdminUsers**: إنشاء/تعديل/حذف مستخدم، تغيير كلمة المرور، إرسال رابط استرداد، Ban/Unban (فردي + Bulk مع الحماية الجديدة)، Grant/Revoke roles، Bulk Disable/Enable، CSV Export، فلترة Role/Type/Tier/BusinessLink، KPIs، Recharts (تسجيلات 30 يوم)، Recent Admin Activity، CrQuickScanInline لإنشاء حساب من السجل التجاري، Multi-business permissions inline، اختصارات لوحة المفاتيح.

**من AdminBusinesses**: عرض/تعديل/حذف/تفعيل/تحقق منشأة، إدارة الفروع، Membership Tier، Approval Status، Provider Review entry، Bulk operations، Username conflict handling، صورة الشعار/الغلاف، إحصائيات (مشاهدات/طلبات/عقود).

سيتم إنشاء **checklist تلقائي** قبل الإطلاق في تعليق رأس الملف الجديد، يربط كل ميزة قديمة بمكانها الجديد.

## التنظيف بعد التعديل

- **حذف**: `AdminUserDetail.tsx` (تحلّ مكانه الصفحة الكاملة الجديدة).
- **تقسيم**: المكوّن الرئيسي إلى ملفات صغيرة تحت `src/components/admin/identity/`:
  - `IdentityShell.tsx`، `IdentityHeader.tsx`، `IdentityKpiStrip.tsx`
  - `users/UserRow.tsx`، `users/UserDrawer.tsx`، `users/UserForms.tsx`
  - `businesses/BusinessRow.tsx`، `businesses/BusinessDrawer.tsx`، `businesses/BusinessForms.tsx`
  - `shared/IdentityFilters.tsx`، `shared/IdentityBulkBar.tsx`، `shared/EntityLink.tsx`
  - `hooks/useIdentityData.ts` (يجمع كل الاستعلامات في مكان واحد)
- **استبدال** آخر استخدامات `c.id.slice(0,8)` و`<Hash>` اليدوية بـ `<ReferenceBadge>`.
- **Redirects**: `/admin/users → /admin/identity?view=users`، `/admin/businesses → /admin/identity?view=businesses`، `/admin/users/:id → /admin/identity/u/:id`.
- **تحديث**: روابط في `DashboardSidebar.tsx`, `AdminDashboardView.tsx`, و7 صفحات أدمن أخرى لتشير للمسار الجديد.

## ضمانات الأمان

- إبقاء `requireSuperAdmin` على القائمة الكاملة (PII)؛ `requireAdmin` فقط لقائمة المنشآت.
- استمرار `maskEmail`/`maskPhone` لغير Super Admin + قفل تعديل PII (الإصلاحات السابقة).
- استمرار حماية Bulk Disable من إصابة المشرفين/الذات.
- لا UUID خام في أي مكان مرئي.
- `useNoIndex` لكل المسارات.
- لا منبثقات؛ Drawer + Inline forms فقط.

## الإنجاز على مراحل

تجنباً لتعطيل العمل، التنفيذ على 3 موجات صغيرة:

**موجة 1**: إنشاء الهيكل الجديد (`/admin/identity`) مع تبويب المستخدمين فقط منقول من الكود الحالي، وإضافة `EntityLink` و`UserDrawer`. الصفحات القديمة تبقى تعمل.

**موجة 2**: نقل تبويب المنشآت + `BusinessDrawer` + ربط المستخدم↔المنشأة.

**موجة 3**: إضافة Redirects، تحديث الروابط، حذف الملفات القديمة، تنظيف نهائي، اختبار TypeScript.

## ملاحظات تقنية (للقارئ التقني)

- إجمالي ~4000 سطر سيتقلّص إلى ~2500 موزّع على ملفات < 400 سطر لكل ملف.
- جميع الاستعلامات تنتقل إلى hook موحّد `useIdentityData()` يستخدم `useQuery` مع `staleTime` المناسب لكل جدول.
- Drawer مبني على `Sheet` من shadcn (مسموح كونه inline-overlay وليس popup إجباري).
- Memoization صارمة على Row components وقوائم البحث.
- لا تغيير في مخطط قاعدة البيانات (DB schema) ولا في RLS — فقط طبقة العرض.

## ما يحتاج تأكيدك

1. **المسار**: `/admin/identity` مقبول، أم تفضّل `/admin/people` أو `/admin/accounts`؟
2. **Drawer جانبي**: مقبول كحل بديل عن الـ inline panel الحالي (يبقى inline وليس popup)؟ أم تفضّل الإبقاء على الكروت الـ inline تحت كل صف؟
3. **حذف `AdminUserDetail.tsx`**: موافق على دمجه في `/admin/identity/u/:id`، أم تريد الإبقاء على الصفحة المستقلة؟

بعد تأكيدك للنقاط الثلاث أبدأ بالموجة 1 فوراً.
