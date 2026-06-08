---
name: Assets Microservice
description: ASSET-MANAGEMENT-MICROSERVICE-1 — fleet/equipment management with maintenance, inspections, utilization, alerts; never public
type: feature
---
Domain: `src/modules/assets/**` — services per entity, pure utils (utilization, lifecycle), bilingual constants.
Tables (all prefixed `asset_`): categories (ACAT-), assets (AST-), maintenance (AMNT-), inspections (AINS-), utilization, alerts (AALR-), rental_links (M2M with rental_items). Sequences start 1,000,000.
Status enums: asset_status (available/rented/reserved/maintenance/inspection/retired), maintenance_status, maintenance_kind, inspection_frequency, inspection_result. Roll fn `assets_roll_status()` + counts RPC `assets_ops_counts()`.
RLS: every table owner-or-admin scoped (joins businesses by user_id). No anon GRANT anywhere. Categories visible to authenticated only.
**NEVER public**: no public routes, no SEO pages, no sitemap entries. Only rental offerings are public — assets are the underlying fleet.
Pages: `/dashboard/assets` (provider hub with maintenance/inspections forms), `/admin/assets` (admin oversight + ops snapshot). Both wrapped in DashboardLayout, useNoIndex on admin.
Ops integration: `AssetOpsCard` lives in admin Operations Hub under the "Assets" tab. Surfaces maintenance overdue/due-soon, inspections overdue, low utilization (<25%), open alerts.
Tests: `src/__tests__/assetMicroservice1.test.ts` (12/12).
No popups. Inline forms only. No payment integration (cost field on maintenance only).