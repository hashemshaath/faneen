/**
 * GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1 — guard tests.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const read = (p: string) => readFileSync(p, "utf8");
const rg = (args: string): string => {
  try { return execSync(`rg ${args} || true`, { encoding: "utf8" }); } catch { return ""; }
};

describe("GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1", () => {
  it("unified module exists with all required services", () => {
    expect(existsSync("src/modules/google/index.ts")).toBe(true);
    expect(existsSync("src/modules/google/mapsService.ts")).toBe(true);
    expect(existsSync("src/modules/google/placesService.ts")).toBe(true);
    expect(existsSync("src/modules/google/geocodingService.ts")).toBe(true);
    expect(existsSync("src/modules/google/addressValidationService.ts")).toBe(true);
    expect(existsSync("src/modules/google/routesService.ts")).toBe(true);
    expect(existsSync("src/modules/google/healthService.ts")).toBe(true);
  });

  it("all required edge functions exist", () => {
    for (const fn of ["google-places", "google-geocoding", "google-routes", "google-address-validation", "google-health"]) {
      expect(existsSync(`supabase/functions/${fn}/index.ts`)).toBe(true);
    }
    expect(existsSync("supabase/functions/_shared/google/gateway.ts")).toBe(true);
  });

  it("frontend never calls the Google gateway directly", () => {
    const out = rg("-n 'connector-gateway\\.lovable\\.dev/google_maps' src/ -g '!**/__tests__/**' -g '!**/*.test.*'");
    expect(out.trim()).toBe("");
  });

  it("no hardcoded Google API keys (AIza…) in src/ or supabase/functions/", () => {
    const out = rg("-n 'AIza[0-9A-Za-z_\\-]{20,}' src/ supabase/functions/ -g '!**/*.test.*'");
    expect(out.trim()).toBe("");
  });

  it("browser key env var is only read inside mapsService.ts", () => {
    const out = rg("-n 'VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY' src/");
    const offenders = out
      .split("\n").filter((l) => l.trim())
      .filter((l) => !l.startsWith("src/modules/google/mapsService.ts"))
      .filter((l) => !l.startsWith("src/tests/googleIntegrationGovernanceAudit1.test.ts"));
    expect(offenders).toEqual([]);
  });

  it("edge functions never read VITE_ browser env vars", () => {
    const out = rg("-n 'import\\.meta\\.env\\.VITE_' supabase/functions/");
    expect(out.trim()).toBe("");
  });

  it("AdminDataEnrichment imports the unified maps service", () => {
    const src = read("src/pages/admin/AdminDataEnrichment.tsx");
    expect(src).toContain("@/modules/google");
    expect(src).not.toMatch(/VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY/);
  });

  it("admin health dashboard page + route exist", () => {
    expect(existsSync("src/pages/admin/AdminGoogleServices.tsx")).toBe(true);
    const app = read("src/App.tsx");
    expect(app).toContain("AdminGoogleServices");
    expect(app).toContain("/admin/integrations/google");
  });

  it("new google-* edge functions do not read GOOGLE_MAPS_API_KEY directly", () => {
    const out = rg("-n 'GOOGLE_MAPS_API_KEY' supabase/functions/ -g '!_shared/**'");
    const offenders = out.split("\n").filter(Boolean)
      .filter((l) => /supabase\/functions\/google-/.test(l));
    expect(offenders).toEqual([]);
  });

  it("usage log table migration exists", () => {
    const out = rg("-l 'google_api_usage_log' supabase/migrations/");
    expect(out.trim().length).toBeGreaterThan(0);
  });
});