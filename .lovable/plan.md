
# خطة تطوير تجربة التواصل في قِطاعات

تنفيذ مرحلي على 4 مراحل متتابعة. كل مرحلة قابلة للنشر بشكل مستقل، ويمكنك المراجعة بين المراحل.

## المبادئ الحاكمة

- **Backend**: لا تغييرات DB إلا عند الحاجة الحقيقية، ودائماً مع شرح + RLS صارم.
- **الأمان**: لا تمرير PII (إيميل، هاتف، اسم) إلى GA4/GTM — فقط أحداث مجهولة الهوية.
- **التصميم**: Tokens موجودة (`surface`, `btn-ds`, `.hover-lift`, `VerifiedBadge`, `<Bi>`).
- **اللغة**: `<Bi ar="..." en="..."/>` بدلاً من `isRTL ? ar : en` المباشر.
- **No popups**: نماذج inline أو fullscreen views.
- **Mobile-first**: الاختبار الأساسي على 393px.

---

## المرحلة 1 — التسجيل و Onboarding (احترافية + موثوقية)

### الواجهة (Frontend)
- **`RegisterForm`**: مؤشر قوة كلمة سر مرئي مع اقتراحات، تحقق فوري للإيميل/الهاتف، عرض الأخطاء بصورة inline أسفل الحقل (لا toasts للأخطاء التحققية).
- **`RegistrationSuccessView`**: شاشة fullscreen محسّنة — زر "إعادة إرسال التأكيد" مع cooldown 60s، عداد مرئي، زر "تغيير الإيميل".
- **`Onboarding` Wizard**: 
  - Progress bar أوضح (3 خطوات: نوع الحساب → بيانات → قطاعات للمزود).
  - حفظ تلقائي للمسودة في `localStorage` عبر `onboarding-draft.ts` (موجود).
  - شاشة "Welcome" نهائية مع CTA لأول إجراء (إكمال الملف، استكشاف المزودين).
- **حالات Error**: رسائل عربية واضحة عبر `errorMessages.ts` (موجود) — توسيع لتغطية حالات الشبكة والـ rate limit.

### Backend (مطلوب)
- **توسيع جدول `profiles`** (إن لم يوجد): إضافة `onboarding_step` (smallint), `onboarding_completed_at` (timestamptz) — لتمكين resume الدقيق وتتبع التحويل.
- **Edge function `track-onboarding-event`**: يستقبل أحداث (started, step_completed, abandoned, completed) ويسجلها في `activity_log` فقط (بدون GA4).
- **Trigger**: عند اكتمال الـ onboarding، إنشاء إشعار welcome في `notifications` + إرسال welcome email عبر `send-transactional-email`.

### Analytics (آمن — بدون PII)
- أحداث GTM: `signup_started`, `signup_otp_sent`, `signup_completed`, `onboarding_step_{n}`, `onboarding_completed`. القيم: `account_type` فقط.

---

## المرحلة 2 — مركز الرسائل + الإشعارات

### الواجهة
- **`DashboardMessages`**: 
  - Empty state احترافي (illustration + CTA "ابدأ محادثة جديدة").
  - Loading: skeletons موحدة (لا spinners).
  - Error state مع زر "إعادة المحاولة".
  - مؤشر "متصل الآن" (online presence) — موجود بشكل جزئي، توحيد.
  - مؤشر "يكتب الآن…" عبر Realtime broadcast.
  - Read receipts (✓ / ✓✓) واضحة.
  - Pinned conversations + Unread filter chips.
- **`NotificationBell`** (موجود): تحسين group-by-type، "Mark by category"، صوت اختياري عند وصول إشعار عاجل.
- **`DashboardNotifications`** صفحة كاملة: Filters (All/Unread/Urgent/By type)، Bulk actions، Search داخل الإشعارات.

### Backend
- **`messages` table**: إضافة `read_at` (timestamptz), `delivered_at`, `is_pinned` إن لم توجد.
- **`typing_indicators`**: استخدام Realtime broadcast فقط (لا جدول DB).
- **RLS**: تأكيد أن المرسل والمستقبل فقط يقرأون الرسالة، الأدمن لا يطلع على المحتوى (privacy-by-design) — فقط metadata.
- **Trigger**: عند إنشاء رسالة جديدة، إنشاء إشعار للمستقبل (إن لم يكن متصلاً وعدّاد unread > 0).

### Realtime
- Channels: `conversation:{id}` للرسائل + typing، `user:{id}:notifications` للإشعارات.

---

## المرحلة 3 — Contact/Lead + قوالب الإيميل

### الواجهة
- **`Contact`**: نموذج يحفظ في `contact_messages` + يُرسل تأكيد للمستخدم وإشعار إيميل للأدمن (موجود — تحسين القوالب فقط).
- **Lead requests (طلب تواصل من ملف مزود)**: زر "اطلب عرض سعر" يفتح inline form (لا dialog) — يحفظ في `lead_requests` ويُرسل:
  - إشعار in-app + إيميل للمزود.
  - تأكيد إيميل للمستخدم.
  - إشعار للأدمن (للمتابعة).

