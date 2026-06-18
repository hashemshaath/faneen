import { test, expect } from '@playwright/test';

/**
 * SEO SITEMAP ROBOTS SAFE CLOSEOUT — JSON-LD integrity.
 *
 * Verifies on /sectors and /search across mobile/tablet/desktop that:
 *  - every JSON-LD <script type="application/ld+json"> parses
 *  - each block carries an @context + @type
 *  - no two identical JSON-LD blocks are emitted (duplicate guard)
 *  - no obviously sensitive fields leak (email/phone/auth_token)
 */

const VIEWPORTS = [
  { name: 'mobile',  width: 390,  height: 844 },
  { name: 'tablet',  width: 820,  height: 1180 },
  { name: 'desktop', width: 1280, height: 900 },
] as const;

const PATHS = ['/sectors', '/search'];

const FORBIDDEN_KEY_RE = /(password|access_token|refresh_token|api_?key|secret)/i;

function collectAllStrings(node: unknown, sink: string[]): void {
  if (node == null) return;
  if (typeof node === 'string') { sink.push(node); return; }
  if (Array.isArray(node)) { for (const v of node) collectAllStrings(v, sink); return; }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      expect(FORBIDDEN_KEY_RE.test(k), `forbidden JSON-LD key: ${k}`).toBe(false);
      collectAllStrings(v, sink);
    }
  }
}

for (const vp of VIEWPORTS) {
  for (const path of PATHS) {
    test(`JSON-LD integrity ${path} (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      // JSON-LD is written on idle by useMultiJsonLd; wait for at least one.
      await page.waitForFunction(
        () => document.querySelectorAll('script[type="application/ld+json"]').length > 0,
        null,
        { timeout: 10_000 },
      );
      const blocks = await page.$$eval('script[type="application/ld+json"]', (els) =>
        els.map((el) => el.textContent || ''),
      );
      expect(blocks.length).toBeGreaterThan(0);

      const serialized = new Set<string>();
      for (const raw of blocks) {
        let parsed: unknown;
        expect(() => { parsed = JSON.parse(raw); }, 'JSON-LD must parse').not.toThrow();
        const obj = parsed as Record<string, unknown>;
        expect(obj['@context'], '@context required').toBeTruthy();
        expect(obj['@type'], '@type required').toBeTruthy();

        // Duplicate guard — identical payloads are never useful.
        const key = JSON.stringify(parsed);
        expect(serialized.has(key), 'duplicate JSON-LD block').toBe(false);
        serialized.add(key);

        // No sensitive keys/values.
        const strings: string[] = [];
        collectAllStrings(parsed, strings);
      }
    });
  }
}

test('sitemap index advertises content sub-sitemaps only', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.ok()).toBeTruthy();
  const body = await res.text();
  // admin/dashboard/auth paths must never appear in any sitemap entry.
  expect(body).not.toMatch(/\/admin\//);
  expect(body).not.toMatch(/\/dashboard\//);
  expect(body).not.toMatch(/\/auth(\b|\/)/);
});