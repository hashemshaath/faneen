# توحيد تدفق Provider Intake في `/admin/data-enrichment`

## الهدف

صفحة واحدة بـ Stepper من 4 خطوات، تنتهي بإنشاء `provider_leads` تلقائيًا وفتح `/admin/provider-leads?batch=…`.

## الخطوات (Stepper داخل نفس الصفحة)

```
1) رفع Excel  →  2) تعيين الأعمدة + معاينة الجدول  →  3) مراجعة + تدقيق صف-بصف  →  4) ملخّص + إرسال
```

- **خطوة 1 (Upload):** يبقى `IntakeWizardGuide` كمكوّن رفع/تحليل فقط (يُجرَّد من الجدول الكبير).
- **خطوة 2 (Map & Preview):** جدول الصفوف + Column Mapper (مستخرج من `IntakeWizardGuide` الحالي).
- **خطوة 3 (Review):** يدمج الصف الحالي + قسم البحث/Google Places + dedupe — كل ذلك في عمود واحد بدلًا من Banner علوي + بطاقة بحث منفصلة.
- **خطوة 4 (Submit):** بطاقة ملخّص (مراجَع/مكرّر/متخطّى) + زر "إرسال إلى Provider Leads" يستدعي RPC جديد ثم ينقل لـ `/admin/provider-leads?batch=<id>`.

## التغييرات الملموسة

### مكوّنات جديدة (صغيرة ومتخصّصة، بدون تكرار)

- `IntakeStepper.tsx` — مؤشر الخطوات + state machine بسيط (`'upload' | 'map' | 'review' | 'submit'`).
- `IntakeStepUpload.tsx` — يستخدم `parseProviderIntakeFile` الموجود.
- `IntakeStepMap.tsx` — يستخدم `columnMap` و`handleApplyMapping` المستخرجة من الويزرد.
- `IntakeStepReview.tsx` — يدمج `IntakeRowPreviewBanner` + قسم البحث الحالي في `AdminDataEnrichment`.
- `IntakeStepSubmit.tsx` — ملخّص + زر إرسال + رابط للقائمة.

### مكوّنات تُحذف/تُدمج

- ❌ `IntakeRowPreviewBanner.tsx` — منطقه ينتقل إلى `IntakeStepReview`.
- ❌ الجدول الضخم داخل `IntakeWizardGuide.tsx` — يتقلّص إلى زر/منطقة رفع فقط.
- ❌ بطاقة "Google Places search" المستقلّة في `AdminDataEnrichment` — تصبح جزءًا من خطوة المراجعة.

### تقليص `AdminDataEnrichment.tsx`

من 1534 سطر → ~250 سطر:
- يستضيف `<IntakeStepper />` فقط + `<GoogleStatusPanel />`.
- كل المنطق التشغيلي (نتائج Google، حفظ التدقيق، dedupe) ينتقل إلى الخطوات.

### إرسال إلى Provider Leads

- Edge Function جديدة `intake-finalize-batch`:
  - تستقبل `{ rows, fileName, skipDuplicates: true }`.
  - تنشئ صف لكل عنصر في `provider_leads` (status=`new`, source=`bulk_intake`).
  - تتجاوز التكرار عبر `unified_number`.
  - تُرجع `{ batchId, created, skipped }`.
- بعد النجاح: `navigate('/admin/provider-leads?batch=<id>')`.
- صفحة `AdminProviderLeads` تُضيف فلتر `?batch=<id>` لعرض الدفعة فقط.

### حفظ التقدّم

يبقى `intakeQueue.ts` كما هو (localStorage) لكن يضاف:
- `step: 'upload'|'map'|'review'|'submit'`
- `batchId?: string` بعد الإرسال

### الاختبارات

- تحديث `providerIntakeCenterArchitecture.test.ts` لقبول البنية الجديدة (Stepper بدلًا من Banner+Guide منفصلين).
- إبقاء `providerIntakeTemplateDownload.test.tsx` كما هي.
- إضافة `intakeStepperFlow.test.tsx` يتحقّق من تنقّل الخطوات.

## ما لن يتغيّر

- `AdminProviderGrowthQueue` (لا تستخدم الويزرد، فقط import نوعي).
- `parseProviderIntakeFile` ومنطق Excel.
- `GoogleStatusPanel` و gateway.
- جدول `provider_leads` ذاته (لا migrations).

## المخاطر

- **حجم التغيير:** ~2500 سطر يُعاد توزيعها. سأنفّذ على مرحلتين:
  1. **Phase A:** استخراج الخطوات + Stepper + حذف الـ Banner، بدون تغيير في الإرسال.
  2. **Phase B:** إضافة edge function والـ submit step والـ batch filter.
- **الاختبارات الحالية:** ستحتاج تحديثًا (3 ملفات) — سأحدّثها بالتوازي.

## التأكيد المطلوب

هل أبدأ بـ **Phase A** الآن (إعادة هيكلة UI فقط، بدون edge function/إرسال)، ثم أتبعها بـ Phase B في رسالة منفصلة؟ أم تفضّل تنفيذ المرحلتين معًا في نفس الجولة (أكبر وأبطأ، لكن نتيجة نهائية)؟
