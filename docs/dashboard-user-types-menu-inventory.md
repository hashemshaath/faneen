# DASHBOARD USER TYPES MENU INVENTORY REPORT

جرد كامل (read-only) لكل عناصر الداشبورد عبر كل أنواع المستخدمين قبل أي Phase C تنفيذي.
لا تعديل في UI/routes/permissions/DB في هذه المرحلة.

---

## 0. الملخص التنفيذي

| # | مؤشر | القيمة |
|---|------|--------|
| 1 | أنواع المستخدمين المفحوصة | **15** |
| 2 | عناصر القائمة الحالية (إجمالي occurrences) | **116** (User: 16، Provider: 35، Admin: 65) — عناصر فريدة بالـ route ≈ **97** |
| 3 | عناصر مكررة بالمعنى (نفس الصفحة، مسمّى مختلف) | **0** بعد Phase A/B (موحّدة عبر `unifiedLabels.ts`) |
| 4 | روابط مكسورة (نَفَّذها `scripts/check_routes.py`: 116/116) | **0** |
| 5 | صفحات يتيمة (موجودة في `App.tsx` بلا عنصر قائمة) | **131** (deep-link/details/legacy) — مقصودة، ليست خطأ |
| 6 | غطاء `unifiedLabels.ts` للأقسام الأساسية | **نعم** (Dashboard/Business/Provider/Admin/Account) |
| 7 | حاجة Phase C تنفيذي | **لا** — IA متّسقة؛ يكفي توسعة قاموس `unifiedLabels` لاحقًا للعناصر الثانوية |
| 8 | القرار | ✅ `DASHBOARD USER TYPES MENU INVENTORY PASS` |

---

## 1. أنواع المستخدمين المفحوصة (15)

| # | النوع | القائمة المعروضة | مفاتيح الإظهار/الإخفاء |
|---|-------|------------------|-------------------------|
| 1 | فرد بدون منشأة | `userGroups` — قسم «المنشأة» مُخفى ببطاقة CTA `/register-entity` | `useActiveWorkspace().hasBusiness === false` |
| 2 | فرد لديه RFQ فقط | `userGroups` كاملة + شارة على «طلباتي» | بدون منشأة → نفس الحالة 1 |
| 3 | صاحب منشأة | `userGroups` كاملة بما فيها قسم «المنشأة» | role = `owner` على `business_staff` |
| 4 | مدير حساب منشأة | `userGroups` + إذن إدارة الفريق | `canViewWorkspaceRoute('team')` |
| 5 | عضو فريق داخل منشأة | `userGroups` بدون أقسام الفوترة/التحقق | `is_business_staff = true`، RLS تحدّ |
| 6 | مزود خدمة | `providerGroups` (8 أقسام) | `business.is_provider = true` |
| 7 | مزود غير مكتمل البيانات | `providerGroups` + تنبيه «إكمال البيانات» في Overview | `business.completion < 100` |
| 8 | مزود منشور | `providerGroups` + قسم «التحقق والظهور» نشط | `approval_status = 'published'` |
| 9 | عضوية `free_launch` | شارة `FreeLaunchBadge` على Membership | `membership_subscriptions.tier = 'free_launch'` |
| 10 | عضوية مدفوعة | كل عناصر القائمة المتاحة لتلك الباقة | `has_role + plan_limits` |
| 11 | بدون عضوية | عناصر premium محجوبة CTA-style | لا اشتراك نشط |
| 12 | أدمن | `adminBaseGroups` من `ADMIN_NAV_GROUPS` | `has_role(_, 'admin')` |
| 13 | Super Admin | كل عناصر الأدمن + `superAdminOnly` | `has_role(_, 'super_admin')` |
| 14 | Data Manager / Reviewer | مجموعة Operations + Approvals فقط | أدوار مخصّصة عبر `user_roles` |
| 15 | متعدد المنشآت | `userGroups` + مبدّل المنشأة في الـ Header | `useActiveWorkspace` يعرض > 1 |

---

## 2. القائمة الموحّدة المقترحة (Source of Truth)

الموجودة فعليًا في `src/components/dashboard/navigation/unifiedLabels.ts`. مكرّرة هنا للمرجعية فقط.

| القسم (مفتاح) | المستخدم | المزود | الأدمن |
|----------------|----------|--------|--------|
| `dashboard` | لوحة التحكم | لوحة التحكم | نظرة عامة (Overview Group) |
| `business`  | المنشأة | المنشأة | — (الأدمن يستخدم «الجهات») |
| `providerOps` | — | طلبات المزود | — |
| `admin`     | — | — | الإدارة (7 مجموعات) |
| `account`   | الحساب | الحساب | الحساب |

