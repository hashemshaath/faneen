## HELP-CENTER-FOUNDATION-1 — Implementation Plan

A foundation phase to ship the full Help Center domain. Out of scope: inventory, accounting, supplier portal/payments, WhatsApp/SMS, AI chatbot (foundation only — links to articles).

### A. Domain module
Create `src/modules/helpCenter/` with barrel exports:
- `articles.ts` — CRUD + search wrappers (no page-level supabase access)
- `categories.ts`
- `search.ts` — `searchHelpArticles({ q, audience, locale })` covering title/summary/keywords/category in AR+EN (ilike + tsvector fallback, no external engine)
- `issueReports.ts`
- `featureRequests.ts`
- `contextualHelp.ts` — `HelpLauncher` registry of `{ pageKey -> articleSlugs[] }`
- `analytics.ts` — pure `computeHelpMetrics(rows)`
- `index.ts` barrel

### B. Database migration
Create tables with `PREFIX-NNNNNNN` ref_id sequences (HCAT, HELP, ISS, REQ):
- `help_categories` — slug, audience enum (provider/customer/admin/general), title/desc AR+EN, sort_order, is_active
- `help_articles` — category_id FK, slug, audience, status (draft/published), title/summary/content AR+EN, keywords[], counters, created_by/updated_by
- `help_issue_reports` — business_id, reporter_user_id (nullable), page_key, issue_type enum, priority enum, title, description, screenshot_url, status enum
- `help_feature_requests` — business_id, user_id, category, title, description, votes_count, status enum

RLS (no anon):
- categories/articles published → authenticated SELECT; admin full
- issue_reports/feature_requests → INSERT by authenticated; SELECT own row (`reporter_user_id = auth.uid()` / `user_id = auth.uid()`); admin full via `has_admin_access()`
- GRANTs: authenticated CRUD where allowed, service_role ALL, no anon grants

Sequences + `gen_ref_id()` triggers for each ref_id field.

### C. Routes
Public:
- `/help` → HelpCenterHome
- `/help/category/:slug` → HelpCategoryPage
- `/help/article/:slug` → HelpArticlePage
- `/help/report-issue` → ReportIssuePage (useNoIndex)
- `/help/feature-request` → FeatureRequestPage (useNoIndex)

Dashboard / Admin:
- `/dashboard/help` → user view of own submissions + KB shortcut
- `/admin/help` → Admin Help Center (manage categories, articles, issues, requests)

Sitemap generator: add `/help`, dynamic category + article slugs (published only). Skip report/request pages.

### D-I. Pages & UX
- **HelpCenterHome** — Hero + big search box (AR/EN placeholder), category grid (General, Providers, Customers, Operations, Contracts, Work Orders, Production, Procurement, Customer Portal, Admin), popular articles (top views_count), contact support card
- **HelpArticlePage** — title, summary, category breadcrumb, content (markdown render via existing renderer), last updated, helpful / not helpful buttons → increment counters via RPC
- **ReportIssuePage** — inline form (NO MODAL): issue_type, priority, current page auto-detected from `location.pathname`, title, description, screenshot URL. Returns ISS- ref id inline.
- **FeatureRequestPage** — inline form: category, title, description → returns REQ- id
- **HelpLauncher** — small "?" button component for page headers; takes `pageKey`, looks up registry, opens dropdown of relevant article links. Wire into: Work Order Detail, Procurement, Contracts, Customer Portal admin pages, Admin pages (Identity/Publishing/Diagnostics)

### J. Starter knowledge base
Seed 75+ articles via migration insert across all listed categories with bilingual title/summary/content/keywords. Topics: business creation, publishing, BOQ, RFQ, quotations→contracts, customer tracking, warranty start, etc.

### K. Admin Help Management
`/admin/help` tabs: Categories | Articles | Issues | Requests. Filters by status/audience/category. Inline edit (no modals). Uses wrappers only.

### L. Analytics
`computeHelpMetrics(articles, issues, requests, searches)` → article views, helpful ratio, open vs resolved issues, feature request counts by status, top searched topics. Render cards in admin dashboard.

### M. Security
Verify: no anon RLS access to issue/feature tables; no UUIDs rendered (use ref_id); no PII in customer-facing surfaces; no `supabase.from` in pages (only wrappers); zero references to inventory/accounting/supplier portal/whatsapp/sms.

### N. Tests
`src/tests/helpCenterFoundation1.test.ts` — guards for: migration objects exist, RLS deny-anon, routes registered, wrappers exported, search returns AR+EN matches, viewer increments counters, contextual registry has entries for required page keys, issue/feature submission returns ref_id, analytics helper math, no direct DB access in pages (regex scan), no out-of-scope module imports.

### O. Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- Audits: broken-links, sitemap-integrity, identity/businesses/contracts/procurement isolation, storage, notifications, transactional-email, edge-functions, RTL central + direction.

### Final report
PASS/FAIL across schema, routes, articles seeded count, contextual help coverage map, issue/feature flows, admin management, analytics, security review, tests added, validation results, next phase recommendation (Help Center v1.1: AI assistant + chatbot using Lovable AI on top of articles).

---

**Scope estimate**: ~25 new files (module + 7 pages + components + tests + docs), 1 large migration with seed inserts, sitemap + route registry edits. No new external deps.

Confirm to proceed and I'll ship it end-to-end.