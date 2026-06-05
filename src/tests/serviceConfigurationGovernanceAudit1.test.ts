/**
 * SERVICE-CONFIGURATION-GOVERNANCE-AUDIT-1 — Phase 2 guard tests.
 * Ensures: no hardcoded secrets, no duplicate config sources,
 * every external service routes through the shared layer, and the
 * unified /admin/integrations page + 4 new health probes exist.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const read = (p: string) => readFileSync(p, "utf8");
const rg = (args: string): string => {
  try { return execSync(`rg ${args} || true`, { encoding: "utf8" }); } catch { return ""; }
};

describe("SERVICE-CONFIGURATION-GOVERNANCE-AUDIT-1", () => {
  it("unified /admin/integrations page exists and is routed", () => {
    expect(existsSync("src/pages/admin/AdminIntegrations.tsx")).toBe(true);
    const app = read("src/App.tsx");
    expect(app).toMatch(/AdminIntegrations/);
    expect(app).toMatch(/path="\/admin\/integrations"/);
  });

  it("all four new health edge functions exist", () => {
    for (const fn of ["resend-health", "moyasar-health", "firecrawl-health", "lovable-ai-health"]) {
      expect(existsSync(`supabase/functions/${fn}/index.ts`)).toBe(true);
    }
    expect(existsSync("supabase/functions/_shared/health/probe.ts")).toBe(true);
  });

  it("health probes require admin gating", () => {
    for (const fn of ["resend-health", "moyasar-health", "firecrawl-health", "lovable-ai-health"]) {
      const src = read(`supabase/functions/${fn}/index.ts`);
      expect(src, fn).toMatch(/requireAdminHealth/);
    }
  });

  it("no hardcoded provider keys in src/", () => {
    // Look for typical key prefixes in source. tests/docs/fixtures excluded.
    const out = rg(`-n --no-heading -g 'src/**' -g '!src/tests/**' -e 'AIza[0-9A-Za-z_-]{20,}' -e 'sk_live_[0-9A-Za-z]{20,}' -e 're_[0-9A-Za-z_-]{20,}'`);
    expect(out.trim()).toBe("");
  });

  it("browser Google Maps key is only read inside mapsService.ts", () => {
    const out = rg(`-n --no-heading -g 'src/**' -g '!src/modules/google/mapsService.ts' -g '!src/tests/**' 'VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'`);
    expect(out.trim()).toBe("");
  });

  it("platform_settings is not used to read live service keys", () => {
    // Only metadata reads (branding/theme) are allowed; nothing under supabase/functions/ should query it.
    const out = rg(`-n --no-heading -g 'supabase/functions/**' 'platform_settings'`);
    expect(out.trim()).toBe("");
  });

  it("integrations page lists every governed service", () => {
    const src = read("src/pages/admin/AdminIntegrations.tsx");
    for (const id of ["google", "lovable_ai", "resend", "moyasar", "firecrawl", "gtm"]) {
      expect(src, id).toMatch(new RegExp(`id:\\s*"${id}"`));
    }
  });
});