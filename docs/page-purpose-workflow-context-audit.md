# Page Purpose & Workflow Context Audit

_Phase: PAGE-PURPOSE-WORKFLOW-CONTEXT-AUDIT-1_
_Source of truth_: `src/App.tsx` (179 `<Route>` declarations as of audit run).

## Legend

- **Audience**: `public | customer | provider | staff | manager | admin | super_admin`
- **Status**: `core | supporting | utility | admin-only | hidden | deprecated | needs-integration`
- **Risk**: `OK | unclear | orphan | duplicate | missing-entry | missing-next | stale | wrong-audience`

## A. Public / Marketing surface

| Route | Component | Audience | Domain | Purpose | From → Next | Nav source | Status | Risk |
|---|---|---|---|---|---|---|---|---|
| `/` | `Index` | public | discovery | Home; brand + sector entry | Search engines → `/search`, `/sectors` | header | core | OK |
| `/search` | `Search` | public | discovery | Provider/service search | `/` → provider profile / `/quote` | header, Cmd+K | core | OK |
| `/sectors`, `/sectors/all` | `SectorsHub`/`SectorsIndex` | public | discovery | Sector hub | `/` → `/sectors/:slug` | header | core | OK |
| `/sectors/:slug`, `/sectors/:sector/:city` | `SectorLanding`/`SectorCity` | public | SEO/discovery | Sector + city landings | Search/SEO → provider profile | SEO sitemap | core | OK |
| `/sector/:slug` | `SectorBrief` | public | SEO | Sector brief (short copy) | Internal links | sitemap | supporting | duplicate-candidate (overlaps `SectorLanding`) |
| `/services`, `/services/:slug` | `Services`/`ServiceDetail` | public | discovery | Service catalogue | `/sectors/...` → provider profile | header, footer | core | OK |
| `/brands`, `/brands/:slug` | `BrandsCatalog`/`BrandDetail` | public | discovery | System & supplier brand pages | `/profile-systems` → provider | footer | supporting | OK |
| `/profile-systems`, `/profile-systems/:slug`, `/profile-systems/category/:cat` | `ProfileSystems`/`Detail` | public | discovery | Aluminum/glass system specs | `/sectors/...` → provider | header | core | OK |
| `/categories`, `/categories/:slug` | `Categories` | public | discovery | Service categories index | `/` → search | header | supporting | OK |
| `/projects`, `/projects/:id` | `Projects`/`ProjectDetail` | public | portfolio | Portfolio showcase | `/` → provider profile | header | core | OK |
| `/showcase` | `Showcase` | public | portfolio | Curated showcase | Internal | footer | supporting | OK |
| `/compare`, `/compare-profiles` | `Compare`/`CompareProfiles` | public | discovery | Provider/system comparison | Search → result | hidden (deep link) | supporting | missing-entry (no nav surface from search results) |
| `/blog`, `/blog/:slug` | `Blog`/`BlogPost` | public | content | Editorial blog | `/` → article | header | core | OK |
| `/guides` | `Guides` | public | content | Industry guides | `/` → guide | header | supporting | OK |
| `/offers` | `Offers` | public | growth | Active promotions | `/` → provider | header | supporting | OK |
| `/quote` | `Quote` | public/customer | quotation | Quote request entry | Provider profile → `/quote` → success | provider profile CTA | core | OK |
| `/membership` | `Membership` | public/provider | growth | Tier pricing | `/for-providers` → checkout | header | core | OK |
| `/for-providers`, `/join-as-provider` | `ForProviders` | public | growth | Provider landing | Ads/SEO → `/auth?mode=signup` | header | core | OK |
| `/about`, `/contact`, `/privacy`, `/terms` | static | public | system | Standard pages | footer | footer | utility | OK |
| `/:username` | `UsernameResolver` → `PublicUserProfile`/`BusinessProfile` | public | identity | Vanity URL → profile | Search/share → profile | shared links | core | OK |

## B. Auth & onboarding

| Route | Component | Audience | Purpose | Status |
|---|---|---|---|---|
| `/auth` | `Auth` | public | Login / signup | core |
| `/reset-password` | `ResetPassword` | public | Password reset finalize | utility |
| `/onboarding` | `Onboarding` | new user | Post-signup wizard | core |
| `/invite/:token` | `InviteAccept` | invitee | Business invite acceptance | utility |
| `/staff-invite/:token` | `StaffInviteAccept` | invitee | Staff invite acceptance | utility |
| `/forbidden`, `/diagnostics`, `/unsubscribe` | static | any | Error & preferences | utility |

## C. Customer / token routes

| Route | Component | Audience | Purpose | Nav source | Risk |
|---|---|---|---|---|---|
| `/q/:code` | `QSlugDispatcher` | customer/public | Universal short-link dispatcher (barcode/quote/site) | Print/QR | OK |
| `/s/:token` | `PublicSiteScan` | customer | Site asset barcode scan | QR | OK |
| `/client/:refId` | `CustomerProjectPortal` | customer | Tracking portal (status, photos, sign-off) | Email/SMS link | core |
| `/v/c/:number`, `/v/b/:username` | `VerifyContract`/`VerifyBusiness` | public/customer | Verification microsites | Shared link / badge | supporting |
| `/r/:refId` | `ReferenceResolver` | any auth | Universal ref-id resolver | Notifications, search, badges | core |

