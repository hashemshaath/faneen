# RENTAL-MICROSERVICE-1 — Implementation Plan

نظام تأجير مستقل ومتكامل لخدمات ومعدات التشييد داخل قطاعات. مايكروسيرفيس منفصل تماماً عن المشتريات والعقود الحالية لكنه يتكامل معها عبر روابط مرجعية.

## 1. Database (migration واحد)

جداول جديدة تحت prefix `rental_*`:

- **rental_categories** — تصنيفات (سقالات/حاويات/مولدات/...). seed لـ 12 تصنيف أساسي. حقول: ref_id (RCAT-), slug, name_ar/en, description_ar/en, icon, seo_keywords, default_image_url, sort_order, is_active.
- **rental_items** — العنصر القابل للتأجير. ref_id (RENT-), category_id, provider_business_id, name_ar/en, description_ar/en, unit (enum: day/hour/piece/m/m2/unit), base_price, currency, min_duration, deposit_amount, usage_terms, late_terms, penalty_terms, status (draft/pending_review/approved/rejected/archived), city_id, service_areas jsonb, images jsonb, availability_status, is_published, seo_slug, view_count, created_by.
- **rental_orders** — عقد/طلب تأجير. ref_id (RORD-), provider_business_id, customer_user_id, customer_business_id (nullable), project_id (nullable), work_order_id (nullable), client_site_id (nullable), rental_item_id, quantity, start_date, end_date, total_days, unit_price, total_amount, deposit_amount, currency, status (draft/active/expiring_soon/expired/extended/renewed/closed/cancelled), notes, terms_snapshot jsonb, created_by.
- **rental_extensions** — REXT-, rental_order_id, extension_type (full/partial/duration_only/quantity_only), additional_days, additional_quantity, reason, cost, approved_by_provider, approved_by_customer, status, effective_from, created_by.
- **rental_order_events** — audit log (created/approved/started/expiring/expired/overdue/extended/renewed/closed/cancelled) — للإشعارات ومركز العمليات.

Sequences تبدأ من 1000000. مولّد ref_id عبر trigger موحّد كباقي النظام.

RLS:
- categories: قراءة عامة للمعتمد، كتابة admin فقط.
- items: provider يدير عناصره (user_id من businesses). admin كامل. قراءة عامة فقط لـ `is_published=true AND status='approved'`.
- orders: provider يرى طلباته، customer يرى طلباته، admin كامل. لا قراءة عامة.
- extensions: تابعة لصلاحية الـ order.
- GRANT + service_role لكل جدول.

Trigger يومي (pg_cron أو computed) لتحديث `status` إلى expiring_soon/expired/overdue بناءً على end_date.

## 2. Module (`src/modules/rentals/`)

ميكروسيرفيس مستقل تحت `src/modules/rentals/`:

```
src/modules/rentals/
  index.ts                    # barrel
  types.ts
  constants.ts                # UNITS, STATUSES, TONE_MAP
  services/
    categories.ts             # listCategories, getCategoryBySlug
    items.ts                  # listItems, getItem, createItem, updateItem, publishItem
    orders.ts                 # listOrders, getOrder, createOrder, updateStatus, closeOrder, cancelOrder
    extensions.ts             # listExtensions, createExtension, approveExtension
    publicCatalog.ts          # public approved-only reads
    operationsHub.ts          # counts for ops center
  hooks/
    useRentalCounters.ts      # days-left, overdue, badge tone
    useRentalItems.ts
    useRentalOrders.ts
  utils/
    dayCounter.ts             # totalDays, daysLeft, overdueDays, alertTier
    pricing.ts                # calcTotal(unit, qty, days, price)
  components/
    RentalStatusBadge.tsx
    RentalDayCounter.tsx
    RentalItemCard.tsx
    RentalOrderRow.tsx
    RentalExtensionDialog.tsx (inline panel, NO popup — per memory)
```

Wrappers ترجع `{ data, error }` بدون throw، تطابق نمط `service-boundary-audit`. ممنوع استدعاء supabase مباشرة من الصفحات.

## 3. Provider Dashboard — `/dashboard/rentals`

صفحات جديدة تحت `src/pages/dashboard/`:

- `DashboardRentalsHub.tsx` — tabs: عناصري | الطلبات النشطة | قريبة الانتهاء | متجاوزة | تمديدات
- `DashboardRentalItems.tsx` — grid 4-col (16:11)، فلاتر، bulk actions لتغيير التوفر فقط (لا bulk publish).
- `DashboardRentalItemDetail.tsx` — تحرير inline، رفع صور (bucket business-assets الموجود)، اختيار المدن/المناطق، أسعار، شروط جزائية.
- `DashboardRentalOrderDetail.tsx` — تفاصيل الطلب + عداد أيام كبير + أزرار تمديد/تجديد/إغلاق inline.

كلها داخل `DashboardLayout`. ربط بـ client_sites/work_orders/projects عبر site_id/work_order_id query params.

## 4. Admin — `/admin/rentals`

