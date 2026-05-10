# Brand Color Audit — استثناءات مبررة

> مرجع موجز لفريق Qitaat حول سكربت `npm run audit:brand-colors` ولماذا تبقى بعض النتائج مصنّفة كمبرَّرة.

## 1. الهدف من `audit:brand-colors`

سكربت **read-only** يفحص ملفات `src/`, `supabase/functions/`, `public/` ويرصد:

- ألوان hex خارج لوحة الهوية المركزية (`src/config/brandTheme.ts`).
- كلاسات Tailwind محظورة (`amber, yellow, gold, purple, pink, cyan, orange, ...`).
- أي `linear-gradient` / `radial-gradient` / `bg-gradient-gold` / `bg-gradient-navy`.

يُصنِّف كل نتيجة إلى:

| الفئة | المعنى |
|------|--------|
| **A** | مخالفة حقيقية تحتاج إصلاحًا |
| **B** | لون رسمي لطرف ثالث (مبرَّر) |
| **C** | تقني — `#000000` / `#FFFFFF` للطباعة أو fallback |
| **D** | تعليق نصي أو تعريف نظام (لا لون مرئي) |

يخرج دائمًا بكود `0` (إرشادي فقط — لا يكسر CI).

---

## 2. لماذا تبقى بعض النتائج مبرَّرة؟

بعد جولات التنظيف (شارتات، خرائط، إيميلات، PDF/طباعة)، النتائج المتبقية تنقسم إلى أنواع لا يجب تعديلها:

### 2.1 ألوان رسمية لأطراف خارجية (B)

محفوظة في `OFFICIAL_BRAND_HEX` داخل السكربت:

| الخدمة | اللون |
|--------|------|
| Google | `#4285F4`, `#34A853`, `#EA4335`, `#FBBC05` |
| WhatsApp | `#25D366` |
| Facebook | `#1877F2` |
| LinkedIn | `#0A66C2` |
| Telegram | `#26A5E4`, `#0088CC` |
| Twitter / X | `#1DA1F2` |
| YouTube | `#FF0000` |

تستخدم في أزرار تسجيل الدخول الاجتماعي وأيقونات المشاركة الرسمية. **لا تُعدَّل أبدًا.**

### 2.2 ألوان تقنية #000000 / #FFFFFF (C)

مسموحة عند:

- نص أبيض على خلفية داكنة في PDF / OG-image (تباين قراءة).
- قيمة افتراضية لـ color-picker (`AdminBranding.tsx`, `AdminTags.tsx`).
- Fallback لقيم آتية من قاعدة البيانات قد تكون `null` (`provider.color_hex || '#000000'`).

### 2.3 تعريفات نظام الهوية (D)

الملفات التالية **هي مصدر الحقيقة** للألوان والتدرجات، وأي hex فيها هو إعلان وليس استخدامًا عشوائيًا:

- `src/config/brandTheme.ts` — يعرّف `BRAND_COLORS`, `BRAND_EMAILS`, `BRAND_DOCUMENTS`, و `FORBIDDEN_LEGACY_HEX`.
- `src/index.css` — يعرّف CSS Variables و `--gradient-gold/brand/navy/hero` و كلاسات `.bg-gradient-*`.
- `src/hooks/useThemeColors.ts` — يبني CSS Variables ديناميكيًا من `brandTheme`.
- `src/lib/theme/brandThemeUtils.ts` — أدوات التحقق (تذكر `#14B481` كقيمة محظورة).
- `supabase/functions/_shared/brandTheme.ts` — يعرّف `EMAIL_BRAND` و `EMAIL_TINTS` للـ Edge Functions.

### 2.4 Legacy gradient utilities المعاد ربطها (A — استثناء موَثَّق)

الكلاسات `bg-gradient-gold`, `bg-gradient-navy`, `text-gradient-gold-shimmer`, و CSS variables `--gradient-gold/brand/navy` **لم تعد ذهبية فعليًا**. تم إعادة ربطها داخليًا في `src/index.css` و `useThemeColors.ts` لتتدرج بين `hsl(var(--primary))` (الأخضر الصناعي) و `hsl(var(--secondary))` (الأزرق الصناعي).

- ✅ مسموحة مؤقتًا — تنتج ألوان الهوية الجديدة.
- ⚠️ يفضَّل إعادة تسميتها لاحقًا إلى `bg-gradient-brand` / `bg-gradient-primary` لتجنب الالتباس.

### 2.5 ألوان مزودين خارجيين من قاعدة البيانات

- `DashboardInstallments.tsx` يستخدم `provider.color_hex` ديناميكيًا (Tabby `#3BFFC1`, Tamara `#FFB7C7`, ...) داخل `linear-gradient(${color}18, ${color}08)` لعرض هوية المزود الرسمية.
- لا يجوز استبدالها بألوان قطاعات — هي ملكية المزود.