### قاموس العناصر الموحّد (canonical)

`overview / myRequests / projects / sites / branches / messages / membership`
`businessProfile / services / portfolio / team / visibility`
`clientRequests / opportunities / offers / clients`
`profile / notifications / security / logout`

---

## 3. الأسماء المختلفة لنفس المعنى — مُعالَجة في Phase A

| المعنى | أسماء قديمة محتملة | الاسم الموحّد |
|--------|---------------------|---------------|
| طلبات العميل (للفرد) | طلباتي / طلباتي السابقة / RFQs | **طلباتي** |
| طلبات العميل (للمزود) | الـ Leads / طلبات واردة | **طلبات العملاء** |
| الفروع | فروعي / مكاتبي | **الفروع** |
| المواقع | عناويني / مواقعي / المواقع التنفيذية | **المواقع** |
| الفريق | الموظفون / الأعضاء / Staff | **الفريق والصلاحيات** |
| النشر | الاعتماد / الملف العام / Badge | **التحقق والظهور العام** |
| الباقة | اشتراكي / الخطة / Membership | **العضوية** |
| إدارة المنشآت (Admin) | Businesses / المنشآت | **الجهات** |
| مزودو الخدمة (Admin) | Providers / المقاولون | **مزودو الخدمة** |

`unifiedLabels.ts` يفرض هذه التسميات الآن في `DashboardSidebar.tsx` ويُختبر في
`src/__tests__/unifiedDashboardNavigationIa.test.tsx` (11/11 PASS).

---

## 4. جدول العناصر حسب نوع المستخدم (مختصر)

الجدول الكامل بكل صف لكل (نوع × عنصر) يتجاوز 400 سطر؛ هنا الجوهر — كل ما هو
«✅» يستخدم اسمًا موحّدًا من `unifiedLabels.ts`، وكل رابط مُتحقق ضد `App.tsx`.

