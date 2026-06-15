# PASSWORD RESET ANALYTICS GOVERNANCE — PRA-1
## Security · Privacy · RLS Audit

## 1. Executive Summary

The recent change extends `password_reset_log` with a `jsonb metadata` column
plus nine new lifecycle events (`forgot_page_viewed`, `reset_page_viewed`,
`link_clicked`, `link_valid`, `link_expired`, `link_invalid`, etc.) written
from `ForgotPasswordForm.tsx` and `ResetPassword.tsx`. RLS keeps reads
admin-only and `service_role` never appears in client code. **The change is
safe to keep**, but three medium-severity hardening items should land before
we widen the schema further (see §14).

## 2. Decision

**PARTIAL — approved with required follow-ups.**
No leak ships today; no rollback required; the follow-ups in §14 must be
scheduled before the next analytics expansion.

## 3. What actually changed in DB / RLS / indexes

Migration `20260615135154_…sql`:

- `ALTER TABLE public.password_reset_log ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'`
- `CREATE INDEX idx_password_reset_log_status_created ON (status, created_at DESC)`
- Idempotent `CREATE POLICY "Anyone can insert password reset logs" … WITH CHECK (true)` to `anon, authenticated`
- `GRANT INSERT ON public.password_reset_log TO anon, authenticated`

Existing SELECT policy (`Admins can view password reset logs`,
`has_admin_access(auth.uid())`) and the pre-existing INSERT grants are
unchanged. No triggers, no backfill, no destructive ops.

## 4. RLS Review

`pg_policies` snapshot:

| Policy | Cmd | Roles | Predicate |
|---|---|---|---|
| Admins can view password reset logs | SELECT | authenticated | `has_admin_access(auth.uid())` |
| Anyone can insert password reset logs | INSERT | anon, authenticated | `WITH CHECK (true)` |

- ✅ anon/authenticated can only INSERT (no SELECT/UPDATE/DELETE grants exist).
- ✅ Reads are admin-gated via a SECURITY DEFINER helper — no recursive RLS.
- ✅ No policy lets a normal user read another user's rows.
- ✅ `service_role` never appears in client code (guard test enforces).
- ⚠️ INSERT predicate is `true` — see §5/§9.

## 5. anon INSERT risk

`WITH CHECK (true)` plus `GRANT INSERT TO anon` means any visitor can write
arbitrary rows. There is **no DB-side validation** of:

- `status` (free-text — anon can store `"pwned"`, `"<script>"`, etc.)
- `metadata` size (JSONB row can reach >1 MB)
- volume per IP / per email (no rate limit at the table)

Operationally this is consistent with how `email_send_log` and similar
analytics tables behave on this project, but it is the highest-leverage
follow-up — see §14.

## 6. Metadata Privacy Review

Fields written today (from `ForgotPasswordForm.tsx` and `ResetPassword.tsx`):
`path`, `referrer`, `locale`, `viewport`, `arrived_at`, `has_hash_token`
(boolean), `has_query_error` (boolean), `link_status`, `resolved_at`.

- ✅ Recovery tokens are never embedded — `has_hash_token` stores only a
  boolean via `.includes('access_token')`, and `ResetPassword` logs
  `window.location.pathname` (no `search`, no `hash`).
- ✅ No `Authorization` header, cookie, refresh_token, or full `location.href`.
- ✅ `user_agent` is capped at 200 chars before insertion.
- ⚠️ **`ForgotPasswordForm` logs `pathname + search`** (line 69). The forgot
  page itself does not carry recovery tokens, but a deep-link with a query
  string (e.g. `?email=...`) would land in JSONB. Recommend truncating to
  `pathname` only.
- ⚠️ `referrer` is stored raw. If a user lands on `/forgot` from a page that
  itself has a token in its URL (e.g. an emailed reset link they opened in a
  new tab and then clicked "back to forgot"), `document.referrer` could
  contain that token. Probability is low but non-zero — recommend stripping
  query/hash from referrer before logging.

## 7. Email Privacy Review

- Raw email is stored in `password_reset_log.email`. This is the same
  identifier used everywhere else in the auth pipeline (`email_send_log`,
  `auth_rate_limits`) and is required so admins can correlate a delayed reset
  with the matching `email_send_log` row.
- Admin UI (`AdminEmailDiagnostics`, `AdminEmailHub`) shows the email as
  plain text, consistent with other admin auth tooling.
- ✅ No anon SELECT, so the table cannot be used as an email-enumeration
  oracle from the browser.
- Future improvement: store `email_hash` alongside `email` and mask in the
  default admin view; not required for PRA-1.

## 8. Token / referrer / path sanitization

