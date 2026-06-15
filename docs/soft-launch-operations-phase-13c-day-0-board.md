# SOFT LAUNCH OPERATIONS PHASE 13C — DAY 0 EXECUTION BOARD + FIRST COHORT SETUP

> Operations-only document. No code, DB, RLS, RPC, or migration changes.
> Scope: Jeddah + Riyadh · 5 sectors (ألمنيوم وواجهات، حديد وأعمال معدنية، خشب وديكور، مطابخ، زجاج) · 15–25 providers · 30–50 pilot customers · 10–14 days observation.

---

## 1. Day 0 Objective

هدف اليوم صفر:

- التأكد من جاهزية البيئة الإنتاجية (env vars, WhatsApp FAB, sitemap, robots, llms, canonical/OG).
- تجهيز أول دفعة مزودين (Tier A/B/C) مع بيانات التواصل وحالة التحقق.
- تجهيز أول دفعة عملاء تجريبيين (50) عبر الفئات الخمس.
- تنفيذ اختبار RFQ داخلي end-to-end (submit + upload + matching visibility).
- اختبار WhatsApp FAB من جوال + سطح مكتب على بيئة الإنتاج.
- التأكد أن لوحة المتابعة اليومية (KPI Board) جاهزة قبل إرسال أي دعوة.
- لا تُرسل أي دعوة فعلية قبل اكتمال جميع بنود Section 4 (Technical Checklist).

---

## 2. First Provider Cohort Board

قالب فارغ — تُملأ من قبل Provider Coordinator. لا تستخدم أسماء افتراضية.

### Tier A — 10 مزودين (جاهزون أو شبه جاهزين)

| ID | Tier | اسم المنشأة | المدينة | القطاع | المسؤول | واتساب | مصدر الترشيح | حالة التحقق | حالة الدعوة | حالة التسجيل | اكتمال % | الاعتماد | صور؟ | خدمات واضحة؟ | مناطق الخدمة | آخر تواصل | الإجراء التالي | المسؤول | ملاحظات |
|----|------|--------------|---------|---------|----------|---------|----------------|---------------|---------------|----------------|------------|-----------|--------|------------------|----------------|--------------|-----------------|----------|----------|
| PA-01 | A |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PA-02 | A |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PA-03 | A |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PA-04 | A |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PA-05 | A |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PA-06 | A |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PA-07 | A |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PA-08 | A |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PA-09 | A |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PA-10 | A |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

### Tier B — 10 مزودين (يحتاجون إكمال بيانات/صور)

| ID | Tier | اسم المنشأة | المدينة | القطاع | المسؤول | واتساب | مصدر الترشيح | حالة التحقق | حالة الدعوة | حالة التسجيل | اكتمال % | الاعتماد | صور؟ | خدمات واضحة؟ | مناطق الخدمة | آخر تواصل | الإجراء التالي | المسؤول | ملاحظات |
|----|------|--------------|---------|---------|----------|---------|----------------|---------------|---------------|----------------|------------|-----------|--------|------------------|----------------|--------------|-----------------|----------|----------|
| PB-01 | B |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PB-02 | B |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PB-03 | B |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PB-04 | B |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PB-05 | B |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PB-06 | B |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PB-07 | B |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PB-08 | B |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PB-09 | B |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PB-10 | B |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

### Tier C — 5 مزودين (احتياط / مؤجلون)

| ID | Tier | اسم المنشأة | المدينة | القطاع | المسؤول | واتساب | مصدر الترشيح | حالة التحقق | حالة الدعوة | حالة التسجيل | اكتمال % | الاعتماد | صور؟ | خدمات واضحة؟ | مناطق الخدمة | آخر تواصل | الإجراء التالي | المسؤول | ملاحظات |
|----|------|--------------|---------|---------|----------|---------|----------------|---------------|---------------|----------------|------------|-----------|--------|------------------|----------------|--------------|-----------------|----------|----------|
| PC-01 | C |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PC-02 | C |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PC-03 | C |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PC-04 | C |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| PC-05 | C |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