`AdminRentalsHub.tsx` (TabbedShell):
- العناصر | تحتاج مراجعة | عقود نشطة | قريبة الانتهاء | متجاوزة | تمديدات معلقة | التصنيفات | جودة البيانات | SEO readiness

داخل `<DashboardLayout>` عبر `<AdminRoute>` (per memory).

## 5. Day Counter + Alerts

`dayCounter.ts`:
- `totalDays(start, end)`, `daysLeft(end, now)`, `overdueDays(end, now)`
- `alertTier`: `safe | t7 | t3 | t1 | expired | overdue`

`RentalDayCounter` يعرض circular badge + tone (emerald/amber/red).

Edge function يومي `rental-expiry-scan`:
- يحدّث statuses
- يكتب events في `rental_order_events`
- ينشئ `notifications` rows عبر wrapper موجود (لا direct insert)

## 6. Renewal / Extension

inline panel (لا dialog) داخل `DashboardRentalOrderDetail`:
- 4 أنواع (full/partial/duration/quantity)
- يكتب `rental_extensions` row + event
- يحدّث order.status='extended' عند الاعتماد

## 7. Public SEO Pages

- `/rentals` — `RentalsPublicCatalog.tsx`
- `/rentals/:slug` — `RentalItemPublic.tsx` (slug = seo_slug)
- `/rentals/category/:slug` — `RentalCategoryPublic.tsx`

استخدام `useSeoPage` + `buildBreadcrumbList` + `buildService` JSON-LD + `ogImageFor({type:'category', title, subtitle})`.
يعرض فقط `is_published && status='approved'`.
Bilingual عبر `<Bi>` و `useBi()` (per memory).
صور WebP < 80KB عبر pipeline الموجود؛ تسمية: `{category}-rental-{city}.webp`.

إضافة المسارات إلى sitemap عبر edge function `sitemap-generator` الحالي.

## 8. Notifications

استخدام `@/modules/notifications` wrapper. أضف 9 أنواع جديدة + ترجمات AR/EN في `i18n/notificationLabels`. in-app + email عبر البنية الحالية. لا WhatsApp/SMS.

## 9. Operations Center

أضف بطاقات داخل `AdminOperationsHub`:
- عقود نشطة / قريبة / متجاوزة
- تمديدات معلقة
- عناصر بلا صور / غير مصنفة / ناقصة البيانات

عبر `services/operationsHub.ts` (counts فقط، لا PII).

## 10. Permissions

- استخدام `user_roles` + `has_role` الموجود
- provider scoping عبر business ownership (نفس نمط `businesses` wrappers)
- public reads gated في RLS بـ `is_published AND status='approved'`
- لا anon GRANT على orders/extensions

## 11. Reference Resolver

تحديث `lookup_by_reference` RPC + `reference-id-architecture.md`:
- RCAT → `/admin/rentals?tab=categories`
- RENT → `/rentals/{slug}` (public) أو dashboard
- RORD → `/dashboard/rentals/orders/{id}`
- REXT → safe null (no standalone route)

## 12. Tests

`src/__tests__/rentalMicroservice1.test.ts`:
- وجود الـ wrappers في barrel
- صحة `dayCounter` (totalDays/daysLeft/overdue/alertTier)
- `pricing.calcTotal` لكل وحدة
- صفحات `/dashboard/rentals` و `/admin/rentals` mounted في `App.tsx`
- public catalog يفلتر `is_published && approved`
- لا `supabase.from('rental_` داخل `src/pages/**` (regex)
- لا UUID-shaped strings تظهر في item/order card render
- SEO: `useSeoPage` مستدعى في public pages
- no bulk publish action

## 13. Validation Steps

- `tsc` (مؤتمت)
- targeted vitest run
- broken-links audit (`scripts/broken-links-audit.mjs`)
- sitemap audit (edge function)
- supabase linter بعد migration
- credits/edge isolation audits غير متأثرة (no credit calls)

## Files (new)

**Migration**: `supabase/migrations/<ts>_rental_microservice.sql`

**Module**: ~16 files تحت `src/modules/rentals/**`

**Pages**: 4 dashboard + 1 admin hub + 3 public = 8

**Tests**: 1 file

**Routing**: تحديث `src/App.tsx` للمسارات + `AdminRoute` wrapper

**Docs**: `docs/rentals-system-overview.md` + تحديث `docs/reference-id-architecture.md`

**Memory**: `mem://features/rentals-microservice`

## Out of Scope (صراحة)

- لا دمج تلقائي مع `procurement_*`
- لا تعديل على `contracts` schema
- لا تعديل على `work_orders` schema (نقرأ ربط فقط)
- لا WhatsApp/SMS
- لا bulk publish
- لا payment/invoice integration هذه المرحلة (deposit field فقط، بدون gateway)

## Deliverable

نظام تأجير شغّال end-to-end: provider يضيف عنصر → admin يعتمد → ينشر في `/rentals` → عميل/مزود ينشئ RORD → عداد أيام + تنبيهات → تمديد/تجديد → إغلاق. جاهزية ≈ MVP قابل للإطلاق التجريبي.