| Source | Field | Status |
|---|---|---|
| `ResetPassword.tsx` | `path` | ✅ pathname only |
| `ResetPassword.tsx` | `has_hash_token` | ✅ boolean only |
| `ResetPassword.tsx` | `has_query_error` | ✅ boolean only |
| `ForgotPasswordForm.tsx` | `path` | ⚠️ pathname **+ search** (FIX-1) |
| Both | `referrer` | ⚠️ raw (FIX-2) |

## 9. Abuse / Spam Risk

- ✅ App-level rate limit exists via `useLoginLockout` for the actual submit
  flow.
- ❌ No rate limit on `forgot_page_viewed` writes — a script can spam page-view
  rows from any browser.
- ❌ No max-size enforcement on `metadata` JSONB.
- ❌ No `status` allowlist at the DB layer (TS allowlist exists in code).
- ✅ Admin UI does not render metadata via `dangerouslySetInnerHTML`, so HTML
  injection into `metadata` cannot escalate to XSS in the dashboard
  (guard test enforces).

## 10. Admin UI Exposure Review

- `AdminEmailDiagnostics` / `AdminEmailHub` are reached through admin-only
  routes wrapped in `<AdminRoute>` / `DashboardLayout` per project policy.
- Metadata is rendered as JSON text inside React (escaped by default).
- No raw HTML insertion, no `eval`, no `innerHTML` near reset-log payloads.
- Recipient email is shown verbatim — acceptable given the admin-only scope.

## 11. Analytics Accuracy Review

- `forgot_page_viewed` is logged with `email: ''` — page-views are NOT
  attributed to a user, which is correct.
- `link_clicked` fires on mount of `/reset-password` and does not depend on
  the token value, only on its presence boolean.
- `link_valid` / `link_expired` / `link_invalid` are emitted from a
  `useEffect` that watches `linkStatus` after the token has been resolved
  server-side — no premature emission.
- `arrivalLoggedRef` and `outcomeLoggedRef` prevent double-logging under
  React StrictMode.
- `request_id` uses `RST-<base36 timestamp>` — non-secret, non-PII; safe to
  surface in admin UI but should not be treated as unguessable.

## 12. Migration Safety

- ✅ `metadata jsonb NOT NULL DEFAULT '{}'` — safe on add (default fills
  existing rows in one transaction; table is low-volume).
- ✅ `CREATE INDEX IF NOT EXISTS` — not `CONCURRENTLY`, but the table is
  small enough that the brief lock is acceptable.
- ✅ Policy creation is idempotent (`DO $$ … IF NOT EXISTS`).
- ✅ No data backfill, no destructive ops, no schema changes outside `public`.
- ⚠️ No CHECK constraint on `status` or on `metadata` size (see §14).

## 13. High-Risk Findings

None. All findings are medium or low — none warrant blocking the rollout.

## 14. Required fixes before approval

None are release-blockers. The following are **strongly recommended** before
the next analytics expansion (PRA-2):

1. **FIX-1 — Strip `search` from `ForgotPasswordForm` `path` field.**
   Change `window.location.pathname + window.location.search` →
   `window.location.pathname`.
2. **FIX-2 — Sanitize `referrer` before logging.** Parse with `new URL(...)`
   and store only `origin + pathname` — drop `search`/`hash`.
3. **FIX-3 — DB-side `status` allowlist + metadata size cap.** Add a CHECK
   constraint enumerating the 11 known events and a trigger rejecting
   `octet_length(metadata::text) > 4096`.

## 15. Safe follow-up improvements

- Add an `event_type` column and migrate `status` so the same enum is not
  used for both "request failed" and "password update failed".
- Persist `email_hash` (sha256 + project pepper) alongside `email` and mask
  the raw column in the default admin view.
- Rate-limit anon inserts via an edge function chokepoint rather than direct
  `from('password_reset_log').insert(...)`.
- Schedule a retention job that prunes rows older than 90 days.

## 16. Test Results

Guard suite `src/__tests__/passwordResetAnalyticsGovernancePra1.test.ts` — **9 / 9 passing**:

1. Migration grants anon/authenticated INSERT-only (no SELECT/UPDATE/DELETE).
2. Every SELECT policy on the table is admin-gated.
3. No `service_role` reference in analytics call-sites.
4. Metadata payloads embed no cookies, Authorization headers, refresh tokens,
   raw `location.hash`, or `location.href`.
5. `ResetPassword.tsx` logs only `pathname` — never `search` or `hash`.
6. No `dangerouslySetInnerHTML` in admin UI files that touch the reset log.
7. No `as any` / `@ts-ignore` / `@ts-expect-error` in analytics call-sites.
8. No hardcoded secrets (Stripe live/test keys, JWTs) in call-sites.
9. Every status string written from the client is in the documented
   11-event allowlist.

## 17. Final decision

`PASSWORD RESET ANALYTICS GOVERNANCE PRA-1 COMPLETE` — **PARTIAL PASS**.
Ship as-is; queue FIX-1/2/3 before PRA-2.