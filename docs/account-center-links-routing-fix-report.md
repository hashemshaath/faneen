# ACCOUNT CENTER LINKS ROUTING FIX REPORT

## 1. السبب الجذري
صفحة `/admin/identity` تُقدّمها `AdminIdentityHub` عبر `TabbedShell`، الذي يعكس التبويب النشط إلى `?tab=<key>`. كل بطاقة في `IdentityOverviewLanding` تستخدم `<Link to="/admin/identity?tab=users|roles|...">`.

المشكلة: صفحة `AdminUsers` (المُحمَّلة داخل تبويب Users) كانت تستهلك `?tab=` بنفسها لأغراضها الداخلية القديمة (overview/users/analytics/staff/disabled)، ثم تحذفه من الـ URL عبر `setSearchParams(..., { replace: true })`. النتيجة: `TabbedShell` يعيد القراءة فيجد التبويب فارغًا → يرجع للتبويب الافتراضي (Overview) → المستخدم يضغط «المستخدمون» فلا يتغيّر شيء (يبدو الرابط مكسورًا).

التبويبات الأخرى (Roles/Invitations/Activity/Security) كانت تعمل لأن صفحاتها لا تستهلك مفتاح `tab`.

## 2. الملفات المعدلة
- `src/pages/admin/AdminUsers.tsx` — أضيف `useEmbeddedPage()`؛ تخطّي قراءة/حذف `?tab=` عند التضمين.
- `src/__tests__/accountCenterLinksRoutingFix.test.tsx` — جديد، 6 اختبارات حراسة.
- `docs/account-center-links-routing-fix-report.md` — هذا التقرير.

## 3. الروابط التي كانت لا تعمل
| الرابط | الوجهة | الحالة قبل | السبب |
|---|---|---|---|
| بطاقة «المستخدمون» | `/admin/identity?tab=users` | يرجع لـ Overview | تعارض `?tab` بين Shell و AdminUsers |
| بطاقة «لوحة الحسابات الكاملة» | `/admin/identity/dashboard` | يعمل | — |
| بطاقة «الأدوار والصلاحيات» | `/admin/identity?tab=roles` | يعمل | — |
| بطاقة «الدعوات» | `/admin/identity?tab=invitations` | يعمل | — |
| بطاقة «النشاط الإداري» | `/admin/identity?tab=activity` | يعمل | — |
| بطاقة «الأمان» | `/admin/identity?tab=security` | يعمل | — |

## 4. كيف تم إصلاح كل رابط
الإصلاح يقتصر على البطاقة المعطّلة (Users). أضيف فحص `isEmbedded = useEmbeddedPage()` في `AdminUsers`، فإذا كانت الصفحة مضمَّنة داخل `TabbedShell` يصبح `tabParam = null` (لا قراءة ولا حذف من الـ URL)، فيبقى `?tab=users` ويستمر `TabbedShell` في عرض تبويب Users.

بقية الروابط لم تكن تحتاج إصلاحًا — الإصلاح أعاد فقط البطاقة المعطلة للعمل دون كسر السلوك المستقل لـ `/admin/users` (Stand-alone)، حيث `isEmbedded === false`.

## 5. redirects مضافة
لا. لا توجد routes محذوفة. `/admin/provider-analytics` (موجود سابقًا) لا يزال `Navigate` آمن إلى `/admin/provider-review?tab=analytics`.

## 6. هل تم تعديل App.tsx؟
لا. كل المسارات المستخدمة في بطاقات مركز الحسابات مسجّلة بالفعل.

## 7. هل تم تعديل DashboardLayout أو navigation؟
لا. الإصلاح في `AdminUsers` فقط.

## 8. DB/RLS/migrations
لا — لا تغييرات في قاعدة البيانات أو RLS أو edge.

## 9. نتائج tsc
نظيف.

## 10. نتائج الاختبارات
`bunx vitest run src/__tests__/accountCenterLinksRoutingFix.test.tsx` → **6/6 passed**.

## 11. نتيجة الفحص اليدوي (Playwright)
قبل الإصلاح:
- `?tab=users` → URL يُقصّ إلى `/admin/identity`، يظهر Overview بدل المستخدمين.

بعد الإصلاح، النواتج لكل بطاقة:
- `dashboard` → `مركز الحسابات والموافقات` ✅
- `users` → `إدارة المستخدمين` ✅
- `roles` → `إدارة الوصول والحسابات` ✅
- `invitations` → `طلبات الانضمام للمنشآت` ✅
- `activity` → `سجل النشاط` ✅
- `security` → `التحكم بإظهار الأنظمة` ✅

المستخدم العادي: المسار `/admin/identity` محمي بـ `<ProtectedRoute requireSuperAdmin>`، فلا يرى البطاقات أصلًا.

## 12. القرار
`ACCOUNT CENTER LINKS ROUTING FIX PASS` ✅