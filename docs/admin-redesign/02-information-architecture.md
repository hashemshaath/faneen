# Information Architecture — Admin & Dashboard Redesign Phase 1

> Generated: June 2026 | New structure: 7 canonical admin groups, consolidated dashboard

---

## 1. Philosophy

**One source of truth per data domain.** If a concept (e.g., "Contracts") appears in both admin and dashboard, the admin page is the **source** and the dashboard page is the **provider view** (filtered to their own data). No page should manage the same data from two different places.

**Hub + Spoke model:** Every major domain gets one hub page with tabs/sections. Deep links (spokes) are reachable via drawer, inline expansion, or direct URL but do not appear in the sidebar.

---

## 2. Admin Structure — 7 Canonical Groups

The current `ADMIN_NAV_GROUPS` registry already defines these 7 groups. This document ratifies them as the final architecture and maps every existing page to its new home.

### Group 1: Overview (نظرة عامة)

| Current Page | Lines | Decision | New Home |
|--------------|-------|----------|----------|
| `AdminKpis` | 245 | **Keep** | `/admin/kpis` |
| `AdminOperations` | 960 | **Keep** (as hub) | `/admin/operations` |
| `AdminActivityLog` | 815 | **Keep** | `/admin/activity-log` |
| `AdminBulkReferenceTriage` | 743 | **Keep** | `/admin/ref/triage` |
| `AdminOperationsConsole` | 550 | **Merge** into `AdminOperations` tab | `/admin/operations` → tab |
| `AdminOperationsCenterUnified` | 176 | **Merge** into `AdminOperations` tab | `/admin/operations` → tab |
| `AdminOperationsHub` | 22 | **Delete** — redirect to `/admin/operations` | — |
| `AdminOperationsAssets` | 17 | **Delete** — redirect to `/admin/operations` | — |
| `AdminOperationsRentals` | 23 | **Delete** — redirect to `/admin/operations` | — |
| `AdminDiagnostics` | 256 | **Move** to System & Governance | `/admin/system/diagnostics` |

### Group 2: Operations (العمليات)

| Current Page | Lines | Decision | New Home |
|--------------|-------|----------|----------|
| `AdminQuoteOperations` | 759 | **Keep** (as hub) | `/admin/quote-operations` |
| `AdminQuoteRequests` | 201 | **Merge** into `AdminQuoteOperations` tab | `/admin/quote-operations` → tab |
| `AdminQuoteRequestDetails` | 1,104 | **Convert** to drawer/detail view | Reached from `AdminQuoteOperations` |
| `AdminLeadRequests` | 514 | **Merge** into new `AdminLeads` | `/admin/leads` |
| `AdminProviderLeads` | 293 | **Merge** into new `AdminLeads` | `/admin/leads` |
| `AdminServiceRequests` | 318 | **Keep** | `/admin/service-requests` |
| `AdminServiceActivations` | 528 | **Keep** | `/admin/service-activations` |
| `AdminContracts` | 179 | **Keep** (as hub) | `/admin/contracts` |
| `AdminContractAnalytics` | 545 | **Merge** into `AdminContracts` tab | `/admin/contracts` → tab |
| `AdminContractCreate` | 173 | **Convert** to inline form | Reached from `AdminContracts` |
| `AdminContractTemplates` | 429 | **Keep** | `/admin/contract-templates` |
| `AdminApprovalsCenter` | 16 | **Delete** — redirect to `/admin/identity` | — |
| `AdminContactMessages` | 1,609 | **Keep** (as hub) | `/admin/contact-messages` |
| `AdminContactCenter` | 105 | **Merge** into `AdminContactMessages` tab | `/admin/contact-messages` → tab |
| `AdminContactInboxSettings` | 469 | **Merge** into `AdminContactMessages` tab | `/admin/contact-messages` → tab |
| `AdminContactAuditLog` | 285 | **Merge** into `AdminContactMessages` tab | `/admin/contact-messages` → tab |
| `AdminContactSlaDashboard` | 232 | **Merge** into `AdminContactMessages` tab | `/admin/contact-messages` → tab |
| `AdminContactNotificationLog` | 290 | **Merge** into `AdminContactMessages` tab | `/admin/contact-messages` → tab |
| `AdminProviderReview` | 512 | **Keep** | `/admin/provider-review` |
| `AdminProviderGrowth` | 125 | **Keep** | `/admin/provider-growth` |
| `AdminProviderGrowthQueue` | 203 | **Merge** into `AdminProviderGrowth` tab | `/admin/provider-growth` → tab |
| `AdminOwnershipTransferRequests` | 618 | **Keep** | `/admin/ownership-transfer-requests` |

