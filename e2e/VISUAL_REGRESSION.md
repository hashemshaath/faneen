## CI integration

Visual tests run in `.github/workflows/visual-regression.yml` on every PR
and push to `main` using the official Playwright container
`mcr.microsoft.com/playwright:v1.59.1-jammy` (Chromium + system deps
pre-installed, matches Playwright 1.57).

Pipeline steps:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npm run build`
4. `npx vite preview --host 0.0.0.0 --port 8080 --strictPort &`
5. Poll `http://localhost:8080` until ready (60 s timeout)
6. `npm run test:visual`
7. On failure, uploads `playwright-report/` and `test-results/` as artifacts

## Seeding baselines

Baselines must be generated on a Linux x64 machine (matching CI) so pixel
diffs stay deterministic. The current Lovable sandbox (NixOS) cannot run
Chromium, so seed locally or in CI:

**Local (Linux / WSL2 / Playwright Docker image):**

```bash
npm ci
npx playwright install --with-deps chromium
npm run build
(npx vite preview --host 0.0.0.0 --port 8080 --strictPort &)
until curl -sf http://localhost:8080 >/dev/null; do sleep 1; done
npm run test:visual:update          # writes e2e/__screenshots__/
git add e2e/__screenshots__/
git commit -m "chore(visual): seed Playwright baselines"
```

**Via the Playwright Docker image (recommended for parity with CI):**

```bash
# Run tests against existing baselines:
docker run --rm -it --ipc=host -v "$PWD":/work -w /work \
  mcr.microsoft.com/playwright:v1.59.1-jammy \
  bash scripts/run-visual-tests.sh

# Or re-seed baselines (writes to e2e/__screenshots__/):
docker run --rm -it --ipc=host -v "$PWD":/work -w /work \
  mcr.microsoft.com/playwright:v1.59.1-jammy \
  bash scripts/run-visual-tests.sh --update
```

`scripts/run-visual-tests.sh` mirrors the CI workflow exactly: lockfile
sync check → `npm ci` → reuse pre-installed Chromium → build → preview
server (120 s readiness wait) → `test:visual` (or `test:visual:update`).

Commit the contents of `e2e/__screenshots__/` to lock the baseline. Future
PRs whose layout drifts beyond `maxDiffPixelRatio: 0.02` will fail the
`Visual Regression` job.
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