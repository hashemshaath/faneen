import { test, expect } from '@playwright/test';

/**
 * On every viewport the popular `/sectors/:sector/:city` quick-links
 * must render at least once with valid hrefs and indexable text, and
 * the SiteNavigationElement JSON-LD must include the same combos.
 * Mobile/tablet render them under the results card; desktop renders
 * them inside the sidebar.
 */
const VIEWPORTS = [
  { name: 'mobile',        width: 390, height: 844 },
  { name: 'tablet',        width: 820, height: 1180 },
  { name: 'large-tablet',  width: 1100, height: 1300 },
  { name: 'desktop',       width: 1280, height: 900 },
] as const;

for (const vp of VIEWPORTS) {
  test(`/search popular links + JSON-LD render (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/search', { waitUntil: 'domcontentloaded' });

    // 1. At least one popular-search nav with valid /sectors/:s/:c links.
    const nav = page.getByRole('navigation', { name: /روابط|Popular|Indexable/i }).first();
    await expect(nav).toBeVisible();
    const links = nav.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(8);

    for (let i = 0; i < count; i++) {
      const a = links.nth(i);
      const href = (await a.getAttribute('href')) || '';
      expect(href).toMatch(/^\/sectors\/[a-z-]+\/[a-z-]+$/);
      const text = ((await a.textContent()) || '').trim();
      expect(text.length).toBeGreaterThan(2);
      // Must contain visible indexable text in either Arabic or English.
      expect(text).toMatch(/[\u0600-\u06FF]|[a-zA-Z]/);
    }

    // 2. SiteNavigationElement JSON-LD ships with the same combos.
    // JSON-LD is written on idle so wait briefly for it.
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .some((s) => (s.textContent || '').includes('SiteNavigationElement')),
      undefined,
      { timeout: 5000 },
    );

    const navJsonLd = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent || 'null');
          if (data && data['@type'] === 'SiteNavigationElement') return data;
        } catch { /* ignore */ }
      }
      return null;
    });
    expect(navJsonLd).not.toBeNull();
    expect(Array.isArray(navJsonLd.hasPart)).toBe(true);
    expect(navJsonLd.hasPart.length).toBeGreaterThanOrEqual(8);
    for (const part of navJsonLd.hasPart) {
      expect(part.url).toMatch(/^https:\/\/qitaat\.com\/sectors\/[a-z-]+\/[a-z-]+$/);
    }
  });
}