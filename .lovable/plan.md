# Performance + SEO/GEO/AEO Audit — Read-only Findings & Phased Plan

Read-only inspection of build output, data hooks, route shell, `index.html`, `robots.txt`, `llms.txt`, `sitemap.xml`, and hot pages (`Index.tsx`, `SearchV3.tsx`). Concrete numbers below come from `bun run build` and file inspection.

---

## 1. Root causes ranked by user impact

### P0 — Directly explains "slow /search" and "empty then pop" flashes

**RC1. `/search` fires a single 500-row mega-query on every mount, and cache is deliberately bypassed.**
`src/services/search/useSearch.ts` L220–269 — `useBusinesses()`:
- `.from('businesses_public').select('…, cities(...), business_services(...), promotions(...)').limit(500)` — one wide join fetching up to 500 providers with nested arrays, then filtered client-side by `filterAndSort`.
- `staleTime: 30_000`, but `refetchOnMount: 'always'` **and** `refetchOnWindowFocus: true` — every visit and every tab refocus refetches the full 500 rows, defeating the cache. Same anti-pattern on `useCategories` (L181) and `useCities` (L203).
- Plus `useDirectoryRealtimeInvalidation()` opens a Realtime WS channel on `/search` mount and invalidates 7 query keys on any `directory_sync_events` change.

**RC2. Route-lazy + data-lazy are sequential, gated by a full-screen loader.**
`src/App.tsx` L281 wraps every route in `<Suspense fallback={<PageLoader />}>`; `PageLoader` is a `min-h-dvh` centered spinner (L250). So a cold visit to `/search` is: download `Search-*.js` (60 KB gz) → mount → *then* fire the 500-row query → *then* fire taxonomy context + service-category queries. Nothing is parallel-prefetched.

**RC3. No client-side cache persistence.**
`src/lib/queryClient.ts` uses default in-memory store. React Query `persist` plugin is not installed. Every hard refresh / new tab starts from zero data — this is the "blank shell then pop" the user sees on return visits.

**RC4. Empty renders during `isLoading` instead of skeletons on public pages.**
Home has proper `SectionFallback` skeletons (Index.tsx L35–100). `/search` uses `LoadingProgressV3` (a top progress bar) — the results grid area itself renders empty during initial `isLoading` until businesses arrive. Same pattern likely on `BusinessProfile`, `BranchDetail`, `Projects`, `Blog` (worth verifying).

### P1 — Bundle bloat pulling extra bytes into hot paths

Top 15 built chunks (production, from `bun run build`):

| Chunk | Size | Gzip | Notes |
|---|---:|---:|---|
| `heic2any` | 1352 KB | 341 KB | Should be dynamic-only on image upload |
| `vendor-icons` (lucide-react) | 781 KB | 138 KB | **Star-import problem** — all icons bundled globally |
| `xlsx` | 499 KB | 162 KB | Verify only lazy-loaded from export flows |
| `index-*.js` (entry) | 453 KB | 145 KB | Entry chunk still heavy |
| `vendor-charts` (recharts) | 442 KB | 115 KB | Should never appear on `/` or `/search` |
| `jspdf.es.min` | 390 KB | 127 KB | Confirm no eager import remains |
| `pdf-ksa` | 334 KB | 98 KB | Dynamic-only expected |
| `DashboardContracts` | 285 KB | 78 KB | Page-split candidate |
| `ContractDetail` | 220 KB | 54 KB | Page-split candidate |
| `AdminBusinesses` | 218 KB | 59 KB | Admin — lower priority |
| `vendor-supabase` | 210 KB | 55 KB | Expected |
| `html2canvas.esm` | 201 KB | 48 KB | Dynamic-only expected |
| `vendor-react` | 157 KB | 51 KB | Expected |
| `index.es` | 151 KB | 51 KB | Investigate — likely a stray dep |
| `vendor-map` (leaflet) | 150 KB | 43 KB | Already lazy ✔ |