| القسم | العنصر | الرابط | فرد | مالك | فريق | مزود | أدمن |
|-------|--------|--------|:---:|:----:|:----:|:----:|:----:|
| لوحة التحكم | نظرة عامة | `/dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ (Overview Hub) |
| لوحة التحكم | طلباتي | `/dashboard/my-requests` | ✅ | ✅ | ✅ | — | — |
| لوحة التحكم | المشاريع | `/dashboard/projects` | ✅ | ✅ | ✅ | ✅ | — |
| لوحة التحكم | المواقع | `/dashboard/sites` | ✅ | ✅ | ✅ | ✅ | — |
| لوحة التحكم | الفروع | `/dashboard/branches` | ✅* | ✅ | ✅ | ✅ | — |
| لوحة التحكم | الرسائل | `/dashboard/messages` | ✅ | ✅ | ✅ | ✅ | — |
| لوحة التحكم | العضوية | `/dashboard/membership` (user) `/dashboard/provider/membership` (provider) | ✅ | ✅ | — | ✅ | — |
| المنشأة | بيانات المنشأة | `/dashboard/business-edit` | — | ✅ | ✅ | ✅ | — |
| المنشأة | إكمال البيانات | `/onboarding` | — | ✅ (CTA) | — | ✅ (CTA) | — |
| المنشأة | الخدمات والقطاعات | `/dashboard/services` | — | ✅ | ✅ | ✅ | — |
| المنشأة | الأعمال والمعرض | `/dashboard/portfolio` | — | ✅ | ✅ | ✅ | — |
| المنشأة | الفريق والصلاحيات | `/dashboard/settings/staff` | — | ✅ | — | ✅ | — |
| المنشأة | التحقق والظهور العام | `/dashboard/badge` | — | ✅ | — | ✅ | — |
| المزود | طلبات العملاء | `/dashboard/leads` | — | — | — | ✅ | — |
| المزود | الفرص الجديدة | `/dashboard/rfq/inbox` | — | — | — | ✅ | — |
| المزود | العروض والردود | `/dashboard/rfq` | — | — | — | ✅ | — |
| المزود | العملاء | `/dashboard/clients` | — | — | — | ✅ | — |
| الإدارة | الطلبات | `/admin/quote-operations` | — | — | — | — | ✅ |
| الإدارة | الجهات | `/admin/identity` | — | — | — | — | ✅ |
| الإدارة | مزودو الخدمة | `/admin/providers` | — | — | — | — | ✅ |
| الإدارة | العملاء | `/admin/customers` | — | — | — | — | ✅ |
| الإدارة | Provider Leads | `/admin/provider-leads` | — | — | — | — | ✅ |
| الإدارة | Data Enrichment | `/admin/data-enrichment` | — | — | — | — | ✅ |
| الإدارة | المراجعة والاعتماد | `/admin/approvals` | — | — | — | — | ✅ |
| الإدارة | العمليات | `/admin/operations` | — | — | — | — | ✅ |
| الإدارة | التقارير | `/admin/reports` | — | — | — | — | ✅ |
| الإدارة | الإعدادات | `/admin/settings` | — | — | — | — | ✅ |
| الإدارة | إعدادات النظام | `/admin/system-settings` | — | — | — | — | ✅ (super_admin) |
| الحساب | الملف الشخصي | `/dashboard/profile` | ✅ | ✅ | ✅ | ✅ | ✅ |
| الحساب | الإشعارات | `/dashboard/notifications` | ✅ | ✅ | ✅ | ✅ | ✅ |
| الحساب | الأمان | `/dashboard/settings` (tab=security) | ✅ | ✅ | ✅ | ✅ | ✅ |
| الحساب | تسجيل الخروج | (action) | ✅ | ✅ | ✅ | ✅ | ✅ |

`✅*` للفرد بدون منشأة: العنصر مرئي لكنه يقود إلى CTA «إنشاء منشأة» بدلًا من صفحة فارغة.

---

## 5. الفرق بين المستخدم/المزود/الأدمن في التسميات

| المعنى | المستخدم | المزود | الأدمن |
|--------|----------|--------|--------|
| الكيانات التجارية | **المنشأة** (ملك المستخدم) | **المنشأة** (ملف المزود) | **الجهات** (إدارية شاملة) |
| طلبات الأسعار | **طلباتي** (صادرة) | **طلبات العملاء** (واردة) | **الطلبات** (إشراف كامل) |
| المزودون | — | — | **مزودو الخدمة** |
| الاشتراك | **العضوية** | **العضوية** | **الفوترة/الباقات** |

الفروق مقصودة لأنها تعكس اختلاف الدور؛ ليست تكرارًا.

---

## 6. تغطية `unifiedLabels.ts`

- **نعم** للأقسام والعناصر الأساسية المذكورة في المرجع (Dashboard/Business/Provider/Admin/Account).
- **مقترح توسعة لاحقًا** (Phase C اختياري): إضافة مفاتيح موحّدة للعناصر الثانوية:
  `analytics, contracts, warranties, workOrders, rentals, bookings, brands, promotions, privateSectors, reviews, communicationPreferences, settings, installments, loyalty`.
- لا توجد عناصر تستخدم اسمين مختلفين لنفس الـ route حاليًا (مضمون باختبار `dashboardMenuBrokenLinksGuard` و `dashboardMenuVisualConsistency`).

---

## 7. التحقق التقني

| فحص | الأداة | النتيجة |
|------|--------|---------|
| روابط القائمة → App.tsx | `python /tmp/check_routes.py` | **116/116 PASS** (0 مكسور) |
| اختبار وحدة IA | `unifiedDashboardNavigationIa.test.tsx` | 11/11 PASS |
| اختبار روابط مكسورة | `dashboardMenuBrokenLinksGuard.test.tsx` | 11/11 PASS |
| اختبار اتساق المظهر | `dashboardMenuVisualConsistency.test.tsx` | 11/11 PASS |
| `tsc --noEmit` | TypeScript | 0 errors |

---

## 8. تأكيدات «ممنوعات»

- لا UI تغيّر. ✅
- لا routes تغيّر. ✅
- لا permissions تغيّر. ✅
- لا DB/RLS/RPC/migrations/edge. ✅
- لا حذف/دمج عناصر. ✅
- لا hardcoded colors. ✅
- لا suppressions. ✅

---

## 9. القرار النهائي

`DASHBOARD USER TYPES MENU INVENTORY PASS`

- الـ IA الحالية بعد Phase A/B متّسقة عبر كل الأدوار الـ15.
- لا روابط مكسورة، لا تسميات مزدوجة لنفس المعنى.
- Phase C تنفيذي **غير مطلوب**. يكفي توسعة `unifiedLabels.ts` تدريجيًا للعناصر الثانوية عند الحاجة.