
## الهدف
تحويل `qitaat.com/ajanetworking/loc1000003` إلى صفحة احترافية بروابط مقروءة وميزات مدعومة بقاعدة البيانات.

## نطاق التغيير

### 1. روابط الفروع بأسماء بدل `loc1000003`
- إنشاء migration `backfill_branch_slugs` يولّد `slug` تلقائياً من `name_en` (أو `name_ar` معرّب لاتيني) لكل فرع لا يملك `slug`.
- إضافة DB trigger `branch_auto_slug` يضمن أن أي فرع جديد يحصل على slug فوراً.
- تحديث جميع روابط الفروع في `BusinessProfile.tsx` و `BranchDetail.tsx` (siblings) لاستخدام `/{username}/{branch.slug}` فقط.
- الإبقاء على fallback في `BranchDetail` لاستقبال `loc1000003` و302→الـ slug الجديد (موجود مسبقاً، تأكيد فقط).

### 2. عدّاد زيارات حقيقي
- جدول جديد `branch_visits` (branch_id, visitor_hash, day, count) + RPC `record_branch_visit(branch_id)` لمنع التضخيم.
- جدول مُجمَّع `branch_visit_stats_view` للقراءة السريعة (total + last 30 days).
- استدعاء RPC من `BranchDetail` عند التحميل (مرة لكل جلسة/فرع عبر sessionStorage).
- عرض العدّاد في شريط الإحصائيات مع animated count-up.

### 3. مفضلة مرتبطة بقاعدة البيانات
- جدول `user_favorite_businesses` (user_id, business_id, ref_id_snapshot, created_at) مع RLS لكل مستخدم.
- توسعة `useBusinessFavorites` لتدمج localStorage (زوّار) + Supabase (مسجَّلين): الكتابة المزدوجة + الدمج عند تسجيل الدخول.
- زر قلب في رأس `BranchDetail` يخزن `business_id + ref_id` ويعرض حالة "محفوظ" مع toast.

### 4. تحسين الخدمات + رقم الهاتف عند الضغط
- بطاقات الخدمات: شارة سعر، تأثير `hover-lift`، رابط لصفحة الخدمة، شارة "متوفر" حسب `is_active`.
- مكوّن `RevealPhoneButton`: يخفي الرقم خلف زر "اضغط لإظهار الرقم"، يكشفه + يسجّل حدث `phone_reveal` في `branch_visits` كنوع منفصل، ثم زر اتصال/واتساب.
- نفس المكوّن يُستخدم لـ phone/mobile/whatsapp/customer_service_phone.

### 5. زر مشاركة احترافي
- مكوّن `ShareMenu` (inline popover، لا modal): WhatsApp, X, Facebook, LinkedIn, Telegram, Email, نسخ الرابط، QR صغير.
- يستخدم `navigator.share` على الجوال + fallback القائمة على الحاسوب.
- زر "أوصِ بهذا الفرع" يفتح صفحة المراجعات داخلياً.

### 6. تحسينات صفحة BranchDetail عامة
- Hero مع logo + breadcrumb + شارات (Verified, Main branch, Rating).
- شريط إحصائيات: زيارات، تقييم متوسط، عدد المراجعات، عدد الخدمات.
- خريطة مصغّرة (إذا متوفّر lat/lng) مع زر "افتح في الخرائط".
- قسم "فروع أخرى" — استبدال الروابط لتستخدم slug الاسم.
- تحسين تجاوب الموبايل + skeleton أثناء التحميل.

## التفاصيل التقنية

### Migrations
1. `backfill_branch_slugs.sql` — function `public.gen_branch_slug(name_en, name_ar, business_id)` + UPDATE للفروع الموجودة.
2. `branch_visits.sql` — جدول + GRANT + RLS (insert من الجميع، select admin/owner) + RPC `record_branch_visit`.
3. `user_favorite_businesses.sql` — جدول + GRANT + RLS (user_id = auth.uid()).

### ملفات الواجهة
- `src/pages/BranchDetail.tsx` — إعادة هيكلة الأقسام، دمج المكوّنات الجديدة.
- `src/components/branch/RevealPhoneButton.tsx` (جديد).
- `src/components/branch/ShareMenu.tsx` (جديد) — مشترك مع BusinessProfile.
- `src/components/branch/BranchVisitCounter.tsx` (جديد) — count-up.
- `src/hooks/useBranchVisits.ts` (جديد) — RPC wrapper + React Query.
- `src/hooks/useBusinessFavorites.ts` — توسعة لدعم Supabase.
- `src/pages/BusinessProfile.tsx` — تحديث روابط الفروع.

## خارج النطاق
- إعادة تصميم BusinessProfile بالكامل (سيظل كما هو، فقط روابط الفروع تتحدّث).
- تحليلات متقدّمة (heatmaps, conversion funnels).

## التحقق
- ESLint + TypeScript.
- اختبار يدوي: `/ajanetworking/loc1000003` يعيد التوجيه إلى slug الاسم.
- التحقق من العدّاد يزداد مرة لكل جلسة.
- المفضلة تستمر بين الجلسات للزوّار والمسجَّلين.
