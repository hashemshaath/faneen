# Broken Links Audit — Internal & External

## Part A — Internal Links

Routes inventoried in `src/App.tsx`: **210 `<Route>` declarations**.

Surfaces scanned: Navbar (`Header`), Footer, Dashboard sidebar, Admin sidebar, Breadcrumbs, Card CTAs, Help links, Blog links, Related-content links, Search results, Entity links.

| Check               | Result | Notes |
|---------------------|--------|-------|
| Broken routes       | PASS   | Every `to=` / `href=` resolves to a `<Route path=...>` or external `https://` URL. |
| Wrong routes        | PASS   | Branch URLs migrated from `/{user}/loc{n}` → `/{user}/{slug}`; sitemap filter in place. |
| Redirect loops      | PASS   | `useRoleRedirect` checks current path before navigating. |
| Missing pages       | PASS   | 404 fallback `NotFound.tsx` registered as last route. |
| Orphan routes       | PASS   | All routes reachable from nav, footer, or in-app links. |
| Unreachable pages   | PASS   | Admin / dashboard routes gated by `useRoleRedirect`, not orphans. |

## Part B — External Links

| Category         | Result | Notes |
|------------------|--------|-------|
| Social media     | PASS   | Configured via admin `SiteSettings`; empty values hidden in Footer. |
| Google Maps      | PASS   | Built dynamically from branch lat/lng. |
| App / Play store | N/A    | Not yet published — links rendered only when URLs configured. |
| Contact links    | PASS   | `mailto:` / `tel:` built from validated DB values. |

### Placeholder URL Strings

`example.com` occurs only in:

- `src/lib/identity/canonicalEmail.ts` — synthetic-email blocklist (intended).
- `src/modules/operations/customerCommunications/safety.ts` — outbound-email guard (intended).
- `src/**/__tests__/**` and `src/tests/**` — test fixtures only.
- Form `placeholder=""` attributes (`name@example.com`, `https://example.com`) — UX hints, never persisted.

No `localhost` / `127.0.0.1` / `demo.com` / `test.com` strings ship in production runtime paths.