## NAVIGATION-ARCHITECTURE-REBUILD-1 — خطة التنفيذ

نطاق ضخم يلامس التنقّل، التوثيق، الصلاحيات، العلامة، والاختبارات. سأنفّذه على دفعات مع الحفاظ الصارم على المسارات والميزات.

---

### المرحلة 1 — جرد وتدقيق (Read-only)

**A. جرد الصفحات** → `docs/navigation-page-inventory.md`
- استخراج كل `<Route>` من `src/App.tsx` (≈162 مسار) ومطابقتها بملفات `src/pages/**`.
- لكل صفحة: `route, title, purpose, audience, frequency, current location, recommended location, classification`.
- تصنيف: Core Daily / Weekly / Monthly / Admin Only / Rare / Legacy / Hidden Utility.

**B. تدقيق الـ Sidebar الحالي** → `docs/sidebar-audit.md`
- تحليل `DashboardSidebar.tsx` (مجموعات/تسميات/أيقونات/ترتيب/visibility/role rules).
- إبراز: تكرار، تسميات مشوّشة، صفحات في مكان خاطئ، صفحات مخفية مهمة، نهايات ميتة، عمق نقرات > 2.

**H. سلامة المسارات** — تثبيت قاعدة: **صفر تغييرات على `path=` أو ملفات الصفحات**. كل العمل في طبقة القائمة فقط. سأشغّل `scripts/broken-links-audit.mjs` و `src/test/adminSidebarLinks.test.ts` بعد كل دفعة.

---

### المرحلة 2 — معمارية المعلومات الجديدة (Part C)

تكييف الهيكل المقترح مع المسارات الفعلية، عبر ملف واحد `src/components/dashboard/navigation/menuArchitecture.ts` يحدّد:

```text
الرئيسية         → /dashboard, /dashboard/operations-center
المبيعات والعملاء → /dashboard/leads, /dashboard/customers, /dashboard/quotes, /dashboard/follow-ups
العقود والتنفيذ   → /dashboard/contracts, /dashboard/work-orders, /dashboard/boq,
                    /dashboard/measurements, /dashboard/attachments
التشغيل والإنتاج  → /dashboard/work-orders/board, /dashboard/production-stages,
                    /dashboard/schedules, /dashboard/installations
المشتريات        → /dashboard/procurement, /dashboard/rfqs, /dashboard/suppliers, /dashboard/purchase-orders
الجودة والعميل   → /dashboard/tracking, /dashboard/appointments, /dashboard/closeout,
                    /dashboard/warranty, /dashboard/reviews
النمو والتسويق   → /dashboard/provider-growth, /sectors, /dashboard/seo, /dashboard/analytics
الإدارة (admin)  → /admin/businesses, /admin/users, /admin/access-management, /admin/identity, …
المساعدة         → /dashboard/help, /dashboard/report-issue, /dashboard/feature-request
الإعدادات        → /dashboard/business-edit, /dashboard/branding, /dashboard/notifications, /dashboard/settings
```

المسارات غير الموجودة فعلياً ستُحذف من المقترح أو تُربط بأقرب صفحة قائمة. لن أُنشئ صفحات جديدة.

---

### المرحلة 3 — تجربة القائمة (Part D)

- رأس مجموعات أنظف + أيقونات موحّدة (Lucide).
- Collapse/expand مع تذكّر الحالة في `localStorage:qitaat_sidebar_groups_v1`.
- **المفضّلة** عبر hook جديد `useSidebarFavorites` (تخزين `qitaat_sidebar_favs_v1`، حدّ 8).
- **آخر الصفحات** عبر hook `useRecentRoutes` (آخر 5، تخزين `qitaat_sidebar_recent_v1`).
- شريط **Quick Create** في رأس الـ Sidebar (عقد، عرض سعر، أمر عمل، RFQ، بلاغ) — كل زر `Link` لمسار قائم.
- ظهور **Global Search** (Cmd/Ctrl+K) دائماً في رأس الـ Sidebar.

---

### المرحلة 4 — صلاحيات (Part E)

- مصفوفة في `menuArchitecture.ts`: `roles: Role[]` لكل مجموعة وبند.
- استخدام `useAuth` + `useCan` الحاليين — صفر تعديل على RLS أو منطق الصلاحيات.
- إخفاء المجموعات الفارغة بعد فلترة الأدوار.

