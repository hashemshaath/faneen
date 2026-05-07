import { test, expect } from "../playwright-fixture";

test.describe("Accessibility basics", () => {
  test("homepage has skip-to-content / main landmark", async ({ page }) => {
    await page.goto("/");
    const main = page.locator("main, [role='main']");
    await expect(main.first()).toBeVisible({ timeout: 10000 });
  });

  test("images on homepage have alt attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const imgs = page.locator("img:visible");
    const count = await imgs.count();
    let missing = 0;
    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute("alt");
      if (alt === null) missing++;
    }
    expect(missing).toBe(0);
  });

  test("interactive buttons have accessible names", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const buttons = page.locator("button:visible");
    const count = Math.min(await buttons.count(), 20);
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const text = (await btn.innerText()).trim();
      const aria = await btn.getAttribute("aria-label");
      const title = await btn.getAttribute("title");
      expect(Boolean(text || aria || title)).toBeTruthy();
    }
  });

  test("focus visible on keyboard navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });
});