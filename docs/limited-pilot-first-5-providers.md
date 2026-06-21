# LIMITED PILOT — First 5 Providers

> **Launch class:** `Limited Pilot` — not a public launch.
> Provider entries below are **slots reserved for real, manually-vetted
> providers**. No fake/demo entries. No public phone numbers — internal
> contact is tracked outside this repo (private ops channel only).
>
> Publishing in this pilot is gated by the existing public visibility
> rules (`is_published AND approved`). Providers in `demo` or
> `inactive` state **do not** enter the pilot.

## Acceptance criteria (per provider)
- Not a demo profile.
- Status = active.
- Published or ready-to-publish (passes `is_published AND approved`).
- Has a clear sector.
- Has a clear city.
- Has a known internal contact for the ops team (out-of-band).
- Can receive requests.
- No sensitive data exposed publicly.
- Does not violate public visibility rules.

## Sector coverage (must cover all five)
1. ألمنيوم وزجاج
2. حديد وستانلس
3. خشب ومطابخ
4. واجهات
5. درابزين / أعمال معدنية

## Providers table (5 slots — fill before pilot day)

| # | اسم المزود | القطاع | المدينة | الحي | حالة الملف | حالة النشر | حالة التحقق | صور/أعمال | يستقبل طلبات؟ | مسؤول داخلي | ملاحظات |
| - | ---------- | ------ | ------- | ---- | ---------- | ---------- | ----------- | --------- | ------------- | ----------- | ------- |
| 1 | _TBD_ | ألمنيوم وزجاج | جدة | _TBD_ | active | ready | pending | _TBD_ | _TBD_ | _TBD_ | — |
| 2 | _TBD_ | حديد وستانلس | جدة | _TBD_ | active | ready | pending | _TBD_ | _TBD_ | _TBD_ | — |
| 3 | _TBD_ | خشب ومطابخ | جدة | _TBD_ | active | ready | pending | _TBD_ | _TBD_ | _TBD_ | — |
| 4 | _TBD_ | واجهات | جدة | _TBD_ | active | ready | pending | _TBD_ | _TBD_ | _TBD_ | — |
| 5 | _TBD_ | درابزين / أعمال معدنية | جدة | _TBD_ | active | ready | pending | _TBD_ | _TBD_ | _TBD_ | — |

## Hard rules
- No demo / inactive providers in pilot.
- No public exposure of private contact data (phone, WhatsApp, personal email).
- Public visibility remains gated by `is_published AND approved`.
- No DB / RLS / RPC / migrations / edge changes are introduced by this list.
- No public assistant, no auto-send, no fake RFQs.