### Group 3: Users & Entities (المستخدمون والكيانات)

| Current Page | Lines | Decision | New Home |
|--------------|-------|----------|----------|
| `AdminIdentity` | 841 | **Keep** (as hub) | `/admin/identity` |
| `AdminUsers` | 2,790 | **Keep** but split into sub-components | `/admin/users` (hidden in sidebar, deep link) |
| `AdminUserDetail` | 336 | **Keep** | `/admin/users/:id` (deep link) |
| `AdminBusinesses` | 3,069 | **Keep** but split into sub-components | `/admin/businesses` (hidden in sidebar, deep link) |
| `AdminBusinessVisibility` | 125 | **Keep** | `/admin/business-visibility` |
| `AdminEntityAccessRequests` | 558 | **Keep** | `/admin/entity-access-requests` (hidden) |
| `AdminAccessManagement` | 504 | **Keep** | `/admin/access-management` |
| `AdminSystemAccess` | 1,140 | **Keep** | `/admin/system-access` |
| `AdminMembershipRejections` | 517 | **Merge** into `AdminMemberships` | `/admin/memberships` → tab |
| `AdminBrandRequests` | 436 | **Keep** | `/admin/brand-requests` |

### Group 4: Content & Directory (المحتوى والدليل)

| Current Page | Lines | Decision | New Home |
|--------------|-------|----------|----------|
| `AdminTaxonomyCenter` | 17 | **Delete** — redirect to `/admin/taxonomy` | — |
| `AdminLegacyTaxonomyReplaced` | 43 | **Delete** — redirect to `/admin/taxonomy` | — |
| `AdminCatalogGovernance` | 113 | **Keep** | `/admin/catalog-governance` |
| `AdminCatalogGovernanceQueue` | 184 | **Merge** into `AdminCatalogGovernance` tab | `/admin/catalog-governance` → tab |
| `AdminBrands` | 476 | **Keep** | `/admin/brands` |
| `AdminBrandDetail` | 1,278 | **Keep** | `/admin/brands/:id` (deep link) |
| `AdminPrivateSectors` | 298 | **Keep** | `/admin/private-sectors` |
| `AdminHomeSectors` | 327 | **Keep** | `/admin/home-sectors` |
| `AdminHomeFaq` | 228 | **Keep** | `/admin/home-faq` |
| `AdminHelpCenter` | 444 | **Keep** | `/admin/help` |
| `AdminPartnerShowcase` | 596 | **Keep** | `/admin/partner-showcase` |
| `AdminShowcase` | 292 | **Delete** — redirect to `/admin/partner-showcase` | — |
| `AdminSectorSeo` | 358 | **Keep** | `/admin/sector-seo` |
| `AdminClientSitesMonitoring` | 427 | **Keep** | `/admin/client-sites` |
| `AdminLocationsHub` | 105 | **Delete** — redirect to `/admin/locations` | — |
| `AdminLocationsCatalog` | 210 | **Merge** into `AdminLocations` tab | `/admin/locations` → tab |
| `AdminBusinessServiceAreas` | 195 | **Merge** into `AdminLocations` tab | `/admin/locations` → tab |
| `AdminBusinessCoordinates` | 169 | **Merge** into `AdminLocations` tab | `/admin/locations` → tab |
| `AdminAssets` | 102 | **Keep** | `/admin/assets` |
| `AdminAssetOverrides` | 75 | **Merge** into `AdminAssets` tab | `/admin/assets` → tab |
| `AdminRentals` | 220 | **Keep** | `/admin/rentals` |
| `AdminBarcodeRegistry` | 1,336 | **Keep** | `/admin/barcode-registry` |
| `AdminContractTemplates` | 429 | **Keep** | `/admin/contract-templates` |

### Group 5: System & Governance (النظام والحوكمة)

