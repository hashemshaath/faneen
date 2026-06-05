# SERVICE-CONFIGURATION-GOVERNANCE-AUDIT-1

تاريخ التنفيذ: 2026-06-05
النطاق المُنفّذ: **المرحلة 1 — جرد + تقرير فقط (بدون تعديل كود).**
الهدف: نقطة تحكم مركزية وواضحة لجميع الخدمات الخارجية، بدون مفاتيح في الكود، وبدون إعدادات وهمية.

---

## 1. النتيجة الإجمالية

**PASS مع ملاحظات (Conditional Pass).**

- المفاتيح الفعلية المستخدمة في الإنتاج كلها مخزّنة في **Supabase Secrets** أو في **بيئة Vite للمتصفّح** (مفتاح Maps المرجعي فقط). لا توجد مفاتيح Hardcoded في الكود.
- يوجد **تكرار/تشتّت إداري**: جدول `platform_settings` يحتوي 18 إعداداً جميعها فارغة وغير فعّالة، تظهر في صفحات الإدارة وتوحي بأنها تتحكم بالنظام، **بينما الكود لا يقرأ أيًّا منها**. هذه هي «الإعدادات الوهمية» الرئيسية.
- لا توجد صفحة `/admin/integrations` موحّدة؛ المعلومات موزّعة على ≥4 صفحات.
- لا يوجد Health Check حقيقي إلا لـ Google (دالة `google-health`). بقية الخدمات تُقاس فقط بـ «وجود/عدم وجود السر».

درجة الجاهزية: **7 / 10**.

---

## 2. جرد كامل للمفاتيح والخدمات

### 2.1 Supabase Secrets (Runtime — Edge Functions) — 14 سرّاً

| السرّ | الخدمة | يستخدم فعليًا؟ | مكان الاستخدام | ملاحظات |
|---|---|---|---|---|
| `LOVABLE_API_KEY` | Lovable AI + Connector Gateway | نعم | `_shared/google/gateway.ts`, ai-center | مُدار، يُدوّر عبر أداة الـ rotate |
| `RESEND_API_KEY` | Resend (Email) | نعم | `send-transactional-email`, `process-email-queue`, `resend-status`, `auth-email-hook`, `send-otp`, `send-login-otp` | المصدر الوحيد للبريد |
| `FIRECRAWL_API_KEY` | Firecrawl (Enrichment) | نعم | `admin-enrichment-fetch` فقط | مستخدم في موضع واحد |
| `MOYASAR_SECRET_KEY` | Moyasar (Payments) | نعم | `membership-payment-*` (4 دوال) + `_shared/membership-payments` | |
| `MOYASAR_WEBHOOK_SECRET` | Moyasar Webhook | نعم | `membership-payment-webhook` | |
| `MEMBERSHIP_PAYMENTS_SUCCESS_URL` | Moyasar redirect | نعم | `membership-payment-create-intent` | |
| `MEMBERSHIP_PAYMENTS_CANCEL_URL` | Moyasar redirect | نعم | كما أعلاه | |
| `MEMBERSHIP_PAYMENTS_WEBHOOK_URL` | Moyasar webhook | نعم | كما أعلاه | |
| `OTP_HASH_PEPPER` | OTP hashing | نعم | `send-otp`, `verify-otp`, `send-login-otp`, `verify-login-otp` | |
| `OTP_BYPASS_PHONES` | اختبار OTP | نعم | كما أعلاه | يجب أن يكون فارغًا في الإنتاج |
| `TWILIO_PHONE_NUMBER` | SMS sender id | **مشكوك فيه** | `send-otp`, `send-login-otp` | راجع §3.A |
| `CRON_SECRET` | حماية Cron endpoints | نعم | `check-overdue`, `weekly-sla-report`, `monthly-provider-credit-grant`, `process-email-queue`, `process-contact-notification-retries`, `membership-lifecycle-dispatcher`, `contracts-expiry-notifier`, `manual-sla-real-run` | |
| `INDEXNOW_KEY` | IndexNow ping | نعم | `ping-search-engines` | |
| `SECURITY_AUDIT_SALT` | تجزئة سجلات الأمان | نعم | عدة دوال داخل `_shared` | |