### Backend
- **جدول جديد `lead_requests`** (إن لم يوجد):
  - `id, user_id, business_id, message, contact_preference (email/phone/whatsapp), status (new/contacted/closed), created_at`.
  - RLS: المستخدم يرى طلباته، المزود يرى الطلبات الموجهة لأعماله، الأدمن يرى الكل (metadata فقط).
- **Trigger**: notifications + transactional emails متعددة.

### قوالب الإيميل (Transactional)
استخدام `email_domain--scaffold_transactional_email` لتسجيل قوالب موحّدة بهوية قِطاعات (RTL، الخط، اللون):
1. `welcome-signup` (موجود — تحسين).
2. `lead-request-received` (للمزود).
3. `lead-request-confirmation` (للمستخدم).
4. `contact-form-confirmation` (موجود).
5. `contact-admin-notification` (موجود).
6. `new-message-notification` (للمستخدم/المزود — مع throttle: لا أكثر من إيميل واحد كل 15 دقيقة).
7. `weekly-digest` للأدمن (إحصائيات leads & messages).

كل القوالب: header بشعار "ق"، RTL، خط IBM Plex Sans Arabic عبر web-safe fallback، CTA واضح، footer unsubscribe (تلقائي).

---

## المرحلة 4 — رؤية الأدمن + Analytics

### الواجهة
- **`AdminContactMessages`** (موجود): إضافة status workflow (new → in_progress → resolved)، assignee، ملاحظات داخلية.
- **صفحة جديدة `AdminLeadRequests`**: جدول مع filter (status, business, date range)، تصدير CSV، زر "تواصل مع المستخدم".
- **`AdminCommunicationDashboard`** صفحة جديدة: KPIs (إجمالي رسائل، leads، معدل الرد، متوسط زمن الرد) عبر Recharts.

### Backend
- **View `admin_communication_stats`**: aggregations للوحة الأدمن (cached, 5min).
- **RLS**: View محصور بـ `has_role(uid, 'admin')`.

### Analytics (GA4/GTM — بدون PII)
أحداث جديدة في `analytics-events.ts`:
- `lead_request_submitted` (params: `business_sector`, `contact_preference`).
- `message_sent` (params: `conversation_type` فقط).
- `notification_clicked` (params: `notification_type`).
- `email_template_sent` (server-side log فقط، ليس GA4).

تأكيد عدم تمرير user_id, email, phone, name إلى dataLayer.

---

## التفاصيل التقنية (للمراجعة)

### ملفات جديدة متوقعة
```
src/components/messages/
  EmptyMessagesState.tsx
  TypingIndicator.tsx
  ReadReceipt.tsx
src/components/lead/
  LeadRequestForm.tsx (inline)
src/pages/admin/
  AdminLeadRequests.tsx
  AdminCommunicationDashboard.tsx
src/hooks/
  useTypingPresence.ts
  useLeadRequests.ts
supabase/functions/_shared/transactional-email-templates/
  lead-request-received.tsx
  lead-request-confirmation.tsx
  new-message-notification.tsx
```

### ملفات معدّلة
```
src/components/auth/RegisterForm.tsx
src/components/auth/RegistrationSuccessView.tsx
src/pages/Onboarding.tsx
src/pages/dashboard/DashboardMessages.tsx
src/pages/dashboard/DashboardNotifications.tsx
src/components/notifications/NotificationBell.tsx
src/pages/Contact.tsx
src/pages/admin/AdminContactMessages.tsx
src/lib/analytics-events.ts
src/lib/gtm.ts (تأكيد عدم تمرير PII)
src/services/auth/errorMessages.ts (توسيع)
```

### Migrations مطلوبة
1. توسيع `profiles` بحقول onboarding tracking.
2. جدول `lead_requests` جديد + RLS + trigger.
3. توسيع `messages` بـ `read_at, delivered_at, is_pinned` (إن لم توجد).
4. View `admin_communication_stats` + RLS.

سأشرح كل migration نصياً قبل تنفيذها وأنتظر موافقتك.

### ترتيب التنفيذ
المرحلة 1 → مراجعة → المرحلة 2 → مراجعة → المرحلة 3 → مراجعة → المرحلة 4.

داخل كل مرحلة:
1. Migrations (إن وُجدت) — مع شرح وانتظار موافقة.
2. Backend logic (edge functions, triggers).
3. Frontend (components, pages).
4. Analytics events.
5. اختبار عيني سريع على preview.

---

## ما يبقى بدون تغيير

- بنية Auth الأساسية (Supabase, OTP, JWT).
- RLS الحالية — توسيع فقط، لا إضعاف.
- Business profiles, contracts, projects logic.
- SEO و JSON-LD.
- Consent Mode + GTM gating الحالي (production فقط).

---

عند الموافقة، أبدأ بالمرحلة 1 (التسجيل + Onboarding) — أعرض migration الـ profiles أولاً للمراجعة، ثم أكمل التنفيذ.