Key concern: `vendor-icons` at **138 KB gzipped** is loaded early because most public components import `lucide-react` via named imports which don't tree-shake through the `manualChunks: { 'vendor-icons': ['lucide-react'] }` bucket. That single chunk is a bigger perf hit than most page code.

### P2 — SEO/GEO/AEO gaps (Vite SPA reality)

**SR1. Crawlers get an empty shell.** `index.html` contains only the sitewide title/description/OG and a `<div id="root">` with a hero placeholder. All per-route titles, descriptions, canonicals, OG per page, and every JSON-LD block (LocalBusiness on `/:username`, Article on `/blog/:slug`, ItemList on sectors, BreadcrumbList, FAQPage) are injected client-side by `usePageMeta` + `useMultiJsonLd`. Googlebot renders JS (usually fine), but **Bingbot, PerplexityBot, GPTBot, ClaudeBot, and Facebook/Twitter/LinkedIn preview scrapers do not execute JS reliably** — they see the homepage's static meta on *every* URL.

**SR2. hreflang is misconfigured.** `index.html` L40–42:
```html
<link rel="alternate" hreflang="ar" href="https://qitaat.com" />
<link rel="alternate" hreflang="en" href="https://qitaat.com" />
```
Both point to the same URL, and the app has no `/en` variant. Google ignores/warns on this. Either drop both or provide real language variants.

**SR3. Sitemap coverage risk.** `public/sitemap.xml` is a sitemap-index pointing to `functions/v1/sitemap?type=…` edge function. Not audited here whether the businesses/blog/projects segments are actually returning fresh data — worth an edge-function smoke check.

**SR4. Font strategy is decent but not optimal.** IBM Plex Sans Arabic + Inter + Plex Mono all preloaded from Google Fonts as one stylesheet with `display=swap` and `fetchpriority=high` (L51). Fine, but subsetting Arabic weights or self-hosting would cut LCP by ~150–300 ms on 3G.

**SR5. LCP element on `/` is a background hero image, but its preload is deferred until `HeroSection` module mounts** (comment L53–55). This means preload happens *after* the JS parses — losing the critical-path win.

### GEO/AEO (AI answer engines)

**Good:**
- `public/llms.txt` exists, comprehensive.
- `robots.txt` explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, cohere-ai, CCBot missing but not blocked.

**Gaps:**
- Same SR1 problem — AI crawlers see the shell. They rely on `llms.txt` links plus initial HTML text. The homepage `<h1 class="sr-only">` provides one line of text; the rest of what Qitaat *is* only exists once React renders.
- No FAQ block in static HTML — FAQ JSON-LD is client-injected, so ChatGPT/Perplexity won't extract it.
- No CCBot entry in robots.txt (Common Crawl feeds most open LLM training).

---

## 2. Phased fix plan

### Phase P1 — Quick wins (no infra changes, no schema, mostly config + hooks)

**P1.1 Fix React Query cache leaks (biggest single win for `/search`)**
- `src/services/search/useSearch.ts`: change `useCategories`, `useCities`, `useBusinesses` to `refetchOnMount: false, refetchOnWindowFocus: false`. Bump `useBusinesses` staleTime to 5 min (matches `queryClient.ts` default).
- Consider narrowing `useBusinesses` PARENT_SELECT or splitting the nested `business_services` into a lazy per-card fetch (only when a card enters viewport / user filters by service).

**P1.2 Add React Query cache persistence**
- Install `@tanstack/react-query-persist-client` + `createSyncStoragePersister` (localStorage, 24 h max age, key-allowlist for public queries only).
- Returning visitors see instant cached content — kills the "empty then pop" flash for anyone who's been here before.

**P1.3 Skeleton coverage on public pages**
- Add `SearchResultsV3` grid skeleton (mimic 12 card placeholders) during first `isLoading`.
- Audit `BusinessProfile`, `BranchDetail`, `Projects`, `Blog`, `Offers` and add matching skeletons where the current `isLoading` returns `null`.

