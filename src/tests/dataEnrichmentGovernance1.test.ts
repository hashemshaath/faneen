// DATA-ENRICHMENT-GOVERNANCE-1 — guard tests.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  listSources, SOURCE_REGISTRY,
  normalizePhone, normalizeEmail, normalizeUrl, normalizeCity,
  scoreField, detectConflicts, computeQuality,
  ENRICHMENT_EVENTS,
} from "@/modules/dataEnrichment";

const read = (p: string) => readFileSync(p, "utf8");

describe("DATA-ENRICHMENT-GOVERNANCE-1", () => {
  it("module barrel exports the documented surface", () => {
    expect(typeof listSources).toBe("function");
    expect(typeof normalizePhone).toBe("function");
    expect(typeof scoreField).toBe("function");
    expect(typeof detectConflicts).toBe("function");
    expect(typeof computeQuality).toBe("function");
  });

  it("source registry contains all 11 sources with valid trust weights", () => {
    const sources = listSources();
    expect(sources).toHaveLength(11);
    const expected = [
      "google_places","google_maps","firecrawl_website","website_crawl",
      "national_address","manual_admin","provider_registration",
      "supplier_import","csv_import","brand_import","future_api",
    ];
    expected.forEach((k) => expect(SOURCE_REGISTRY).toHaveProperty(k));
    sources.forEach((s) => {
      expect(s.trust_weight).toBeGreaterThanOrEqual(0);
      expect(s.trust_weight).toBeLessThanOrEqual(1);
    });
  });

  it("normalizes Riyadh aliases, +966 phones, lowercased email, stripped URL", () => {
    expect(normalizeCity("الرياض")).toBe("riyadh");
    expect(normalizeCity("Riyadh")).toBe("riyadh");
    expect(normalizePhone("0501234567")).toBe("+966501234567");
    expect(normalizePhone("00966501234567")).toBe("+966501234567");
    expect(normalizeEmail("  TEST@Example.COM ")).toBe("test@example.com");
    expect(normalizeUrl("https://Example.com/?utm_source=x")).toBe("https://example.com");
  });

  it("confidence: google+website agree >=95, website-only 70, manual 60, ai-only 50", () => {
    const agree = scoreField("name_ar", [
      { source: "google_places", value: "ABC" },
      { source: "firecrawl_website", value: "ABC" },
    ]);
    expect(agree).toBeGreaterThanOrEqual(95);
    expect(scoreField("name_ar", [{ source: "firecrawl_website", value: "X" }])).toBe(70);
    expect(scoreField("name_ar", [{ source: "manual_admin", value: "X" }])).toBe(60);
    expect(scoreField("name_ar", [{ source: "future_api", value: "X" }])).toBe(50);
  });

  it("conflict resolver detects disagreement, none on agreement", () => {
    const disagree = detectConflicts(
      { google_places: { city: "riyadh" }, firecrawl_website: { city: "jeddah" } },
      ["city"],
    );
    expect(disagree).toHaveLength(1);
    const agree = detectConflicts(
      { google_places: { city: "riyadh" }, firecrawl_website: { city: "riyadh" } },
      ["city"],
    );
    expect(agree).toHaveLength(0);
  });

  it("quality scoring returns 0..100 with breakdown", () => {
    const q = computeQuality({ name_ar: "X", phone: "+966500000000", city: "riyadh" });
    expect(q.score).toBeGreaterThanOrEqual(0);
    expect(q.score).toBeLessThanOrEqual(100);
    expect(q.breakdown).toHaveProperty("profile");
  });

  it("all observability events are declared", () => {
    ["enrichment_started","enrichment_completed","enrichment_failed",
     "conflict_detected","conflict_resolved","enrichment_approved"]
      .forEach((e) => expect(ENRICHMENT_EVENTS).toContain(e));
  });

  it("edge functions exist and gate on admin", () => {
    const fns = [
      "supabase/functions/data-enrichment-ingest/index.ts",
      "supabase/functions/data-enrichment-run/index.ts",
      "supabase/functions/data-enrichment-resolve/index.ts",
      "supabase/functions/data-enrichment-approve/index.ts",
      "supabase/functions/data-enrichment-quality/index.ts",
    ];
    fns.forEach((f) => {
      expect(existsSync(f)).toBe(true);
      const src = read(f);
      expect(src).toMatch(/requireAdmin/);
    });
  });

  it("admin page exists, registered in App.tsx, linked from sidebar", () => {
    expect(existsSync("src/pages/admin/AdminDataEnrichmentGovernance.tsx")).toBe(true);
    const app = read("src/App.tsx");
    expect(app).toMatch(/AdminDataEnrichmentGovernance/);
    expect(app).toMatch(/\/admin\/data-enrichment-governance/);
    const sb = read("src/components/dashboard/DashboardSidebar.tsx")
      + '\n' + read("src/modules/admin-shell/navigation/adminNavigation.ts");
    expect(sb).toMatch(/\/admin\/data-enrichment-governance/);
  });

  it("no page/component calls data-enrichment edge functions directly", () => {
    const dirs = ["src/pages", "src/components", "src/hooks"];
    const offenders: string[] = [];
    const re = /functions\.invoke\(['"`]data-enrichment-/;
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(p));
        else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
      }
      return out;
    };
    dirs.filter((d) => existsSync(d)).flatMap(walk).forEach((f) => {
      if (re.test(read(f))) offenders.push(f);
    });
    expect(offenders).toEqual([]);
  });

  it("migration creates the four governance tables", () => {
    const dir = "supabase/migrations";
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
    const hit = files.some((f) => {
      const s = read(join(dir, f));
      return s.includes("data_enrichment_sources")
        && s.includes("data_enrichment_records")
        && s.includes("data_enrichment_audit")
        && s.includes("data_enrichment_quality_snapshots");
    });
    expect(hit).toBe(true);
  });
});