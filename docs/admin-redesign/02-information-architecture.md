# Admin Redesign — Phase 1 / Doc 2: New Information Architecture

## 1. Top-level groups (7)

```
1. Overview              /admin
2. Operations            /admin/operations/*
3. Users & Entities      /admin/entities/*
4. Content & Directory   /admin/content/*
5. System & Governance   /admin/system/*
6. Analytics             /admin/analytics/*
7. Finance               /admin/finance/*
```

Sidebar shows these 7 group headers; each expands to ≤8 items. Anything
more is reachable via the in-sidebar search, command palette (Cmd+K), or
as a tab inside a hub.

## 2. Group → items

### 1. Overview
- Dashboard (`/admin`)
- Activity log (`/admin/activity-log`)
- Diagnostics (`/admin/diagnostics`)
- Performance (`/admin/performance`)

### 2. Operations
- Operations center (`/admin/operations`) — unified hub (assets/rentals as tabs)
- Approvals (`/admin/approvals`)
- Contracts (`/admin/contracts`) — hub with analytics/templates/create as tabs
- Leads & quotes (`/admin/operations/leads-quotes`) — quote-requests + lead-requests + provider-leads + quote-ops as tabs
- Procurement / RFQ (linked from operations center)
- Cron runs (`/admin/cron-runs`)

### 3. Users & Entities
- Users (`/admin/users`)
- Businesses (`/admin/businesses`)
- Provider review (`/admin/provider-review`) — hub
- Provider growth (`/admin/provider-growth`)
- Ownership transfer requests (`/admin/ownership-transfer-requests`)
- Entity access requests (`/admin/entity-access-requests`)
- Business visibility (`/admin/business-visibility`)
- Client sites monitoring (`/admin/client-sites`)

### 4. Content & Directory
- Taxonomy center (`/admin/taxonomy`) — categories, tags, types
- Sectors (`/admin/home-sectors`, `/admin/private-sectors`)
- Brands (`/admin/brands`)
- Help center (`/admin/help`)
- Blog (admin section)
- Home FAQ (`/admin/home-faq`)
- Partner showcase (`/admin/partner-showcase`)
- Showcase submissions (`/admin/showcase`)
- Provider landing (under provider-review tab)

### 5. System & Governance
- **Identity center** (`/admin/system/identity`) — single source for tokens (Phase 2)
- System settings (`/admin/system-settings`)
- System access (`/admin/system/access`) — merged `access-management` + `system-access`
- Access violations / audit log (`/admin/audit-log`)
- Integrations (`/admin/integrations`)
- Google services (`/admin/integrations/google`)
- AI center (`/admin/ai-center`)
- API docs (`/admin/api-docs`)
- SEO hub (`/admin/sitemap-status`) — sitemap, audit, sector SEO, indexnow as tabs
- Email center (`/admin/email-center`) — deliverability as tab
- Data enrichment (`/admin/data-enrichment`) — governance as tab
- Catalog governance (`/admin/catalog-governance`)

### 6. Analytics
- KPIs (`/admin/kpis`)
- Market analytics (`/admin/market-analytics`)
- Conversion optimization (`/admin/conversion-optimization`)
- A/B experiments (`/admin/ab-experiments`)
- Contract analytics (link → contracts hub tab)
- Provider analytics (link → provider-review tab)

### 7. Finance
- Memberships (`/admin/memberships`) — hub (payments, events, rejections, plan modules, provider subs as tabs)
- Contact / Messages (`/admin/contact-messages`) — center with settings/audit/sla/notifications as tabs
- PDF export audit (`/admin/pdf-export-audit`)

## 3. Page-by-page disposition

`Status` ∈ { **KEEP**, **MERGE**, **DELETE-AFTER-INVENTORY**, **TAB-OF**, **SPLIT** }

