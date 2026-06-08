---
name: Rentals Microservice
description: Standalone rental domain (RENTAL-MICROSERVICE-1) for construction equipment with day counter, extensions, RLS, SEO
type: feature
---
Domain: `src/modules/rentals/**` — services per entity, pure utils for dayCounter + pricing, bilingual constants.
Tables (all prefixed `rental_`): categories (RCAT-), items (RENT-), orders (RORD-), extensions (REXT-), order_events. Sequences start 1,000,000. Status enums + roll function `rental_orders_roll_status()`.
RLS: categories public on `is_active`; items public on `is_published AND status='approved'`; orders/extensions/events provider-or-customer-or-admin scoped. No anon GRANT on orders/extensions/events.
Pages: `/dashboard/rentals` (provider), `/admin/rentals` (moderation + ops counts), `/rentals`, `/rentals/category/:slug`, `/rentals/:slug` (public, approved-only).
Day counter tiers: safe / t7 / t3 / t1 / expired / overdue. Use `<RentalDayCounter>` + `<RentalStatusBadge>`.
No popups: provider Add Item is inline Card. No bulk publish (admin approves one-by-one). No payment/invoice integration yet — deposit field only.
Tests: `src/__tests__/rentalMicroservice1.test.ts`.