import { test, expect } from '@playwright/test';

/**
 * Regression guard: the fixed navbar + sticky search header must NEVER
 * overlap the filters sidebar or the results section, across mobile,
 * tablet, and desktop. Also asserts that text inside the audited regions
 * is visible (non-zero opacity, no `visibility:hidden`, non-zero font).
 */
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1280, height: 900 },
] as const;

for (const vp of VIEWPORTS) {
  test(`/search — header does not overlap content (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/search?q=');
    // Wait for either the sticky header to settle, or results region to mount
    await page.waitForSelector('[data-sticky-header="search"]');

    const measurements = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('[data-sticky-header="search"]');
      const navbar = document.querySelector<HTMLElement>('nav.fixed, nav[class*="fixed"]');
      const headerBottom = Math.max(
        header?.getBoundingClientRect().bottom ?? 0,
        navbar?.getBoundingClientRect().bottom ?? 0,
      );
      const targets = Array.from(
        document.querySelectorAll<HTMLElement>('[data-overlap-audit]'),
      ).map((el) => {
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return {
          key: el.getAttribute('data-overlap-audit'),
          top: r.top,
          height: r.height,
          visible: r.height > 0,
          opacity: parseFloat(cs.opacity || '1'),
          visibility: cs.visibility,
          display: cs.display,
        };
      });
      return { headerBottom, targets };
    });

    // Some targets (e.g. lg-only filters sidebar) are display:none on small
    // viewports — only audit those that are actually visible.
    const visible = measurements.targets.filter((t) => t.visible);
    expect(visible.length).toBeGreaterThan(0);
    for (const t of visible) {
      expect.soft(t.top, `${t.key} top must be >= header bottom`).toBeGreaterThanOrEqual(
        measurements.headerBottom - 1,
      );
      expect.soft(t.opacity, `${t.key} opacity > 0`).toBeGreaterThan(0);
      expect.soft(t.visibility, `${t.key} not visibility:hidden`).not.toBe('hidden');
      expect.soft(t.display, `${t.key} not display:none`).not.toBe('none');
    }

    // Text-visibility audit: every heading/paragraph inside an audited
    // region must have non-zero font and non-transparent color.
    const textIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const regions = document.querySelectorAll('[data-overlap-audit]');
      regions.forEach((region) => {
        const key = region.getAttribute('data-overlap-audit');
        region.querySelectorAll('h1, h2, h3, h4, p, span, label, button').forEach((node) => {
          const el = node as HTMLElement;
          if (!el.textContent || !el.textContent.trim()) return;
          const cs = window.getComputedStyle(el);
          const fontSize = parseFloat(cs.fontSize || '0');
          const opacity = parseFloat(cs.opacity || '1');
          // Parse rgba alpha (color "rgba(r,g,b,a)" or "rgb(r,g,b)")
          const m = cs.color.match(/rgba?\(([^)]+)\)/);
          const alpha = m ? parseFloat(m[1].split(',')[3] ?? '1') : 1;
          if (fontSize === 0) issues.push(`${key}: font-size 0 on <${el.tagName.toLowerCase()}>`);
          if (opacity === 0) issues.push(`${key}: opacity 0 on <${el.tagName.toLowerCase()}>`);
          if (alpha === 0) issues.push(`${key}: transparent color on <${el.tagName.toLowerCase()}>`);
          if (cs.visibility === 'hidden') issues.push(`${key}: visibility hidden on <${el.tagName.toLowerCase()}>`);
        });
      });
      return issues;
    });
    expect(textIssues, textIssues.join('\n')).toEqual([]);
  });
}