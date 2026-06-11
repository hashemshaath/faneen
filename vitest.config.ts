import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // ---- AUDIT-SCRIPT-CRASH stabilization (FULL SUITE TRIAGE A.1) ----
    // Several audit tests shell out to `node scripts/*.mjs` via
    // execSync/execFileSync. Each passes in isolation, but under full-suite
    // parallel execution the resulting fork storm exhausts CPU and surfaces
    // as STACK_TRACE_ERROR / timeout (the bulk of the pre-existing 107
    // failures). Capping fork concurrency and extending the per-test timeout
    // removes the flake without skipping tests, relaxing assertions, or
    // touching production code or audit scripts themselves.
    pool: "forks",
    poolOptions: {
      forks: {
        maxForks: 4,
        minForks: 1,
      },
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
