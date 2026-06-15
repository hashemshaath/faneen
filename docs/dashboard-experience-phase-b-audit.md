# DASHBOARD EXPERIENCE PHASE B
## Role-Aware Unified Dashboard IA — Audit Report

> Audit فقط — لا refactor، لا تغيير كود، لا DB/RLS/RPC/migrations، لا تغيير صلاحيات أو role routing أو onboarding/visibility.

---

## 1) ملخص المشكلة الحالية

- `/dashboard` يخدم 3 تجارب رئيسية (User / Provider / Admin) عبر views منفصلة (`UserDashboardView`, `ProviderDashboardView`, `AdminDashboardView`).
- Phase A وحّد الـ Hero و KPI grid، لكن باقي العناصر (Readiness, RFQ, Onboarding, Profile Completion, Membership, Visibility) موزّعة على بطاقات متفرقة بلا أولوية واضحة.
- الصفحات تحت `src/pages/dashboard/` تتجاوز **60 صفحة** (Operations, OperationsCenter, OperationsFeed, LoyaltyHub, LoyaltyStore, RequestsHub, ContractsHub, BusinessProfileHub…) — بعضها مكرر وظيفيًا.
- المستخدم الجديد لا يعرف أول خطوة. المزود لا يرى بوضوح "ما الذي يمنع ظهوري؟". الأدمن يرى KPIs لكن بدون "ماذا يحتاج تدخّلي اليوم؟".
- صلاحيات `business role` (owner/manager/staff) لا تنعكس بصريًا في Dashboard Shell — كل من له وصول يرى نفس البطاقات تقريبًا.
- لوحات Soft Launch (13A–13D) موجودة في docs فقط؛ لا توجد واجهة للمشغّل.

---

## 2) أنواع الحسابات الموجودة

| النوع | المصدر | الوصف |
|---|---|---|
| Individual / Customer | `profiles.account_type='individual'` | فرد يبحث / يرسل RFQ |
| Provider (Solo) | profile + business مرتبط | مزود فردي بدون فريق |
| Business Owner | `businesses.owner_id` | صاحب المنشأة |
| Business Manager | `business_staff.role='manager'` | مدير معتمد من المالك |
| Business Staff | `business_staff.role='staff'` | موظف بصلاحيات محدودة |
| Admin | `user_roles.role='admin'` | أدمن تشغيلي |
| Super Admin | `user_roles.role='super_admin'` | كل الصلاحيات + إدارة الأدمنز |

---

## 3) الأدوار والصلاحيات المؤثرة

المحاور التي يجب أن يقرأها Dashboard Shell قبل العرض:

1. **account_type** (individual / business).
2. **business role** (owner / manager / staff / none).
3. **admin role** (none / admin / super_admin) — عبر `has_role()`.
4. **permissions** (granular staff permissions: leads, contracts, projects…).
5. **membership tier** (free / basic / pro / elite) — مصدر الحقيقة `membership_subscriptions ⨝ membership_plans`.
6. **approval status** (pending / approved / rejected / suspended).
7. **readiness status** (visible / hidden + قائمة blockers).

القاعدة: **التصميم موحد، المحتوى يتغيّر**. لا توحيد أعمى.

---

## 4) ماذا يجب أن يرى كل نوع حساب؟

### Individual / Customer
- Hero: ترحيب + CTA "أرسل طلب عرض سعر".
- Action Center: مسوّدات RFQ، طلبات بانتظار رد، مزودون مقترحون.
- KPIs: طلبات نشطة · عروض مستلمة · رسائل غير مقروءة · مفضلة.
- Cards: RFQ status, Suggested providers, Recent messages.

### Provider (Solo)
- Hero: اسم المنشأة + شارة الحالة (Visible / Hidden / Pending).
- Action Center: Readiness blockers مرتبة، Leads جديدة، رسائل عملاء.
- KPIs: Leads (شهري) · Profile views · Response rate · Rating.
- Cards: Readiness, Recent leads, Membership/credits, Services & images status.

### Business Owner
- كل ما يراه Provider + بطاقات: Team, Branches, Subscription, Billing, Contracts.
- CTA إضافي: إدارة الفريق · إدارة الفروع.

### Business Manager
- مثل Owner **ما عدا**: Billing/Subscription/Ownership transfer/Delete business.
- يرى Team لكن لا يستطيع حذف Owner أو ترقية manager → owner.

### Business Staff
- يرى فقط المهام ضمن permissions الممنوحة (مثلاً Leads فقط، أو Contracts فقط).
- لا يرى KPIs مالية ولا Team management ولا Settings.
- Action Center محصورة في مهامه اليومية.