| Current Page | Lines | Decision | New Home |
|--------------|-------|----------|----------|
| `AdminIdentityCenter` | 320 | **Keep** (expand in Phase 2) | `/admin/system/identity` |
| `AdminSystemSettings` | 658 | **Keep** | `/admin/system-settings` |
| `AdminSystemSettingsHub` | 22 | **Delete** — redirect to `/admin/system-settings` | — |
| `AdminBranding` | 722 | **Delete** — merge into `AdminIdentityCenter` | Redirect to `/admin/system/identity` |
| `AdminIntegrations` | 607 | **Keep** | `/admin/integrations` |
| `AdminGoogleServices` | 161 | **Merge** into `AdminIntegrations` tab | `/admin/integrations` → tab |
| `AdminAuditLog` | 244 | **Keep** | `/admin/audit-log` |
| `AdminDiagnostics` | 256 | **Keep** (moved from Overview) | `/admin/diagnostics` (hidden) |
| `AdminCronRuns` | 830 | **Keep** | `/admin/cron-runs` |
| `AdminAiCenter` | — | **Create** (AI settings hub) | `/admin/ai-center` |
| `AdminApiSettings` | 711 | **Keep** | `/admin/api-settings` |
| `AdminApiDocs` | 6 | **Delete** — merge content into `AdminApiSettings` | — |
| `AdminEmailCenter` | 67 | **Keep** (as hub) | `/admin/email-center` |
| `AdminEmailDeliverability` | 594 | **Merge** into `AdminEmailCenter` tab | `/admin/email-center` → tab |
| `AdminEmailHub` | 20 | **Delete** — redirect to `/admin/email-center` | — |
| `AdminAnalyticsSettings` | 590 | **Keep** | `/admin/analytics-settings` |
| `AdminDataEnrichmentGovernance` | 240 | **Keep** | `/admin/data-enrichment-governance` |
| `AdminSitemapStatus` | 671 | **Keep** | `/admin/sitemap-status` |
| `AdminSiteAudit` | 658 | **Keep** | `/admin/site-audit` |
| `AdminPerformance` | 236 | **Keep** | `/admin/performance` |
| `AdminAbExperiments` | 531 | **Move** to Analytics | `/admin/ab-experiments` |

### Group 6: Analytics (التحليلات)

| Current Page | Lines | Decision | New Home |
|--------------|-------|----------|----------|
| `AdminProviderAnalytics` | 299 | **Keep** | `/admin/provider-analytics` |
| `AdminProviderGrowth` | 125 | **Keep** | `/admin/provider-growth` |
| `AdminMarketAnalytics` | 466 | **Keep** | `/admin/market-analytics` |
| `AdminMembershipEvents` | 146 | **Merge** into `AdminMemberships` tab | `/admin/memberships` → tab |
| `AdminConversionOptimization` | 156 | **Keep** | `/admin/conversion-optimization` |
| `AdminReports` | 256 | **Keep** (as hub) | `/admin/reports` |
| `AdminReportsHub` | 20 | **Delete** — redirect to `/admin/reports` | — |
| `AdminAbExperiments` | 531 | **Keep** | `/admin/ab-experiments` |
| `AdminDataEnrichment` | 1,509 | **Keep** | `/admin/data-enrichment` |
| `AdminPdfExportAudit` | 368 | **Keep** | `/admin/pdf-exports` (hidden) |
| `AdminPdfVisualQa` | 551 | **Keep** | `/admin/pdf-visual-qa` (hidden) |

### Group 7: Finance (المالية)

| Current Page | Lines | Decision | New Home |
|--------------|-------|----------|----------|
| `AdminMemberships` | 1,466 | **Keep** (as hub) | `/admin/memberships` |
| `AdminMembershipPayments` | 751 | **Merge** into `AdminMemberships` tab | `/admin/memberships` → tab |
| `AdminMembershipPlanModules` | 226 | **Merge** into `AdminMemberships` tab | `/admin/memberships` → tab |
| `AdminMembershipEvents` | 146 | **Merge** into `AdminMemberships` tab | `/admin/memberships` → tab |
| `AdminMembershipRejections` | 517 | **Merge** into `AdminMemberships` tab | `/admin/memberships` → tab |
| `AdminProviderSubscriptions` | 402 | **Keep** | `/admin/provider-subscriptions` |

---

## 3. Dashboard Structure

Dashboard is role-based (Provider / User / Admin). The current structure is already well-organized. Changes are minimal:

### 3.1 Provider Dashboard