**Status enums**:
- حالة التحقق: `Unverified` / `Verifying` / `Verified` / `Rejected`
- حالة الدعوة: `Not sent` / `Sent` / `Opened` / `Replied` / `No reply`
- حالة التسجيل: `Not started` / `Started` / `Profile WIP` / `Submitted for review` / `Approved` / `Rejected`
- الاعتماد: `Pending` / `Approved` / `Rejected`

---

## 3. First Customer Pilot Board

50 صف فارغ موزّعة على 5 فئات. قوالب مرقمة فقط — لا أسماء مخترعة.

### 3.1 أفراد لديهم مشاريع (15)

| ID | الفئة | الاسم | المدينة | القطاع المطلوب | نوع المشروع | طلب فعلي؟ | مصدر الدعوة | حالة الدعوة | فتح الرابط؟ | أرسل RFQ؟ | جودة الطلب | حالة المطابقة | حالة التواصل | تقييم | الإجراء التالي | المسؤول | ملاحظات |
|----|------|--------|---------|------------------|---------------|-------------|----------------|---------------|---------------|-------------|--------------|----------------|----------------|--------|-----------------|----------|----------|
| CI-01 | فرد |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| ... (CI-02 إلى CI-15) |
| CI-15 | فرد |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

### 3.2 مقاولون صغار (10)

| ID | الفئة | ... |
|----|------|-----|
| CC-01 | مقاول |  |
| ... (CC-02 إلى CC-10) |

### 3.3 مكاتب هندسية (10)

| ID | الفئة | ... |
|----|------|-----|
| CE-01 | مكتب هندسي |  |
| ... (CE-02 إلى CE-10) |

### 3.4 أصحاب مشاريع تشطيب (10)

| ID | الفئة | ... |
|----|------|-----|
| CF-01 | تشطيب |  |
| ... (CF-02 إلى CF-10) |

### 3.5 جهات تجارية أو معارض (5)

| ID | الفئة | ... |
|----|------|-----|
| CB-01 | جهة تجارية |  |
| ... (CB-02 إلى CB-05) |

**Status enums**:
- جودة الطلب: `High` / `Medium` / `Low` / `Unclear`
- حالة المطابقة: `Pending` / `Matched` / `No match` / `Partial`
- التقييم: `1–5` بعد التجربة

---

## 4. Day 0 Technical Checklist

| # | البند | Owner | Status | Notes |
|---|-------|-------|--------|-------|
| 1 | ضبط `VITE_QITAAT_WHATSAPP` في production | Technical Watch | Pending |  |
| 2 | اختبار WhatsApp FAB من الجوال | Technical Watch | Pending |  |
| 3 | اختبار WhatsApp FAB من سطح المكتب | Technical Watch | Pending |  |
| 4 | إرسال RFQ داخلي end-to-end | RFQ Operator | Pending |  |
| 5 | اختبار رفع صورة (JPG/PNG/WebP) | RFQ Operator | Pending |  |
| 6 | اختبار رفع PDF | RFQ Operator | Pending |  |
| 7 | اختبار طلب بدون ملفات | RFQ Operator | Pending |  |
| 8 | اختبار Search no-results CTA | Data/Quality | Pending |  |
| 9 | اختبار `/for-providers` CTA | Provider Coordinator | Pending |  |
| 10 | اختبار `/join-as-provider` redirect | Provider Coordinator | Pending |  |
| 11 | اختبار onboarding review note | Provider Coordinator | Pending |  |
| 12 | اختبار provider readiness card | Provider Coordinator | Pending |  |
| 13 | اختبار public provider profile | Data/Quality | Pending |  |
| 14 | اختبار مزود غير ظاهر للعامة | Data/Quality | Pending |  |
| 15 | مراجعة sitemap.xml | Technical Watch | Pending |  |
| 16 | مراجعة robots.txt | Technical Watch | Pending |  |
| 17 | مراجعة llms.txt | Technical Watch | Pending |  |
| 18 | مراجعة canonical/OG للصفحة الرئيسية | Technical Watch | Pending |  |
| 19 | مراجعة صفحة قطاع | Data/Quality | Pending |  |
| 20 | مراجعة صفحة بحث | Data/Quality | Pending |  |
| 21 | مراجعة `/quote` على الجوال | RFQ Operator | Pending |  |
| 22 | مراجعة contact/about/privacy/terms | Data/Quality | Pending |  |
| 23 | فحص `email_send_log` | Technical Watch | Pending |  |
| 24 | فحص `cron_run_log` | Technical Watch | Pending |  |
| 25 | فحص أول Moyasar sandbox/real | Launch Owner | Pending |  |

