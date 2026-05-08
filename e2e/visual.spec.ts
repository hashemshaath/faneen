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
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
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

/** Wait for the app to be visually stable. */
async function waitForStable(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  // App boots behind a splash that disappears once React mounts; wait for it.
  await page.waitForSelector("body[data-app-ready], main, footer", { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  // Settle layout
  await page.waitForTimeout(400);
}

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`${route.name} layout`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await waitForStable(page);
        await stabilize(page);
        await expect(page).toHaveScreenshot(`${route.name}--${vp.name}.png`, {
          fullPage: true,
        });
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
  });
}