import { test, expect } from "../playwright-fixture";

test.describe("Homepage", () => {
  test("loads and shows hero section with Arabic content", async ({ page }) => {
    await page.goto("/");
    // Wait for the hero heading
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
    // Navbar should be present
    await expect(page.locator("nav")).toBeVisible();
    // Footer should exist
    await expect(page.locator("footer")).toBeVisible();
  });

  test("displays stats section with animated counters", async ({ page }) => {
    await page.goto("/");
    // Scroll to stats section — look for the stats container
    const statsSection = page.locator("text=مزود خدمة").first();
    await statsSection.scrollIntoViewIfNeeded();
    await expect(statsSection).toBeVisible();
  });

  test("search input navigates to /search", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[type="search"], input[placeholder*="بحث"]').first();
    await searchInput.scrollIntoViewIfNeeded();
    await searchInput.fill("ألمنيوم");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=/);
  });
});