**Gate**: لا يبدأ Day 1 قبل وصول جميع البنود إلى `Pass`. أي `Fail` يصعد فورًا إلى Launch Owner.

---

## 5. Day 0 Operating Roles

| الدور | المسؤولية | مراجعة يومية | متى يصعد | كيف يسجل |
|-------|-----------|----------------|------------|-----------|
| **Launch Owner** | قرار Go/Pause/Scale، توقيع Go-Live Decision Card | KPI Board + Decision Card | عند أي Red status | Decision Card daily |
| **RFQ Operator** | تنفيذ RFQ، متابعة استجابة المزودين، تصنيف الإغلاق | RFQs submitted + completion + matching | فشل submit/upload أو >24h دون رد | KPI Board cols D–H |
| **Provider Coordinator** | إدارة Provider Board، الدعوة، المتابعة، اعتماد الملفات | Provider Board + readiness % | <50% completion لـ Tier A بعد 48h | Provider Board + ملاحظات |
| **Customer Coordinator** | إدارة Customer Board، الدعوة، التتبع، التقييم | Customer Board + RFQs started | <20% open rate أو طلبات غير واضحة | Customer Board + ملاحظات |
| **Technical Watch** | env, FAB, sitemap, logs, cron, email, Moyasar | email_send_log + cron_run_log + WhatsApp clicks | أي خطأ في submit/upload/cron/email | Technical Checklist + escalation log |
| **Data/Quality Reviewer** | جودة الطلبات، جودة الملفات العامة، zero-results | Zero-result searches + quality scores | >3 zero-result في نفس القطاع | KPI Board col M + ملاحظات |

---

## 6. First RFQ Test Scenarios

| # | السيناريو | الهدف | بيانات الطلب | النتيجة المتوقعة | ما يُراقب | الحالة |
|---|----------|--------|----------------|--------------------|-------------|--------|
| 1 | ألمنيوم واجهات — جدة | تأكيد المسار الأساسي + matching | قطاع: ألمنيوم، المدينة: جدة، وصف مختصر، ميزانية تقديرية | RFQ submitted, matched providers >0 | submit success, autosave, matching count | Pending |
| 2 | حديد درابزين — الرياض | تأكيد قطاع ثانٍ + مدينة ثانية | قطاع: حديد، المدينة: الرياض، صورة مرجعية | submitted + matched | upload صورة، تصنيف القطاع | Pending |
| 3 | مطبخ — جدة | تأكيد قطاع المطابخ مع تفاصيل | قطاع: مطابخ، أبعاد، نوع المواد | submitted + matched | حقول الأبعاد، الوحدات mm | Pending |
| 4 | خشب وديكور — الرياض | تأكيد قطاع خشب | قطاع: خشب، نوع المشروع: ديكور | submitted + matched | حقول وصف، اللغة | Pending |
| 5 | زجاج — جدة | تأكيد قطاع الزجاج | قطاع: زجاج، نوع: واجهة | submitted + matched | matching الزجاج فقط | Pending |
| 6 | طلب ناقص الوصف | اختبار Validation | حقول فارغة/مختصرة | رفض ودود + رسالة عربية واضحة | inline validation copy | Pending |
| 7 | ملف كبير/غير مقبول | اختبار upload limits | PDF >10MB أو امتداد غير مدعوم | رفض + رسالة واضحة | upload helper text | Pending |
| 8 | Search no-results → RFQ | تأكيد CTA من البحث | بحث عن قطاع نادر | CTA إلى `/quote` ظاهر + clickable | conversion من search إلى quote | Pending |

> جميع السيناريوهات تُنفّذ على بيئة الإنتاج بحساب اختبار داخلي. لا تُرسل لأي مزود حقيقي قبل اعتماد Section 4.

---

## 7. Day 1 Invitation Sequence

### المزودون

