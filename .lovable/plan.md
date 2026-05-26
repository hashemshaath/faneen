
# Microservice مركزي للعناوين + إعداد SPL تلقائي في كل البيئات

## الهدف
توحيد بيانات العنوان للأشخاص (`profiles`) والشركات (`businesses`) والفروع (`business_branches`) داخل جدول واحد `public.addresses`، مع خدمة قراءة/كتابة موحّدة، وضمان أن خدمة العنوان الوطني `national-address-lookup` تعمل تلقائياً في **التطوير + المعاينة + الإنتاج** دون تدخل يدوي.

## ما هو منجز بالفعل (نُبقي عليه)
- Edge function `national-address-lookup` تقرأ `SPL_API_KEY` من env ثم من `platform_settings` كاحتياط (موجود). 
- استخدام مباشر في `DashboardProfile` و `DashboardBusinessEdit` و `AdminBusinesses` (أنجزناه قبل قليل). 
- اختبارات عزل الكاش وفحص query keys (انتهت في هذه الجولة).

## التغييرات

### 1) جدول `public.addresses` الموحّد (Migration جديدة)

```text
addresses
├── id                uuid PK
├── owner_type        text  CHECK in ('profile','business','branch')
├── owner_id          uuid  -- يشير لـ profiles.user_id / businesses.id / business_branches.id
├── label             text  -- مثل: 'main','billing','site'
├── is_primary        boolean default false
├── short_address     text  -- رمز SPL (RRRD2402)
├── country_id, city_id, region, district, street_name, building_number, additional_number, post_code, address, latitude, longitude
├── region_en, district_en, street_name_en, address_en   -- ثنائي اللغة كامل
├── source            text  -- 'spl' | 'map_pick' | 'manual'
├── verified_at       timestamptz
├── created_by        uuid
└── created_at / updated_at
```

- **Index**: `(owner_type, owner_id)`, partial unique `(owner_type, owner_id) WHERE is_primary`.
- **RLS**: المالك (حسب `owner_type/owner_id`) + admin + business_staff للفروع/الشركات.
- **Trigger**: `addresses_set_primary` يضمن primary واحد فقط لكل مالك.

### 2) Microservice في الواجهة الأمامية

`src/modules/addresses/` (جديد):

```text
modules/addresses/
├── index.ts
├── types.ts              # AddressRow / AddressInput / OwnerRef
└── services/
    ├── listAddresses.ts          # by ownerType + ownerId
    ├── getPrimaryAddress.ts
    ├── upsertAddress.ts          # insert or update by id
    ├── setPrimaryAddress.ts
    ├── deleteAddress.ts
    └── resolveFromSpl.ts         # استدعاء national-address-lookup + بناء AddressInput
```

`resolveFromSpl.ts` يصبح **النقطة الوحيدة** لاستدعاء `national-address-lookup` — كل الصفحات (Profile/BusinessEdit/AdminBusinesses) تستهلك هذا الـwrapper بدل تكرار `supabase.functions.invoke`.

### 3) SPL تلقائي في كل البيئات (zero-touch)

- التحقق من وجود `SPL_API_KEY` كـ **secret على مشروع Supabase** (`secrets--fetch_secrets` ثم `add_secret` إن لزم — السرّ ينطبق تلقائياً على dev/preview/prod لأن edge functions تعمل بنفس النشر).
- لوحة الأدمن `AdminApiSettings`: إضافة بطاقة حالة `SPL_API_KEY` (موجود مفتاح env / مفتاح في `platform_settings`؟ تاريخ آخر استعلام ناجح؟) + زر "اختبار الاتصال" يستدعي شفرة قصيرة (`RRRD2402`) ويعرض النتيجة. هذا يجعل التحقق من الإعداد ذاتيًا في كل بيئة.
- توثيق صغير في `docs/national-address-service.md`: كيف يُضاف المفتاح مرة واحدة، وكيف تتأكد بأنه يعمل.

### 4) ترحيل البيانات (دفعة واحدة، non-destructive)

داخل نفس الـmigration:
- نسخ صفوف العنوان الحالية من `profiles` / `businesses` / `business_branches` إلى `addresses` كـ `is_primary=true`.
- **لا تُحذف الأعمدة الحالية في هذه المرحلة** — تبقى للقراءة الخلفية حتى نتأكد عبر الإنتاج. الكتابة الجديدة تذهب لـ `addresses` + تُحدِّث الأعمدة القديمة (dual-write) عبر الـwrapper `upsertAddress` كمرحلة انتقالية.

### 5) ربط الواجهة (الحد الأدنى لهذه الجولة)

- `DashboardProfile`، `DashboardBusinessEdit`، `AdminBusinesses`: استبدال استدعاء SPL المباشر بـ `resolveFromSpl` + استخدام `upsertAddress` بعد الحفظ (dual-write). الـUI لا يتغيّر بصرياً.

### 6) اختبارات

- `addressesMicroservice.test.ts`: list/upsert/setPrimary/delete (مع Supabase mock).
- `addressesIsolationAudit.test.ts`: يفحص أن لا يوجد `supabase.functions.invoke('national-address-lookup'` خارج `src/modules/addresses/` (يجعل الخدمة هي القناة الوحيدة).
- `addressesRlsRegression.test.ts`: anon لا يقرأ/يكتب؛ owner يقرأ/يكتب صفوفه فقط.

## الملفات

- `supabase/migrations/<ts>_addresses_central_table.sql` (جديد)
- `src/modules/addresses/{index,types}.ts` (جديد)
- `src/modules/addresses/services/*.ts` (6 ملفات جديدة)
- `src/pages/dashboard/DashboardProfile.tsx` (تحديث استدعاءات SPL/الحفظ)
- `src/pages/dashboard/DashboardBusinessEdit.tsx` (نفس)
- `src/pages/admin/AdminBusinesses.tsx` (نفس)
- `src/pages/admin/AdminApiSettings.tsx` (بطاقة حالة SPL + زر اختبار)
- `docs/national-address-service.md` (جديد)
- 3 ملفات اختبارات

## خارج النطاق
- حذف الأعمدة القديمة (`businesses.address` ...) — مرحلة لاحقة بعد تشغيل dual-write لفترة.
- تغيير شكل صفحات العرض العامة.
- تعديل خدمات أخرى (booking/contracts) لاستخدام الجدول الجديد — تتم تدريجياً.

## ملاحظات تقنية
- `owner_id` بدون FK مركّب لأنه polymorphic؛ يُضبط بـtrigger يتحقق من وجود الصف في الجدول الصحيح حسب `owner_type`.
- `set_primary` trigger يستخدم `BEFORE INSERT/UPDATE` لإلغاء primary السابق ضمن نفس `(owner_type, owner_id)` ذرّياً.
- SPL: المفتاح يُحفظ كـ secret على Supabase → يصل لكل edge function deployment تلقائياً في كل البيئات (لا حاجة لمتغيرات بيئة منفصلة في الواجهة).
