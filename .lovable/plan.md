# خطة: تفعيل بحث المزوّد وإعادة تصميم خطوة الأطراف في إنشاء العقد

## ما رصدته الآن (فحص بصري)
الصفحة `/dashboard/contracts` ← "إنشاء عقد جديد" تعمل وفق ترتيب Phase السابق:
الغرض → الأطراف → القالب → موقع → تفاصيل → تسعير → مراجعة.

لكن للحسابات الفردية (مثل حسابك الحالي بدون منشأة) يظهر تحذير:
> «اربط المشروع بمزود خدمة قبل إنشاء العقد»

بدون أي زر/حقل بحث. أي أن **الطرف الأول لا يمكن اختياره يدويًا**، فيتجمّد المسار.

## التغييرات

### 1) مكوّن جديد — `ContractProviderSearchPicker`
- `src/components/contracts/dashboard/create/ContractProviderSearchPicker.tsx`
- بحث inline (لا dialog) ضمن جدول `businesses` المنشورة:
  - حقل بحث بـ debounce 300ms (الاسم AR/EN، الرقم المعرّف).
  - فلتر اختياري: التخصص (يأتي من `selectedWorkType` إن وُجد).
  - نتائج كبطاقات صغيرة (max 8) مع زر "اختيار".
  - حالة فارغة + حالة تحميل + زر "مسح الاختيار".
- يستخدم `useQuery` و `supabase.from('businesses').select(...).ilike(...).eq('is_published', true).limit(8)`.
- Pure presentational + query؛ لا تغييرات على RLS/RPC/migrations.

### 2) ربط الاختيار بحالة العقد
في `DashboardContracts.tsx`:
- إضافة state: `selectedProviderBusiness: { id, name_ar, name_en, ref } | null`.
- تمريرها لـ `resolveContractPartiesAndEligibility` عبر `firstParty.selectedProviderBusinessId` و `firstParty.displayName`.
- إظهار الـ Picker داخل خطوة "الأطراف" فقط عندما `accountKind === 'client'` و `!linkedProviderProjectId`.

### 3) تحسين `ContractPartiesPanel` (إعادة تصميم احترافية)
- بطاقتان متقابلتان (الطرف الأول/الثاني) بحدود واضحة، أيقونة دور، وحالة "مكتمل/ناقص" ملوّنة (success/warning).
- شارة دور صريحة (`المزوّد` / `صاحب الحساب`).
- زر تعديل/تغيير الاختيار للطرف الأول عند توفّر الـ picker.
- شريط ملخّص أسفل البطاقات: "جاهز للمتابعة" أو "أكمل اختيار الطرف الأول".

### 4) تحديث الـ stepper
- اسم خطوة الأطراف للعميل الفردي يصبح: «الطرف الأول» بدل «الطرف الثاني» عند غياب المزوّد.
- زر "التالي" مُعطّل حتى يُختار المزوّد.

### 5) خط الإنتاج وحدود الملفات
- استخراج JSX الجديد إلى `ContractPartiesStep.tsx` لإبقاء `DashboardContracts.tsx` تحت 3192.
- لا تغيير على lifecycle العقد (يبقى `draft`) ولا على فلترة القوالب أو الإشعارات.

## ما لن يتغيّر
- DB / RLS / RPC / migrations / edge functions.
- ترتيب الخطوات.
- منطق فلترة القوالب.
- العقود الحالية والـ matching/credits/notifications.

## التحقق
- `tsgo --noEmit`.
- اختبارات جديدة:
  - `contractProviderSearchPicker.test.tsx` (debounce + اختيار + مسح).
  - تحديث `contractCreationPurposeFirstFlow.test.tsx` لتأكيد ظهور الـ picker للحساب الفردي وتعطيل "التالي" قبل الاختيار.
- لقطة Playwright لخطوة الأطراف بعد التطبيق.

## ملاحظات
- لن أضيف أي dialog/popup (التزامًا بقاعدة المشروع: نماذج inline فقط).
- جميع الألوان عبر tokens المعتمدة (`bg-primary/5`, `border-success/40`, إلخ).
