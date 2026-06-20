## UNIFIED DASHBOARD IA + MENU DESIGN AUDIT + ROUTE CONSOLIDATION

هذا تغيير كبير يلمس Sidebar لكل الأدوار (user / business owner / provider / admin)، يوحّد المسميات، يعيد ترتيب الأقسام، يضيف اختبارات صارمة، ويُنتج تقريرًا. سأنفّذه على دفعات حتى لا أكسر شيئًا.

### نطاق التنفيذ

**الملفات الرئيسية المتأثرة (تعديل):**
- `src/components/dashboard/DashboardSidebar.tsx` — مصدر `userGroups` / `providerGroups` وتمرير `adminBaseGroups`. سأعيد بناء الأقسام بالأسماء الموحّدة فقط، نفس بنية `MenuGroup` الحالية (لا أغير الـ shell).
- `src/components/dashboard/navigation/menuArchitecture.ts` — تحديث glossary + `recommendedGroupOrder` بالأسماء العربية الموحّدة.
- `src/components/dashboard/sidebar/SidebarItem.tsx` و `SidebarSection` (إن وُجد) — توحيد classes للعنوان والعنصر والـ active state، حجم أيقونة ثابت `w-[18px] h-[18px]`، بدون hex.
- `src/modules/admin-shell/navigation/adminNavigation.ts` — مزامنة عناوين قسم «الإدارة» مع المرجع الموحّد دون تغيير الـ routes.

**ملفات جديدة:**
- `src/components/dashboard/navigation/unifiedLabels.ts` — مصدر واحد لكل المسميات (ar/en) لكل عنصر قائمة، يستهلكه السايدبار والاختبارات.
- `src/__tests__/unifiedDashboardNavigationIa.test.tsx` — الاختبارات 13 المطلوبة.
- `src/__tests__/dashboardMenuVisualConsistency.test.tsx` — اختبارات الاتساق البصري.
- `docs/unified-dashboard-ia-audit.md` — التقرير النهائي (المسميات قبل/بعد + جدول routes + قرار).

### بنية القائمة الموحّدة (مرجع التنفيذ)

```text
لوحة التحكم      → نظرة عامة، طلباتي، المشاريع، المواقع، الفروع، الرسائل، العضوية
المنشأة          → بيانات المنشأة، الخدمات والقطاعات، الأعمال والمعرض، الفريق والصلاحيات، التحقق والظهور
طلبات المزود     → طلبات العملاء، الفرص الجديدة، العروض والردود، العملاء
الإدارة (أدمن)   → الطلبات، الجهات، مزودو الخدمة، العملاء، المراجعة والاعتماد، العمليات، التقارير، الإعدادات
الحساب           → الملف الشخصي، الإشعارات، الأمان، تسجيل الخروج
```

### قواعد الإظهار الشرطي (تُطبَّق داخل `DashboardSidebar` عبر فلتر موجود)
- بدون منشأة → يُخفى قسم «المنشأة» + «طلبات المزود» + عناصر الفروع/المشاريع المرتبطة بالمنشأة، ويظهر CTA «إنشاء منشأة» يربط إلى `/register-entity` (وليس `/onboarding`).
- بمنشأة → كل قسم «المنشأة».
- Provider بصلاحية → قسم «طلبات المزود».
- Admin → قسم «الإدارة».
- `/dashboard/membership` يظهر دائمًا، المحتوى يتكيّف.

### routes inventory
سأبني الجدول في التقرير عبر سكربت بسيط يقارن `App.tsx` بـ `unifiedLabels.ts` + admin nav registry، ويضع `Status = OK/Missing/Orphan`. أي 404 محتمل سأوثقه ولن أحذف أي route بدون redirect.

### ممنوعات (مُلتزَم بها)
- لا DB/RLS/RPC/migrations/edge.
- لا تغيير Auth/Membership/RFQ behavior.
- لا hex، لا `any`، لا `@ts-ignore/expect-error`، لا `eslint-disable`، لا تخطّي اختبارات.
- لا حذف routes — فقط إعادة تسمية labels وإعادة ترتيب.

### خطوات التنفيذ بالتسلسل

1. **قراءة** `DashboardSidebar.tsx` بالكامل + `adminNavigation.ts` + `SidebarItem/Section` + `App.tsx` لجمع routes.
2. **إنشاء** `unifiedLabels.ts` كمصدر واحد.
3. **إعادة كتابة** `userGroups` و`providerGroups` داخل `DashboardSidebar.tsx` بالاستيراد من `unifiedLabels`، مع الحفاظ على كل `url` كما هو (تغيير labels فقط + الترتيب).
4. **مزامنة** عناوين admin groups بنفس الأسماء الموحّدة (دون تغيير routes).
5. **توحيد** classes في `SidebarItem` / section heading (حجم أيقونة، active state، spacing) — بدون hex.
6. **CTA «إنشاء منشأة»** للمستخدم بدون منشأة → `/register-entity`. التأكد أن أي رابط حالي إلى `/onboarding` كـ «إنشاء» يصبح إلى `/register-entity`. `/onboarding` يبقى لاستكمال البيانات فقط.
7. **كتابة الاختبارين** بالـ 13 + 6 شروط.
8. **توليد التقرير** `docs/unified-dashboard-ia-audit.md` بالأقسام الـ 19.
9. **تشغيل** `vitest run` للاختبارات الجديدة + audit scripts ذات الصلة (`broken-links-audit`، `adminSidebarLinks`، `adminRouteLinkIntegrity`).

### المخرجات النهائية للمستخدم
- Sidebar موحّد بالعربية لكل الأدوار.
- مسميات موحّدة بدون تكرار.
- CTA «إنشاء منشأة» صحيح لمن لا يملك منشأة.
- اختباران جديدان يحرسان الـ IA.
- تقرير `UNIFIED DASHBOARD IA + MENU DESIGN AUDIT REPORT` مع قرار `PASS` أو `NEEDS FIX` حسب نتيجة الاختبارات.

هل أبدأ التنفيذ بهذه الخطة؟