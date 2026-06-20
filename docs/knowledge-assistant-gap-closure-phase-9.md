# KNOWLEDGE ASSISTANT GAP CLOSURE — PHASE 9

Source: `docs/knowledge-assistant-internal-pilot-phase-8-report.md` (26 pilot
questions, 21 answered, 5 fallback).

## Fallback root-cause table

| # | السؤال | الجمهور | سبب fallback | القرار | الإجراء |
| - | ------ | ------ | ------------ | ------ | ------- |
| p22 | عاصمة فرنسا | visitor | خارج نطاق قطاعات | `out_of_scope` | إبقاء fallback — لا يجوز إجابة عامة |
| p23 | وصفة كعكة شوكولاتة | visitor | خارج نطاق قطاعات | `out_of_scope` | إبقاء fallback |
| p24 | zxqv blarp foobar nonsense | visitor | gibberish | `out_of_scope` | إبقاء fallback |
| p25 | qwertyuiop asdfghjkl | visitor | gibberish | `out_of_scope` | إبقاء fallback |
| p26 | lorem ipsum dolor sit amet | visitor | خارج نطاق قطاعات | `out_of_scope` | إبقاء fallback |
| p9 | لماذا لم يصلني رد على طلبي؟ | customer | يحتاج FAQ توقيت أوضح | `add_knowledge` | إضافة `rfq-reply-timing-detail` |
| p13 | الفرق بين الأعمال الشخصية وأعمال المنشأة | business_owner | يحتاج FAQ مستقل | `add_knowledge` | إضافة `biz-personal-vs-business` |
| n/a | أعطني رقم جوال مزود معين | customer | بيانات شخصية | `needs_human_support` + `add_knowledge` | إضافة `cust-provider-contact-privacy` |
| n/a | ما أفضل مزود في جدة؟ | customer | لا ترشيح | `add_knowledge` | إضافة `cust-choose-provider` |
| n/a | كم سعر واجهة ألمنيوم؟ | customer | لا تسعير | `add_knowledge` | إضافة `cust-pricing-guidance` يوجه لـ `/quote` |
| n/a | هل تضمنون التنفيذ؟ | customer | وعد ضمان | `keep_blocked` | يبقى fallback — لا وعد بضمان |

## Knowledge items added (Phase 9)

- `cust-pricing-guidance` — كيف يتم تقدير السعر، دون أي رقم. يوجه لـ `/quote`.
- `cust-choose-provider` — كيف يختار المستخدم مزودًا، يصرّح أن المنصة لا ترشّح أحدًا.
- `cust-provider-contact-privacy` — لا تشارك أرقام الجوال أو بيانات شخصية.
- `rfq-reply-timing-detail` — توضيح أن مدة الرد متغيرة ولا تعد المنصة بمدة ثابتة.
- `biz-personal-vs-business` — مقال مستقل للفرق بين الأعمال الشخصية وأعمال المنشأة.

## Synonyms expanded

`تسعير`, `pricing`, `شركتي`, `بياناتي`, `أرفع طلب`.

## Out-of-scope / sensitive — preserved as fallback

- سؤال خارج نطاق قطاعات (عاصمة دولة، وصفات، gibberish).
- وعود ضمان غير موثقة.
- ترشيح مزود معين بالاسم.
- مشاركة بيانات تواصل شخصية لمزود محدد.

## Target

تقليل fallback داخل النطاق إلى **< 2** في الجولة القادمة دون السماح بأي إجابة
يجب أن تبقى محجوبة. الاختبارات تثبت هذا الحد.