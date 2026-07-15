## Provider onboarding follow-up paused — this pass audits public-page performance (Google PageSpeed / CWV, mobile-first). Read-only.

## 1. Measured baseline (production build, gzip)

**CSS**
- `index-*.css` — 297 KB raw / **43 KB gz** (single blocking file, one `<link rel="stylesheet">` in `<head>`). Tailwind purge is working; no unused route CSS split — acceptable at gz size.

**JS shipped on first paint of `/` (chunks that are `<script>` entry OR in `<link rel="modulepreload">` OR statically imported by them):**

| Chunk | Raw | gz | Notes |
|---|---|---|---|
| `index-*.js` (entry) | 528 KB | **164 KB** | App shell: 30+ eager imports in `src/App.tsx` (AuthProvider, LanguageProvider, ThemeProvider, Sonner, Toaster, TooltipProvider, GlobalLinkTracker, GlobalShortcuts, ErrorBoundary, IdentityTokensApplier, BrandFaviconApplier, ThemeApplier, ProtectedRoute, PermissionRouteGuard, AdminRoute, 729-line route table) |
| `vendor-react` | 157 KB | **51 KB** | required |
| `vendor-supabase` | 210 KB | **55 KB** | preloaded on `/`; only reason it's needed at first paint is `AuthProvider` subscribing to `onAuthStateChange` in the shell |
| `vendor-ui` (radix) | 112 KB | **35 KB** | dialog + dropdown + tabs + tooltip + popover + select. Home only needs tooltip/dropdown for header. |
| `vendor-query` | 47 KB | **14 KB** | required |
| `vendor-date` | 25 KB | **7 KB** | preloaded on `/`; home doesn't render dates |
| `vendor-utils` | 21 KB | **7 KB** | clsx/tw-merge — required |
| `Index-*.js` (route) | 36 KB | **12 KB** | |
| Home sub-chunks (CategoryRows, SectorGrid, AudienceSplit, FAQ, ContentCombined) | ~40 KB | **~15 KB** | |
| ~13 individual lucide icon chunks | small | **~3 KB** | tree-shaking working |
| **Total first-paint JS** | ~1.2 MB | **≈ 359 KB gz** | |

Reference — Lighthouse mobile "Good" band is ≤ ~170 KB gz JS at first paint. We ship **~2×** that. Every chunk in the modulepreload list is fetched in parallel and *before* the LCP paint can commit.

**Top 10 chunks by gz (whole app, not just home)**

| Chunk | gz |
|---|---|
| heic2any | **341 KB** |
| xlsx | **162 KB** |
| index (entry) | 164 KB |
| lucide-react (fallback, for `import * as` sites only) | 119 KB |
| jspdf | 127 KB |
| vendor-charts (recharts) | 115 KB |
| pdf-ksa | 98 KB |
| DashboardContracts | 79 KB |
| AdminBusinesses | 60 KB |
| vendor-supabase | 55 KB |

None of the big offenders (heic2any, xlsx, jspdf, recharts, pdf, lucide fallback) are in the homepage modulepreload chain — good. But `heic2any` at 341 KB gz sitting in the bundle at all means one dashboard flow ships more JS than the entire rest of the app combined; worth deferring to a user gesture.

**CSS on `/`:** single 43 KB gz file, render-blocking; `leaflet.css` (15 KB) is *not* on `/` — only pulled by `Search` and `BusinessProfile` map paths. OK.

**Fonts — this is the largest low-hanging LCP/FCP lever**
- Loaded from Google Fonts CDN, NOT self-hosted (contradicts `core-web-vitals-review.md` which claims local IBM Plex).
- One stylesheet URL requests: IBM Plex Sans Arabic wt 400/500/600/700 (**4** weights, Arabic subset ≈ 40–80 KB woff2 each) + Inter wt 400/500/600/700/800 (**5** weights) + IBM Plex Mono wt 400/500/600 (**3** weights). That's **12 font files, ~500–800 KB uncompressed** on mobile.
- Loaded with `rel="preload" as="style" ... onload="this.rel='stylesheet'"` — the CSS is deferred, but the woff2 files it triggers are *not* preloaded, so LCP text repaints when they finally arrive (or FOUT if `display=swap`, which it is).
- Third-party origin adds preconnect + extra DNS/TLS hop.

