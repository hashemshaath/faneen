# SOFT LAUNCH OPERATIONS — PHASE 13E
## Day 0 Go-Live Execution Check

> مرحلة تشغيل فقط. لا كود، لا DB/RLS/RPC/migrations، لا أسماء وهمية، لا نتائج
> فعلية مخترعة، ولا إرسال رسائل فعليًا من النظام في هذه المرحلة.

## مراجع معتمدة

تم فتح ومراجعة:

- `docs/soft-launch-operations-phase-13a.md` — خطة الإطلاق التجريبي.
- `docs/soft-launch-operations-phase-13b-activation-kit.md` — حزمة التفعيل والرسائل.
- `docs/soft-launch-operations-phase-13c-day-0-board.md` — لوحة اليوم صفر.
- `docs/soft-launch-operations-phase-13d-daily-operator-playbook.md` — دليل المشغل اليومي.

تم اعتماد قبل هذه المرحلة:

- `PRODUCT LAUNCH QA PHASE 12F SOFT LAUNCH READY WITH WATCH ITEMS`
- `DASHBOARD EXPERIENCE FINAL REGRESSION SWEEP PASS`
- آخر full suite: `7664/7664` — blockers: none.

---

## 1. Day 0 Final Status

| العنصر | الحالة | المسؤول | ملاحظات |
| --- | --- | --- | --- |
| Production URL يعمل | ☐ Pending verify | Operator | فتح `https://qitaat.com` والتأكد من تحميل الصفحة الرئيسية بدون أخطاء console. |
| WhatsApp FAB مضبوط أو مخفي | ☐ Pending verify | Operator | إن لم يُضبط `VITE_QITAAT_WHATSAPP` يجب أن يكون الزر مخفيًا تمامًا في الـ public. |
| `/quote` يعمل | ☐ Pending verify | Operator | تحميل الصفحة + ظهور خطوات المعالج + autosave badge. |
| رفع ملف يعمل | ☐ Pending verify | Operator | اختبار صورة + PDF صغير ضمن RFQ تجريبي داخلي. |
| Search يعمل | ☐ Pending verify | Operator | بحث بكلمة عربية + فلتر قطاع + فلتر مدينة. |
| `/for-providers` يعمل | ☐ Pending verify | Operator | ظهور CTA التسجيل ووصوله إلى `/auth?mode=signup&role=provider`. |
| `/onboarding` يعمل | ☐ Pending verify | Operator | تنقّل بين الخطوات بدون كسر. |
| Public provider profile يعمل | ☐ Pending verify | Operator | فتح بروفايل مزود واحد جاهز والتأكد من الظهور العام. |
| sitemap/robots/llms موجودة | ☐ Pending verify | Operator | تأكد من `/sitemap.xml`, `/robots.txt`, `/llms.txt`. |
| Email logs سليمة | ☐ Pending verify | Operator | فحص آخر سجلات البريد التشغيلية بدون أخطاء حرجة. |
| Cron logs سليمة | ☐ Pending verify | Operator | تأكد من عدم وجود فشل متكرر في المهام المجدولة. |
| Moyasar watch item محدد | ☐ Tracked | Operator | مراقبة فقط — لا تفعيل دفع حقيقي في Soft Launch. |
| Operator محدد | ☐ Assigned | Lead | اسم/مناوبة اليوم في 13D Playbook. |
| Provider board جاهز | ☐ Ready | Operator | جدول Tier A/B/C في القسم 2. |
| Customer board جاهز | ☐ Ready | Operator | جدول الفئات في القسم 3. |
| رسائل التواصل جاهزة | ☐ Ready | Lead | راجع 13B Activation Kit + جدول الاعتماد في القسم 6. |

> القاعدة: أي صف بحالة غير ✅ يمنع الانتقال إلى Green في القسم 7.

---

## 2. Provider Cohort Readiness

لا أسماء وهمية. يملأ المشغل الأرقام فعليًا قبل الإطلاق.

| Tier | العدد المطلوب | العدد الجاهز | النواقص | الإجراء التالي |
| --- | --- | --- | --- | --- |
| Tier A — مزودون مميزون | 10 | __ / 10 | __ | تأكيد اكتمال الملف + تفعيل الظهور قبل الدعوة. |
| Tier B — مزودون نشطون | 10 | __ / 10 | __ | متابعة إكمال الصور والخدمات. |
| Tier C — مزودون ناشئون | 5 | __ / 5 | __ | إرشاد عبر Provider Action Center. |

تعريف "جاهز":

- ملف المزود مكتمل وفق `ProviderReadinessCard`.
- الظهور العام مفعّل (visible to customers).
- خدمة واحدة على الأقل منشورة مع صور.
- منطقة خدمة محددة.

---

## 3. Customer Cohort Readiness

| الفئة | العدد المطلوب | العدد الجاهز | النواقص | الإجراء التالي |
| --- | --- | --- | --- | --- |
| أفراد | 15 | __ / 15 | __ | جهات اتصال مؤكدة + قناة تواصل. |
| مقاولون صغار | 10 | __ / 10 | __ | تأكيد القطاع والمدينة. |
| مكاتب هندسية | 10 | __ / 10 | __ | تأكيد مسؤول اتصال. |
| أصحاب مشاريع تشطيب | 10 | __ / 10 | __ | تأكيد جاهزية إرسال RFQ. |
| جهات تجارية/معارض | 5 | __ / 5 | __ | تأكيد قناة الاستجابة. |

تعريف "جاهز": جهة اتصال موثقة + موافقة مبدئية على استلام دعوة Soft Launch.

---

## 4. First RFQ Internal Test

