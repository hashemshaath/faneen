# Sitemap Status Automation

## 1. Database (migration)
- New table `sitemap_audit_runs`:
  - `id uuid pk`, `created_at timestamptz`, `triggered_by` ('cron'|'manual'|'user_id'),
  - `total_endpoints int`, `ok_count int`, `error_count int`, `total_urls int`,
  - `has_spa_fallback bool`, `has_failures bool`,
  - `results jsonb` (per-endpoint: url, status, contentType, isXml, isSpaFallback, urlCount, lastmod, error),
  - `robots_check jsonb` (per target path: path, allowed, matchedRule),
  - `diff_from_previous jsonb` (newly broken endpoints, url count deltas).
- RLS: admin-only select/insert.
- Indexes on `created_at desc`.

## 2. Edge function `audit-sitemap-status` (verify_jwt=false for cron, internal token check)
- Fetches: `qitaat.com/robots.txt`, `qitaat.com/sitemap.xml`, edge sitemap index + each `?type=*`.
- Runs same XML/SPA-fallback checks the dashboard does.
- Parses robots.txt → checks list of target paths (`/`, `/search`, `/categories/`, `/projects`, `/blog`, `/offers`, `/profile-systems`, `/membership`, `/about`, `/contact`, plus a few must-block ones like `/admin/`, `/auth`).
- Loads previous run from DB → computes diff (status flips, urlCount changes).
- Inserts new row.
- If `has_failures || has_spa_fallback` → sends email to admin recipients via existing `send-transactional-email` (use template `contact-admin-notification` as a generic alert, or scaffold a simple inline alert by enqueueing). To keep this small, send via `send-transactional-email` with template `contact-admin-notification` carrying the failure summary (subject: "SEO Sitemap Alert").
- Returns JSON summary.

## 3. Schedule
- pg_cron job invoking the edge function daily at 03:00 UTC via `net.http_post` with service-role key from Vault (or platform_settings).

## 4. Dashboard updates (`AdminSitemapStatus.tsx`)
- Keep live check section.
- Add "Run & save audit" button (calls the edge function, stores result).
- New section: **Audit history** (last 20 from `sitemap_audit_runs`):
  - Time, endpoints OK/total, total URLs, SPA fallback flag, failures count.
  - Expand row → see per-endpoint status & robots check & diff vs previous.
- New section: **Robots rules check** — show table of target paths with Allowed/Blocked badge, taken from latest audit's `robots_check`.

## 5. Files
- New migration: `supabase/migrations/<ts>_sitemap_audit_runs.sql`
- New edge function: `supabase/functions/audit-sitemap-status/index.ts`
- Update `supabase/config.toml` — add `[functions.audit-sitemap-status] verify_jwt = false`.
- Update `src/pages/admin/AdminSitemapStatus.tsx` — history + robots rules + run-and-save button.
- Cron scheduling SQL via `supabase--insert` (contains service-role key reference).

## Notes
- Email alerts reuse existing transactional pipeline; recipients = users with admin role (query `user_roles`).
- Dedup alerts: only send if previous run was healthy or 24h passed.
