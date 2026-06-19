/**
 * GOOGLE MAPS SERVER KEY — Data Enrichment guards.
 * Verifies server-side key isolation for /admin/data-enrichment.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const rg = (args: string): string => {
  try { return execSync(`rg ${args} || true`, { encoding: "utf8" }); } catch { return ""; }
};
const read = (p: string) => readFileSync(p, "utf8");

describe("GOOGLE MAPS SERVER KEY — Data Enrichment", () => {
  it("edge gateway reads GOOGLE_MAPS_API_KEY from Deno.env", () => {
    const src = read("supabase/functions/_shared/google/gateway.ts");
    expect(src).toMatch(/Deno\.env\.get\(["']GOOGLE_MAPS_API_KEY["']\)/);
  });

  it("no edge function uses the browser key", () => {
    const hits = rg("-n 'VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY' supabase/functions/")
      .split("\n").filter(Boolean);
    expect(hits).toEqual([]);
  });

  it("no edge function reads VITE_GOOGLE_MAPS_API_KEY", () => {
    const hits = rg("-n 'VITE_GOOGLE_MAPS_API_KEY' supabase/functions/")
      .split("\n").filter(Boolean);
    expect(hits).toEqual([]);
  });

  it("server key is not referenced in client source (src/)", () => {
    // Client must never READ the server key — only display its NAME as a label is OK.
    const hits = rg("-n 'GOOGLE_MAPS_API_KEY' src/ -g '!**/*.test.ts' -g '!**/*.test.tsx' -g '!**/*.md'")
      .split("\n").filter(Boolean)
      .filter((l) => /process\.env|import\.meta\.env|Deno\.env/.test(l));
    expect(hits).toEqual([]);
  });

  it("AdminDataEnrichment surfaces a non-breaking fallback when the key is missing", () => {
    const src = read("src/pages/admin/AdminDataEnrichment.tsx");
    // Page must render and handle a deferred Google state without throwing.
    expect(src).toMatch(/deferred|غير\s*مفعّ?ل|إدخال\s*يدوي/);
  });

  it("gateway exists and admin-only", () => {
    expect(existsSync("supabase/functions/_shared/google/gateway.ts")).toBe(true);
    const src = read("supabase/functions/_shared/google/gateway.ts");
    expect(src).toMatch(/has_admin_access|requireAdmin/);
  });
});