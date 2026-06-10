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