| Current | Decision | Notes |
|---------|----------|-------|
| `DashboardOverview` | **Keep** | Thin wrapper, acceptable |
| `DashboardBusinessEdit` | **Keep** | Split into sections in Phase 6 |
| `DashboardServices`, `DashboardBrands`, `DashboardPortfolio`, `DashboardProjects`, `DashboardPromotions` | **Keep** | Business profile group |
| `DashboardSites`, `DashboardPrivateSectors` | **Keep** | |
| `DashboardLeads`, `DashboardBookings`, `DashboardClients`, `DashboardRfq` | **Keep** | Sales group |
| `DashboardContracts`, `DashboardWorkOrders`, `DashboardWarranties` | **Keep** | Operations group |
| `DashboardRentals`, `DashboardRentalsCalendar`, `DashboardRentalsAnalytics`, `DashboardAssets` | **Keep** | Rentals group |
| `DashboardProviderMembership`, `DashboardInstallments`, `DashboardLoyalty` | **Keep** | Membership group |
| `DashboardMessages`, `DashboardNotifications` | **Keep** | Communication |
| `DashboardProfile`, `DashboardSettings`, `DashboardStaffCenter`, `DashboardTeamAccess` | **Keep** | Settings |

### 3.2 User Dashboard

| Current | Decision | Notes |
|---------|----------|-------|
| `DashboardOverview` | **Keep** | |
| `DashboardEntities`, `DashboardMyRequests`, `DashboardSites`, `DashboardContracts`, `DashboardBookings`, `DashboardInstallments` | **Keep** | Activity group |
| `DashboardMessages`, `DashboardNotifications` | **Keep** | Communication |
| `DashboardBookmarks` | **Keep** | |
| `DashboardProfile`, `DashboardSettings` | **Keep** | Settings |

---

## 4. Shortcuts Table

Every page that is merged or deleted needs a redirect/shortcut preserved for bookmarks and external links.

| Old Route | Redirects To | Status |
|-----------|--------------|--------|
| `/admin/approvals` | `/admin/identity` | 301 |
| `/admin/operations-hub` | `/admin/operations` | 301 |
| `/admin/operations-assets` | `/admin/operations` | 301 |
| `/admin/operations-rentals` | `/admin/operations` | 301 |
| `/admin/quote-requests` | `/admin/quote-operations` | 301 |
| `/admin/contact-center` | `/admin/contact-messages` | 301 |
| `/admin/contact-inbox-settings` | `/admin/contact-messages` | 301 |
| `/admin/contact-audit-log` | `/admin/contact-messages` | 301 |
| `/admin/contact-sla-dashboard` | `/admin/contact-messages` | 301 |
| `/admin/contact-notification-log` | `/admin/contact-messages` | 301 |
| `/admin/membership-payments` | `/admin/memberships` | 301 |
| `/admin/membership-plan-modules` | `/admin/memberships` | 301 |
| `/admin/membership-events` | `/admin/memberships` | 301 |
| `/admin/membership-rejections` | `/admin/memberships` | 301 |
| `/admin/provider-growth-queue` | `/admin/provider-growth` | 301 |
| `/admin/locations/catalog` | `/admin/locations` | 301 |
| `/admin/locations/service-areas` | `/admin/locations` | 301 |
| `/admin/locations/business-coordinates` | `/admin/locations` | 301 |
| `/admin/system-settings-hub` | `/admin/system-settings` | 301 |
| `/admin/branding` | `/admin/system/identity` | 301 |
| `/admin/api-docs` | `/admin/api-settings` | 301 |
| `/admin/email-hub` | `/admin/email-center` | 301 |
| `/admin/email-deliverability` | `/admin/email-center` | 301 |
| `/admin/reports-hub` | `/admin/reports` | 301 |
| `/admin/seo-hub` | `/admin/sitemap-status` | 301 |
| `/admin/taxonomy-center` | `/admin/taxonomy` | 301 |
| `/admin/legacy-taxonomy` | `/admin/taxonomy` | 301 |
| `/admin/showcase` | `/admin/partner-showcase` | 301 |
| `/admin/contracts-hub` | `/admin/contracts` | 301 |
| `/admin/memberships-hub` | `/admin/memberships` | 301 |

---

## 5. Route Registry Maintenance Rules

1. **Every route in `App.tsx` MUST have a matching entry in `ADMIN_NAV_GROUPS`** (or be explicitly flagged `hiddenInSidebar`)
2. **No orphaned routes** — if a page is deleted, its `<Route>` must be replaced with a `<Navigate>` or removed
3. **Breadcrumb generation** derives from `ADMIN_NAV_GROUPS` + `findAdminNavItem()` — no manual breadcrumb arrays
4. **Command palette** (`Cmd+K`) sources from `ADMIN_NAV_ITEMS` flat list — always in sync with sidebar
5. **Favorites** pin routes that exist in the registry — invalid favorites auto-clean on load

---

*End of Information Architecture. Prepared for Phase 2 (Design System & Identity Center Core).*
