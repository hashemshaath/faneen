# EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15F-DEPLOY — EXTERNAL CHECKLIST REPORT

تاريخ: 2026-06-15
النوع: تشغيل خارجي + redeploy فقط. لا كود، لا migrations، لا RLS/RPC، لا templates، لا webhook.

> **حدود التقرير**: البنود التي تتطلب فتح Resend Dashboard، أو قراءة inbox فعلي، أو تنفيذ signup ببريد حقيقي — لا يمكن للـ agent تنفيذها. تم تمييزها بـ 📋 (إجراء يدوي مطلوب من المشغّل).

---

## 1) Supabase Edge Function Secrets

| Secret | الحالة |
| --- | --- |
| `RESEND_API_KEY` | ✅ موجود |
| `RESEND_FROM_EMAIL` | ⚪ غير مستخدم — المُرسِل ثابت في الكود: `noreply@qitaat.com` (FROM_DOMAIN=`qitaat.com` في `send-transactional-email/index.ts`) |
| `RESEND_REPLY_TO` | ⚪ غير مستخدم في مسار الإرسال الحالي |
| `LOVABLE_API_KEY` | موجود (managed) لكنه **لا يُستخدم كمُرسِل بريد** — مراجعة الكود في `process-email-queue` و`send-transactional-email` تؤكد أن المسار الوحيد هو `https://api.resend.com/emails` |
| `LOVABLE_SEND_URL` | ❌ غير موجود — جيد |

**النتيجة**: لا يوجد Lovable sender نشط. القيم نفسها لم تُعرض في التقرير.

---

## 2) Resend Domain — 📋 يدوي

المُرسِل المُكوَّن في الكود: `Qitaat <noreply@qitaat.com>` (root domain).

| البند | الحالة |
| --- | --- |
| Domain verified في Resend | 📋 يُتحقق من Resend Dashboard |
| SPF | 📋 يُتحقق يدويًا |
| DKIM | 📋 يُتحقق يدويًا |
| DMARC | 📋 يُتحقق يدويًا |
| From email production-ready | 📋 — الكود يستخدم `noreply@qitaat.com` (ليس sandbox) |
| لا sandbox sender | ✅ لا يوجد `onboarding@resend.dev` في الكود |

---

## 3) Auth Hook Exclusivity

| البند | الحالة |
| --- | --- |
| `auth-email-hook` deployed ويستخدم `enqueue_email → auth_emails` | ✅ (مؤكَّد عبر Phase 15C tests) |
| المسار الوحيد: `auth-email-hook → auth_emails → process-email-queue → Resend` | ✅ |
| Native Supabase SMTP يرسل بالتوازي | 📋 يُتحقق من Auth → Email settings: يجب أن يكون Custom SMTP **غير مفعّل** أو متطابق مع نفس Resend |
| Lovable sender path | ❌ مُلغى منذ Phase 15C |
| Duplicate auth emails في 7 أيام | لا duplicate في `email_send_log` (1 pending + 4 sent، كلها أحداث منفصلة) |

---

## 4) Redeploy

| Function | الحالة |
| --- | --- |
| `process-email-queue` | ✅ Redeployed |
| `send-transactional-email` | ✅ Redeployed |
| `auth-email-hook` | ✅ Redeployed |

---

## 5) Smoke Test 1 — Signup Verification — 📋 يدوي

لا يمكن للـ agent إنشاء حساب ببريد حقيقي وفتح inbox. الخطوات للمشغّل:
1. افتح `/auth` على البيئة المنشورة.
2. سجّل ببريد test مملوك.
3. تحقق من وصول الرسالة من `noreply@qitaat.com`.
4. بعد الوصول، شغّل الاستعلام:
   ```sql
   SELECT template_name, status, metadata->>'provider' AS provider,
          (metadata->>'provider_id') IS NOT NULL AS has_provider_id, created_at
   FROM email_send_log
   WHERE template_name IN ('signup','welcome-signup')
   ORDER BY created_at DESC LIMIT 3;
   ```
   ويجب أن يكون `provider='resend'` و`has_provider_id=true`.

**Baseline من الكود/DB**: آخر signup حقيقي (2026-06-03) سجّل `provider=resend` مع `provider_id` ✅.

---

## 6) Smoke Test 2 — Password Recovery

فحص آلي على آخر 24 ساعة:

