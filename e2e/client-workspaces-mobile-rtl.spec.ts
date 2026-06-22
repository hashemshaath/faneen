/**
 * CLIENT WORKSPACE UNIFICATION — Phase 2 E2E (mobile + RTL).
 *
 * Auth-gated routes. Without a stored session the app redirects to
 * `/auth`; that is a valid pass for this smoke layer — what we guard
 * against is route shell crashes, horizontal overflow on mobile, and
 * loss of RTL direction. With PLAYWRIGHT_STORAGE_STATE set the spec
 * additionally asserts the workspace UI itself.
 */
import { test, expect } from '../playwright-fixture';

const MOBILE = { width: 390, height: 844 };

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => ({
    docScroll: document.documentElement.scrollWidth,
    bodyScroll: document.body.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(metrics.docScroll, 'documentElement overflow').toBeLessThanOrEqual(metrics.inner + 1);
  expect(metrics.bodyScroll, 'body overflow').toBeLessThanOrEqual(metrics.inner + 1);
}

test.use({ viewport: MOBILE });

test('workspaces list — mobile RTL renders without crashing or overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const res = await page.goto('/dashboard/workspaces', { waitUntil: 'domcontentloaded' });
  expect(res?.ok(), `status ${res?.status()}`).toBeTruthy();

  // RTL preserved on both authed render and /auth redirect.
  const dir = await page.locator('html').getAttribute('dir');
  expect(dir).toBe('rtl');

  await expectNoHorizontalOverflow(page);
  expect(errors, `runtime errors: ${errors.join(' | ')}`).toEqual([]);

  if (!page.url().includes('/auth')) {
    await expect(page.locator('section[aria-label]').first()).toBeVisible({ timeout: 8000 });
  }
});

test('workspace detail — mobile RTL tabs render without overflow + disabled CTA', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // Use a syntactically-valid uuid placeholder; on /auth redirect the
  // route is never reached, and with a session the page degrades to its
  // empty/loading state rather than crashing.
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const res = await page.goto(`/dashboard/workspaces/project/${fakeId}`, {
    waitUntil: 'domcontentloaded',
  });
  expect(res?.ok(), `status ${res?.status()}`).toBeTruthy();

  const dir = await page.locator('html').getAttribute('dir');
  expect(dir).toBe('rtl');

  await expectNoHorizontalOverflow(page);
  expect(errors, `runtime errors: ${errors.join(' | ')}`).toEqual([]);

  if (!page.url().includes('/auth')) {
    const cta = page.getByTestId('workspace-create-contract-disabled');
    if (await cta.count()) {
      await expect(cta).toBeDisabled();
      await expect(cta).toHaveAttribute('aria-disabled', 'true');
    }
  }
});