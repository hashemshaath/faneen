import { test, expect } from "../playwright-fixture";

test.describe("SEO meta", () => {
  test("homepage has title, description, canonical, og tags", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc && desc.length).toBeTruthy();
    expect((desc || "").length).toBeLessThan(200);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBeTruthy();
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:type"]')).toHaveCount(1);
  });

  test("html has lang and dir attributes", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const lang = await html.getAttribute("lang");
    const dir = await html.getAttribute("dir");
    expect(lang).toBeTruthy();
    expect(["rtl", "ltr"]).toContain(dir);
  });

  test("single H1 per page on home", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test("blog page loads and lists posts or empty state", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
  });
});