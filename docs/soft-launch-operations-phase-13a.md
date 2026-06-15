# SOFT LAUNCH OPERATIONS PHASE 13A — QITAAT PILOT LAUNCH EXECUTION PLAN

_Status_: READY FOR EXECUTION
_Window_: 10–14 days, invited cohort, Riyadh + Jeddah
_Predecessor_: `PRODUCT LAUNCH QA PHASE 12F SOFT LAUNCH READY WITH WATCH ITEMS`
_Mode_: Operate → Observe → Measure → Tighten. No new modules.

---

## 1. ملخص الخطة

قطاعات جاهزة تقنيًا (tsc clean، 7589/7589 tests، لا blockers). هذه المرحلة تحوّل الجاهزية إلى تشغيل فعلي: دعوة 15–25 مزود + 30–50 عميل في الرياض/جدة عبر 5 قطاعات، تشغيل RFQ يدويًا، ومراقبة 13 مؤشر يومي لمدة 14 يوم، ثم قرار Scale/Pause/Fix.

المبدأ: **كل RFQ في الأسبوع الأول يُتابع يدويًا** من قبل operator واحد مسؤول — لا اعتماد على automation فقط.

---

## 2. نطاق الإطلاق المعتمد

| البند | القيمة |
|---|---|
| المدن | الرياض، جدة |
| القطاعات | ألمنيوم وواجهات · حديد وأعمال معدنية · خشب وديكور · مطابخ · زجاج |
| المزودون المدعوون | 15–25 (3–5 لكل قطاع) |
| العملاء التجريبيون | 30–50 |
| المدة | 10–14 يوم |
| Operator | 1 مسؤول رئيسي + admin backup |
| قنوات التواصل | WhatsApp Business + Email + لوحة المزود |

خارج النطاق: مدن أخرى، قطاعات أخرى، إعلانات عامة، حملات Google/Meta Ads، Press release.

---

## 3. خطة تجهيز المزودين

### 3.1 من ندعو؟
- مصانع/ورش لها سجل تجاري ساري في الرياض أو جدة.
- لديهم أعمال سابقة موثقة (صور مشاريع، عملاء سابقون).
- يردّون على WhatsApp خلال 24h.
- مستعدون لتجربة منصة جديدة لمدة أسبوعين بدون رسوم.

مصادر القائمة: شبكة Admin الشخصية، مزودون موجودون مسبقًا في DB بحالة `draft/pending`، توصيات من العملاء التجريبيين، Google Maps بحث محلي.

### 3.2 التحقق من الجودة (قبل النشر)
Checklist إلزامي يراجعه Admin في `/admin/provider-review`:
- ✅ سجل تجاري + رقم موحّد.
- ✅ موقع جغرافي حقيقي (Pin على الخريطة).
- ✅ ≥ 3 صور مشاريع سابقة عالية الجودة.
- ✅ ≥ 1 خدمة من Service Catalog مع سعر تقديري أو "حسب الطلب".
- ✅ مناطق خدمة محددة (Riyadh/Jeddah على الأقل).
- ✅ رقم WhatsApp فعّال + email.
- ✅ وصف العمل ≥ 80 حرف بالعربية.

### 3.3 الحد الأدنى لملف المزود (Readiness ≥ 70%)
الاسم التجاري، الشعار/صورة غلاف، الوصف، ≥ 3 خدمات، ≥ 3 صور portfolio، مناطق الخدمة، ساعات العمل، رقم تواصل.

### 3.4 شرح القيمة (Onboarding call — 10 دقائق)
1. "قطاعات يربطك بعملاء جادين في تخصصك بدون عمولة في الفترة التجريبية."
2. عرض شاشة `/for-providers` + مثال RFQ حي.
3. توضيح: الإشعارات على WhatsApp + Email + لوحة المزود.
4. توقعات صادقة: "خلال أسبوعين، نتوقع 1–3 طلبات لك حسب قطاعك."

### 3.5 متابعة من لم يكمل ملفه
| الحالة | الإجراء | التوقيت |
|---|---|---|
| سجّل لم يبدأ Onboarding | WhatsApp تذكير + رابط مباشر | +24h |
| Onboarding < 50% | WhatsApp + مساعدة شخصية | +48h |
| Onboarding 50–69% | WhatsApp يحدد ما الناقص | +72h |
| لا رد بعد 5 أيام | استبعاد من الدفعة، إضافة بديل | يوم 5 |

