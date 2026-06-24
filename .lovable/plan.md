# تحسينات تدفّق إنشاء العقد

أربع تحسينات مترابطة على نموذج إنشاء العقد لتقليل الإدخال اليدوي وربط الحقول بمصادر البيانات القائمة.

## 1) تاريخ الانتهاء = تاريخ أو مدة بالأيام

في `ContractDetailsSection.tsx` بجانب حقل تاريخ الانتهاء، أضيف Toggle صغير:
- **«تاريخ»** (الوضع الحالي): يستخدم `<Input type="date">`.
- **«مدة بالأيام»**: حقل رقمي `duration_days` يحسب `end_date = start_date + N` تلقائيًا.

التخزين النهائي يبقى `end_date` فقط (لا تغيير في الـ schema). إذا تغيّر `start_date` بعد ذلك ووضع المدة فعّال، يُعاد الحساب تلقائيًا.

## 2) مشرف المشروع — قائمة + إضافة

`SupervisorSection.tsx` يصبح Combobox يقرأ من:
- موظفي المنشأة (`business_staff` للمنشأة الحالية) و/أو
- جهات الاتصال المعرّفة سابقًا في موقع التنفيذ (`site_contacts` للموقع المختار).

ويظهر زر **«+ إضافة مشرف جديد»** يفتح inline form (اسم، جوال، بريد، وظيفة). عند الحفظ يُضاف إلى `business_staff` (دور `supervisor`) ويُحدَّد فورًا. لا Dialog — inline سطرين فقط حسب قاعدة الواجهة.

## 3) بنود العقد من القالب أو نموذج افتراضي

في `ContractTermsSection.tsx`:
- إذا اختار المستخدم قالبًا (`effectiveVersion` موجود): تُحقن البنود/الأقسام من `contract_template_sections` و`contract_template_clauses` للنسخة المنشورة (للقراءة + إمكانية التعديل في `terms_ar`).
- إذا لم يختر قالبًا: يُحقن **نموذج بنود افتراضي** كامل الأقسام (التعريفات، نطاق العمل، المدة، السعر والدفع، الضمانات، الإنهاء، التحكيم) من ثابت `DEFAULT_CONTRACT_TERMS` جديد في `src/lib/contract-default-terms.ts`.

في كلا الحالتين النتيجة تُكتب في `form.terms_ar` (و`terms_en` مرآة) وتبقى قابلة للتحرير.

## 4) العنوان والوصف يُكوَّنان تلقائيًا

`ContractDetailsSection.tsx`:
- `title_ar` يُولَّد من: `«{اسم الموقع} — {اسم التخصص}»` (مثل: «مشروع برج النخيل — أعمال الألمنيوم»). يُحدَّث تلقائيًا متى تغيّر الموقع أو التخصص، **ما لم** يحرّر المستخدم العنوان يدويًا (نتعقّب `titleTouched` كما نفعل حاليًا للإنجليزي).
- `description_ar` يُولَّد كقالب قصير: `«توريد وتنفيذ {اسم التخصص} في {اسم الموقع} ضمن نطاق العمل المتفق عليه.»` بنفس قاعدة الـ touched.
- الحقول تبقى مرئية وقابلة للتعديل (لا إخفاء).

نمرّر اسم الموقع المختار (`selectedSiteName`) واسم التخصص (`selectedWorkTypeLabel`) من `DashboardContracts.tsx` إلى `ContractDetailsSection` كـ props جديدة اختيارية.

## ملفات ستُعدَّل

- `src/components/contracts/dashboard/create/ContractDetailsSection.tsx` (toggle المدة + auto-title/desc).
- `src/components/contracts/dashboard/create/SupervisorSection.tsx` (Combobox + inline add).
- `src/components/contracts/dashboard/create/ContractTermsSection.tsx` (حقن البنود).
- `src/pages/dashboard/DashboardContracts.tsx` (تمرير `selectedSiteName` و`selectedWorkTypeLabel` و`effectiveVersion` للأقسام).
- جديد: `src/lib/contract-default-terms.ts` (نص البنود الافتراضي).

## ملاحظات تقنية

- لا تغييرات schema. لا migrations.
- لا Dialog/Popup للإضافة — inline فقط (قاعدة المشروع).
- المرآة الإنجليزية للعنوان/الوصف تبقى تلقائية كما في آخر تعديل.
- اختبارات RTL audit واختبارات Phase C/D/E لن تتأثر (لا تغيير على Combobox القوالب ولا ترتيب الخطوات).
- بعد التنفيذ: `tsgo --noEmit` + الاختبارات المستهدفة (`ContractDetailsSection`, `SupervisorSection`, `contractCreationClientAutoFill`).

موافقتك للبدء؟