| الوقت | الشريحة | الرسالة | المسؤول | الهدف | الحالة |
|-------|---------|---------|----------|--------|--------|
| 10:00 | Tier A (10) | Provider Invite #1 (13B §4.1) | Provider Coordinator | تسجيل + بدء الملف | Pending |
| 13:00 | فتح ولم يكمل | Provider Follow-up (13B §4.2) | Provider Coordinator | إكمال التسجيل | Pending |
| 17:00 | ملفات ناقصة | Provider Profile Push (13B §4.3) | Provider Coordinator | اكتمال 80%+ | Pending |

### العملاء

| الوقت | الشريحة | الرسالة | المسؤول | الهدف | الحالة |
|-------|---------|---------|----------|--------|--------|
| 11:00 | الدفعة الأولى (15) | Customer Invite (13B §5.1) | Customer Coordinator | فتح `/quote` | Pending |
| 15:00 | لم يكمل RFQ | Customer Nudge (13B §5.2) | Customer Coordinator | إرسال RFQ | Pending |
| 18:00 | كل الدفعة | Daily Recap (داخلي) | Launch Owner | تلخيص + ملاحظات | Pending |

---

## 8. Daily KPI Board (14 days)

| Day | Date | /quote visits | RFQs started | RFQs submitted | Completion % | Main drop-off | Providers invited | Providers registered | Providers profile completed | Providers approved | Avg response time | Zero-result searches | WhatsApp clicks | Upload failures | Submit failures | Top issue | Decision | Owner |
|-----|------|----------------|----------------|------------------|----------------|----------------|---------------------|------------------------|--------------------------------|----------------------|---------------------|------------------------|-------------------|-------------------|-------------------|-------------|------------|--------|
| 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 11 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 12 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 13 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 14 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

---

## 9. Escalation Rules

### Technical Escalation → Technical Watch + Launch Owner (فوري)

- RFQ submit failure (أي حالة).
- Upload failure مكررة (>1 خلال ساعة).
- Public route مكسور (5xx/404 على مسار عام).
- WhatsApp FAB لا يعمل.
- خطأ في `email_send_log` أو `cron_run_log` (>10% فشل).
- Auth/Onboarding محجوب لأي مستخدم.

### Operations Escalation → Launch Owner (نفس اليوم)

- مزود لا يرد خلال 24 ساعة بعد دعوة Tier A.
- عميل أرسل طلبًا غير واضح (Quality = Unclear).
- أكثر من 3 zero-result searches في نفس القطاع.
- أكثر من 2 مزودين يرفضون نفس نوع الطلب.

### Business Escalation → Launch Owner (قرار Pause/Pivot)

- لا توجد طلبات خلال 3 أيام متتالية.
- Completion < 20% بعد 5 أيام.
- مزودون غير جادين (>30% من Tier A بدون استجابة).
- عملاء لا يفهمون الخدمة (>40% تقييم ≤2).

---

## 10. Go-Live Decision Card (يومي)

```
Date: __________
Status: 🟢 Green  /  🟡 Yellow  /  🔴 Red
Day Summary: ____________________________
Top positive metric: ____________________
Top issue: ______________________________
Tomorrow's decision:
  [ ] Continue
  [ ] Fix before continuing
  [ ] Pause
  [ ] Expand (city/sector/cohort)
Owner: __________________________________
Notes: __________________________________
```

**Color rules**:
- 🟢 Green: KPIs على الهدف، لا blockers تقنية، ≥40% completion.
- 🟡 Yellow: انحراف قابل للإصلاح خلال 24h، لا blockers حرجة.
- 🔴 Red: blocker تقني/تشغيلي/تجاري — Pause حتى الإصلاح.

---

## Compliance

- لا تغييرات كود · لا DB · لا RLS · لا RPC · لا migrations.
- لا أسماء شركات/عملاء حقيقية مخترعة — كل القوالب فارغة.
- لا أرقام نتائج فعلية — كل KPI صف فارغ.
- لا إرسال رسائل فعلية من النظام أثناء Day 0.
- لا تعديل pricing/membership/scope.

---

## Decision

`SOFT LAUNCH OPERATIONS PHASE 13C DAY 0 BOARD READY` ✅
