# Core Web Vitals Review — PERFORMANCE-ACCESSIBILITY-FINAL-1

## LCP
- Hero image preload: `HomeV2` injects `<link rel="preload" as="image" fetchpriority="high">` for `hero-slide-1.webp`.
- First hero slide renders `loading="eager"`; slides 2+ `loading="lazy"`.
- Hero asset bundled at `src/assets/home/hero-slide-1.webp` → hashed `/assets/*` for long-cache.
- Status: PASS, pinned by `cwv-optimizations.test.ts`.

## CLS
- `<LazyImage>` reserves space via wrapper div.
- `Skeleton` placeholders hold layout while Suspense resolves.
- Below-the-fold uses `content-visibility: auto`.
- Status: PASS.

## INP
- `useTypingAnimation` and HomeV2 parallax honor `prefers-reduced-motion: reduce`.
- Search uses `useDebouncedValue` (200ms) in brand picker and global search.
- Lazy routes minimize first-navigation JS.
- Status: PASS.

## TTFB
- Static SPA; TTFB driven by CDN.
- Service worker uses `NetworkFirst` for Supabase (5s timeout) and `StaleWhileRevalidate` for JS/CSS/woff.
- Status: PASS.

## FCP
- Critical CSS inlined via Vite; design tokens in `index.css`.
- Local IBM Plex Sans Arabic (font-display swap).
- Status: PASS.

## Runtime telemetry
- `src/utils/reportWebVitals.ts` ships all five metrics with rating, path, connection, device via `sendBeacon`.

## Outcome
CWV invariants remain green. No further repairs needed for launch.
