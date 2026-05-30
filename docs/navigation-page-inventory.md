# Navigation Page Inventory — NAVIGATION-ARCHITECTURE-REBUILD-1

Auto-derived from `src/App.tsx` (181 routes registered). Public-token,
resolver, and parametric `:id` routes are listed for completeness but
excluded from sidebar surfaces.

## Classification key
- **Core Daily** — used every working session by providers/admins.
- **Weekly** — recurring but not daily (reports, audits, settings).
- **Monthly** — periodic ops (memberships, payments reconciliation).
- **Admin Only** — gated by `requireAdmin` / `requireSuperAdmin`.
- **Rare** — diagnostics, one-off tools.
- **Legacy** — superseded by another route; still resolves for back-compat.
- **Hidden Utility** — token / dispatch / no-index pages, not in nav.

## Dashboard surfaces (provider + user)

| Route | Audience | Class | Current group | Recommended group |
|---|---|---|---|---|
| `/dashboard` | all | Core Daily | Overview | Overview |
| `/dashboard/operations-center` | provider | Core Daily | Overview | Overview |
| `/dashboard/operations/feed` | provider | Core Daily | Overview | Overview |
| `/dashboard/work-orders` | provider | Core Daily | Operations | Contracts & Execution |
| `/dashboard/work-orders/board` | provider | Core Daily | Operations | Production & Operations |
| `/dashboard/work-orders/overview` | provider | Weekly | Overview | Production & Operations |
| `/dashboard/contracts` | provider+user | Core Daily | Operations | Contracts & Execution |
| `/dashboard/contract-analytics` | provider | Weekly | Operations | Contracts & Execution |
| `/dashboard/warranties` | provider | Weekly | Operations | Quality & Customer |
| `/dashboard/leads` | provider | Core Daily | Sales & Requests | Sales & Customers |
| `/dashboard/provider/leads` | provider | Core Daily | Sales & Requests | Sales & Customers |
| `/dashboard/clients` | provider | Weekly | Sales & Requests | Sales & Customers |
| `/dashboard/bookings` | provider+user | Weekly | Sales & Requests | Quality & Customer |
| `/dashboard/rfq` | provider | Core Daily | Sales & Requests | Procurement |
| `/dashboard/rfq/inbox` | provider | Core Daily | Sales & Requests | Procurement |
| `/dashboard/procurement` | provider | Weekly | — | Procurement |
| `/dashboard/services` | provider | Weekly | Business Profile | Business Profile |
| `/dashboard/portfolio` | provider | Weekly | Business Profile | Business Profile |
| `/dashboard/projects` | provider | Weekly | Business Profile | Business Profile |
| `/dashboard/promotions` | provider | Weekly | Business Profile | Growth & Marketing |
| `/dashboard/provider/service-areas` | provider | Monthly | Business Profile | Business Profile |
| `/dashboard/private-sectors` | provider | Rare | Business Profile | Business Profile |
| `/dashboard/reviews` | provider | Weekly | Business Profile | Quality & Customer |
| `/dashboard/badge` | provider | Monthly | Business Profile | Settings |
| `/dashboard/business-edit` | provider | Monthly | Settings | Business Profile |
| `/dashboard/business-completion` | provider | Rare | — | Hidden Utility |
| `/dashboard/business-draft` | provider | Rare | — | Hidden Utility |
| `/dashboard/profile-systems` | provider | Weekly | Content & SEO | Growth & Marketing |
| `/dashboard/analytics` | provider | Weekly | Overview | Growth & Marketing |
| `/dashboard/installments` | all | Monthly | Membership | Memberships & Payments |
| `/dashboard/loyalty` | all | Weekly | Membership | Memberships & Payments |
| `/dashboard/loyalty/store` | all | Monthly | Membership | Memberships & Payments |
| `/dashboard/messages` | all | Core Daily | Communication | Communications |
| `/dashboard/notifications` | all | Core Daily | Communication / Account | Communications |
| `/dashboard/bookmarks` | user | Weekly | More | Account |
| `/dashboard/my-requests` | user | Core Daily | My Activity | Sales & Customers |
| `/dashboard/help` | all | Rare | — | Help |
| `/dashboard/profile` | all | Monthly | Settings | Account |
| `/dashboard/communication-preferences` | all | Monthly | Settings | Settings |
| `/dashboard/settings/staff` | provider | Monthly | Settings | Settings & Integrations |
| `/dashboard/settings` | all | Monthly | Settings | Settings & Integrations |
| `/dashboard/diagnostics` | provider | Rare | — | Hidden Utility |
| `/dashboard/no-access` | all | Rare | — | Hidden Utility |
| `/dashboard/showcase` | provider | Rare | — | Hidden Utility |
| `/dashboard/blog` | provider | Weekly | Content & SEO | Content & SEO |

