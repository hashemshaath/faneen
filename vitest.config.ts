import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Patterns for tests that shell out to `node scripts/*.mjs` (or similar)
// via execSync/execFileSync/spawnSync. Under full-suite parallel execution
// these fork storms cause CPU-pressure crashes / timeouts ("STACK_TRACE_ERROR"),
// while each suite passes when run in isolation. We funnel them through a
// single fork with an extended timeout so the audit logic is exercised
// unchanged — no skips, no relaxed assertions, no production-code changes.
const AUDIT_SCRIPT_TEST_GLOBS = [
  "src/__tests__/*Audit*.test.ts",
  "src/__tests__/assetsAudit.test.ts",
  "src/__tests__/homeDeadCodeCleanup.test.ts",
  "src/__tests__/businessOperations2b.operationalAlerts.test.ts",
  "src/__tests__/businessOperations2s.manualHarness.test.ts",
  "src/__tests__/businessOperations2u.edgeEntry.test.ts",
  "src/components/admin/email-center/__tests__/email-template-preview-isolation.test.ts",
  "src/modules/__tests__/ef5SeoAdminWrappers.test.ts",
  "src/modules/businesses/services/__tests__/businessStaffIsolationAudit.test.ts",
  "src/modules/contracts/services/__tests__/ct8MigrationGuard.test.ts",
  "src/modules/contracts/services/__tests__/ct10ContractsUpdateMigration.test.ts",
  "src/modules/contracts/services/__tests__/ct11AnalyticsMigration.test.ts",
  "src/modules/contracts/services/__tests__/ct12PdfExportRpcMigration.test.ts",
  "src/modules/identity/services/roles/__tests__/id2RoleReadsMigration.test.ts",
  "src/tests/googleIntegrationGovernanceAudit1.test.ts",
  "src/tests/serviceConfigurationGovernanceAudit1.test.ts",
  "src/tests/supabaseDatabaseDeepRepair1.test.ts",
];

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    projects: [
      {
        extends: true,
        test: {
          name: "default",
          exclude: [...AUDIT_SCRIPT_TEST_GLOBS, "node_modules/**", "dist/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "audit-scripts",
          include: AUDIT_SCRIPT_TEST_GLOBS,
          // Funnel all script-spawning audit tests through one fork to avoid
          // fork-storm crashes under CPU pressure in full-suite runs.
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