**Third-party scripts on `/`**
- GTM (`GTM-NHPQ2R52`) — gated to prod host, deferred to `load` + `requestIdleCallback` — **good**.
- Service worker registration — deferred to load+idle — **good**.
- No chat/support widget, no other analytics — **good**.

## 2. LCP

- LCP element: `<img>` inside `HeroV2` slide 1 → `/hero/slide-1-1920.webp`. Preload matches, `fetchpriority="high"`, `imagesrcset` covers 768/1280/1920. Widths in bytes: 25 / 53 / 87 KB webp. Explicit width/height set. This part is **healthy**.
- The LCP hurt is downstream: text on top of the hero re-flows once Google Fonts arrive (Arabic-only page → the Arabic font swap directly affects the LCP candidate if it's a text node), and the 164 KB gz entry chunk delays hydration.
- Below-the-fold images use `LazyImage`/`loading="lazy"` — spot-checked HomeV2:956 sector card images all lazy. **PASS**.

## 3. CLS

- HeroV2 has a critical-CSS placeholder block matching hero viewport height — good.
- Prerendered `#root` contains only `sr-only` content (heading + link list); React swap does not cause a visible shift.
- Font-swap is `display=swap` → Arabic font swap risks visible reflow of the hero heading, which is a CLS + LCP hit combined. No `size-adjust` fallback declared.
- All below-the-fold images spot-checked have dimensions. No obvious CLS source beyond fonts.

## 4. TBT / main thread

- Entry chunk at 164 KB gz translates to ~500–700 KB parse+compile on mobile → main thread is busy for a noticeable chunk of TBT before hydration.
- App shell forces synchronous evaluation of **12 provider/effect modules** (Auth, Language, Theme×3, IdentityTokens, BrandFavicon, GlobalLinkTracker, GlobalShortcuts, Tooltip, direction shell) before the router even mounts.
- Two `application/ld+json` blocks in `<head>` are static text (inline) — negligible cost.
- No obvious heavy sync work on home mount (React Query prefetch is IO, not CPU).

## 5. Prerender interaction

Static prerendered `#root` contains an `sr-only` block only. On hydration React replaces it with the real tree. Because the block is visually hidden, there's no LCP flash / no CLS. **Safe.** (Aside: the prerender is producing HTML that isn't used for LCP — the LCP image is what paints. That's fine.)

## 6. Prioritized fix list

Estimates use the current mobile Lighthouse baseline; ranges assume no other regressions.

### P-A — safe, high-impact (do first)

| # | Fix | Expected impact |
|---|---|---|
| A1 | **Self-host IBM Plex Sans Arabic + Inter** (subset to `arab, latin`, only weights actually used — audit shows 400/500/700 cover ~all usages; drop 600/800). Preload the 1–2 files needed for the hero heading with `<link rel="preload" as="font" type="font/woff2" crossorigin>`. Drop Google Fonts CDN entirely; remove its preconnect and stylesheet. | **LCP −300 to −800 ms mobile**, **CLS ↓** (font-swap flash on hero heading disappears), −1 third-party origin, −8+ font requests |
| A2 | **Remove `vendor-date` and `vendor-supabase` from the homepage modulepreload chain**. `vendor-date` is not referenced by any home code path — trace and cut. For `vendor-supabase`, split `AuthProvider` so the supabase client + `onAuthStateChange` subscription is dynamically imported inside a `useEffect` (renders unauthed shell synchronously, hydrates auth after mount). | **−62 KB gz first-paint JS**, TBT ↓ (parse cost), removes one blocking module from the LCP critical path |
| A3 | **Slim `src/App.tsx` shell.** Move `GlobalLinkTracker`, `GlobalShortcuts`, `IdentityTokensApplier`, `BrandFaviconApplier`, `ThemeApplier`, `Sonner`, `Toaster`, `TooltipProvider` into the existing `DeferredAppOverlays` pattern (mount after `load`+idle). Keep only routing + language + auth + error boundary in the eager shell. | **Entry chunk −40 to −70 KB gz** (down from 164 → ~100), TBT ↓, LCP ↓ (fewer bytes competing with hero image download on slow 4G) |
| A4 | **Drop unused Google Fonts weights immediately** (independent of A1). Change the stylesheet URL to only request weights the app actually renders. `rg -n "font-weight" src/**/*.css` + Tailwind config shows 400/500/700 dominant; 800 Inter is used ~0×, 600 Plex Mono ~0×. | **−200 to −400 KB uncompressed** font transfer on mobile; partial LCP win even before A1 |

### P-B — moderate

| # | Fix | Expected impact |
|---|---|---|
| B1 | **Split `vendor-ui` radix bundle.** Home only needs `@radix-ui/react-tooltip` (and maybe dropdown for the auth menu). Put dialog/tabs/popover/select in their own chunk consumed only by pages that use them. | Entry-adjacent −15–20 KB gz on home |
| B2 | **Add `size-adjust`, `ascent-override`, `descent-override` to `@font-face` fallbacks** (only meaningful after A1 lands). Removes remaining font-swap layout shift. | CLS ↓, negligible LCP |
| B3 | **Add `content-visibility: auto` + `contain-intrinsic-size` to the below-the-fold home sections** (sector grid, category rows, FAQ). Already partially done per audit doc — verify it's actually applied to HomeSectorGrid / HomeCategoryRows / FAQSection. | TBT ↓, INP ↓ on scroll |
| B4 | **Verify `Index-*.js` static import of `image-pipeline` (via `HomeCategoryRow.tsx`)** — inline the tiny `isVariantUrls` helper or move it to a shared leaf so the whole `image-pipeline` module (with its `imageCompression` sibling) isn't pulled. Same file also brings `migration-services` into the home chunk. | Home chunks −3–5 KB gz |
| B5 | **Preload the LCP hero image with `Priority Hints` "high" AND move the preload `<link>` above the fonts preload** in `index.html`. Currently the fonts preload sits right after — order matters for the browser's priority queue. | LCP −50–150 ms |
| B6 | **Kill `xlsx` / `heic2any` / `jspdf` from the initial route graph on every page they leak into.** They're not on home, but pdf-ksa (98 KB gz) and xlsx (162 KB gz) show up in the top-10 and cause modulepreload bloat on dashboard routes; defer to user gesture (button click). | Not a home-page win but big for authenticated CWV. |

### P-C — risky / low-leverage

| # | Fix | Expected impact |
|---|---|---|
| C1 | Route-based CSS splitting (extract per-route `.css`). Vite doesn't do this by default and Tailwind's atomic classes make it low-value — 43 KB gz is not the bottleneck. | Skip unless we see CSS >100 KB gz. |
| C2 | Preact-compat swap. Not worth the compatibility risk. | Skip. |
| C3 | Migrate GTM to server-side / consent-gated init. Currently already load+idle-deferred; unlikely to move Lighthouse further on `/`. | Skip. |

## Expected combined impact (P-A only)

- First-paint JS on `/`: **~359 KB gz → ~230–250 KB gz** (still above the ~170 KB "green" target but out of the "red" band).
- Font transfer on mobile: **≈ −60 %**.
- LCP mobile (throttled 4G): **estimated −0.7 to −1.4 s**.
- CLS: **near-zero** for the hero (font-swap reflow removed).
- TBT: **−100 to −200 ms** (less script to parse before hydration).
- Lighthouse Performance (mobile): **+8 to +15 points** from current baseline.

## Notes / caveats

- The `core-web-vitals-review.md` claim that fonts are "local IBM Plex Sans Arabic (font-display swap)" is **stale** — the shipped `index.html` still loads them from `fonts.googleapis.com`. Fixing A1 also brings the doc back into truth.
- No schema/back-end changes involved. All changes are frontend build/config + presentation code, matching the "UI change → frontend only" rule.
- `/search` and business-profile audits are secondary; the LCP/JS work above lands equally on those routes (they share the same entry, fonts, and shell).