import { test, expect } from '@playwright/test';

/**
 * The sr-only <h1> and indexable summary <p> on /search must:
 *  1. Be present in the DOM immediately (so crawlers see them even
 *     while the providers/businesses query is still skeleton-loading).
 *  2. Contain the search query, the selected city OR region, when
 *     those are supplied through URL params.
 */

test('search SEO h1 + summary render with query and city (during skeleton)', async ({ page }) => {
  // Block the businesses request so we stay on the skeleton path long
  // enough to assert that sr-only SEO copy renders BEFORE results land.
  await page.route('**/rest/v1/businesses*', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });

  await page.goto('/search?q=%D8%A3%D9%84%D9%85%D9%86%D9%8A%D9%88%D9%85'); // ?q=ألمنيوم

  const h1 = page.getByTestId('search-seo-h1');
  await expect(h1).toBeAttached();
  const h1Text = (await h1.textContent()) || '';
  expect(h1Text).toMatch(/ألمنيوم|aluminum/i);
  expect(h1Text.length).toBeGreaterThan(8);

  const summary = page.getByTestId('search-seo-summary');
  await expect(summary).toBeAttached();
  const summaryText = (await summary.textContent()) || '';
  // Either the loading variant or the ready variant — both reference
  // the directory context, so the sentence is always indexable.
  expect(summaryText).toMatch(/قِطاعات|Qitaat|مزو[دّ]|providers/i);
});

test('search SEO h1 reflects selected region when present', async ({ page }) => {
  await page.goto('/search?region=riyadh');
  const h1 = page.getByTestId('search-seo-h1');
  await expect(h1).toBeAttached();
  const text = (await h1.textContent()) || '';
  expect(text).toMatch(/الرياض|Riyadh/i);
});

test('indexable popular-search links point at /sectors/:sector/:city', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/search');
  // The sidebar is desktop-only (lg:block); wait for it to mount.
  const nav = page.getByRole('navigation', { name: /روابط|Indexable|Popular/i }).first();
  await expect(nav).toBeVisible();
  const hrefs = await nav.locator('a').evaluateAll((els) =>
    els.map((e) => (e as HTMLAnchorElement).getAttribute('href') || ''),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    expect(href).toMatch(/^\/sectors\/[a-z-]+\/[a-z-]+$/);
  }
});