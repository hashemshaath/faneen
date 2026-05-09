import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 1,
  // CI: emit HTML report + JSON summary so failed visual diffs are easy to
  // browse from the uploaded artifact. Locally we keep the default 'list'.
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
        ["github"],
      ]
    : "list",
  outputDir: "test-results",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080",
    headless: true,
    viewport: { width: 1280, height: 720 },
    // Reduce motion → stable screenshots, no animation flicker
    reducedMotion: "reduce",
    colorScheme: "light",
  },
  // Visual snapshots tolerate tiny rendering deltas across machines/OS
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
});
