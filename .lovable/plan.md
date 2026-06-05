# دمج "مركز الموافقات" الموحّد

الصفحات الثلاث الحالية ضخمة (~4,500 سطر إجمالاً) ومتشعّبة الصلاحيات والـ RLS:

- `AdminApprovalsCenter.tsx` (1,127 سطر) — موافقات المزوّدين، أسماء المستخدمين، طلبات الوصول، الاشتراكات، العروض.
- `AdminBusinesses.tsx` (2,861 سطر) — إدارة كاملة للمنشآت (CRUD، توثيق، فئات عضوية، إجراءات جماعية، فلاتر متقدّمة).
- `AdminEntityAccessRequests.tsx` (555 سطر) — طلبات الانضمام للكيانات.

دمجها دفعة واحدة في PR واحد عالي المخاطر (يكسر روابط، اختبارات audit، RBAC، تصدير). أقترح **مرحلتين** نفّذهما متتاليتين بنفس الجلسة:

## المرحلة 1 — التوحيد البصري والوظيفي (هذه الجولة)

صفحة جديدة واحدة `/admin/approvals` مُعاد تصميمها كـ "مركز موافقات شامل" مع:

1. **رأس موحّد**: KPIs (قيد المراجعة، طلبات انضمام، أسماء معلّقة، منشآت غير موثّقة، اشتراكات معلّقة) بكروت `surface-raised` مع `shadow-elev-2`.
2. **شريط فلترة ذكي واحد**: بحث (اسم/Ref/username)، نوع الكيان، الحالة، السائق الزمني (اليوم/الأسبوع/الكل)، الفرز.
3. **Tabs موحّدة** بدل الصفحات الثلاث:
   - الكل (Inbox)
   - موافقات المزوّدين
   - أسماء المستخدمين
   - طلبات الانضمام (entity_access)
   - الاشتراكات والترقيات
   - العروض الترويجية
   - **المنشآت** (قائمة موجزة قابلة للتصفية مع رابط للصفحة الكاملة لأي إجراء عميق)
4. **بطاقة طلب موحّدة** `<ApprovalRequestCard>` بأيقونة الفئة، شارة الحالة (`EntityVerificationStatusBadge`)، Ref ID، الأزرار السريعة (موافقة/رفض/فتح).
5. **إجراءات جماعية** عبر `runBulkReview` + `getReviewer` (موجود).
6. **اختصارات لوحة المفاتيح**: `A` موافقة، `R` رفض، `O` فتح، `/` بحث.
7. **روابط عميقة** بدل التكرار: زر "إدارة كاملة" يفتح `AdminBusinesses` للحالات التي تحتاج CRUD ثقيل.
8. تحديث `App.tsx` لإبقاء `/admin/businesses` و `/admin/entity-access-requests` كروابط داخلية شفّافة (redirect → `/admin/approvals?tab=...`).
9. تنظيف الكود: استخراج `useApprovalsInbox` hook، حذف الفلاتر/الحالات المتكرّرة.

## المرحلة 2 — مؤجّلة (لا تُنفّذ الآن)

دمج `AdminBusinesses` الكامل (CRUD + bulk + 2,800 سطر) داخل نفس الصفحة. هذا يتطلّب refactor مستقل لتقسيمه أولاً إلى مكوّنات أصغر (BusinessTable, BusinessFiltersBar, BusinessCreateInline) ثم استيرادها في تبويب داخل المركز. تنفيذها الآن مع المرحلة 1 يكسر الـ audits ويُنتج ملفاً > 3,000 سطر.

## الملفات

- جديد: `src/pages/admin/approvalsCenter/ApprovalsInbox.tsx`
- جديد: `src/pages/admin/approvalsCenter/ApprovalKpiStrip.tsx`
- جديد: `src/pages/admin/approvalsCenter/ApprovalRequestCard.tsx`
- جديد: `src/pages/admin/approvalsCenter/useApprovalsInbox.ts`
- تعديل: `src/pages/admin/AdminApprovalsCenter.tsx` (تبسيط — يستهلك المكوّنات الجديدة)
- تعديل: `src/App.tsx` (redirect aliases)
- تعديل: `mem://features/admin-controls` (تحديث)

## التحقّق

- `bunx tsc --noEmit`
- `bunx eslint . --max-warnings=80`
- `bunx vitest run src/pages/admin/approvalsCenter`
- فحص بصري على `/admin/approvals`

هل أبدأ بالمرحلة 1 الآن؟