**P1.4 Slim `PageLoader`**
- Replace full-screen spinner with a top progress bar (nprogress-style, 3-line component) so the previous page stays visible while the next lazy chunk loads. Eliminates the "flash to blank" between route transitions.

**P1.5 SEO / GEO tweaks**
- Fix hreflang in `index.html` (remove duplicate `en` or add real `/en` route later).
- Expand static `<div id="root">` content: add a real `<h1>`, one paragraph describing Qitaat, and a small `<ul>` of the six main sectors, all inside the placeholder. Crawlers and AI bots will index this even without JS.
- Add a static FAQ block in `index.html` (`<section aria-hidden="true" hidden>`) with the same Q&A as `useHomeFaq`'s fallback, so FAQPage JSON-LD + text is visible to non-JS crawlers.
- Add `CCBot` allow to `robots.txt` for training-corpus inclusion.
- Preload the hero LCP image with a direct `<link rel="preload" as="image">` in `index.html` (accept one hashed-asset maintenance burden; use `?url` import at build time or a small predev script that writes the tag).

**P1.6 Kill lucide-react bloat**
- Replace `manualChunks: { 'vendor-icons': ['lucide-react'] }` with per-icon imports (`lucide-react/dist/esm/icons/x`) OR remove the manualChunks bucket and let Rollup tree-shake per-page. Target: cut the ~138 KB gz global icon chunk to <30 KB gz on hot pages.

Testable independently: `/search` cold-load timing, Lighthouse before/after, `view-source:` on `/` for the added static content.

### Phase P2 — Prerendering strategy for public pages

The only durable fix for SR1 (empty shell to non-JS crawlers) is prerendering. Options in order of effort:

**P2.1 Static prerender via `vite-plugin-prerender` or `react-snap`** for the fully-static routes: `/`, `/about`, `/contact`, `/privacy`, `/terms`, `/sectors`, `/sectors/:slug`, `/for-providers`, `/help`, `/help/:slug`, `/blog`. Build-time renders these to HTML with real titles/descriptions/JSON-LD baked in. No runtime backend change.

**P2.2 On-demand SSR at the edge for dynamic pages** (`/:username`, `/:username/:branch`, `/blog/:slug`, `/projects/:slug`): a small Supabase edge function that fetches the page's canonical data and returns HTML with server-rendered head + first-paint content, then hydrates client-side. Higher effort but essential for social-preview parity and AI-engine indexing of provider profiles.

**P2.3 (Alternative)** Migrate the public shell to TanStack Start / Next.js in a separate `apps/public` project, keep the auth'd app as-is. Largest change; defer until P2.1+P2.2 prove insufficient.

### Phase P3 — Chunk/vendor optimization

- **Split `vendor-charts`**: audit which public routes still pull recharts; move remaining call sites to `.chart.tsx` + `React.lazy` (Phase B2 pattern already established).
- **Investigate `index.es-*.js` (151 KB)**: identify which dep landed there (likely `xlsx` internals or a stray) and manual-chunk or lazy it.
- **Confirm `jspdf`, `xlsx`, `html2canvas`, `heic2any` have zero eager imports.** Grep already done for jspdf/qrcode in Phase B2; extend to the other three.
- **Split top pages ≥200 KB**: `DashboardContracts` (285 KB), `ContractDetail` (220 KB), `AdminBusinesses` (218 KB) — extract tabs into sub-routes or `React.lazy` panels.
- **Entry chunk (`index-*.js` 453 KB)**: profile with `rollup-plugin-visualizer`, identify what's forced eager by `App.tsx`/`main.tsx`.

Target after P3: entry + hot-vendor combined ≤ 300 KB gz on `/` and `/search`.

---

## 3. Not in scope (per user)

No DB schema changes, no RPC/edge-function work, no route re-orderings.

## 4. Recommended execution order

P1 first (biggest UX delta for lowest risk). Then P2.1 (static prerender — unblocks non-JS crawlers for the highest-traffic public pages). Then P3 (bundle diet). P2.2 (dynamic SSR) is the largest lift and should follow only if P2.1 metrics show clear ROI.