---

## 4. خطة تجهيز العملاء التجريبيين

### 4.1 من هم؟
- أفراد ببناء/تشطيب جاري (5–10).
- مقاولون صغار (5–10).
- مكاتب هندسية (3–5).
- أصحاب معارض/منشآت تجارية تحتاج تصنيع (3–5).
- أصحاب مشاريع تشطيب فلل/شقق (5–10).

### 4.2 طريقة الدعوة
- WhatsApp شخصي من Admin + رابط `/quote` مباشر.
- شرح: "جرّب طلب عرض سعر مجاني، تحصل على عروض من 3–5 مزودين معتمدين خلال 24–48 ساعة."
- لا تسجيل إلزامي قبل الطلب (Guest RFQ متاح).

### 4.3 تجربة RFQ المتوقعة
- العميل يفتح `/quote` → wizard 4 خطوات → ≤ 5 دقائق → استلام تأكيد.
- Operator يراجع الطلب يدويًا خلال 2h ويتحقق من جودته.
- مطابقة + إشعار 3–5 مزودين.
- متابعة العميل بعد 48h: "كم عرض استلمت؟"

---

## 5. خطة تشغيل RFQ اليومية

### Morning (09:00)
- `/admin/quote-requests` — مراجعة الطلبات الجديدة من آخر 18h.
- لكل طلب جديد: تحقق من اكتماله، صحته، عدم تكرار، تطابق القطاع/المدينة.
- إذا ناقص: WhatsApp للعميل خلال 1h لاستكماله.
- مطابقة يدوية + إرسال للمزودين المناسبين (3–5 حد أقصى).

### Midday (13:00)
- متابعة المزودين الذين استلموا RFQ ولم يردوا: WhatsApp ذكي.
- مراجعة `/dashboard/operations/feed` للأخطاء.
- قياس avg response time للمزودين.

### Evening (17:00)
- متابعة كل عميل أرسل RFQ قبل 48h: "هل تواصل معك مزود؟ كم عرض؟"
- إغلاق الحالة: ناجح / غير مكتمل / بحاجة تدخل.
- تسجيل في لوحة المتابعة اليومية (Section 10).
- `/admin/diagnostics` + `/admin/email-deliverability` فحص سريع.

### تصنيف الطلب عند الإغلاق
| التصنيف | المعنى |
|---|---|
| ✅ Successful | العميل استلم ≥ 2 عروض وردّ على واحد |
| ⚠️ Partial | عرض واحد فقط أو لا رد من العميل |
| ❌ Failed | لم يتواصل أي مزود خلال 48h |
| 🔁 Needs follow-up | الطلب نفسه ناقص أو غير واضح |

---

## 6. مؤشرات المراقبة (Daily KPIs)

| # | المؤشر | المصدر | الهدف اليومي |
|---|---|---|---|
| 1 | زيارات `/quote` | GA4 | ≥ 20 |
| 2 | RFQs submitted | `quote_requests` | ≥ 3 |
| 3 | RFQ completion rate | GA4 funnel | ≥ 40% |
| 4 | Step drop-off (أي خطوة؟) | GA4 wizard events | ≤ 30% أي خطوة |
| 5 | Providers بدأوا onboarding | `profiles.onboarded_at` | تراكمي ≥ 25 |
| 6 | Providers أكملوا الملف | `businesses.status='published'` | تراكمي ≥ 15 |
| 7 | Zero-result searches | `search_history` | < 15% من البحوث |
| 8 | WhatsApp FAB clicks | GA4 event | يُسجّل فقط |
| 9 | Upload failures | console + edge logs | 0 |
| 10 | Quote submit failures | edge logs | 0 |
| 11 | Provider approvals pending | `/admin/provider-review` | SLA < 4h |
| 12 | Cron/email health | `cron_run_log` + `email_send_log` | 100% drained |
| 13 | LCP public routes | web-vitals | ≤ 2.5s p75 |

---

## 7. Watch Items خاصة (Phase 12F carryover)