سيناريو الاختبار الداخلي قبل أي دعوة خارجية:

- القطاع: ألمنيوم وواجهات.
- المدينة: جدة.
- الوصف: طلب واجهة محل / واجهة زجاج وألمنيوم بمساحة تقريبية صغيرة.
- الملفات: صورة JPG واحدة + PDF صغير (<2MB).
- المرسل: حساب اختبار داخلي تابع لفريق قطاعات (ليس عميلًا حقيقيًا).

المتوقع (Pass criteria):

- ✅ يتم إرسال الطلب بدون submit failure.
- ✅ رفع الصورة و PDF يكتمل بدون upload failure.
- ✅ الطلب يظهر في `/admin/quote-requests`.
- ✅ يمكن للأدمن مراجعة الطلب وفتح تفاصيله.
- ✅ لا تظهر معلومات تواصل العميل لأي مزود قبل آلية الكشف الرسمية.
- ✅ لا أخطاء console / network 5xx خلال الإرسال.

سجل النتيجة: ☐ Pass · ☐ Fail · ملاحظات: __

---

## 5. WhatsApp Readiness

| سؤال | الحالة |
| --- | --- |
| هل `VITE_QITAAT_WHATSAPP` مضبوط؟ | ☐ Yes · ☐ No |
| هل الرابط يفتح واتساب فعليًا؟ | ☐ Yes · ☐ N/A |
| هل يظهر فقط في الـ public footer؟ | ☐ Yes |
| هل لا يظهر في Admin/Dashboard؟ | ☐ Yes |
| هل يعمل على mobile (iOS + Android)؟ | ☐ Yes · ☐ N/A |

إن كان الرقم غير مضبوط:

- الحالة: **Not configured**.
- القرار: لا يمنع Soft Launch إذا كان هناك بديل تواصل يدوي (بريد/هاتف معتمد).
- ملزم: ضبط الرقم قبل دعوة العملاء بالدفعات الأكبر.

---

## 6. Invitation Approval

| الرسالة | معتمدة؟ | من يعتمد؟ | ملاحظات |
| --- | --- | --- | --- |
| دعوة المزود (Tier A) | ☐ | Lead | راجع نص 13B. |
| متابعة المزود | ☐ | Lead | تُرسل بعد 24h من الدعوة. |
| إكمال ملف المزود | ☐ | Lead | تُربط بـ Provider Action Center. |
| دعوة العميل | ☐ | Lead | تبدأ بعد جاهزية Tier A. |
| متابعة RFQ غير المكتمل | ☐ | Operator | تُرسل بعد 24h من بدء الطلب. |
| طلب تقييم بعد التنفيذ | ☐ | Operator | تُرسل بعد إغلاق أول صفقة فعلية. |

قاعدة: لا تُرسل أي رسالة قبل اعتمادها هنا.

---

## 7. Go / Hold Decision

بطاقة قرار اليوم صفر:

- 🟢 **Green** — كل صفوف القسم 1 ✅، Tier A ≥ 10 جاهز، عملاء ≥ 10 جاهز، أول RFQ داخلي Pass.
  - الإجراء: إرسال أول دعوات Tier A + أول 10 عملاء وفق جدول اليوم الأول.
- 🟡 **Yellow** — Tier A ≥ 10 جاهز لكن جاهزية العملاء < 10 أو WhatsApp غير مضبوط.
  - الإجراء: إرسال للمزودين فقط، تأجيل دعوة العملاء حتى رفع الجاهزية.
- 🔴 **Red** — أي blocker في القسم 1 أو فشل أول RFQ داخلي أو Tier A < 5 جاهز.
  - الإجراء: لا إرسال. فتح Issue Log في 13D وإصلاح الـ blocker قبل إعادة الفحص.

القرار النهائي لليوم صفر: ☐ Green · ☐ Yellow · ☐ Red — التوقيع: __ — التاريخ: __

---

## 8. Day 1 Launch Command

جدول التشغيل لليوم الأول بعد قرار Green/Yellow:

| الساعة | المهمة | المسؤول | المرجع |
| --- | --- | --- | --- |
| 10:00 | إرسال دعوة Tier A (المزودون المعتمدون). | Lead | رسالة "دعوة المزود" — 13B. |
| 11:00 | إرسال أول دفعة عملاء (حتى 10 جهات اتصال). | Lead | رسالة "دعوة العميل" — 13B (Green only). |
| 13:00 | متابعة المزودين الذين لم يكملوا التسجيل/الملف. | Operator | Provider Follow-up SOP — 13D. |
| 15:00 | متابعة RFQs غير المكتملة من العملاء. | Operator | RFQ Handling SOP — 13D. |
| 18:00 | رفع تقرير اليوم الأول. | Operator | Daily Report Template — 13D. |

ملاحظات:

- في حالة Yellow: حذف صف 11:00 وتأجيله ليوم آخر بعد اكتمال جاهزية العملاء.
- في حالة Red: إلغاء كامل الجدول وإعادة فحص 13E.

---

## 9. Compliance

تأكيدات هذه المرحلة:

- ✅ لا كود تم تعديله.
- ✅ لا DB / لا RLS / لا RPC / لا migrations / لا edge functions.
- ✅ لا أسماء وهمية لمزودين أو عملاء.
- ✅ لا نتائج فعلية مخترعة — كل الأرقام placeholders يملأها المشغل.
- ✅ لا إرسال رسائل فعليًا من النظام في إطار هذه الوثيقة.
- ✅ كل القرارات تشغيلية وقابلة للمراجعة قبل التنفيذ.

---

## القرار

`SOFT LAUNCH OPERATIONS PHASE 13E DAY 0 GO-LIVE CHECK READY`