
# خطة تبسيط ودمج /dashboard

تجربة موحّدة لكل الأدوار (Admin / Provider / Customer / Staff) على ثلاث طبقات: **Overview** → **Sidebar/تنقل** → **دمج صفحات Hub**. تغييرات UI/IA فقط — لا DB/RLS/RPC/migrations.

---

## الطبقة 1 — توحيد صفحة Overview

اليوم: ثلاث ملفات منفصلة (`AdminDashboardView` 602 سطر، `ProviderDashboardView` 477، `UserDashboardView` 346) ببنية مختلفة وويدجتات متكرّرة.

**الهدف**: قالب واحد `DashboardOverviewShell` يستضيف نفس البنية لكل الأدوار، مع ويدجتات قابلة للتركيب (role-aware):

```text
┌──────────────────────────────────────────────────────────┐
│  Hero موحّد (تحية + Ref ID + Refresh + Customize)        │
├──────────────────────────────────────────────────────────┤
│  3 ويدجتات حالة:                                          │
│   - OverdueAlerts / TodaySummary / MembershipWidget       │
│  (مشتركة بين الأدوار — موجودة فعلًا في shared)             │
├──────────────────────────────────────────────────────────┤
│  Bento KPI (4 بطاقات حسب الدور):                          │
│   Admin    → Users · Businesses · Revenue · Health        │
│   Provider → Leads · Bookings · Revenue · Rating          │
│   Customer → Spent · Active · Messages · Unread           │
├──────────────────────────────────────────────────────────┤
│  CustomizableGrid (نفس النظام الحالي، توسيع للأدوار)       │
│   - Trends / Activity / Tasks / Recent / Notifications    │
└──────────────────────────────────────────────────────────┘
```

**ما يُحذف**:
- التكرار بين ثلاث views.
- البطاقات المكرّرة (Notifications/Recent Contracts تظهر بصور مختلفة في كل view).
- Hero بثلاث صياغات مختلفة.

**ما يُحفظ بالكامل**:
- جميع الاستعلامات الحالية (نفس React Query keys).
- `useDashboardCustomization` و `BentoTile` و `KeyboardShortcuts`.
- روابط الوجهة (لا تغيير routes).

> أوفّر **3 اتجاهات بصرية** لـ Overview قبل البناء (Refined Bento / Minimal Apple / Operations-dense)، تختار واحدًا — ثم أنفّذه.

---

## الطبقة 2 — تبسيط Sidebar/التنقل

اليوم:
- `providerGroups`: **8 مجموعات / 27 عنصرًا**.
- `userGroups`: **5 مجموعات / 11 عنصرًا**.
- `adminBaseGroups`: 7 مجموعات من الـ registry.

**المشاكل**: عناصر "جديد" مبعثرة، تكرار بين Settings و Profile، Rentals تبتلع 4 صفوف، Operations + Sales يتداخلان.

**التقليل المقترح للمزوّد** (8 → 5 مجموعات):

| القديم | الجديد |
|---|---|
| Overview | **Overview** (Dashboard, Analytics, Operations Feed) |
| Business Profile (11 عنصر) | **Business** (Profile, Services, Brands, Portfolio + Projects, Promotions, Service Areas + Sites, Reviews, Badge) — يدمج Projects تحت Portfolio و Sites تحت Service Areas |
| Sales & Requests + Operations + Communication | **Work** (Requests, Bookings, Clients, RFQ, Work Orders, Contracts, Warranties, Messages, Notifications) |
| Rentals & Assets | **Rentals** (Rentals مع تبويبات Calendar/Analytics داخل الصفحة + Assets) |
| Membership + Settings | **Account** (Membership, Installments, Loyalty, Profile, Comm. Prefs, Staff, Settings) |

نفس المنطق للعميل (5 → 3 مجموعات: Overview · My Activity · Account).

**ما لا يتغيّر**:
- لا تغيير routes — كل الروابط القديمة تستمر.
- لا تغيير في `ADMIN_NAV_GROUPS` registry (مصدر حقيقة).
- لا تغيير RBAC أو `canViewWorkspaceRoute`.