## Admin surfaces (162 routes scanned, 71 admin)

Admin layout is already aligned with the recommended IA — see
`adminBaseGroups` in `DashboardSidebar.tsx`. Highlights of the
classification:

- **Core Daily (admin)**: `/admin/identity`, `/admin/businesses`,
  `/admin/provider-review`, `/admin/lead-requests`,
  `/admin/quote-operations`, `/admin/contracts`,
  `/admin/contact-messages`, `/admin/entity-access-requests`,
  `/admin/activity-log`, `/admin/operations/console`.
- **Weekly (admin)**: `/admin/memberships`, `/admin/membership-payments`,
  `/admin/provider-analytics`, `/admin/email-center`,
  `/admin/email-deliverability`, `/admin/audit-log`, `/admin/reports`,
  `/admin/kpis`, `/admin/site-audit`, `/admin/sitemap-status`.
- **Monthly (admin)**: `/admin/access-management`,
  `/admin/membership-events`, `/admin/membership-rejections`,
  `/admin/sector-seo`, `/admin/categories`, `/admin/tags`,
  `/admin/private-sectors`, `/admin/branding`, `/admin/analytics-settings`.
- **Rare (admin)**: `/admin/ai-center`, `/admin/ab-experiments`,
  `/admin/market-analytics`, `/admin/cron-runs`, `/admin/ref/triage`,
  `/admin/barcode-registry`, `/admin/client-sites`.
- **Hidden Utility**: `/admin/users/:id`, `/admin/quote-requests/:id`,
  `/admin/pdf-visual-qa`, `/admin/contracts/analytics`,
  `/admin/diagnostics`, `/admin/showcase`,
  `/admin/contact-{inbox-settings,audit-log,sla-dashboard,notification-log}`,
  `/admin/locations/{catalog,service-areas,business-coordinates}`.
- **Legacy back-compat**: `/admin/identity?view=...` (now redirected to
  the standalone pages — covered by `VIEW_REDIRECTS` in `AdminIdentity`).

## Public + token surfaces (excluded from nav)

`/`, `/:username`, `/sectors/*`, `/blog/*`, `/categories/*`,
`/projects/*`, `/services/*`, `/contracts/:id`, `/search`, `/about`,
`/contact`, `/privacy`, `/terms`, `/guides`, `/for-providers`,
`/join-as-provider`, `/quote`, `/help/*`, `/membership/*`, `/auth`,
`/reset-password`, `/onboarding`, `/forbidden`, `/notifications`,
`/offers`, `/compare`, `/compare-profiles`, `/diagnostics`,
`/q/:code`, `/r/:refId`, `/s/:token`, `/client/:refId`,
`/v/b/:username`, `/v/c/:number`, `/invite/:token`,
`/staff-invite/:token`, `/unsubscribe`.

## Verification

- `scripts/broken-links-audit.mjs` → **0 broken links** across 70 unique
  internal targets and 181 registered routes.
- `src/test/adminSidebarLinks.test.ts` → every `/admin/*` sidebar link
  resolves to a route in `App.tsx`.
- `src/__tests__/adminSidebarRestructure.test.ts` → no duplicate hrefs,
  no `/admin/identity?view=…` references.