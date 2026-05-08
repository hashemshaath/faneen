# Visual regression harness

Lightweight Playwright screenshot tests covering all public routes at five
viewports plus the mobile navbar drawer and the footer. Designed to catch
layout / card-geometry / chip-spacing regressions without coupling to copy.

## Routes covered

Home, Search, Categories, Contact, Blog, BlogPost, BusinessProfile,
ProfileSystemDetail, Offers, Compare, CompareProfiles, Privacy, Terms, About.
Plus: navbar mobile drawer (open state), Footer (in-viewport).

## Viewports covered

`320×568`, `390×844`, `430×932`, `768×1024`, `1440×900`.

## Run

```bash
# 1. Make sure the dev server is running on http://localhost:8080
npm run dev

# 2. (One-time) install browsers
npx playwright install chromium

# 3. Run the visual suite
npm run test:visual

# 4. Approve intentional layout changes
npm run test:visual:update
```

Override the base URL (e.g. against a preview deploy):

```bash
PLAYWRIGHT_BASE_URL=https://qitaat.lovable.app npm run test:visual
```

## How flake is avoided

- `reducedMotion: "reduce"` + animations disabled in `playwright.config.ts`.
- A stylesheet injected per page hides volatile elements (`canvas`, `video`,
  `iframe`, `time`, anything tagged `[data-visual-volatile]`, hero particles).
- `networkidle` + a 400 ms settle delay before each shot.
- `maxDiffPixelRatio: 0.02` tolerates sub-pixel font rendering deltas.
- Snapshots are stored under `e2e/__screenshots__/` keyed by test file.

## Adding a route

Edit the `ROUTES` array in `e2e/visual.spec.ts`. For dynamic routes, add the
slug to `SLUGS` — pull a stable, seeded slug from the database.

## Tagging volatile UI

If a card or widget shows live data (counts, timestamps, online dots), add
`data-visual-volatile` to its root so the harness hides it during snapshots
without affecting normal rendering.