
# إعادة تصميم منظومة العضويات

النطاق ضخم جداً (≈5,000 سطر بين الصفحة العامة، لوحة المزوّد، 4 شاشات أدمن، و20+ مكوّن). تنفيذ كل ذلك دفعة واحدة محفوف بالأخطاء وسيكلّفك كثيراً من الرصيد. أقترح تقسيمه على **3 مراحل** متتابعة، ونبدأ الآن بالمرحلة الأولى — وهي الأهم تجارياً (تجربة المستخدم النهائي + سرعة الاشتراك).

---

## المرحلة 1 — الصفحة العامة `/membership` (نُنفّذها الآن)

### أ. إعادة التصميم البصري الكامل
- **Hero جديد**: عنوان مكثّف + Trust strip مدمج + مبدّل (شهري / سنوي بخصم) كأزرار segment أنيقة.
- **بطاقات الباقات (PlanCard v2)**:
  - تصميم Apple-like، `rounded-2xl`، ظل ناعم، حد متدرّج للباقة الموصى بها.
  - **تبويبات داخل كل بطاقة**: «الظهور والوصول» · «التحليلات» · «أدوات الذكاء» · «الدعم» — تعرض المزايا الفعلية المرتبطة بهذه الباقة من قاعدة البيانات (`membership_plans.features` + `plan_feature_matrix`).
  - شارة «الباقة الحالية» / «الأعلى قيمة» / «موصى به».
  - زر CTA واحد ذكي يتغيّر نصه حسب الحالة (اشترك / ترقّى / الباقة الحالية / تخفيض).
- **جدول مقارنة مطوي** (`<details>` افتراضياً مغلق + Lazy import) لتسريع التحميل الأولي.
- إعادة ترتيب الأقسام: Hero → Recommender → Plans → Compare (مطوي) → FAQ → Trust.

### ب. تبسيط الاشتراك — معالج خطوتين (Stepper inline)
بدلاً من الانتقالات المتعددة والتأكيدات المنفصلة (downgrade/upgrade/checkout) نستخدم **قسم Stepper شفّاف يظهر مكان البطاقات** عند الضغط على «اشترك»:

```
[الخطوة 1: المراجعة]                 [الخطوة 2: الدفع/التفعيل]
─ الباقة المختارة + ميزاتها         ─ ملخص الفاتورة (شامل ضريبة 15%)
─ المنشأة المرتبطة (ref_id)         ─ زر «ادفع الآن» → Moyasar
─ مبدّل شهري/سنوي                   ─ أو «طلب ترقية يدوية» للحالات الخاصة
─ كود خصم (اختياري)                 ─ بعد النجاح: شاشة تأكيد كاملة
```

- يلتزم بقاعدة المشروع: **لا Dialogs/Popups**، كل شيء inline داخل نفس الصفحة (يستبدل قائمة البطاقات أثناء العملية).
- زر «رجوع» في كل خطوة.
- للتخفيض (downgrade): خطوة تأكيد inline توضّح متى سيُطبَّق التغيير.

### ج. التحقق من ظهور المزايا حسب الباقة (DB → UI)
- قراءة `membership_plans.features` (JSONB) و `plan_feature_matrix` لبناء التبويبات ديناميكياً.
- مراجعة `FeatureGate.tsx` للتأكد أن المنع/السماح يتطابق مع البيانات.
- لو وُجدت ميزات بدون mapping في الـ matrix → تنبيه في console (dev only).

### د. تحسين الأداء
- `lazyRetry` لجدول المقارنة، Testimonials، FAQ، Payment History.
- دمج استعلامي `my-business-membership` و `my-subscription` في React Query batch.
- إزالة polling الـ60 ثانية واستخدام Realtime فقط (موجود مسبقاً).
- `useMemo` للـ JSON-LD، `React.memo` لبطاقات الباقات.
- استبدال أيقونات lucide غير المستخدمة (تقليل bundle).

### هـ. المسارات والروابط
- إبقاء `/membership` و `/membership/invoice/:id` و `/membership/payment-return` كما هي.
- إصلاح أي رابط مكسور داخل المكوّنات، توحيد الـ deep links (`#upgrade-requests`, `#compare`).
- تحديث sitemap لو لزم.

### و. SEO
- إبقاء JSON-LD الحالي (Breadcrumb + FAQPage + Product/AggregateOffer) مع تحسين الأوصاف.
- `usePageMeta` بنصوص مُحسّنة.

---

## المرحلة 2 — لوحة المزوّد `/dashboard/provider/membership`
- إعادة استخدام مكوّنات المرحلة 1 (PlanCard v2 + Stepper) داخل قشرة Dashboard.
- إضافة لوحة «استخدام الباقة» (Quotes used / Leads used / Storage) من DB.
- تنبيهات الاقتراب من الحد الأقصى.

## المرحلة 3 — شاشات الأدمن (4 صفحات، 2,741 سطراً)
- **بدون إعادة تصميم كامل** (هي أدوات تشغيلية، التصميم الحالي وظيفي).
- مراجعة + توحيد رؤوس الجداول والفلاتر بنمط `dashboard-standard`.
- إصلاح أي bugs، تحسين الفلاتر/البحث، أزرار pivot بين الشاشات الأربع.

---

## ملاحظات تقنية مهمة
- لا تغييرات في schema الـ DB في المرحلة 1 إلا لو اكتشفنا نقصاً في `plan_feature_matrix` — حينها migration صغيرة لإضافة الميزات الناقصة (data only via insert tool).
- TypeScript صفر `any` (يلتزم بسياسة المشروع).
- RTL/LTR كامل، استخدام `<Bi>` و `useBi()` بدلاً من inline ternaries.
- استخدام design tokens فقط (لا ألوان مباشرة).

---

## الملفات المتوقّع تعديلها في المرحلة 1
- `src/pages/Membership.tsx` (إعادة بناء جوهرية ~30% أقصر)
- `src/components/membership/PlanCard.tsx` (إعادة بناء مع تبويبات)
- `src/components/membership/MembershipHeader.tsx` (Hero محسّن)
- `src/components/membership/FeatureComparisonTable.tsx` (lazy + تطوير)
- **جديد**: `src/components/membership/SubscribeStepper.tsx`
- **جديد**: `src/components/membership/PlanFeatureTabs.tsx`
- **جديد**: `src/lib/membership-features.ts` (موحّد لقراءة المزايا من DB)

هل أبدأ بتنفيذ **المرحلة 1**؟ (الموافقة هنا = تنفيذ المرحلة 1 فقط، ثم نقرر المرحلة 2 لاحقاً).
