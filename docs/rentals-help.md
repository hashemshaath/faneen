# Rentals — Help Center Mappings (RENTAL-MICROSERVICE-2)

This document is the canonical Help Center copy for the Rental Microservice.
It is referenced by `help_articles` rows and the in-app contextual help
resolver.

## Articles

### `provider.rentals` — للمزوّد
- **AR**: كيفية إنشاء عنصر تأجير جديد، رفع الصور، تحديد الوحدة والسعر، وضبط شروط الاستخدام والتأخير والشروط الجزائية. إرسال العنصر للمراجعة، ثم نشره عند الاعتماد.
- **EN**: How to create a rental item, upload images, set unit & pricing, define usage / late / penalty terms, submit for review, and publish on approval.
- **Surface**: `/dashboard/rentals` → My items.

### `admin.rentals` — للأدمن
- **AR**: مراجعة العناصر المعلّقة، اعتماد/رفض، استعراض العقود والتمديدات، متابعة العناصر بدون صور أو بدون تصنيف أو ذات SEO ضعيف، وتشغيل فحص الانتهاء يدويًا.
- **EN**: Moderate pending items, approve/reject, oversee orders & extensions, monitor items missing images/category/low SEO, and manually trigger the expiry scan.
- **Surface**: `/admin/rentals` + `/admin/operations` → Rentals tab.

### `public.rentals` — للمستخدم العام
- **AR**: تصفّح كتالوج التأجير حسب التصنيف (سقالات، حاويات، مولدات، …)، عرض تفاصيل العنصر، السعر بالوحدة، الشروط، والتواصل مع المزوّد.
- **EN**: Browse the rentals catalogue by category (scaffolding, containers, generators, …), view item details, unit price, terms, and contact the provider.
- **Surface**: `/rentals`, `/rentals/category/:slug`, `/rentals/:slug`.

### `rental.extension.workflow` — التمديد والتجديد
- **AR**: يمكن للمزوّد أو العميل طلب تمديد المدة أو الكمية أو الاثنين معًا. يصبح التمديد ساريًا فقط بعد الموافقة المتبادلة، ويتم تحديث تاريخ الانتهاء تلقائيًا. التجديد ينشئ طلبًا جديدًا ويحفظ سجل الأصل.
- **EN**: Provider or customer can request a duration / quantity / partial extension. Extensions take effect only after both parties approve; the end date is updated automatically. Full renewal creates a new order while preserving the original record.
- **Surface**: Order card → “Actions” inline panel.

### `rental.expiry.alerts` — تنبيهات الانتهاء
- **AR**: تُدوَّر الحالات يوميًا: نشط → قريب الانتهاء (≤ 3 أيام) → منتهي. تُرسَل تنبيهات داخل التطبيق للعميل عند الانتقال، مع منع التكرار. تشغيل يدوي متاح من مركز العمليات (آمن وقابل لإعادة التشغيل).
- **EN**: Statuses roll daily: active → expiring soon (≤ 3 days) → expired. Customers receive in-app notifications on transition, deduplicated. Admins can trigger the scan manually from the Operations Center (idempotent).
- **Surface**: `/admin/operations` → Rentals tab.

## Notification types (in-app)

| Event | Type code |
|---|---|
| Rental started | `rental_started` |
| Expiring soon | `rental_expiring_soon` |
| Expired | `rental_expired` |
| Overdue | `rental_overdue` |
| Extension requested | `rental_extension_requested` |
| Extension approved | `rental_extension_approved` |
| Closed | `rental_closed` |

All notifications carry `reference_type='rental_order'` and the `RORD-*`
ref as `reference_id` — never the raw UUID.

## Cron

`rental_orders_roll_status()` runs daily; results are written to
`cron_run_log`. Manual trigger: `supabase.functions.invoke('rental-expiry-scan')`
(admin-guarded via shared `requireCronOrAdmin`).

## Out of scope (by design)

- No payment gateway integration.
- No supplier portal / RFQ for rentals.
- No WhatsApp / SMS channel.
- No bulk publish in admin.