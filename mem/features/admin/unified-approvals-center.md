---
name: Unified Approvals Center
description: Three admin surfaces (approvals, businesses/entities, join requests) share a cross-link banner so they feel like one workflow
type: feature
---
`/admin/approvals`, `/admin/businesses`, `/admin/entity-access-requests` are pages of one workflow. Each renders `<UnifiedApprovalsCenterBanner />` (from `@/components/admin/UnifiedApprovalsCenterBanner`) right after its `<AdminPageHeader />`. The banner highlights the active surface and links to the other two — no duplicate header text needed. Keep heavy CRUD on `AdminBusinesses`; keep the unified inbox + bulk + exports on `AdminApprovalsCenter`. Do not merge the 2,800-line businesses page into approvals — defer that to a separate refactor that first splits BusinessTable / BusinessFiltersBar / BusinessCreateInline.