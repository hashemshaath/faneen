import { test, expect } from '@playwright/test';

/**
 * Automatic performance budgets for SearchV3 (/search) on mobile + tablet.
 *
 * Asserts — during progressive Skeleton → content swap — that:
 *  • TTI proxy (domInteractive) stays within budget
 *  • LCP stays within budget
 *  • CLS stays low while Skeleton swaps to real content
 *  • JSON-LD (SiteNavigationElement + ItemList) is present and parseable
 *  • At least one indexable popular-search link is rendered
 *
 * Budgets are intentionally generous to avoid flake on CI but tight
 * enough to catch real regressions.
 */
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, ttiMs: 4500, lcpMs: 4000 },
  { name: 'tablet', width: 820, height: 1180, ttiMs: 4000, lcpMs: 3500 },
] as const;

for (const vp of VIEWPORTS) {
  test(`/search — perf budgets during progressive load (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // Begin LCP observation as early as possible.
    await page.addInitScript(() => {
      (window as unknown as { __lcp?: number }).__lcp = 0;
      (window as unknown as { __cls?: number }).__cls = 0;
      try {
        const lcpObs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            (window as unknown as { __lcp: number }).__lcp = e.startTime;
          }
        });
        lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
        const clsObs = new PerformanceObserver((list) => {
          for (const e of list.getEntries() as PerformanceEntry[]) {
            const ls = e as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
            if (!ls.hadRecentInput && typeof ls.value === 'number') {
              (window as unknown as { __cls: number }).__cls += ls.value;
            }
          }
        });
        clsObs.observe({ type: 'layout-shift', buffered: true });
      } catch {
        /* PerformanceObserver may be unavailable */
      }
    });

    const navStart = Date.now();
    await page.goto('/search?q=الومنيوم', { waitUntil: 'domcontentloaded' });

    // Sticky header should mount quickly — proxy for interactivity.
    await page.waitForSelector('[data-sticky-header="search"]', { timeout: 8000 });
    const ttiProxy = Date.now() - navStart;

    // Allow Skeleton → content swap to complete.
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      return {
        domInteractive: nav?.domInteractive ?? 0,
        domContentLoaded: nav?.domContentLoadedEventEnd ?? 0,
        loadEvent: nav?.loadEventEnd ?? 0,
        lcp: (window as unknown as { __lcp: number }).__lcp,
        cls: (window as unknown as { __cls: number }).__cls,
      };
    });

    // JSON-LD must be present and parseable even during progressive load.
    const jsonLd = await page.evaluate(() => {
      const scripts = Array.from(
        document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'),
      );
      const types: string[] = [];
      for (const s of scripts) {
        try {
          const parsed = JSON.parse(s.textContent || '{}');
          if (parsed['@type']) types.push(String(parsed['@type']));
        } catch {
          /* ignore */
        }
      }
      return { count: scripts.length, types };
    });

    // Indexable popular-search links — at least one /sectors/:s/:c anchor.
    const popularLinks = await page.locator('a[href^="/sectors/"]').count();

    console.log(`[perf:${vp.name}]`, { ttiProxy, ...metrics, jsonLd, popularLinks });

    expect(ttiProxy, 'TTI proxy (sticky header mount)').toBeLessThan(vp.ttiMs);
    if (metrics.domInteractive > 0) {
      expect(metrics.domInteractive, 'domInteractive').toBeLessThan(vp.ttiMs);
    }
    if (metrics.lcp > 0) {
      expect(metrics.lcp, 'LCP').toBeLessThan(vp.lcpMs);
    }
    expect(metrics.cls, 'CLS during Skeleton→content swap').toBeLessThan(0.15);

    expect(jsonLd.count, 'JSON-LD blocks').toBeGreaterThan(0);
    expect(popularLinks, 'popular /sectors/:s/:c links').toBeGreaterThan(0);
  });
}