### 2.2 Browser env (Vite) — مفاتيح غير سرّية

| المتغير | الخدمة | يستخدم؟ | الملف |
|---|---|---|---|
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` | Google Maps JS / Static Map | نعم | `src/modules/google/mapsService.ts` (المصدر الوحيد) |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID` | قناة استخدام Maps | نعم | المصدر نفسه |
| `VITE_GTM_ID` | Google Tag Manager | نعم | `src/lib/gtm.ts` (مع gating لإنتاج فقط) |
| `VITE_ENABLE_ANALYTICS_IN_PREVIEW` | تجاوز GTM في preview | تشخيصي | `src/lib/gtm.ts` |
| `VITE_APP_VERSION` / `VITE_ENABLE_BETA_TEMP_CODE` / `VITE_ENABLE_PDF_DEBUG` | أعلام تشغيل | نعم | feature flags |
| `VITE_SUPABASE_URL/PUBLISHABLE_KEY/PROJECT_ID` | Supabase client | نعم | تُدار تلقائيًا |

لا يوجد أي مفتاح خاص (server secret) في `import.meta.env` أو في الـ bundle.

### 2.3 جدول `platform_settings` — 18 سجلًّا، **كلها فارغة و`is_active=false`**

```
address: SPL_API_KEY
ai:      OPENAI_API_KEY, GOOGLE_AI_KEY
email:   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SENDER_EMAIL, SENDER_NAME
google:  GOOGLE_MAPS_KEY, GOOGLE_ANALYTICS_ID, GOOGLE_RECAPTCHA_KEY,
         GOOGLE_RECAPTCHA_SECRET, FCM_SERVER_KEY
sms:     TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_VERIFY_SID
```

- **مصدر الحقيقة الفعلي:** Supabase Secrets أو Vite env.
- **مصدر مُعلَن في الإدارة:** `platform_settings` عبر `AdminApiSettings.tsx`.
- **النتيجة:** أي قيمة يكتبها الأدمن هنا **لا تؤثّر إطلاقًا** على سلوك النظام. تكرار وهمي خطير.

### 2.4 صفحات الإدارة الحالية ذات الصلة

| الصفحة | تعرض ماذا | المصدر |
|---|---|---|
| `/admin/api-settings` (`AdminApiSettings.tsx`) | كل `platform_settings` | جدول وهمي |
| `/admin/google-services` (`AdminGoogleServices.tsx`) | حالة Google + استدعاء `google-health` | **فعلي** |
| `/admin/analytics-settings` (`AdminAnalyticsSettings.tsx`) | GTM/GA detection من المتصفّح | **فعلي** |
| `/admin/system-settings` + Hub | إعدادات منوّعة | مزيج |
| `AdminContactInboxSettings`, `AdminProviderLanding` | إعدادات ميزات | فعلي (DB) |
| `components/admin/ResendIntegrationCard.tsx` | حالة Resend | فعلي (يتصل بـ `resend-status`) |

لا توجد صفحة `/admin/integrations` موحّدة.

---

## 3. الخدمات الخارجية — حالة التشغيل الفعلية

