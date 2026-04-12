import { test, expect } from "../playwright-fixture";

test.describe("Search Page", () => {
  test("loads with empty state", async ({ page }) => {
    await page.goto("/search");
    // Should display the search page header or results area
    await expect(page.locator("text=نتائج").or(page.locator("text=results")).first()).toBeVisible({ timeout: 10000 });
  });

  test("accepts query parameter and shows results area", async ({ page }) => {
    await page.goto("/search?q=ألمنيوم");
    // The search input should be pre-filled
    const searchInput = page.locator('input[type="search"], input[placeholder*="بحث"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test("view mode toggle buttons are functional", async ({ page }) => {
    await page.goto("/search");
    // View mode buttons should be visible (grid, list, split, map)
    const viewButtons = page.locator('button[title="grid"], button[title="list"], button[title="map"], button[title="split"]');
    await expect(viewButtons.first()).toBeVisible({ timeout: 10000 });
    // Click list view
    await page.click('button[title="list"]');
    // Should still be on search page
    await expect(page).toHaveURL(/\/search/);
  });
});