### 2.6 Selectors داخلية لمكتبات خارجية

- `src/components/ui/chart.tsx` يحتوي `[stroke='#ccc']` — هذا **CSS attribute selector** يستهدف خطوط Recharts الافتراضية ليعيد تلوينها عبر `stroke-border/50`. ليس لونًا مرسومًا.

---

## 3. متى يكون اللون مخالفة حقيقية؟

يجب الإصلاح إذا اجتمع شرطان:

1. اللون **يُعرض فعليًا** على المستخدم (ليس تعليقًا، ليس selector، ليس ثابت `FORBIDDEN_*`).
2. اللون **ليس** ضمن:
   - لوحة `BRAND_COLORS` / `BRAND_EMAILS` / `BRAND_DOCUMENTS` / `EMAIL_TINTS`.
   - `OFFICIAL_BRAND_HEX` (طرف ثالث).
   - استخدام تقني مبرَّر للـ `#000`/`#FFF`.
   - `provider.color_hex` ديناميكي من قاعدة البيانات.

## 4. متى لا يجب تعديل اللون؟

- داخل التعليقات `//` أو `/* */` أو JSDoc.
- داخل تعريف نظام الهوية نفسه.
- داخل selectors لمكتبات خارجية (Recharts, Leaflet).
- لون رسمي لـ Google / WhatsApp / Facebook / LinkedIn / Telegram.
- لون قادم من جدول قاعدة بيانات يمثّل هوية مزود خارجي.
- `bg-gradient-gold` / `bg-gradient-navy` / `text-gradient-gold-shimmer` (مربوطة داخليًا بهوية قطاعات الجديدة).

---

## 5. تحذيرات صارمة

### ⛔ `#14B481` للوغو فقط

اللون الأخضر الأصلي للوغو (`--color-primary-logo`) **محجوز للوغو حصرًا**. ممنوع استخدامه في:

- أزرار، خلفيات، نصوص، شارتات، أيقونات، حالات (success/active).
- استخدم `#0E9E6F` (الأخضر الصناعي للهوية) كبديل في كل مكان آخر.

### ⛔ ممنوع إضافة ألوان عشوائية

لا تُضَف الألوان التالية إلى الواجهة، لا كـ hex، ولا ككلاسات Tailwind، ولا كـ inline styles:

| ممنوع | البديل المعتمد |
|-------|---------------|
| `gold`, `yellow`, `amber` | `--accent` (`#F08A24` برتقالي صناعي) أو `--warning` |
| `purple`, `pink` | `--secondary` (`#2F62AE` أزرق صناعي) |
| `cyan` | `--primary` (`#0E9E6F` أخضر صناعي) أو `--info` |
| `orange` (Tailwind) | `--accent` فقط (لا تستخدم `bg-orange-*`) |
| Hex حر | استخدم CSS variable من `index.css` أو import من `brandTheme.ts` |

الـ `FORBIDDEN_HEX` في السكربت يرصد تلقائيًا:
`#14B481, #1FBA82, #178A60, #2D54C4, #1F3D99, #1A2240, #D4A017, #F59E0B, #FBBF24, #8B5CF6, #06B6D4, #EC4899, #10B981, #3B82F6, #2563EB, #EF4444`.

---

## 6. ملاحظة على الـ Legacy Names

| الاسم الحالي | يربَط داخليًا إلى | الاسم المقترح مستقبلاً |
|--------------|------------------|------------------------|
| `bg-gradient-gold` | `linear-gradient(--primary → --secondary)` | `bg-gradient-brand` |
| `text-gradient-gold-shimmer` | shimmer على `--primary`/`--secondary` | `text-gradient-brand-shimmer` |
| `bg-gradient-navy` | `linear-gradient(--surface-nav → --surface-nav/0.85)` | `bg-gradient-surface-nav` |
| `--gold`, `--gold-light`, `--gold-dark` | درجات `--primary` | `--primary`, `--primary-light`, `--primary-dark` |
| `--brand-blue` | `--secondary` | `--secondary` |

**خطة إعادة التسمية**: مهمة منفصلة (rename refactor) تُنفَّذ بعد استقرار الهوية الجديدة لمدة دورتين على الأقل، لتجنب كسر مكونات تستهلك هذه الكلاسات.

---

## 7. تشغيل السكربت

```bash
npm run audit:brand-colors
```

المخرجات الحالية المتوقعة (بعد جولات التنظيف):

- **A** ≈ 84 (كلها استثناءات موثَّقة أعلاه)
- **B** ≈ 8 (ألوان أطراف خارجية)
- **C** ≈ 2 (#000/#FFF تقني)
- **D** ≈ 149 (تعليقات وتعريفات نظام)

أي ارتفاع في عدد **A** خارج النطاقات أعلاه يستوجب فحصًا فوريًا.