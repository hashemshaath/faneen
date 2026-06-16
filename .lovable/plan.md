# إعادة بناء صفحة تسجيل بيانات المنشأة

## 1) تدقيق التصنيفات المركزية (DB)

### المشاكل المكتشفة
- **7 تصنيفات مكررة بالاسم العربي** عبر `taxonomy_categories`: المطابخ، الزجاج والسيكوريت، الستانلس ستيل، مولدات، الألمنيوم، سقالات، مطابخ ألمنيوم.
- **تداخل نوعين** يخدمان نفس الغرض: `sector` (34 تصنيفًا، إصدار قديم) و`primary_activity` (31 تصنيفًا، الإصدار الحديث المستخدم في الـpicker).
- `secondary_activity` فيها 175 تخصصًا — جيد لكن بحاجة تنظيف وربط واضح بالأنشطة الرئيسية عبر `taxonomy_category_relations` (parent_id) ليعمل الفلترة في الواجهة.
- بعض `primary_activity` غير ظاهرة في التسجيل (24 من 31 فقط `show_in_registration=true`).

### الإجراءات (Migration واحدة، قابلة للمراجعة)
1. **دمج المكررات**: لكل اسم مكرر نُبقي السجل الأقدم/الأنشط ونؤرشف الآخر (`is_archived=true`, `is_active=false`)، مع تحويل أي ربط في `business_taxonomy_categories` و`taxonomy_aliases` إلى السجل المُبقى.
2. **تصفية `sector` القديم**: تحويله إلى alias-only — يُؤرشف نوع `sector` من قوائم الاختيار العامة، وتُنقل أسماؤه كـ`taxonomy_aliases` على ما يقابلها في `primary_activity`. تقرير قبل التنفيذ.
3. **تفعيل `show_in_registration=true`** لكل تصنيفات `entity_type` و`primary_activity` و`secondary_activity` النشطة.
4. **التحقق من parent_id** لكل `secondary_activity` ليكون مرتبطًا بنشاط رئيسي واحد على الأقل.

## 2) إعادة بناء صفحة بيانات المنشأة (UI)

تُستبدل خطوة `business-details` الواحدة الطويلة بـ Wizard من 4 خطوات فرعية مع شريط تقدم خاص بها (داخل خطوة Onboarding "بيانات المنشأة"):

```text
[ 1 الهوية ] → [ 2 التصنيف ] → [ 3 العنوان والفروع ] → [ 4 مدير الحساب ]
```

### خطوة 1 — الهوية
الاسم بالعربي/الإنجليزي، اسم المستخدم، الرقم الموحد 700، البريد، السجل التجاري (اختياري).

### خطوة 2 — التصنيف (سهل وسريع)
- **بحث ذكي موحَّد** أعلى الصفحة يبحث في النوع/النشاط/التخصص ويقترح فورًا.
- **3 شرائح أفقية** قابلة للتوسعة:
  - نوع الجهة (Chips أحادي الاختيار، 15 خيار، أيقونة لكل نوع).
  - النشاط الرئيسي (Chips متعدد، يظهر فقط الأنشطة المرتبطة بنوع الجهة المختار).
  - التخصصات (Chips متعدد، تظهر فقط التخصصات التابعة للأنشطة المختارة عبر parent_id).
- اقتراحات شائعة في الأعلى + "الأكثر اختيارًا في منطقتك".
- زر "لم أجد تخصصي" يفتح حقل اقتراح يُسجَّل في `service_addition_requests`.

### خطوة 3 — العنوان والفروع (مرتبط بنظام العناوين المركزي)
تبويبان جنبًا إلى جنب:

**أ. العنوان الوطني (SPL)** — إدخال الرمز القصير (4 أحرف + 4 أرقام) → استدعاء `nationalAddressLookup` (موجود) → تعبئة تلقائية لكل الحقول + تحديث الخريطة.

**ب. الخريطة** — Google Maps (Connector موجود): تحريك Marker → reverse geocode عبر `reverseGeocode` → تعبئة الحقول.

كلا التبويبين يكتبان في نفس الـstate. النموذج يستخدم `NationalAddressForm` الموجود ويُحفظ عبر `upsertPrimaryAddress` من `@/modules/addresses` مع `owner_type='business'` و`address_type='primary'` (لا تكرار كود — استخدام كامل للوحدة المركزية).

**الفروع**: قسم قابل للطي تحت العنوان مع زر "+ إضافة فرع". كل فرع له نفس مكوّن العنوان (تبويبان) ويُحفظ كـ `address` مرتبط بـ `business_branches` عبر نفس الـmodule. الفرع الأول = الرئيسي تلقائيًا.

### خطوة 4 — مدير الحساب
الاسم + الجوال (كما هو الحالي).

## 3) المكوّنات الجديدة (frontend فقط)

- `src/components/onboarding/business/BusinessWizard.tsx` — موجِّه الخطوات الفرعية وحالة الـDraft.
- `src/components/onboarding/business/steps/IdentityStep.tsx`
- `src/components/onboarding/business/steps/ClassificationStep.tsx` — يستخدم `MultiPrimaryTaxonomyPicker` الموجود لكن بواجهة Chips أبسط + بحث.
- `src/components/onboarding/business/steps/AddressStep.tsx` — يستخدم `NationalAddressForm` + خريطة جديدة `BusinessAddressMap.tsx`.
- `src/components/onboarding/business/steps/AccountManagerStep.tsx` — نقل الكود الحالي.
- `src/components/onboarding/business/BranchesEditor.tsx` — قائمة فروع inline.
- `src/components/maps/AddressPickerMap.tsx` — Google Maps + Marker + reverseGeocode (مشترك مع لوحة التحكم لاحقًا).

`src/pages/Onboarding.tsx` يقلص ليصبح موجِّهًا فقط (يستدعي `BusinessWizard`)، مع الحفاظ على منطق الحفظ والتنقل الحالي.

## 4) ما لن يتغيّر
- منطق إنشاء `businesses` / `profiles` الحالي يبقى — Wizard فقط يجمّع البيانات.
- نظام العناوين المركزي `@/modules/addresses` لا يُعدّل — نستهلكه فقط.
- لا تغيير على الـauth أو الأدوار.

## التحقق
- Migration: تقرير قبل/بعد لعدد التصنيفات لكل نوع + قائمة المُؤرشَفات.
- Playwright سريع للـwizard: ملء الحقول → اختيار من الخريطة → إنشاء منشأة تجريبية والتأكد من حفظ العنوان مع `address_type='primary'`.

## ملاحظة قبل التنفيذ
هذه خطة كبيرة. **سأبدأ بالـmigration للتصنيفات أولاً** (تحتاج موافقتك بشكل منفصل عبر أداة migration)، وبعد تطبيقها أنفّذ الـUI. هل تأذن؟
