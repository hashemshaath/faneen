import { test, expect } from "../playwright-fixture";

/**
 * E2E regression — Provider Profile Routing + Taxonomy Freshness.
 *
 * The `/ajanetworking` provider profile must:
 *   1. Resolve and render (not 404 / not stuck on a loader).
 *   2. Display a real taxonomy label (NOT the "غير مصنّف" / "Unclassified"
 *      fallback badge) — its database links to taxonomy_categories are
 *      published, so any RLS / cache regression that hides them is a P0.
 *
 * Keep this lightweight and resilient: we only assert the negative
 * (no "غير مصنّف" / no "Unclassified") rather than coupling to the exact
 * label, which can evolve.
 */
const TARGET_USERNAME = "ajanetworking";

test.describe(`Provider profile /${TARGET_USERNAME}`, () => {
  test("resolves and never renders the 'غير مصنّف' fallback", async ({ page }) => {
    await page.goto(`/${TARGET_USERNAME}`);
    await page.waitForLoadState("networkidle");

    // Page resolved — must NOT be the 404 screen.
    await expect(
      page.locator("text=404").or(page.locator("text=غير موجودة")),
    ).toHaveCount(0);

    // Header h1 must be present (business name is rendered there).
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // Taxonomy freshness — the public profile must NOT render the
    // "غير مصنّف" / "Unclassified" fallback for this known-good provider.
    await expect(page.locator("body")).not.toContainText("غير مصنّف");
    await expect(page.locator("body")).not.toContainText("Unclassified");
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

      // Page resolved.
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

      // Give React Query a beat to settle any deferred taxonomy refetch — we
      // want to catch flashes too, not just the final paint.
      await page.waitForTimeout(750);

      // Strict negative assertions — taxonomy must render real labels.
      await expect(page.locator("body")).not.toContainText("غير مصنّف");
      await expect(page.locator("body")).not.toContainText("Unclassified");

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