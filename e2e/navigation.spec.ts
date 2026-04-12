import { test, expect } from "../playwright-fixture";

test.describe("Navigation", () => {
  test("navbar links work correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Navigate to search
    await page.click('a[href="/search"]');
    await expect(page).toHaveURL(/\/search/);

    // Navigate to blog
    await page.click('a[href="/blog"]');
    await expect(page).toHaveURL(/\/blog/);

    // Navigate back to home via logo
    await page.click('a[href="/"]');
    await expect(page).toHaveURL("/");
  });

  test("404 page shown for unknown routes", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-at-all");
    await expect(page.locator("text=404").or(page.locator("text=غير موجودة"))).toBeVisible({ timeout: 10000 });
  });

  test("auth page loads login form", async ({ page }) => {
    await page.goto("/auth");
    // Should show login form with email input
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 10000 });
  });

  test("protected routes redirect to auth", async ({ page }) => {
    await page.goto("/dashboard");
    // Should redirect to /auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });
});