---

## الطبقة 3 — دمج صفحات Hub المكرّرة

من تحليل الملفات، عدة صفحات Hub رفيعة (19 سطر فقط) تعيد توجيه أو تغلّف صفحة رئيسية:

| Hub | الحجم | الإجراء |
|---|---|---|
| `DashboardContractsHub` | 19 سطر | يبقى كـ wrapper إن كان tabs-based؛ وإلا redirect إلى `Contracts` |
| `DashboardLoyaltyHub` | 19 سطر | redirect إلى `Loyalty` + tabs (Wallet / Store) |
| `DashboardRequestsHub` | 19 سطر | يحلّ محل `/dashboard/leads` بتبويبات (Requests · Opportunities · RFQ) |
| `DashboardOperations` 445 + `DashboardOperationsCenter` 539 + `DashboardOperationsFeed` 310 | دمج في `Operations` بتبويبات (Center / Feed / Manual) | يُحفظ المحتوى بالكامل داخل tabs |
| `DashboardLoyalty` + `DashboardLoyaltyStore` | tabs داخل صفحة واحدة |

كل الدمج يستخدم `TabbedShell` الموجود فعلًا، وتُحفظ الـ routes القديمة عبر `<Navigate to="…?tab=…" replace />` (نفس النمط المتّبع حاليًا للـ `/dashboard/staff-access`).

---

## التنفيذ المرحلي

1. **Phase A — Overview Unification** (هذه المرحلة فقط أعرض 3 اتجاهات بصرية):
   - استخراج `DashboardOverviewShell` + role-config.
   - تقليل الـ 3 views إلى ملف واحد + 3 ملفات تكوين صغيرة (admin/provider/user.config.ts).
   - تشغيل اختبار جديد `dashboardOverviewUnified.test.ts` يتحقق من ظهور Hero/Bento/Widgets لكل دور.

2. **Phase B — Sidebar Consolidation**:
   - إعادة تنظيم `providerGroups` و `userGroups` (5 و 3 مجموعات).
   - حذف badges "جديد" المتقادمة.
   - اختبار: `dashboardSidebarConsolidation.test.ts` يتحقّق من عدد المجموعات والروابط.

3. **Phase C — Hub Merge**:
   - دمج Operations الثلاث في tabs.
   - دمج Loyalty Hub/Store.
   - تثبيت `<Navigate>` لكل الروابط القديمة.
   - اختبار: `dashboardHubsMerge.test.ts` يتحقّق من tabs والـ redirects.

---

## تفاصيل تقنية

- **بدون** أي تغيير في: Supabase queries, RLS, RPC, migrations, edge functions, مصادر بيانات الإشعارات/العقود/الفواتير.
- **بدون** popups/dialogs (سياسة المشروع).
- **بدون** أي `any` أو `@ts-ignore`.
- **يُحفظ** نظام `useDashboardCustomization` كما هو.
- **يُحفظ** كل الـ routes في `App.tsx` (الدمج عبر tabs + redirects فقط).
- استخدام Brand Identity v1.0 tokens + `surface`/`btn-ds` primitives.
- RTL/LTR عبر `<Bi>` و `useBi()`.
- اختبارات تكاملية بعد كل Phase + `tsc --noEmit`.

---

## ما لا يُلمس مطلقًا

- لا DB / RLS / RPC / migrations / edge.
- لا منطق RFQ / Matching / Credits / Membership tier logic.
- لا تغيير في صلاحيات `canViewWorkspaceRoute` أو `useVisibleModules`.
- لا تغيير في `ADMIN_NAV_GROUPS` registry (يبقى المصدر الوحيد للحقيقة لـ admin).
- لا حذف routes — فقط `<Navigate>` للقديم.

---

## نقطة القرار

- إن وافقت على هذه الخطة، أبدأ بـ **Phase A** وأعرض **3 اتجاهات بصرية مرسومة** لصفحة Overview الجديدة لتختار واحدًا قبل البناء.
- Phase B و C تُنفّذان مباشرة بعد اعتماد Phase A، بدون اتجاهات بصرية إضافية (تنظيم IA فقط).