## D. Dashboard (provider + staff + customer)

| Route | Component | Audience | Domain | Purpose | Next action | Status | Risk |
|---|---|---|---|---|---|---|---|
| `/dashboard` | `DashboardOverview` | any auth | overview | Personalised home + KPIs | Quick Create → contracts/work-orders | core | OK |
| `/dashboard/diagnostics` | `DashboardAccountDiagnostics` | any auth | system | Self-serve account health | Resolve → settings | utility | OK |
| `/dashboard/no-access` | `DashboardNoAccess` | any auth | system | Fallback when route gated | Choose path | utility | OK |
| `/dashboard/profile` | `DashboardProfile` | any auth | identity | Edit personal profile | Save → overview | core | OK |
| `/dashboard/communication-preferences` | settings | any auth | system | Toggle notifications | Save | utility | OK |
| `/dashboard/business-edit` | `DashboardBusinessEdit` | provider/manager | business directory | Edit live business profile | Save → publish | core | OK |
| `/dashboard/business-completion` | `DashboardBusinessCompletion` | provider | business directory | Completion checklist | Each gap → `business-edit` | supporting | OK |
| `/dashboard/business-draft` | `DashboardBusinessDraft` | provider | business directory | Pre-publish draft | Submit → `/admin/provider-review` queue | supporting | OK |
| `/dashboard/contracts` | `DashboardContracts` | provider/manager | contracts | Contracts list | Open → `/contracts/:id` or `/contracts` | core | OK |
| `/contracts`, `/contracts/:id` | `Contracts`/`ContractDetail` | provider/customer | contracts | Customer-facing contract surface | Sign → active | core | OK |
| `/dashboard/work-orders`, `/overview`, `/board`, `/:refId` | work order suite | provider/staff | work orders / production | WO list, overview, kanban, detail | WO detail → procurement / production | core | OK |
| `/dashboard/procurement`, `/:id` | procurement suite | provider/manager | procurement | RFQ → quote → award → PO | Detail → award → contract | core | OK |
| `/dashboard/rfq`, `/inbox`, `/:id` | RFQ suite | provider | procurement/quotations | Provider quote inbox & detail | Quote → contract draft | core | OK |
| `/dashboard/quotes` _(if present via RFQ)_ | — | provider | quotations | Provider quote tracking | Win → contract | core | OK |
| `/dashboard/operations` | `DashboardOperations` | provider/manager | operations | Daily operations snapshot | Drill into work orders | supporting | duplicate-candidate vs `operations-center` |
| `/dashboard/operations/feed` | `DashboardOperationsFeed` | provider/manager | operations | Realtime activity feed | Open ref → detail | supporting | OK |
| `/dashboard/operations-center` | `DashboardOperationsCenter` | provider/manager | observability | Health, integrity, alerts | Run check → resolve | core | OK |
| `/dashboard/analytics`, `/contract-analytics` | analytics | provider | analytics | Provider analytics | Export | supporting | OK |
| `/dashboard/leads`, `/clients`, `/provider/leads`, `/provider/leads/:id` | sales | provider | sales | Pipeline + lead detail | Convert → quote | core | OK |
| `/dashboard/my-requests`, `/my-requests/:id` | customer-side | customer | quotations | Requests sent to providers | Open → status | core | OK |
| `/dashboard/bookings` | `DashboardBookings` | customer/provider | customer XP | Appointments | Manage | supporting | OK |
| `/dashboard/warranties` | `DashboardWarranties` | provider | customer XP | Warranty registry | Open warranty | supporting | OK |
| `/dashboard/reviews` | `DashboardReviews` | provider | customer XP | Reviews & responses | Reply | supporting | OK |
| `/dashboard/promotions` | `DashboardPromotions` | provider | growth | Promo manager | Create | supporting | OK |
| `/dashboard/portfolio`, `/services`, `/profile-systems` (admin) | catalog | provider/admin | catalog | Catalog management | Edit | supporting | OK |
| `/dashboard/badge` | `DashboardBadge` | provider | growth | Verified badge assets | Copy snippet | utility | OK |
| `/dashboard/loyalty`, `/loyalty-store` | loyalty | customer/provider | growth | Loyalty programme | Redeem | supporting | OK |
| `/dashboard/installments` | `DashboardInstallments` | customer/provider | finance | BNPL tracking | View plan | supporting | OK |
| `/dashboard/messages`, `/notifications`, `/bookmarks` | inbox | any auth | comms | Inbox surfaces | Open → entity | core | OK |
| `/dashboard/settings`, `/settings/staff` | settings | provider/manager | system | Org settings & staff | Edit | core | OK |
| `/dashboard/private-sectors` | `DashboardPrivateSectors` | provider | sales | Private sector opportunities | Apply | supporting | OK |
| `/dashboard/projects`, `/showcase` | portfolio | provider | growth | Portfolio publishing | Publish | supporting | OK |
| `/dashboard/provider/membership` | `ProviderMembership` | provider | growth | Membership self-serve | Upgrade | core | OK |
| `/dashboard/provider/service-areas` | `ProviderServiceAreas` | provider | sales | Geo coverage | Add area | supporting | OK |
| `/dashboard/help` | `DashboardHelpCenter` | any auth | help | Authenticated help home | Article | core | OK |
| `/dashboard/blog`, `/profile-systems` (admin-only) | content | admin | content | Admin-only inside dashboard shell | Edit | admin-only | OK |