| البند | الحالة |
| --- | --- |
| Recovery emails sent | ✅ 3 رسائل (آخرها 13:41 UTC اليوم) |
| `metadata.provider='resend'` | ✅ في الثلاث |
| `provider_id` موجود | ✅ في الثلاث |
| Duplicate recovery email | ❌ لا — كل حدث صف واحد |
| `password_reset_log` sanitization (PRA-2 آليات) | ✅ آليات `sanitizeAnalyticsPath/Referrer/Metadata` مفعّلة + DB CHECK constraints |
| سجلات `password_reset_log` آخر 7 أيام | 0 — أحداث Phase التحليلات ستُسجَّل عند أول استخدام بعد PRA-2 |
| Recovery email arrived (inbox) | 📋 يتحقق المشغّل |
| كشف account existence | ❌ — رسالة UI موحّدة |

---

## 7) Smoke Test 3 — Transactional / RFQ — 📋 يدوي

المسار في الكود: `sendTransactionalEmail → supabase.functions.invoke('send-transactional-email') → Resend POST`. مؤكَّد بـ Phase 15A/C/E tests.

للمشغّل:
1. أنشئ RFQ تجريبي.
2. تحقق من وصول البريد.
3. شغّل:
   ```sql
   SELECT template_name, status, metadata->>'provider', metadata->>'provider_id', created_at
   FROM email_send_log
   WHERE template_name LIKE '%quote%' OR template_name LIKE '%rfq%'
   ORDER BY created_at DESC LIMIT 3;
   ```

---

## 8) Admin Deliverability UI

مؤكَّد عبر Phase 15E guard tests (`emailInfrastructurePhase15eLogsDeliverability.test.ts`):

| البند | الحالة |
| --- | --- |
| Recipients masking | ✅ |
| لا `RESEND_API_KEY`/`SERVICE_ROLE` معروض | ✅ |
| لا `dangerouslySetInnerHTML` | ✅ |
| لا `.token` raw | ✅ |
| فجوة delivered/bounced/complained مُوثَّقة كغير فعّالة بدون webhook | ✅ (مذكور صراحة في audit doc الخاص بـ 15E) |

---

## 9) Webhook Gap

مؤكَّد: webhooks الخاصة بـ Resend (delivered/bounced/complained) **غير موصولة حاليًا**. هذا ليس blocker للإطلاق التجريبي. يُفتح لاحقًا كـ `EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15G — RESEND WEBHOOK EVENTS`. لم يُنفَّذ أي webhook في هذه المرحلة.

---

## ملخص النتائج

| # | البند | النتيجة |
| --- | --- | --- |
| 1 | Supabase secrets | ✅ RESEND_API_KEY موجود، لا Lovable sender |
| 2 | Resend domain/SPF/DKIM/DMARC | 📋 يتحقق المشغّل في Resend Dashboard |
| 3 | Auth hook exclusivity | ✅ في الكود/DB، 📋 تأكيد عدم تفعيل Native SMTP |
| 4 | Redeploy | ✅ 3/3 |
| 5 | Signup smoke | 📋 تنفيذ يدوي مطلوب — baseline قديم يُظهر provider=resend |
| 6 | Recovery smoke | ✅ آلي: آخر 3 رسائل provider=resend مع provider_id؛ 📋 inbox check |
| 7 | RFQ/transactional smoke | 📋 تنفيذ يدوي مطلوب |
| 8 | `email_send_log` provider/provider_id | ✅ مكتمل في الإرسالات الحقيقية |
| 9 | `password_reset_log` sanitization | ✅ PRA-2 آليات نشطة |
| 10 | Admin deliverability UI | ✅ مؤكَّد بـ 15E tests |
| 11 | Duplicate emails | ❌ لم تُرصد |
| 12 | Secrets/tokens exposure | ❌ لا تسرب |
| 13 | Webhook gap | ✅ موثَّق، مؤجَّل لـ 15G |
| 14 | Blockers | **لا** blockers تقنية. الإطلاق التجريبي ممكن بمجرد إكمال البنود 📋 |

---

## القرار

`EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15F-DEPLOY EXTERNAL CHECKLIST — AUTOMATED PORTION PASS / MANUAL PORTION PENDING`

الجزء الآلي (secrets، redeploy، DB checks، code paths، PRA-2/15A-E guards) **نجح بالكامل**. البنود المتبقية (2 Resend Dashboard، 3 Native SMTP toggle، 5 signup inbox، 7 RFQ inbox) تتطلب تنفيذًا يدويًا من المشغّل. عند إكمالها بدون مفاجآت → ترقّى الحالة إلى `PASS` كامل.