---

### المرحلة 5 — العلامة (Part F)

- `SidebarBrand` component يدعم: شعار افتراضي، شعار المنشأة النشطة (من `useActiveBusiness`)، fallback، dark-mode variant، compact icon-only mode.
- لا تغيير على الـ Favicon أو `index.html`.

---

### المرحلة 6 — صقل الصفحات (Part G)

- جرد top-30 الأكثر استخداماً من Core Daily/Weekly.
- لكل صفحة فحص فقط (لا تعديل): title, subtitle, breadcrumbs, loading, empty, error, help, related, health badges, next actions.
- النتائج في `docs/page-polish-repairs.md` كقائمة إصلاحات مرتبة بالأولوية. **التنفيذ خارج نطاق هذه الجولة** — يُترك كـ backlog ما لم يُطلب صراحة.

---

### المرحلة 7 — التنفيذ (Part I)

- ملف جديد: `src/components/dashboard/navigation/menuArchitecture.ts` (المصدر الوحيد للحقيقة).
- إعادة كتابة `DashboardSidebar.tsx` ليستهلك المعمارية الجديدة، مع الحفاظ على نفس API الخارجي.
- مكوّنات صغيرة: `SidebarBrand`, `SidebarQuickCreate`, `SidebarFavorites`, `SidebarRecent`, `SidebarGroupCollapsible`.
- **شرط صلب**: كل `url` في القائمة يجب أن يطابق `path=` في `App.tsx` — يفرضه `adminSidebarLinks.test.ts` الحالي.

---

### المرحلة 8 — اختبارات (Part J)

`src/__tests__/navigationArchitectureRebuild1.test.ts` يغطّي:
- كل رابط في `menuArchitecture` موجود في `App.tsx`.
- لا تكرار `url` عبر القائمة.
- مجموعات admin محميّة بـ `requireAdmin`/`requireSuperAdmin`.
- فلترة الأدوار تعطي مخرجات متوقّعة لكل role.
- Quick Create يحوي 5 إجراءات بمسارات صالحة.
- Favorites/Recent hooks تحفظ وتسترجع من localStorage بحدود صحيحة.
- branding component يقع لـ fallback عند غياب شعار المنشأة.
- لا روابط `/admin/identity?view=...` متبقّية بعد التنظيف.

---

### المرحلة 9 — التحقق (Part K)

تشغيل بالتوازي:
- `bunx vitest run` (الحزمة الكاملة)
- `node scripts/broken-links-audit.mjs`
- `node scripts/profiles-isolation-audit.mjs`, `notifications-isolation-audit.mjs`, `procurement-isolation-audit.mjs`, `messaging-isolation-audit.mjs`
- اختبارات RTL: `src/i18n/__tests__/LanguageContext.test.tsx`, `src/lib/__tests__/direction.test.ts`
- التحقق البصري السريع على `/dashboard` و `/admin/identity` و `/admin/businesses`.

`tsc` يجريه الـ harness تلقائياً — لن أشغّله يدوياً.

---

### التقرير النهائي

ملخّص في الردّ الأخير: ما تم نقله، ما تغيّرت تسميته، تحسينات العلامة، تغييرات الظهور حسب الدور، نتائج التحقق، فرص متبقّية.

---

### قيود صلبة (لن أكسرها)

- ❌ لا تغيير على أي `<Route path=...>` في `App.tsx`.
- ❌ لا حذف صفحات أو ميزات.
- ❌ لا تعديل على RLS / policies / edge functions.
- ❌ لا dialogs/popups (سياسة المشروع — كل شيء inline).
- ❌ لا تغيير `sitemap.xml` أو `robots.txt` (لا مسارات عامة جديدة).
- ✅ كل التغييرات في طبقة العرض: `src/components/dashboard/**` + ملفات توثيق + اختبارات.

---

### الحجم المتوقّع

- ملفات جديدة: ~7 (architecture + 4 components + hook + test + 3 docs).
- ملفات معدّلة: 1–2 (`DashboardSidebar.tsx`، ربما `DashboardLayout.tsx` لأجل brand slot).
- لا migrations.

هل أبدأ التنفيذ من المرحلة 1 (الجرد والتدقيق)، أم تريد تعديل النطاق أولاً (مثلاً تخطّي Part G أو تأجيل Branding)؟
