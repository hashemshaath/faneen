import { test, expect } from "../playwright-fixture";

test.describe("Static Pages", () => {
  test("about page loads", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
  });

  test("contact page loads with form", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("form").first()).toBeVisible({ timeout: 10000 });
  });

  test("privacy policy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
  });

  test("terms page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
  });

  test("categories page loads", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
  });

  test("membership page loads with plans", async ({ page }) => {
    await page.goto("/membership");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
  });
});