| البند | كيفية الفحص | المسؤول | تكرار |
|---|---|---|---|
| `VITE_QITAAT_WHATSAPP` مضبوط في الإنتاج | WhatsApp FAB يظهر في footer | Admin | يوم 0 + يومي |
| أول دفع Moyasar حقيقي | `/admin/operations` + provider order | Admin | عند الحدوث |
| أول دورة اعتماد مزود | `/admin/provider-review` | Admin | يومي |
| Sitemap edge-function freshness | `supabase/functions/sitemap` last run | Admin | يوم 0 + 3 + 7 |
| `cron_run_log` health | `select * from cron_run_log order by created_at desc limit 20` | Admin | يومي |
| `email_send_log` drain | DLQ rate < 2% | Admin | يومي |
| Failed quote submissions | edge function logs `submit-quote` | Admin | يومي |
| Failed uploads | console + storage logs | Admin | يومي |

---

## 8. جدول الـ 14 يومًا

### اليوم 0 — Pre-launch (قبل ساعة الإطلاق)
- [ ] ضبط `VITE_QITAAT_WHATSAPP` في env الإنتاج وتحقق ظهور FAB.
- [ ] مراجعة بيانات الـ 5 قطاعات في `/admin` — كل قطاع له ≥ 3 خدمات.
- [ ] دعوة 15 مزود (أول دفعة) عبر WhatsApp + إيميل.
- [ ] RFQ تجريبي داخلي end-to-end (Admin يقدم طلب، يصل لمزود، يرد).
- [ ] فحص صفحة مزود عامة `/r/USR-…` تعمل وتعرض البيانات.
- [ ] `public/sitemap.xml`, `public/robots.txt`, `public/llms.txt` متاحة وحديثة.
- [ ] فحص `/admin/email-deliverability` — لا DLQ.
- [ ] backup قاعدة البيانات.
- [ ] إعلان داخلي: "Pilot Day 0".

### الأيام 1–3 — إطلاق داخلي محدود
- تشغيل RFQ يومي (Section 5).
- هدف: 5–10 RFQs تجريبية من شبكة Admin أولاً.
- متابعة كل طلب يدويًا.
- تسجيل المشاكل في `docs/pilot-launch-backlog.md`.
- **لا تغييرات كود إلا critical hotfix**.

### الأيام 4–7 — توسيع محدود
- إكمال دعوة 25 مزود.
- دعوة أول دفعة عملاء (20 عميل).
- مراقبة معدل التحويل يوميًا.
- إصلاح copy/UX بسيط فقط (نصوص، tooltips، رسائل خطأ).
- اجتماع يوم 7: مراجعة المؤشرات.

### الأيام 8–14 — تقييم وقرار
- يوم 10: snapshot كامل لجميع KPIs.
- يوم 12: مقابلات قصيرة مع 5 مزودين + 5 عملاء.
- يوم 14: قرار Scale / Pause / Fix (Section 11).
- توثيق أعلى 5 إصلاحات قبل الإطلاق العام.

---

## 9. رسائل التواصل (Templates)

### 9.1 دعوة مزود
> السلام عليكم [الاسم]،
> نطلق منصة **قطاعات** (qitaat.com) — منصة تربط ورش [القطاع] بعملاء جادين في [المدينة].
> ندعوك كأحد أول 25 مزود في النسخة التجريبية، **بدون أي رسوم لمدة أسبوعين**.
> سجّل ملفك خلال 24 ساعة: https://qitaat.com/auth?mode=signup&role=provider
> لأي استفسار: واتساب [الرقم].

### 9.2 متابعة مزود لم يكمل ملفه
> مرحبًا [الاسم]،
> لاحظنا أن ملفك في قطاعات لم يكتمل بعد. متبقي فقط: **[الناقص]**.
> أكمله خلال 10 دقائق وستبدأ باستقبال طلبات اليوم: https://qitaat.com/onboarding
> نحن جاهزون لمساعدتك — رد على هذه الرسالة.

### 9.3 دعوة عميل لتجربة RFQ
> مرحبًا [الاسم]،
> سمعت إنك تبحث عن [ألمنيوم/مطبخ/…]. جرّب **قطاعات** — اطلب عرض سعر مجاني، ويصلك خلال 24–48 ساعة عروض من 3–5 ورش معتمدة في [المدينة].
> ابدأ طلبك (5 دقائق): https://qitaat.com/quote

