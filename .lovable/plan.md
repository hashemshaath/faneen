## الهدف
نقل تجربة «مراجعة العقد قبل الإرسال» من `AlertDialog` إلى **صفحة مستقلة** منظمة، كل قسم في بطاقة مستقلة قابلة للتعديل Inline (Expand/Save بدون مغادرة الصفحة)، مع زر «إرسال للمراجعة» في الأسفل.

## المسار الجديد
- `GET /dashboard/contracts/:id/review` — صفحة جديدة (lazy في `App.tsx`).
- تتطلب أن يكون `status = 'draft'` وأن المستخدم هو `provider_id` للعقد. خلاف ذلك → redirect إلى `/dashboard/contracts`.

## الملف الجديد
`src/pages/dashboard/DashboardContractReview.tsx`
- يجلب العقد عبر `supabase.from('contracts').select(...).eq('id', id).single()` + `line_items` + الأطراف (نفس الاستعلامات في `DashboardContracts.tsx`).
- يعرض `PageHeader` مع breadcrumb (لوحة التحكم ← العقود ← مراجعة).
- يعرض شريط إكمال علوي (نفس `completenessScore` المُستخدم في الـ summary الحالي).
- بطاقات مستقلة (كل قسم = `FormSection` collapsible):
  1. **الأطراف** (طرف أول/ثاني/عميل) — read-only (تعديل في الإنشاء)
  2. **العنوان والوصف** — تعديل Inline (title_ar/en, description_ar/en)
  3. **الموقع والقطاع** — read-only (تعديل في الإنشاء)
  4. **نوع العمل والقالب** — read-only
  5. **نطاق العمل وبنود العقد** — تعديل Inline (scope_of_work, terms_ar/en, warranty)
  6. **التسعير** — read-only (line items)
  7. **التواريخ والمدة** — تعديل Inline (start_date/end_date/execution_duration)
  8. **شروط الدفع والتسليم** — تعديل Inline
  9. **المشرف** — تعديل Inline (supervisor_name/phone/email)
  10. **المرفقات** — read-only

- كل بطاقة تحرير Inline تستخدم `supabase.from('contracts').update({...}).eq('id', id)` مع تحقق eligibility + invalidation للـ `['dashboard-contracts']` و `['contract-review', id]`.
- الأقسام «read-only» يكون فيها زر **«تعديل في شاشة الإنشاء»** ينقل إلى `/dashboard/contracts?edit={id}&step={key}` (الـ stepper الحالي يدعم `editingId`).

## نقاط الدخول
1. **قائمة العقود** (`DashboardContracts.tsx`): استبدال `onClick: () => setSendConfirm(c)` في زر «إرسال للمراجعة» بـ `navigate(\`/dashboard/contracts/${c.id}/review\`)`. الإبقاء على `AlertDialog` كـ fallback (للاستخدام من الصفحة الجديدة).
2. **شاشة الإنشاء**: في `ContractCreateActionsBar` (أو بجواره داخل `DashboardContracts.tsx` بعد Save Draft) إضافة زر «مراجعة» يظهر عند `editingId` وينتقل إلى `/dashboard/contracts/${editingId}/review`.

## الإرسال للمراجعة
- زر sticky سفلي «إرسال للمراجعة» يعيد استخدام `ContractConfirmDialogs` (لا تغيير في lifecycle ولا في RPC).
- بعد النجاح: invalidation + toast + `navigate('/dashboard/contracts')`.

## ممنوعات
- لا تغيير في `contracts` schema/RLS/RPC/migrations/edge functions.
- لا `service_role` في frontend.
- لا تعطيل أي test موجود.
- إبقاء `data-testid="send-review-summary"`, `send-review-confirm`, `send-review-missing`, `contract-review-summary` كما هي (الصفحة الجديدة تستوردها أيضًا).

## الاختبارات
- `src/__tests__/contractReviewPage.test.tsx`:
  - الصفحة موجودة ومرتبطة بـ route في `App.tsx`.
  - تحتوي بطاقات لكل قسم (data-testid).
  - زر الإرسال معطّل إذا `missing.length > 0`.
  - زر «تعديل» في القسم Inline يستدعي update.
- تشغيل full suite للتأكد لا regressions.

## تقدير الحجم
- ملف واحد جديد ~350-450 سطر.
- ~30 سطر تعديل في `DashboardContracts.tsx` (entry points).
- إضافة route واحد في `App.tsx`.
- ملف اختبار جديد.