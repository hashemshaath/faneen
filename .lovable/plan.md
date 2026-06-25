# USER DASHBOARD NAVIGATION + LINKS + ACTIONS AUDIT — PLAN

نطاق المهمة كبير جدًا (8 صفحات + sidebar + mobile + role-aware + perf + E2E + full suite). لتنفيذها بدقة دون كسر شيء، سأقسمها إلى 4 جولات صغيرة منفصلة، كل جولة لها تقرير مستقل. هذه الخطة للموافقة قبل البدء.

## Round 1 — Inventory + Broken Links (read-only)
- مسح `src/pages/dashboard/**` + `src/components/dashboard/**` + sidebar/topbar/mobile menu.
- بناء جدول inventory: النص، المصدر، الوجهة، النوع (Link/navigate/href/button)، الدور المطلوب، الحالة.
- اكتشاف: `href="#"`، `Link` بدون `to`، `button` بدون `onClick`، routes غير موجودة في `App.tsx`، روابط `undefined/null`، external بدون `rel="noopener noreferrer"`.
- مخرَج: تقرير inventory + قائمة broken links (لا تعديلات بعد).

## Round 2 — Targeted Fixes (frontend only)
- إصلاح broken links المكتشفة في Round 1.
- إصلاح زر "إنشاء العقد": تأكيد الـ handler، gating حسب الأهلية، رسائل النقص الواضحة.
- استبدال `href="#"` بـ disabled buttons أو routes صحيحة.
- ضبط `target="_blank" rel="noopener noreferrer"` للروابط الخارجية.
- ضبط role-aware visibility (إخفاء projects للعميل الشخصي، إلخ).
- لا DB/RLS/RPC/migrations.

## Round 3 — Performance (frontend only)
- إضافة `enabled` gates للـ queries المعتمدة على auth/business/site.
- `placeholderData: keepPreviousData` + `staleTime` للقوائم.
- `useMemo`/`useCallback` للقوائم الثقيلة.
- lazy-load tabs الثقيلة.
- إزالة console logs الزائدة.

## Round 4 — Tests + Verify
- إضافة tests:
  - sidebar links موجودة في router config.
  - لا `href="#"` في dashboard.
  - زر إنشاء العقد يعرض سبب التعطيل.
  - external links لها `rel`.
  - role-aware navigation.
- `tsgo --noEmit` + targeted tests + full suite.
- E2E Playwright إذا session متاحة، وإلا أُعلن `E2E BLOCKED`.

## ممنوعات ملتزَم بها
- لا migrations / RLS / RPC / edge.
- لا تغيير contract lifecycle / signatures.
- لا حذف routes أو tests أو assertions.
- لا `any` / `ts-ignore` / `eslint-disable`.
- لا رفع line caps.
- لا hardcoded IDs.
- لا fake pass — full suite يجب أن يكون أخضرًا قبل إعلان PASS.

## ملاحظة مهمة قبل البدء
الجولة السابقة (`CONTRACT PRICING BASIS FULL SUITE VERIFY`) أنهت بـ **6 failures موروثة** في:
- `contractPartyModelPhaseA` (2)
- `contractPartyModelPhaseE` (2)
- `contractsIsolationAudit` (1)
- `ct10ContractsUpdateMigration` (1)

هذه ليست من نطاق هذا الـ audit، لكنها ستمنع إعلان `FULL SUITE PASS` في Round 4. خياران:
- **(أ)** أتعامل معها داخل هذا الـ audit وأرفع التقرير `PASS` كامل.
- **(ب)** أتجاهلها وأرفع التقرير `NEEDS FIX` مع توثيق أنها موروثة.

أحتاج موافقتك على الخطة وعلى الخيار (أ) أو (ب) قبل البدء.