### 9.4 متابعة بعد إرسال RFQ
> مرحبًا [الاسم]،
> طلبك [#REF] تم إرساله لـ [N] مزودين معتمدين. تابع الردود من حسابك أو سنخبرك عبر واتساب فور وصول أول عرض.
> إذا لم يصلك أي عرض خلال 48 ساعة، رد علينا مباشرة.

### 9.5 شكر وطلب ملاحظات
> شكرًا [الاسم] لتجربتك قطاعات 🌟
> 3 أسئلة سريعة (دقيقة واحدة) تساعدنا نتحسّن:
> 1. كم عرض استلمت؟
> 2. هل تواصلت مع مزود؟
> 3. ما الذي يمكن تحسينه؟
> ردك مهم جدًا لنا.

---

## 10. لوحة المتابعة اليومية

جدول Google Sheets / Notion بهذه الأعمدة (صف واحد لكل يوم):

| Date | /quote visits | RFQs submitted | Completion % | Providers invited | Providers completed | Avg response time (h) | Upload fails | Submit fails | Top issue | Owner | Action |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-06-15 | — | — | — | — | — | — | 0 | 0 | — | Admin | — |

تُحدّث يوميًا الساعة 18:00 ويُراجع أسبوعيًا.

---

## 11. معايير Go / Pause / Scale

### 🟢 SCALE (توسيع لمدن/قطاعات إضافية)
جميع الشروط متحققة بنهاية يوم 14:
- RFQ completion rate ≥ 40%.
- Avg provider response time < 24h.
- ≥ 60% من RFQs مصنّفة Successful أو Partial.
- ≥ 15 مزود published نشطين لمدة 7 أيام متتالية.
- صفر submit/upload failures في آخر 7 أيام.
- Health score (operations) ≥ 90 لمدة 7 أيام.

### 🟡 FIX-THEN-SCALE (إصلاح قبل التوسع)
أي من التالي:
- Zero-result searches > 15%.
- Step drop-off في خطوة معينة > 40%.
- Avg response time 24–48h.
- Provider approval SLA > 8h.
- LCP > 3s p75.

→ إصلاح أعلى 5 مشاكل، تمديد Pilot 7 أيام إضافية، ثم إعادة تقييم.

### 🔴 PAUSE (إيقاف مؤقت)
أي من التالي:
- Quote submit failures > 0 في يومين متتاليين.
- Upload failures متكررة.
- Email DLQ rate > 5%.
- Cron failures > 10% في 48h.
- شكوى أمان/خصوصية من مستخدم حقيقي.
- Health score < 70.

→ إيقاف فوري للدعوات الجديدة، إصلاح، RCA مكتوب، استئناف بعد 48h خضراء.

---

## 12. قائمة مهام قبل اليوم 0

- [ ] `VITE_QITAAT_WHATSAPP` مضبوط في env الإنتاج.
- [ ] WhatsApp Business مفعّل وردود تلقائية مكتوبة.
- [ ] 15 مزود dataset جاهز (اسم، تخصص، تواصل، مدينة).
- [ ] 20 عميل dataset جاهز.
- [ ] قوالب الرسائل (Section 9) محفوظة في WhatsApp Business.
- [ ] لوحة المتابعة (Section 10) منشأة وممتلكة.
- [ ] Admin + Backup operator معروفان ومتدربان.
- [ ] Backup قاعدة بيانات يوم 0.
- [ ] صفحة Status داخلية (حالة pilot) متاحة للفريق.
- [ ] قناة Slack/WhatsApp داخلية لإنذارات yum 0–14.
- [ ] فحص `/admin/operations` + `/admin/diagnostics` + `/admin/email-deliverability` يوم 0.
- [ ] RFQ تجريبي داخلي end-to-end ناجح موثّق.
- [ ] صفحة مزود عامة `/r/USR-…` تعمل.
- [ ] sitemap/robots/llms محدّثة.
- [ ] رسالة إعلان داخلية "Pilot Day 0" جاهزة.

---

## 13. القرار

**`SOFT LAUNCH OPERATIONS PHASE 13A READY FOR EXECUTION`** ✅

الخطة جاهزة للتنفيذ ابتداءً من يوم 0. المسؤولية الأولى: Admin operator. أول نقطة قرار: نهاية يوم 7 (mid-pilot review). نقطة القرار الكبرى: نهاية يوم 14 (Scale / Fix / Pause).
