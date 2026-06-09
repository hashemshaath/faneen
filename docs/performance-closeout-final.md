# Final Performance Closeout — qitaat.com Home

**Date:** 2026-06-09  
**Decision:** ✅ **PASS** — no further changes required.

## Scope
Homepage `/` on production (`qitaat.com`), mobile viewport 390×844.
Verified against the deployed build (HTML + Chrome runtime profile),
not preview.

## Key wins shipped
- GTM loaded once, deferred until `load + requestIdleCallback`, with a
  `querySelector('script[src*="gtm.js"]')` guard (no duplicate `gtm.js`).
- LCP hero served from `/hero/slide-1-{768,1280,1920}.webp` with
  `<picture>` + `srcset` + `<link rel="preload" fetchpriority="high">`.
  Old hashed asset `/assets/hero-slide-1-DovA6Qla.webp` is gone.
- Carousel mounts slide 0 only at first paint (`mounted = new Set([0])`).
- `vendor-pdf` and `vendor-charts` no longer appear in the home
  modulepreload list or initial network waterfall.
- `DeferredAppOverlays` holds ConsentBanner, HelpLauncher,
  BuildVersionWatcher, Notifications out of the critical chain.
- `platform_settings` not requested from Home (admin-only); single
  fetch when needed.
- `ab_assign_variant` deferred to `load + idle` with sessionStorage
  cache.
- Service worker registered manually after `load + idle`
  (`injectRegister: null`); preview/iframe hosts unregister it.
- Critical CSS for hero + reset inlined in `index.html`.
- `modulePreload.polyfill = false` keeps the preload helper from
  pulling heavy vendor chunks into the entry's static graph.

## Before / after (mobile)

| Metric             | Before (old build) | After (production) | Target  | Status |
|--------------------|--------------------|--------------------|---------|--------|
| FCP                | 7.4 s              | **1.15 s**         | <2.5 s  | ✅ |
| LCP                | 11.8 s             | **~1.2–1.5 s**     | <3.5 s  | ✅ |
| TBT                | 180 ms             | **~150 ms**        | <200 ms | ✅ |
| CLS                | 0.012              | **0.043**          | <0.05   | ✅ (close to limit) |
| Speed Index        | 7.4 s              | n/a (PSI 429)      | —       | re-measure later |
| TTFB               | —                  | 728 ms             | —       | ℹ️ |

> PageSpeed Insights returned `429 Quota Exceeded` at closeout time.
> Re-run Mobile PSI **once** when quota is available — single
> measurement only, no Phase 5.

## Remaining risks (monitor 48h — do NOT fix now)
1. **CLS 0.043** — close to 0.05. Sources: hero bottom overlay,
   search pill, trust strip (~0.028 each). Watch RUM
   (`web_vitals_events`).
2. **Mobile LCP image variant** — at DPR=2 the browser picks
   `slide-1-1920.webp` (~85 KB) instead of 768w (~25 KB).
   Acceptable today; revisit `sizes` only if RUM LCP regresses.
3. **`slide-3-1280.webp` (~838 ms)** — carousel may mount a later
   slide sooner than expected. Watch initial network trace.
4. **Console errors** — sweep daily during the 48h window.

## Explicitly deferred (Phase 5, on hold)
- AVIF variants for hero
- `sizes` refinement for the hero picture
- Carousel mount/preload tuning
- Local-hosted Inter/IBM Plex (vs Google Fonts)
- TTFB / cache-header review

## Required actions now
**None.** Closeout accepted as PASS. Re-evaluate after the 48h
monitoring window + the single follow-up PSI Mobile measurement.