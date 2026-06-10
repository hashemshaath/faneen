import { defineConfig, devices } from "@playwright/test";

/**
 * Dedicated cross-browser Playwright config.
 *
 * Used by the `provider-profile-taxonomy-e2e` CI gate to run the
 * `/ajanetworking` taxonomy regression spec on Chromium + Firefox + WebKit.
 * Kept separate from `playwright.config.ts` so visual-regression baselines
 * (chromium-only) are not invalidated.
 */
export default defineConfig({
  testDir: "./e2e",
  // Only the taxonomy guard runs in the cross-browser matrix. Other specs
  // continue to use the default playwright.config.ts.
  testMatch: /provider-profile-taxonomy\.spec\.ts/,
  timeout: 45_000,
  // Required gate — no silent retries that mask flake. One retry on CI only
  // to absorb cold-start network blips against the deployed preview.
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: "playwright-report-cross-browser", open: "never" }],
        ["json", { outputFile: "playwright-report-cross-browser/results.json" }],
        ["github"],
      ]
    : "list",
  outputDir: "test-results-cross-browser",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "https://qitaat.com",
    headless: true,
    reducedMotion: "reduce",
    colorScheme: "light",
    // Diagnostics on failure — required by the gate spec.
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox",  use: { ...devices["Desktop Firefox"] } },
    { name: "webkit",   use: { ...devices["Desktop Safari"] } },
  ],
});