### Admin
- Hero: "لوحة الإشراف" + بطاقة حالة النظام.
- Action Center: RFQs بانتظار مراجعة، Provider approvals pending، Failed submissions، Cron/email alerts.
- KPIs: Users · Businesses · Revenue · System Health.
- Cards: Operations health, Recent approvals, Reported content, Soft launch KPIs (شرطي).

### Super Admin
- مثل Admin + بطاقة: Admins management, Feature flags, System settings, Security audit shortcuts.

---

## 5) ماذا يجب ألا يرى كل نوع؟

| النوع | ممنوع إظهاره |
|---|---|
| Customer | بطاقات Provider (Leads/Readiness/Membership)، أدوات Admin، Team/Branches |
| Provider Solo | Team management، Branches متعددة (إن لم تكن مفعّلة)، Admin tools |
| Owner | Admin operations، Soft launch KPIs |
| Manager | Billing، Ownership transfer، Delete business، Admin tools |
| Staff | Subscription، Team، Settings، Branches editing، Financial KPIs، Admin tools |
| Admin | أزرار Super Admin (Admins mgmt، Feature flags الخطرة) |
| Super Admin | لا قيود تشغيلية، لكن إجراءات الحذف تبقى محمية بتأكيد inline |

القاعدة: **لا نعرض زرًا لا يستطيع المستخدم تنفيذه**. الإخفاء أفضل من Disabled.

---

## 6) Dashboard IA المقترح

بنية موحدة من 4 طبقات:

```text
┌─ Dashboard Header (موحّد) ─────────────────────────────┐
│  Avatar · الاسم/المنشأة · نوع الحساب · الدور · الحالة │
│  آخر تحديث · CTA أساسي (يتغيّر حسب الحالة)             │
└────────────────────────────────────────────────────────┘
┌─ Action Center (الأهم الآن) ───────────────────────────┐
│  1–3 بطاقات فعل عاجلة، مرتبة حسب الأولوية              │
│  مثال مزود: "أضف 3 صور لتظهر في البحث"                │
└────────────────────────────────────────────────────────┘
┌─ KPI Grid (موحّد بصريًا، متغيّر المحتوى) ──────────────┐
│  4–8 بطاقات KPI حسب الدور                              │
└────────────────────────────────────────────────────────┘
┌─ State-Driven Cards (حسب الحالة) ──────────────────────┐
│  Onboarding · Readiness · Leads · RFQ · Operations…    │
└────────────────────────────────────────────────────────┘
```

قاعدة العرض: كل بطاقة لها `visibleWhen(ctx)` يقرأ السياق (account_type, role, approval, readiness, tier).

---

## 7) Provider Dashboard المقترح بالتفصيل

يجب أن يكون **مركز تشغيل يومي**، لا صفحة KPIs.

**ترتيب البطاقات من الأهم للأقل:**

1. **Readiness Card** — لائحة blockers (صور < 3، خدمات < 1، تغطية فارغة، اعتماد pending). كل blocker = زر مباشر للحل.
2. **Visibility Status** — هل المنشأة ظاهرة في البحث؟ ولماذا لا.
3. **Approval Status** — Pending / Approved / Needs changes.
4. **Recent Leads / Matching RFQs** — آخر 5 طلبات مناسبة + زر "افتح".
5. **Service Areas** — المدن المغطاة + تنبيه إن كانت فارغة.
6. **Services & Images** — عدّاد سريع + CTA إضافة.
7. **Membership / Credits** — Tier الحالي + رصيد الـ leads المتبقي.
8. **Team & Branches** — يظهر للـ Owner فقط (Manager: read-only على Branches).
9. **Engagement Preview** — Profile views, response time.

حدود:
- لا تخلط مع Admin tools.
- لا تُظهر للموظف ما ليس ضمن صلاحياته.
- لا KPIs مالية للـ Staff.

---

## 8) User (Customer) Dashboard المقترح

ترتيب:

1. **Hero CTA**: "أرسل طلب عرض سعر جديد".
2. **Active RFQs Card** — حالة كل طلب (Sent / Matched / Responded / Closed) + عدد العروض.
3. **Suggested Providers** — مبني على آخر بحث / RFQ.
4. **Messages Card** — آخر محادثات + غير مقروء.
5. **Bookmarks & Saved Searches**.
6. **Profile Completion** (إن < 80%).
7. **Help / Onboarding** للحساب الجديد (يختفي بعد إكمال أول RFQ).

لا يرى: Leads, Readiness, Membership tiers, Admin, Team, Branches.

---

## 9) Admin Dashboard المقترح

ترتيب:

