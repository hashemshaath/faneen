# خطة شاملة: توحيد الاسم الثنائي (AR/EN) + اسم المستخدم + مدخل الجوال بمفتاح دولة منفصل

تغيير حساس يمس قاعدة البيانات، شاشات التسجيل، الملف الشخصي، الإدارة، المنشآت، والتواصل. سيتم تنفيذه على **4 مراحل** قابلة للإيقاف عند أي مرحلة.

---

## ما يتغير للمستخدم النهائي

- حقل الاسم ينقسم إلى: **الاسم بالعربية** + **الاسم بالإنجليزية** + **اسم المستخدم (username)** ظاهر دائمًا (مثل `@ahmed`).
- حقل الجوال يصبح: **قائمة منسدلة بمفتاح الدولة** (🇸🇦 +966 ...) + **حقل رقم فقط**. يُحفظ في DB كرقم دولي موحد (E.164) ويُعرض مفصولًا.
- يُطبَّق نفس النمط على: تسجيل/دخول، إعدادات الحساب، إدارة المستخدمين (`/admin/users`)، المنشآت والفروع، نماذج التواصل/طلبات الخدمة.

---

## المرحلة 1 — قاعدة البيانات (Migration)

### جدول `profiles`
- إضافة: `full_name_ar text`, `full_name_en text`, `phone_country_code text` (مثل `+966`), `phone_national text` (الرقم فقط بدون مفتاح).
- إبقاء `full_name` و `phone` و `username` كحقول مشتقة/متوافقة (backward compatible).
- Trigger يحدّث تلقائيًا:
  - `full_name = coalesce(full_name_ar, full_name_en)`
  - `phone = phone_country_code || phone_national` (E.164)
- Backfill: تعبئة الحقول الجديدة من الحقول القديمة (تخمين المفتاح من بادئة `+966/+971/...` أو SA كافتراضي).

### جدول `businesses` و `business_branches`
- نفس النمط: `name_ar/name_en` موجود مسبقًا (يُبقى)، إضافة `contact_phone_country_code` + `contact_phone_national` مع trigger لتجميع `contact_phone`.

### جدول `lead_requests` و `contact_messages` (إن وجد)
- إضافة عمودَي `phone_country_code` + `phone_national`، مع backfill من `phone`.

---

## المرحلة 2 — مكوّن موحّد `<PhoneField/>`

- يعتمد على `PhoneInput` الموجود في `src/components/auth/PhoneInput.tsx` مع تمديد:
  - دعم RTL/LTR
  - validation موحّد (`useFieldValidation`)
  - يُصدِر `{ countryCode, national, e164 }`
- استبدال جميع `<Input type="tel">` المنفصلة عبر سكربت بحث/استبدال موجَّه (~25 موقع).

## المرحلة 3 — مكوّن موحّد `<BilingualNameField/>`
- ثلاثة inputs: العربية، الإنجليزية، اسم المستخدم.
- تحقق فوري لتوفر `username` (مكرر).
- معروض في: Auth (تسجيل)، إعدادات الحساب، `/admin/users` (إنشاء/تعديل)، صفحة الملف الشخصي العام.

## المرحلة 4 — التطبيق على الصفحات

| الصفحة | التغيير |
|---|---|
| `/admin/users` | استبدال حقل name + phone في نموذج الإنشاء والتعديل |
| `/auth` (تسجيل) | تقسيم Full Name → AR/EN/username، PhoneField |
| `/dashboard/settings/profile` | نفس الأمر |
| `/dashboard/business/*` (إنشاء/تعديل منشأة وفرع) | name_ar/name_en موجود + PhoneField |
| `LeadRequestForm` ونماذج التواصل | PhoneField |
| `PublicUserProfile` + بطاقات المستخدم | عرض الاسم حسب اللغة + `@username` |

---

## التفاصيل التقنية

- **التوافق**: الحقول القديمة (`full_name`, `phone`) تبقى موجودة ومحدَّثة عبر triggers، فلن ينكسر أي كود لم يُهاجَر بعد.
- **التحقق**: `phone_national` بدون `+` وبدون أصفار بادئة. مفتاح الدولة من `countryCodes` المعرّفة في `src/services/auth/constants.ts` (سنوسّعها).
- **العرض**: `<Bi ar={full_name_ar} en={full_name_en}/>` لاسم العرض، الجوال بـ `.tech-content` و `dir="ltr"`.
- **اختبارات**: تحديث `phone.test.ts` + إضافة guard test يمنع `<Input type="tel">` خارج `<PhoneField/>`.
- **حواف**: المستخدمون ذوو بريد `@phone.qitaat.local` يحتفظون به كـ identifier، لكن العرض يستخدم الحقول الجديدة.

---

## ترتيب التنفيذ

1. Migration (قاعدة البيانات + triggers + backfill) — يتطلب موافقتك.
2. مكوّنات `<PhoneField/>` و `<BilingualNameField/>` + barrel exports.
3. تطبيق على `/admin/users` (يكتمل بالكامل ويتم اختباره).
4. تطبيق تدريجي على Auth، Settings، Business، Leads (يمكن إيقافي بعد أي خطوة).

هل أبدأ بالمرحلة 1 (Migration)؟