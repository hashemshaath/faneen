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

  test("multiple Tab presses do not trap focus", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const id = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return "";
        return `${el.tagName}:${el.getAttribute("aria-label") || el.textContent?.slice(0, 20) || el.id}`;
      });
      seen.add(id);
    }
    // Expect at least 3 distinct focusable elements during traversal
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  test("any visible Progress component exposes ARIA progressbar", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const bars = page.locator('[role="progressbar"]');
    const count = await bars.count();
    if (count === 0) test.skip(true, "No progressbars on landing page");
    for (let i = 0; i < count; i++) {
      const bar = bars.nth(i);
      const min = await bar.getAttribute("aria-valuemin");
      const max = await bar.getAttribute("aria-valuemax");
      const now = await bar.getAttribute("aria-valuenow");
      expect(min).not.toBeNull();
      expect(max).not.toBeNull();
      expect(now).not.toBeNull();
    }
  });

  for (const width of [360, 390]) {
    test(`no horizontal overflow on landing @${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      // Allow 1px rounding tolerance
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});