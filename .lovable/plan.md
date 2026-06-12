# خطة إعادة بناء لوحة الأدمن والداشبورد ومركز الهوية

> ملاحظة: هذا المشروع يلامس ~40+ صفحة أدمن، ~20+ صفحة داشبورد، نظام تصميم كامل، ومركز هوية. التنفيذ سيكون على **7 مراحل متسلسلة بموافقة منفصلة لكل مرحلة** — لا أقفز للتنفيذ قبل اعتمادك للـ Audit ولا أبدأ كل مرحلة قبل تأكيدك لمخرجات سابقتها.

---

## المرحلة 1 — Audit & Architecture (قراءة فقط، بدون أي تعديل كود)

**المخرج:** 4 وثائق تحت `docs/admin-redesign/`:

1. `01-audit-report.md`
   - جرد كامل لـ `src/pages/admin/*` (الصفحات، حجمها، حالتها، تكرارها)
   - جرد كامل لـ `src/pages/dashboard/*`
   - جرد لمركز الهوية الحالي (`ThemeApplier`, `useThemeColors`, `brandTheme`, الـ tokens في `index.css` و `tailwind.config.ts`)
   - خريطة التكرار: أي صفحات تدير نفس البيانات من مكانين
   - خريطة تضارب الهوية: أي `hex/hsl/font-size/spacing` hardcoded خارج التوكنز
   - مشاكل التنقل: سايدبار، هيدر، breadcrumbs، تبويبات
   - حالة الأزرار والحقول والجداول (variants غير موحدة، أحجام عشوائية)
   - مشاكل النماذج المعقدة

2. `02-information-architecture.md`
   - الهيكل الجديد للأدمن بالـ 7 مجموعات الرئيسية التي حددتها
   - جدول: كل صفحة حالية → مكانها الجديد → الحالة (تبقى/تُدمج/تُحذف/تُقسم)
   - جدول الـ Shortcuts (مصدر واحد + اختصارات تشير إليه)

3. `03-identity-center-plan.md`
   - الـ tokens المركزية: typography / colors / radii / shadows / spacing / motion / z-index
   - schema الـ tokens في الـ DB (إن لزم) أو في `theme_overrides`
   - كيف يحقن مركز الهوية CSS variables في `<head>` بشكل live
   - قائمة الـ "anti-patterns" الممنوعة (text-white, hex literals, size={n})
   - خطة الترحيل التدريجي للصفحات القديمة

4. `04-execution-roadmap.md`
   - الـ 6 مراحل التنفيذية اللاحقة بالتفصيل، مع scope ودleliverable لكل مرحلة

**مدة المرحلة 1:** جلسة واحدة. **بدون أي تعديل كود.** فقط 4 ملفات docs.

---

## المرحلة 2 — Design System & Identity Center Core

- توسيع الـ tokens في `src/index.css` (إكمال الناقص: button states, form states, table density, alerts)
- بناء جدول `admin_identity_tokens` في الـ DB (RLS: admin فقط) لحفظ overrides
- توسيع `ThemeApplier` ليحقن **كل** الـ tokens (ليس فقط الألوان)
- بناء `IdentityCenterPage` جديدة تحت `/admin/system/identity` تتحكم في:
  - الخطوط (نوع/أوزان/أحجام/line-height)
  - الألوان (8 مجموعات: primary, secondary, accent, success, warning, error, info, neutral)
  - أنماط الأزرار (لكل variant: radius, height, hover, focus)
  - الحقول والنماذج
  - الجداول والبطاقات
  - التنبيهات
  - الـ Layout (sidebar width, header height, spacing scale)
- منع hardcoded values مستقبلًا: ESLint rule + CI check
- preview حي داخل المركز قبل الحفظ

---

## المرحلة 3 — Admin Shell (Sidebar + Header + Navigation)

- إعادة بناء `DashboardSidebar` بالـ IA الجديدة (7 مجموعات)
- بحث داخلي في السايدبار + Favorites/Pinned + Recent pages + Counters/Badges
- Header موحد: page title + breadcrumb + quick actions + global search + notifications + command palette (Cmd+K) + theme toggle + language toggle + workspace switcher
- collapse/expand ذكي + حفظ الحالة per-user

---

## المرحلة 4 — Dashboard & Widgets (Drag/Drop + Personalization)

- نظام widgets modular مع `dnd-kit`
- 5 layouts جاهزة: Executive / Operations / Finance / Content / Provider mgmt
- حفظ التخصيص per-admin في DB (`admin_dashboard_layouts`)
- إخفاء/إظهار + إعادة ترتيب + density mode (compact/comfortable)

---

## المرحلة 5 — Module Refactor (الصفحات الأساسية)

إعادة بناء على template موحد (`AdminListPageTemplate`): KPIs + Filters + Search + Tabs + Table/List + Details Drawer + Activity trail + Quick actions.

ترتيب الأولوية:
1. Businesses (الأضخم — 2,800 سطر، يحتاج تقسيم BusinessTable / BusinessFilters / BusinessCreateInline)
2. Approvals Center (موحد مسبقًا، يحتاج صقل)
3. Users & Roles
4. Memberships
5. Provider Reviews
6. Activity Log
7. Contact/Messages
8. Taxonomy/Content
9. System & Identity (مغطى في المرحلة 2)

---

## المرحلة 6 — Form Simplification

- تقسيم النماذج الكبيرة إلى steppers/accordions/sections
- inline editing + Drawer/Sheet للعلاقات
- drag/drop للترتيب (صور، أقسام، widgets)
- validation فوري موحد عبر `react-hook-form` + `zod`

---

## المرحلة 7 — Final Cleanup & Governance

- حذف dead UI components (بعد second-pass كما فعلنا في Phase C3)
- توحيد المكونات المتشابهة
- ESLint rules تمنع hex/font-size hardcoded
- تقرير نهائي: ما تم دمجه، ما تم حذفه، ما تم توحيده، ولماذا

---

## ضمانات السلامة المطبقة في كل مرحلة

- لا حذف صفحة قبل توثيق ما حلّ محلها
- لا تعديل DB schema بدون migration + RLS + GRANTs
- لا كسر للصلاحيات أو المنطق التشغيلي
- لا `any` / `@ts-ignore`
- كل مرحلة تنتهي بـ `tsc --noEmit` نظيف + توقف لاعتمادك قبل البدء بالتالية

---

## ما أحتاجه منك للبدء

**موافقة على هذه الخطة + إذن البدء بالمرحلة 1 فقط (Audit، docs فقط، صفر تعديل كود).**

بعد عرض مخرجات المرحلة 1 (4 ملفات docs)، نتفق على:
- أي صفحات تُدمج فعلًا؟
- أي مجموعات IA تعتمدها كما هي وأيها تعدّل؟
- نطاق مركز الهوية: هل يشمل tokens في DB أم ملف JSON محلي فقط؟

ثم ننتقل للمرحلة 2.
