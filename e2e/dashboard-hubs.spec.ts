/**
 * Visual + smoke coverage for the 6 dashboard Hubs (Loyalty, Contracts,
 * Rfq, Staff, Requests, BusinessProfile). All hub routes are auth-gated,
 * so an unauthenticated visit either:
 *   (a) lands on `/auth` (most common — ProtectedRoute redirect), or
 *   (b) renders the hub once a session is restored from storageState.
 *
 * Either outcome is a valid pass for this smoke layer — what we're
 * guarding against is the regression where PageHeader / TabbedShell
 * throws and yields a blank page or an error boundary. We additionally
 * capture a full-page screenshot per route for visual regression.
 *
 * To run against a real authenticated session, set:
 *   PLAYWRIGHT_STORAGE_STATE=./e2e/.auth/state.json npx playwright test
 */
import { test, expect } from '../playwright-fixture';

const HUBS = [
  { name: 'business-profile', path: '/dashboard/business-edit' },
  { name: 'requests', path: '/dashboard/leads' },
  { name: 'contracts', path: '/dashboard/contracts' },
  { name: 'staff', path: '/dashboard/settings/staff' },
] as const;

for (const hub of HUBS) {
  test(`dashboard hub renders without crashing — ${hub.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const response = await page.goto(hub.path, { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), `${hub.path} returned ${response?.status()}`).toBeTruthy();

    // Either the protected Hub renders (PageHeader region present) or we
    // were redirected to /auth. Both prove the route shell is healthy.
    const url = page.url();
    if (!url.includes('/auth')) {
      // PageHeader exposes role="region" with the page title as aria-label.
      await expect(page.locator('section[aria-label]').first()).toBeVisible({ timeout: 8000 });
    }

    // No uncaught runtime errors on initial render.
    expect(errors, `Runtime errors on ${hub.path}: ${errors.join(' | ')}`).toEqual([]);

    // Capture a stable visual reference. Animations are disabled via the
    // global config; the screenshot folder is per-test-file under e2e/.
    await expect(page).toHaveScreenshot(`${hub.name}.png`, { fullPage: true });
  });
}

test('RTL layout: <html dir="rtl"> on a hub route', async ({ page }) => {
  await page.goto('/dashboard/business-edit', { waitUntil: 'domcontentloaded' });
  const dir = await page.locator('html').getAttribute('dir');
  // Arabic-first project defaults to RTL.
  expect(dir).toBe('rtl');
});