| الخدمة | فعّالة؟ | المفتاح من أين | Health Check حقيقي | ملاحظات |
|---|---|---|---|---|
| Google Maps JS (browser) | نعم | `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` | غير مباشر (تحميل JS) | المسار الوحيد المسموح: `mapsService.ts` |
| Google Places (New) | نعم | gateway + `GOOGLE_MAPS_API_KEY` (إن وُجد) أو عبر connector | **نعم** (`google-health` probe) | |
| Google Geocoding | نعم | كما أعلاه | **نعم** | |
| Google Routes | نعم | كما أعلاه | **نعم** | |
| Google Address Validation | نعم | كما أعلاه | **نعم** | |
| Google Tag Manager | نعم (إنتاج فقط) | `VITE_GTM_ID` | detection داخل المتصفّح | gating على `qitaat.com` فقط |
| Google Analytics | عبر GTM فقط | لا يوجد GA ID مباشر | عبر GTM | |
| reCAPTCHA | **لا** | لا مفتاح مهيّأ | – | السجلات في `platform_settings` وهمية |
| Firebase / FCM | **لا** | لا مفتاح مهيّأ ولا كود يستخدمه | – | السجلات وهمية |
| OpenAI (مباشر) | **لا** | لا يوجد `OPENAI_API_KEY` مهيّأ | – | AI يمرّ عبر Lovable AI Gateway فقط |
| Firecrawl | نعم | `FIRECRAWL_API_KEY` | لا يوجد probe مستقل | يُستخدم في موضع واحد |
| Resend (Email) | نعم | `RESEND_API_KEY` | جزئي (`resend-status` يقرأ حالة المزود) | لا يوجد test-send |
| SMTP عام | **لا** | لا — البريد يمرّ عبر Resend فقط | – | إعدادات `SMTP_*` وهمية |
| Moyasar (Payments) | نعم | `MOYASAR_SECRET_KEY` + 3 روابط + webhook secret | لا يوجد ping صريح | |
| Twilio SMS | **مشكوك فيه** | `TWILIO_PHONE_NUMBER` موجود لكن لا `ACCOUNT_SID/AUTH_TOKEN` بين الأسرار | – | راجع §A |
| IndexNow | نعم | `INDEXNOW_KEY` | لا | |
| Lovable AI Gateway | نعم | `LOVABLE_API_KEY` | عبر استخدام فعلي | |
| Lovable Connector Gateway (Google) | **غير مربوط حاليًا** | – | – | `list_connections` فارغ — يعتمد النظام على `GOOGLE_MAPS_API_KEY` كسرّ مباشر |

### A. مفاتيح غامضة / مفقودة

- **Twilio:** فقط `TWILIO_PHONE_NUMBER` موجود. `send-otp` / `send-login-otp` يحتاجان `ACCOUNT_SID` و`AUTH_TOKEN`. إمّا أن OTP يمرّ عبر مزوّد آخر (Resend/Email) أو أن مسار SMS معطّل فعليًا. **يحتاج توضيحًا من المالك.**
- **Google Maps server key:** الكود في `_shared/google/gateway.ts` يقرأ `GOOGLE_MAPS_API_KEY` (سرّ مباشر) — لكنه **ليس في قائمة الأسرار الـ14**. إذًا إمّا أن قِطاعات تعتمد على الـ Connector Gateway (وهو غير مربوط حاليًا في هذه الورشة) أو أن المفاتيح في بيئة الإنتاج فقط. **حالة Google الحالية: deferred حتى يُضاف المفتاح.**

---

## 4. التكرار والإعدادات الوهمية

### 4.1 إعدادات وهمية (في الإدارة، لا تؤثّر بالكود)

جميع سجلّات `platform_settings` الـ18 (مع `is_active=false` وقيم فارغة). **لا يقرأها أي ملف TS/Edge.**

### 4.2 مفاتيح مكرّرة المعنى

| مفهوم | في `platform_settings` | المصدر الحقيقي |
|---|---|---|
| Google Maps key | `GOOGLE_MAPS_KEY` | `GOOGLE_MAPS_API_KEY` (secret) + `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` |
| Google Analytics | `GOOGLE_ANALYTICS_ID` | `VITE_GTM_ID` (عبر GTM) |
| SMTP | 6 حقول | `RESEND_API_KEY` |
| OpenAI | `OPENAI_API_KEY` | غير مستخدم — Lovable AI |
| FCM | `FCM_SERVER_KEY` | غير مستخدم |
| reCAPTCHA | حقلين | غير مستخدم |
| Twilio | 4 حقول | فقط `TWILIO_PHONE_NUMBER` كسرّ |

### 4.3 Env vars غير مستخدمة

لا شيء واضح في `.env`. كل `VITE_*` المعرّفة لها مرجع كودي.

### 4.4 خدمات مهجورة

- **Firebase/FCM** — لا كود يستهلكها.
- **SMTP المباشر** — لا كود.
- **reCAPTCHA** — لا كود.
- **OpenAI مباشر** — لا كود (الكل عبر Lovable AI).
- **SPL_API_KEY** (Saudi Post Lookup) — توجد دالة `national-address-lookup`؛ يجب التحقّق إن كانت ما زالت مفعّلة.

---

