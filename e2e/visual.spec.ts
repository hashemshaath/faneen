/**
 * Visual regression harness — public routes × key viewports.
 *
 * Run:    npm run test:visual
 * Update: npm run test:visual:update
 *
 * Notes:
 * - Reduced motion + animations disabled (see playwright.config.ts).
 * - Dynamic content (counts, dates, hero particles, embedded videos) is hidden
 *   via the [data-visual-stable] CSS injection below to avoid flake.
 * - Slugs come from real seeded data (see SLUGS).
 */
import { test, expect, Page } from "@playwright/test";

const SLUGS = {
  business: "al-raed-alu",
  profileSystem: "composite-cladding",
  blogPost: "complete-guide-aluminum-windows",
};

const VIEWPORTS = [
  { name: "xs-320", width: 320, height: 568 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

const ROUTES = [
  { name: "home", path: "/" },
  { name: "search", path: "/search" },
  { name: "categories", path: "/categories" },
  { name: "contact", path: "/contact" },
  { name: "blog", path: "/blog" },
  { name: "blog-post", path: `/blog/${SLUGS.blogPost}` },
  { name: "business-profile", path: `/${SLUGS.business}` },
  { name: "profile-system-detail", path: `/profile-systems/${SLUGS.profileSystem}` },
  { name: "offers", path: "/offers" },
  { name: "compare", path: "/compare" },
  { name: "compare-profiles", path: "/compare-profiles" },
  { name: "privacy", path: "/privacy" },
  { name: "terms", path: "/terms" },
  { name: "about", path: "/about" },
] as const;

/** Inject a stylesheet that hides volatile elements + freezes animations. */
async function stabilize(page: Page) {
  await page.addStyleTag({
    content: `
      /* Force reduced-motion semantics for every element, in addition to
       * Playwright's emulated prefers-reduced-motion. Defends against custom
       * libraries that ignore the media query. */
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: -0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
      }
      /* Hide elements that change between runs (counts, dates, live data, video) */
      [data-visual-volatile],
      .hero-particles,
      canvas,
      video,
      iframe,
      time,
      [data-testid="online-status"] { visibility: hidden !important; }
      /* Freeze scrollbars so they don't shift layout */
      html { scrollbar-gutter: stable; }
    `,
  });
}

/** Wait for the app to be visually stable.
 *
 * Strategy (in order):
 *   1. DOM parsed.
 *   2. App-ready marker (`html[data-app-ready="1"]`) — set by main.tsx after
 *      React mounts, fonts resolve, and the browser is idle. This is the
 *      authoritative signal; networkidle alone is unreliable on routes that
 *      keep long-poll/realtime sockets open.
 *   3. Best-effort networkidle as a backstop (capped at 5s).
 *   4. Fonts loaded (in case the marker fired before the font promise on
 *      a slow CDN).
 *   5. One animation frame to flush layout.
 */
async function waitForStable(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page
    .waitForSelector('html[data-app-ready="1"]', { timeout: 15000, state: "attached" })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page
    .evaluate(() =>
      (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready ?? Promise.resolve()
    )
    .catch(() => {});
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  );
}

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    // Apply reduced-motion before any app script runs, so first paint and
    // mount-time animations are also suppressed. This complements
    // `use.reducedMotion: "reduce"` from playwright.config.ts.
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
      await page.addInitScript(() => {
        try {
          window.matchMedia = ((orig) => (q: string) => {
            const m = orig(q);
            if (q.includes("prefers-reduced-motion")) {
              return { ...m, matches: q.includes("reduce"), media: q } as MediaQueryList;
            }
            return m;
          })(window.matchMedia.bind(window));
        } catch { /* noop */ }
      });
    });

    for (const route of ROUTES) {
      test(`${route.name} layout`, async ({ page }) => {
        // Capture app-level console errors (filter noisy 3rd-party).
        const errors: string[] = [];
        page.on("console", (msg) => {
          if (msg.type() !== "error") return;
          const text = msg.text();
          if (/ResizeObserver|preview iframe|Lovable/.test(text)) return;
          errors.push(text);
        });

        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await waitForStable(page);
        await stabilize(page);

        // No horizontal overflow.
        const overflow = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }));
        expect(
          overflow.scroll,
          `Horizontal overflow on ${route.name} @ ${vp.name}`
        ).toBeLessThanOrEqual(overflow.client + 1);

        await expect(page).toHaveScreenshot(`${route.name}--${vp.name}.png`, {
          fullPage: true,
        });

        expect(errors, `Console errors on ${route.name} @ ${vp.name}`).toEqual([]);
      });
    }

    test(`navbar mobile drawer open`, async ({ page }) => {
      test.skip(vp.width >= 1024, "drawer is mobile-only");
      await page.goto("/");
      await waitForStable(page);
      await stabilize(page);
      const trigger = page
        .locator(
          'button[aria-label*="menu" i], button[aria-label*="القائمة"], button[aria-controls*="drawer" i], header button:has(svg.lucide-menu)'
        )
        .first();
      await trigger.click({ trial: false }).catch(() => {});
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`navbar-drawer-open--${vp.name}.png`, {
        fullPage: false,
      });
    });

    test(`footer visible`, async ({ page }) => {
      await page.goto("/");
      await waitForStable(page);
      await stabilize(page);
      const footer = page.locator("footer").first();
      await footer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await expect(footer).toHaveScreenshot(`footer--${vp.name}.png`);
    });

    test(`scroll-to-top visible after scroll`, async ({ page }) => {
      await page.goto("/");
      await waitForStable(page);
      await stabilize(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const btn = page
        .locator(
          'button[aria-label*="scroll" i], button[aria-label*="top" i], button[aria-label*="أعلى"], [data-scroll-to-top]'
        )
        .first();
      // Best-effort: only snapshot if it actually rendered (component is optional per route).
      if (await btn.count()) {
        await expect(btn).toHaveScreenshot(`scroll-to-top--${vp.name}.png`);
      } else {
        test.info().annotations.push({ type: "skip", description: "scroll-to-top button not present" });
      }
    });
  });
}