| Current page                          | Status                      | New home / target                                  |
| ------------------------------------- | --------------------------- | -------------------------------------------------- |
| AdminBranding                         | MERGE                       | → AdminIdentity (system/identity)                  |
| AdminContactMessages                  | DELETE-AFTER-INVENTORY      | replaced by AdminContactCenter                     |
| AdminContactInboxSettings             | DELETE-AFTER-INVENTORY      | now `contact-messages?tab=settings`                |
| AdminContactAuditLog                  | DELETE-AFTER-INVENTORY      | now `contact-messages?tab=audit`                   |
| AdminContactSlaDashboard              | DELETE-AFTER-INVENTORY      | now `contact-messages?tab=sla`                     |
| AdminContactNotificationLog           | DELETE-AFTER-INVENTORY      | now `contact-messages?tab=notifications`           |
| AdminMemberships                      | TAB-OF                      | memberships hub                                    |
| AdminMembershipEvents                 | TAB-OF                      | `memberships?tab=events`                           |
| AdminMembershipRejections             | TAB-OF                      | `memberships?tab=rejections`                       |
| AdminMembershipPayments               | TAB-OF                      | `memberships?tab=payments`                         |
| AdminMembershipPlanModules            | TAB-OF                      | `memberships?tab=plan-modules`                     |
| AdminProviderSubscriptions            | TAB-OF                      | `memberships?tab=providers`                        |
| AdminApiSettings                      | DELETE-AFTER-INVENTORY      | now `system-settings?tab=api`                      |
| AdminEmailCenter                      | DELETE-AFTER-INVENTORY      | replaced by AdminEmailHub                          |
| AdminEmailDeliverability              | TAB-OF                      | `email-center?tab=deliverability`                  |
| AdminSiteAudit                        | TAB-OF                      | `sitemap-status?tab=audit`                         |
| AdminSectorSeo                        | TAB-OF                      | `sitemap-status?tab=sector-seo`                    |
| AdminProviderAnalytics                | TAB-OF                      | `provider-review?tab=analytics`                    |
| AdminProviderLanding                  | TAB-OF                      | `provider-review?tab=landing`                      |
| AdminLegacyTaxonomyReplaced           | DELETE-AFTER-INVENTORY      | redirects already in place                         |
| AdminOperationsHub                    | MERGE                       | → AdminOperationsCenterUnified                     |
| AdminOperationsConsole                | MERGE                       | → AdminOperationsCenterUnified                     |
| AdminOperations                       | MERGE                       | → AdminOperationsCenterUnified                     |
| AdminOperationsAssets                 | TAB-OF                      | operations center → assets tab                     |
| AdminOperationsRentals                | TAB-OF                      | operations center → rentals tab                    |
| AdminBusinesses                       | SPLIT                       | BusinessTable / BusinessFilters / BusinessCreateInline / BusinessDetailDrawer |
| AdminUsers                            | SPLIT                       | UserTable / UserFilters / UserDetailDrawer         |
| AdminAccessManagement                 | MERGE                       | → `/admin/system/access`                           |
| AdminSystemAccess                     | MERGE                       | → `/admin/system/access`                           |
| All other admin pages (~70)           | KEEP                        | adopt shared primitives in Phase 5                 |

**Targeted deletions for Phase 7:** ~22 files. Each must pass a `knip`-style second pass before removal (Phase C3 discipline).

## 4. Shortcuts (single source of truth)

A page may appear in multiple groups **only as a Shortcut** — a sidebar
leaf that links to the canonical route. The page itself lives once.
Example: "Provider growth" appears under Operations (shortcut) and lives
under Users & Entities.

Shortcuts are visually marked (chevron + smaller label) and excluded
from breadcrumb generation.

## 5. Acceptance for IA

- Sidebar ≤ 7 groups, each ≤ 8 items visible.
- Every page reachable in ≤ 2 clicks from the dashboard.
- Every `?tab=` URL deep-linkable and shareable.
- Search/Cmd+K resolves to the canonical page (never to a shortcut).