## E. Admin surface

Grouped at high level; individual routes documented in `docs/admin-journey.md`.

| Group | Routes | Audience | Purpose | Risk |
|---|---|---|---|---|
| Identity & users | `/admin/identity`, `/admin/users`, `/admin/users/:id`, `/admin/access-management`, `/admin/audit-log`, `/admin/activity-log` | super_admin / admin | People & permissions | OK |
| Businesses | `/admin/businesses`, `/admin/provider-review`, `/admin/provider-subscriptions`, `/admin/provider-analytics`, `/admin/provider-landing`, `/admin/entity-access-requests` | admin | Business directory governance | OK |
| Contracts | `/admin/contracts`, `/admin/contracts/create`, `/admin/contracts/analytics`, `/admin/contract-templates`, `/admin/quote-requests`, `/admin/quote-requests/:id`, `/admin/quote-operations`, `/admin/lead-requests` | admin | Contract & quote ops | OK |
| Memberships & payments | `/admin/memberships`, `/admin/membership-rejections`, `/admin/membership-events`, `/admin/membership-payments` | admin | Subscription ops | OK |
| Operations | `/admin/operations`, `/admin/operations/console`, `/admin/cron-runs`, `/admin/diagnostics`, `/admin/kpis`, `/admin/reports`, `/admin/market-analytics` | admin | Platform operations | OK |
| Content & SEO | `/admin/categories`, `/admin/tags`, `/admin/branding`, `/admin/showcase`, `/admin/sector-seo`, `/admin/sitemap-status`, `/admin/site-audit`, `/admin/private-sectors` | admin | Content + SEO | OK |
| Communications | `/admin/contact-messages` (+ redirected tabs), `/admin/email-center`, `/admin/email-deliverability`, `/admin/help` | admin | Inbound & outbound comms | OK |
| Locations | `/admin/locations`, `/admin/locations/catalog`, `/admin/locations/service-areas`, `/admin/locations/business-coordinates` | admin | Geo registry | OK |
| Reference / barcodes | `/admin/ref/triage`, `/admin/ref/:refId`, `/admin/barcode-registry`, `/admin/client-sites` | admin | Reference governance | OK |
| AI & system | `/admin/ai-center`, `/admin/system-settings`, `/admin/api-settings`, `/admin/api-docs`, `/admin/analytics-settings`, `/admin/ab-experiments`, `/admin/pdf-exports`, `/admin/pdf-visual-qa`, `/admin/membership-rejections` | super_admin | Platform configuration | OK |
| Legacy redirects | `/admin/contact-inbox-settings`, `/admin/contact-audit-log`, `/admin/contact-sla-dashboard`, `/admin/contact-notification-log`, `/admin` | admin | `<Navigate>` to canonical surfaces | OK (intentional) |

## F. Help center

| Route | Component | Audience | Purpose |
|---|---|---|---|
| `/help` | `HelpCenterHome` | public | Help index |
| `/help/category/:slug` | `HelpCategoryPage` | public | Category browse |
| `/help/article/:slug` | `HelpArticlePage` | public | Article reader |
| `/help/report-issue` | `ReportIssuePage` | auth | Issue reporter |
| `/help/feature-request` | `FeatureRequestPage` | auth | Feature request form |
| `/dashboard/help`, `/admin/help` | dashboard/admin help homes | auth/admin | Contextual help |

## Risk summary

- **Orphans / missing-entry**: `/compare`, `/compare-profiles` (no entry from search result UI today — keep as supporting, deep-linkable).
- **Duplicate-candidates**: `/dashboard/operations` vs `/dashboard/operations-center` (latter is canonical post-Observability-1; former remains as snapshot dashboard). `/sector/:slug` vs `/sectors/:slug` (kept for legacy SEO inbound links).
- **Hidden utilities (intentional)**: `/forbidden`, `/diagnostics`, `/unsubscribe`, `/v/...`, `/r/:refId`, `/q/:code`, `/s/:token`, `/client/:refId`, `/invite/:token`, `/staff-invite/:token`.
- **Admin redirects**: All four contact-* legacy routes resolve via `<Navigate>` — verified in `App.tsx`.
- **No removals proposed in this phase.**