import { test, expect } from "../playwright-fixture";

/**
 * E2E regression — Provider Profile Routing + Taxonomy Freshness.
 *
 * REQUIRED CI GATE. Runs cross-browser via `playwright.cross-browser.config.ts`
 * (Chromium + Firefox + WebKit) and as a regular spec via `playwright.config.ts`
 * on Chromium. Any failure must block merge / deploy.
 *
 * The `/ajanetworking` provider profile must, in every browser:
 *   1. Resolve and render (not 404 / not stuck on a loader).
 *   2. Render the business name (h1, `data-testid="business-profile-name"`).
 *   3. Render the taxonomy block (`data-testid="business-profile-taxonomy"`).
 *   4. Render at least one real taxonomy chip
 *      (`data-testid="business-profile-taxonomy-chip"`) with non-empty text.
 *   5. Never contain the "غير مصنّف" / "Unclassified" fallback.
 *   6. Never contain raw slugs (e.g. `aluminum-works`) — labels only.
 */
const TARGET_USERNAME = "ajanetworking";

const FORBIDDEN_FALLBACKS = ["غير مصنّف", "Unclassified"] as const;
// Raw taxonomy slugs must NEVER leak into the UI — labels only.
const FORBIDDEN_SLUGS = [
  "aluminum-works",
  "technology-systems",
  "aluminum-glass-facades",
] as const;

test.describe(`Provider profile /${TARGET_USERNAME}`, () => {
  test("renders a real taxonomy label and never the fallback", async ({ page }) => {
    await page.goto(`/${TARGET_USERNAME}`);
    await page.waitForLoadState("networkidle");

    // 1. Not a 404 screen.
    await expect(
      page.locator("text=404").or(page.locator("text=غير موجودة")),
    ).toHaveCount(0);

    // 2. Business name renders — wait for the stable test id rather than
    //    any h1 (auth/marketing pages also use h1).
    const nameEl = page.getByTestId("business-profile-name");
    await expect(nameEl).toBeVisible({ timeout: 20_000 });
    await expect(nameEl).not.toHaveText("");

    // 3. Taxonomy block renders (the section is rendered conditionally only
    //    when a label exists, which itself catches a "no data at all" bug).
    const taxonomy = page.getByTestId("business-profile-taxonomy");
    await expect(taxonomy).toBeVisible({ timeout: 20_000 });

    // 4. At least one real chip with non-empty, non-fallback text.
    const chips = page.getByTestId("business-profile-taxonomy-chip");
    await expect(chips.first()).toBeVisible({ timeout: 20_000 });
    const count = await chips.count();
    expect(count, "expected at least one taxonomy chip").toBeGreaterThan(0);

    const chipTexts: string[] = [];
    for (let i = 0; i < count; i++) {
      const txt = (await chips.nth(i).innerText()).trim();
      expect(txt, `chip #${i} must not be empty`).not.toBe("");
      for (const bad of FORBIDDEN_FALLBACKS) {
        expect(txt, `chip #${i} must not equal fallback '${bad}'`).not.toBe(bad);
      }
      chipTexts.push(txt);
    }
    // Surface the actual rendered labels into the report for diagnostics.
    test.info().annotations.push({
      type: "taxonomy-chips",
      description: chipTexts.join(" · "),
    });

    // 5. Page must not contain the fallback ANYWHERE.
    const body = page.locator("body");
    for (const bad of FORBIDDEN_FALLBACKS) {
      await expect(body, `body must not contain '${bad}'`).not.toContainText(bad);
    }
    // 6. No raw slugs leaking into the rendered UI.
    for (const slug of FORBIDDEN_SLUGS) {
      await expect(body, `body must not contain raw slug '${slug}'`).not.toContainText(slug);
    }
  });

  // Exercise the RTL provider-profile path across narrow + tablet widths to
  // catch layout regressions AND any data-timing race that would surface a
  // transient "غير مصنّف" fallback on smaller, slower viewports.
  const RTL_MOBILE_VIEWPORTS = [
    { name: "xs-360",    width: 360, height: 800 },  // smallest supported (mem://style/layout/mobile-optimization)
    { name: "iphone-390", width: 390, height: 844 }, // iPhone 12/13/14
    { name: "tablet-768", width: 768, height: 1024 }, // iPad portrait
  ] as const;

  for (const vp of RTL_MOBILE_VIEWPORTS) {
    test(`RTL @ ${vp.name} (${vp.width}px) never renders the 'غير مصنّف' fallback`, async ({ page, context }) => {
      // Force Arabic UI by seeding the LanguageContext localStorage key BEFORE
      // the SPA boots — guarantees <html dir="rtl"> and Arabic copy.
      await context.addInitScript(() => {
        try { localStorage.setItem("qitaat_lang", "ar"); } catch { /* ignore */ }
      });
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`/${TARGET_USERNAME}`);
      await page.waitForLoadState("networkidle");

      // Sanity — we actually exercised the RTL path.
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

      // Page resolved — wait for the business name test id.
      await expect(page.getByTestId("business-profile-name")).toBeVisible({ timeout: 20_000 });

      // Wait for the taxonomy block to appear before asserting absence of
      // the fallback — guarantees React Query has settled and we are not
      // racing the request.
      await expect(page.getByTestId("business-profile-taxonomy")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("business-profile-taxonomy-chip").first()).toBeVisible({
        timeout: 20_000,
      });

      // Strict negative assertions — taxonomy must render real labels.
      const body = page.locator("body");
      for (const bad of FORBIDDEN_FALLBACKS) {
        await expect(body).not.toContainText(bad);
      }

      // No horizontal scroll on narrow widths — RTL layout must contain itself.
      if (vp.width <= 414) {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `horizontal overflow at ${vp.width}px`).toBeLessThanOrEqual(1);
      }
    });
  }

  test("/q/ alias is not used for company profiles", async ({ page }) => {
    // The provider profile lives at the bare `/:username` route. The `/q/`
    // prefix is reserved for quote requests and must not steal the
    // username — guard against future routing regressions.
    const response = await page.goto(`/q/${TARGET_USERNAME}`);
    // Either a 404 or a redirect away from `/q/ajanetworking` is acceptable;
    // what is NOT acceptable is the company profile rendering under `/q/`.
    if (response && response.ok()) {
      await expect(page).not.toHaveURL(new RegExp(`/q/${TARGET_USERNAME}$`));
    }
  });
});