## 5. الإصلاحات المُقترحة (للمرحلة 2 — لم تُنفَّذ)

مرتّبة حسب الأولوية:

1. **حذف أو وسم Read-Only لـ`platform_settings`** للحقول التالية لأنها لا تؤثّر بشيء:
   `OPENAI_API_KEY`, `GOOGLE_AI_KEY`, `SMTP_*`, `SENDER_*`, `FCM_SERVER_KEY`, `GOOGLE_RECAPTCHA_*`, `TWILIO_*`.
   إمّا: (أ) Migration يحذفها، أو (ب) `AdminApiSettings` يُخفيها وعلى الحقول الباقية يُضاف شارة «Deferred — لا تأثير».
2. **توضيح Google Maps:** ربط Connector في هذه الورشة، أو إضافة `GOOGLE_MAPS_API_KEY` كسرّ يدوي صريح. اليوم `google-health` سيُعيد `deferred`.
3. **بناء `/admin/integrations`:** صفحة واحدة تجمع: Google (من `google-health`)، Email/Resend (من `ResendIntegrationCard`)، Payments (Moyasar ping)، Firecrawl (ping بسيط)، AI (Lovable AI heartbeat)، GTM (detection). تعرض: «الحالة، آخر اختبار، مصدر الإعداد» دون كشف القيمة.
4. **Health probes جديدة (Edge Functions):**
   `resend-health`, `moyasar-health`, `firecrawl-health`, `lovable-ai-health`.
5. **توضيح Twilio:** إمّا حذف `TWILIO_PHONE_NUMBER` إن كان OTP عبر البريد، أو إضافة `TWILIO_ACCOUNT_SID` و`TWILIO_AUTH_TOKEN` كأسرار.
6. **توحيد القاعدة:** كل Server Secret في Supabase Secrets، كل Browser Key في Vite env. لا تكرار في DB.
7. **اختبار حارس** `serviceConfigurationGovernanceAudit1.test.ts` يتأكد:
   - لا مفاتيح Hardcoded (regex على `AIza`, `sk-`, `re_`, `pk_live_`).
   - `platform_settings` ليس مرجعًا من أي كود لقراءة مفاتيح فعّالة.
   - الـ Browser Key يُقرأ فقط من `src/modules/google/mapsService.ts`.

---

## 6. الملفّات التي ستحتاج تعديلًا في المرحلة 2

- `src/pages/admin/AdminApiSettings.tsx` — إخفاء/تعطيل الحقول الوهمية.
- `src/pages/admin/AdminGoogleServices.tsx` — دمج مع `/admin/integrations`.
- `supabase/migrations/<new>.sql` — حذف صفوف `platform_settings` الميتة.
- إضافة `supabase/functions/{resend,moyasar,firecrawl,lovable-ai}-health/`.
- إضافة `src/pages/admin/AdminIntegrations.tsx`.
- إضافة `src/tests/serviceConfigurationGovernanceAudit1.test.ts`.

## 7. الملفّات الجديدة (هذه المرحلة)

- `docs/service-configuration-audit-1.md` (هذا الملف) — الوحيد.

## 8. نتائج الاختبارات

لم تُضَف اختبارات في هذه المرحلة (المرحلة 1 = توثيق فقط).
`src/tests/googleIntegrationGovernanceAudit1.test.ts` الحالي يغطّي عزل مفتاح Google Maps في المتصفّح ولا يزال يمرّ.

## 9. درجة جاهزية Integrations Configuration

**7 / 10**

- ✅ لا مفاتيح Hardcoded
- ✅ Server secrets في Supabase Secrets
- ✅ Browser keys معزولة عبر `mapsService.ts`
- ✅ Google لديه Health Check حقيقي
- ⚠️ إعدادات وهمية في `platform_settings` تربك المشغّل
- ⚠️ لا توجد لوحة موحّدة `/admin/integrations`
- ⚠️ لا Health Checks لباقي الخدمات (Resend ping فقط، لا Moyasar/Firecrawl/AI)
- ⚠️ غموض حول مسار Twilio و`GOOGLE_MAPS_API_KEY` في هذه الورشة الجديدة

الانتقال إلى المرحلة 2 يرفع الدرجة المتوقّعة إلى **9 / 10**.