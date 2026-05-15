## الهدف

تشغيل تجربة A/B على عنوان Hero في الصفحة الرئيسية، مع تتبع نسبة الضغط (CTR) على زر "اطلب عرض سعر"، واستخدام النسخة الأفضل تلقائيًا بعد بلوغ حجم عينة كافٍ ومستوى ثقة محدد.

---

## 1) قاعدة البيانات (migration واحدة)

جداول:
- `ab_experiments` — `key` (مثل `hero_headline`)، الحالة (`draft|running|completed`)، `min_sample_per_variant` (افتراضي 1000)، `confidence_threshold` (افتراضي 0.95)، `winner_variant_id`، `auto_promote` (bool).
- `ab_variants` — `experiment_id`، `key` (`A`/`B`/...)، `content` (jsonb: `{titleAr, titleEn, subAr, subEn}` لكل شريحة أو فقط العنوان الرئيسي)، `weight` (افتراضي 1)، `is_control`، `is_active`.
- `ab_events` — `experiment_id`، `variant_id`، `visitor_id` (text)، `event_type` (`impression|click`)، `created_at`. بدون أي PII.

سياسات RLS:
- قراءة `ab_experiments`/`ab_variants` للحالات `running` و `completed` فقط متاحة للعموم.
- إدراج `ab_events` مسموح للعموم (visitor_id فقط، لا auth).
- الإدارة الكاملة عبر `has_role(auth.uid(),'super_admin')`.

فهارس: `(experiment_id, variant_id, event_type, created_at)` لتسريع التجميع.

---

## 2) RPCs آمنة (SECURITY DEFINER, search_path=public)

- `ab_assign_variant(p_experiment_key text, p_visitor_id text)` →
  - يختار variant فعّالة بشكل ثابت لكل visitor عبر `hashtext(visitor_id || experiment_key) % sum(weight)` ⇒ لا تخزين assignment، نفس الزائر = نفس النسخة دائمًا.
  - يسجل `impression` (مرة واحدة لكل visitor باستخدام `ON CONFLICT DO NOTHING` + قيد فريد جزئي على `event_type='impression'`).
  - يُرجع `{variant_id, variant_key, content}`.
- `ab_track_click(p_experiment_key text, p_visitor_id text)` → يحسب نفس النسخة المعيّنة ويسجل `click`.
- `ab_evaluate_experiments()` (للأدمن/cron) → لكل تجربة `running`:
  - يحسب impressions و clicks لكل variant.
  - إن بلغت كل النسخ `min_sample_per_variant`، يُجري z-test للنسبتين بين الأعلى CTR والمتحكم.
  - إن `p_value < 1 - confidence_threshold` و`auto_promote=true`: ينقل التجربة إلى `completed`، يضع `winner_variant_id`، ويعطل بقية النسخ (`is_active=false`).
- `ab_experiment_stats(p_key text)` → للأدمن: impressions/clicks/CTR/p-value لكل variant.

---

## 3) الواجهة الأمامية

- `src/lib/abTesting.ts`:
  - `getOrCreateVisitorId()` — uuid في `localStorage` (`qitaat_visitor_id`).
  - `useAbVariant(experimentKey)` — React Query، يستدعي `ab_assign_variant`، staleTime=∞، كاش في `sessionStorage` لمنع تكرار impressions داخل نفس الجلسة.
  - `trackAbClick(experimentKey)` — fire-and-forget عبر `ab_track_click`.

- تعديل `HomeV2.tsx`:
  - في `HeroV2`، استدعاء `useAbVariant('hero_headline')` ودمج `content.titleAr/titleEn/subAr/subEn` فوق نسخة الـ slide الافتراضية (إن وُجد content للنسخة، يبدّل عنوان الشريحة الأولى أو الكل حسب النسخة المخزنة).
  - في `PrimaryCTA` لزر "اطلب عرض سعر" داخل الـ hero فقط: استدعاء `trackAbClick('hero_headline')` عند النقر قبل التنقل.

- لوحة الأدمن `/admin/ab-experiments`:
  - قائمة التجارب + إنشاء/تعديل (inline form, لا منبثقات).
  - لكل تجربة: variants مع محرر `content` (JSON آمن أو حقول AR/EN منظمة)، `weight`، `is_control`.
  - عرض الإحصائيات الحية (impressions/clicks/CTR/p-value/المُعيَّن فائزًا).
  - أزرار "تشغيل/إيقاف"، "تعيين فائز يدويًا"، تبديل `auto_promote`.
  - محمي بـ `requireAdmin` + `useNoIndex`.

---

## 4) الترقية التلقائية

- Edge function `ab-evaluate` تستدعي `ab_evaluate_experiments()`، محمية بـ `x-cron-secret` (نفس نمط `monthly-provider-credit-grant`).
- إعداد cron يدويًا في SQL Editor (يومي 02:00 UTC). نُجهّز SQL، ولا نضع السر في الكود.

---

## 5) البيانات الأولية (seed)

عبر `supabase--insert` بعد الـ migration:
- تجربة واحدة `hero_headline` بحالة `running`، `auto_promote=true`، `min_sample_per_variant=1000`، `confidence_threshold=0.95`.
- نسختان:
  - **A (control)**: العنوان الحالي للشريحة الأولى.
  - **B**: عنوان مختلف (مقترح: "اطلب عرض سعر صناعي خلال دقيقة" + sub مطابق).

---

## 6) الأمان والخصوصية

- `visitor_id` معرّف عشوائي في المتصفح فقط، لا يربطه شيء بالمستخدم المسجَّل.
- لا يُسجَّل IP أو user-agent.
- RLS تمنع قراءة `ab_events` للعموم تمامًا.
- كل RPCs بـ `search_path=public` و `SECURITY DEFINER` مع تحقق من المدخلات.

---

## 7) ما لن يتغير

- منطق الطلبات والمطابقة والـ /quote نفسها.
- بقية CTAs خارج الـ hero لا تُتتبَّع في هذه التجربة.
- لا منبثقات/Dialogs (سياسة UX).

---

## التسليم

| العنصر | الحالة |
|---|---|
| Migration (جداول + RLS + RPCs + فهارس) | ✓ |
| Edge function `ab-evaluate` + ربط cron يدوي | ✓ (ملف + تعليمات SQL) |
| `src/lib/abTesting.ts` + hook | ✓ |
| تعديل `HeroV2` ودمج النسخة + تتبع زر CTA | ✓ |
| `/admin/ab-experiments` + رابط في الشريط الجانبي | ✓ |
| Seed التجربة الأولى | ✓ |
| تقرير نهائي: الجداول، RPCs، طريقة التعيين، z-test، الترقية، الأمان | ✓ |

هل أبدأ بالتنفيذ بهذا النطاق؟
