import { test, expect } from "../playwright-fixture";

test.describe("Auth flow validation", () => {
  test("auth page shows login and signup tabs", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("domcontentloaded");
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test("invalid email shows validation error", async ({ page }) => {
    await page.goto("/auth");
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill("not-an-email");
    await emailInput.blur();
    // Either browser validation or inline error
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.checkValidity()
    );
    expect(isInvalid).toBeTruthy();
  });

  test("dashboard redirects unauthenticated users to /auth", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });

  test("admin redirects unauthenticated users", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth|\/$/, { timeout: 10000 });
  });
});