1. **System Health Banner** — حالة Edge functions, Cron, Email, DB linter.
2. **Action Queue** — RFQs pending review · Provider approvals · Reported content · Failed submissions/uploads.
3. **KPI Grid** — Users · Businesses · Active RFQs · Revenue · Health score.
4. **Operations Centers Shortcuts** — روابط للمراكز الموحّدة (Users, Businesses, Content, AI, Security, Performance).
5. **Soft Launch KPIs** (شرطي، عبر feature flag) — Daily RFQs, Cohort response rate, Funnel drop-off — يظهر فقط لو الإطلاق التجريبي مفعّل.
6. **Recent Audit Trail** — آخر إجراءات حساسة.

Super Admin يرى إضافيًا: Admins management, Feature flags, Secrets health.

---

## 10) توحيد الصفحات: الآن أم تدريجيًا؟

**تدريجيًا** — على 5 phases (B1–B5) لتجنّب كسر المستخدمين الحاليين.
- لا حذف لأي route حاليًا؛ Redirects عبر `<Navigate>` فقط عند الجاهزية.
- كل phase يتبعها regression قصير قبل التالي.

---

## 11) ما الذي يجب أن يبقى منفصلًا؟

- **Admin centers** المتخصصة (Users, AI Center, Security, Performance, Blog) — لا تُدمج في Overview.
- **Contracts Hub** و **Requests Hub** — صفحات عمل مستقلة، Overview يربط لها فقط.
- **Settings Suite** — يبقى تحت `/dashboard/settings/*`.
- **Business Profile Hub** — صفحة إدارة منفصلة (Owner/Manager).
- **Loyalty Store** — يبقى منفصلًا عن Loyalty Hub (Hub = نظرة، Store = شراء).
- **Operations / OperationsCenter / OperationsFeed** — مرشحة للدمج، لكن في Phase لاحق (ليس B).

---

## 12) هل نحتاج Operator Dashboard للإطلاق التجريبي الآن؟

**لا**. التوصية:
- استخدام docs (13A–13D) + Google Sheet / Notion خلال 10–14 يوم.
- بعد أسبوع: مراجعة هل نحتاج بناء `AdminOperatorBoard` داخل `/admin/*`.
- قرار البناء = شرطي على حجم المشاكل اليومية ومدى تكرار الـ KPIs المطلوبة.
- إن تم البناء لاحقًا → Phase منفصل (C) خارج نطاق Phase B.

---

## 13) خطة التنفيذ المقترحة

### Phase B1 — Audit فقط ✅ (هذا التقرير)
- توثيق المشكلة، الأدوار، البنية المقترحة.
- لا كود.

### Phase B2 — Role-Aware Dashboard Shell
- إنشاء `DashboardContext` يجمع (account_type, business role, admin role, permissions, tier, approval, readiness) في كائن واحد.
- إنشاء `<RoleAwareCard visibleWhen={ctx => ...}>` wrapper.
- إعادة استخدام `UnifiedDashboardHero` و `UnifiedKpiGrid` الحاليين بإضافة سياق الدور.
- لا حذف لأي بطاقة موجودة — فقط إضافة `visibleWhen`.

### Phase B3 — Provider Action Center
- بناء Action Center أعلى Provider view (Readiness + Visibility + Approval + Recent Leads).
- ربط blockers الحالية من `ProviderReadinessCard` كمصدر بيانات.
- لا تغيير في visibility logic.

### Phase B4 — Admin Soft Launch KPIs (شرطي)
- إضافة بطاقة Soft Launch خلف feature flag `soft_launch_kpis_enabled`.
- مصدر البيانات: queries قراءة فقط من جداول موجودة.
- لا migrations.

### Phase B5 — Final Dashboard Regression
- اختبار شامل لكل الأدوار (7 أنواع حساب × حالات readiness/approval/tier).
- snapshot tests للـ shell.
- قياس CWV للـ `/dashboard` قبل/بعد.

---

## 14) المخاطر

| الخطر | الاحتمال | التخفيف |
|---|---|---|
| كسر تجربة مستخدمين حاليين عند تغيير ترتيب البطاقات | متوسط | إطلاق تدريجي + احتفاظ بـ Customization القديم |
| ازدواج في مصادر الحقيقة للـ readiness/visibility | منخفض | استخدام نفس hooks الموجودة، لا re-implementation |
| تضخّم `DashboardContext` وبطء الـ render | متوسط | React Query مع staleTime مناسب + memoization |
| خلط صلاحيات Manager/Owner بصريًا | متوسط | اختبارات per-role صريحة في B5 |
| بناء Operator Board مبكرًا قبل التحقق من الحاجة | عالٍ | تأجيل صريح حتى بعد أول أسبوع |
| Soft Launch KPIs تكشف بيانات حساسة | منخفض | feature flag + RLS موجودة |
| Regression في `/dashboard` يؤثر على كل الأدوار دفعة واحدة | عالٍ | Phase B5 إجباري قبل الإطلاق |

---

## 15) القرار

`DASHBOARD EXPERIENCE PHASE B AUDIT COMPLETE`