## النطاق

تنفيذ متوازي عبر 4 محاور: تدقيق فني للبيانات/RLS، تحسين UX للأدمن، صفحة Claim عامة، وميزات احترافية جديدة.

---

## 1) تدقيق قواعد البيانات والربط (DB Audit)

- **فحص RLS وGRANTS** على `business_ownership_transfer_requests`, `businesses (placeholder_owner)`, `admin_activity_log`.
- **التحقق من triggers**: تأكد أن إنشاء المنشأة بنمط placeholder يربط تلقائياً بالمالك المؤقت (`com@qitaat.com`) ويسجّل في `admin_activity_log`.
- **Indexes**: إضافة فهارس على `business_ownership_transfer_requests(business_id, status)` و`businesses(placeholder_owner) WHERE placeholder_owner=true`.
- **سلامة المرجعية**: إضافة CHECK constraint لمنع طلبات الـ claim على منشآت غير placeholder.
- **تشغيل `supabase--linter`** بعد التعديلات للتحقق من غياب أي تحذيرات أمنية.

## 2) صفحة Claim العامة `/claim/:businessId`

- صفحة عامة (no auth required للعرض، auth مطلوب للإرسال).
- تعرض: اسم المنشأة، الشعار، حالة "متاحة للمطالبة" (badge أخضر)، شروط المطالبة.
- نموذج Inline (لا popup): الاسم الكامل، رقم الجوال، البريد، السجل التجاري (رقم + ملف PDF/صورة)، رسالة، إثبات الملكية (روابط/ملفات).
- التحقق بـ Zod، رفع الملفات إلى Supabase Storage bucket جديد `ownership-claim-proofs` (private).
- بعد الإرسال: شاشة نجاح fullscreen مع رقم الطلب وتعليمات المتابعة.
- زر "نسخ رابط المطالبة" في صفحة `/admin/businesses` لكل منشأة placeholder.

## 3) تطوير صفحة `/admin/ownership-transfer-requests`

- **معاينة الإثبات**: عارض ملفات مرفقة (PDF/صور) inline مع zoom.
- **بحث وفلترة متقدمة**: بحث نصي (اسم منشأة، اسم طالب، بريد)، فلتر بالتاريخ، فرز.
- **Bulk Actions**: موافقة/رفض جماعي مع تأكيد inline.
- **تصدير CSV** للطلبات حسب الفلتر الحالي.
- **Realtime**: تحديث الحالة فور قدوم طلب جديد (Postgres Changes).
- **تحسين البطاقات**: عرض ملخّص أوضح، أيقونات حالة ملوّنة، مدة الانتظار، عدد الطلبات المنافسة لنفس المنشأة.
- **سجل المراجعة الكامل**: إظهار من راجع، متى، الملاحظات.

## 4) تنظيف الكود وإعادة الهيكلة

- **تقسيم `AdminBusinesses.tsx`** (2835 سطر) إلى مكونات أصغر: `BusinessCreateForm`, `BusinessListTable`, `BusinessFilters`, `PlaceholderBadge`.
- **استخراج Hooks**: `useAdminBusinesses`, `useCreateBusiness`, `usePlaceholderReport`.
- **إزالة `any`**: استبدالها بأنواع دقيقة (التزاماً بسياسة المشروع).
- **توحيد رسائل الأخطاء** عبر `adminCreateBusinessWithOwnerErrors`.

## 5) ميزات احترافية جديدة

- **Audit Timeline View** لكل منشأة: سجل أحداث الـ placeholder (إنشاء، طلبات claim، موافقات، رفض، نقل ملكية).
- **Auto-suggestions في الـ Admin**: عند إنشاء placeholder، اقتراح ربط بمزودين موجودين بناءً على التشابه (الاسم/المدينة).
- **تقرير لوحة معلومات**: إجمالي placeholder، متوسط زمن المطالبة، نسبة الموافقة، أكثر القطاعات placeholder.
- **إشعارات بريدية** (عبر بنية Lovable Emails) للأدمن عند طلب claim جديد، وللمستخدم عند موافقة/رفض طلبه.
- **Rate limiting** على إرسال طلبات claim (3 طلبات/ساعة لكل IP) لمنع الإساءة.

---

## التفاصيل التقنية

```text
DB Changes (migration):
- ALTER business_ownership_transfer_requests
    ADD COLUMN proof_files jsonb DEFAULT '[]'::jsonb
    ADD COLUMN requester_name text
    ADD COLUMN requester_phone text
    ADD COLUMN requester_email text
    ADD COLUMN commercial_registration text
    ADD COLUMN ip_hash text
- CREATE INDEX idx_botr_business_status ON ... (business_id, status)
- CREATE INDEX idx_businesses_placeholder ON businesses(id) WHERE placeholder_owner=true
- Storage bucket: ownership-claim-proofs (private)
- RPC: submit_ownership_claim(business_id, ...) SECURITY DEFINER with rate limit check
- RPC: get_placeholder_dashboard_stats() returning aggregate JSON

Routes:
- /claim/:businessId (public, lazy-loaded)
- /admin/ownership-transfer-requests (enhanced)

Realtime:
- ALTER PUBLICATION supabase_realtime ADD TABLE business_ownership_transfer_requests
```

ملف plan قابل للتعديل حسب رغبتك — قل لي إن أردت حذف أو إضافة أي محور قبل التنفيذ.