/**
 * ADMIN-DATA-ENRICHMENT-MICROSERVICE-1 — guard tests.
 *
 * Verifies:
 *  - Page, module barrel, edge functions, and migration exist.
 *  - The page does NOT import the Supabase client directly.
 *  - No API key / authorization header strings live in client code.
 *  - The page imports through @/modules/adminEnrichment.
 *  - The page exposes Website and Maps URL inputs.
 *  - The page never writes to `businesses` directly and never sets a
 *    `published` status (no auto-create, no auto-publish from the UI).
 *  - Comparison + confidence + conflict UI is present.
 *  - The apply edge function writes an audit row to admin_activity_log.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PAGE = "src/pages/admin/AdminDataEnrichment.tsx";
const MODULE_INDEX = "src/modules/adminEnrichment/index.ts";
const FETCH_FN = "supabase/functions/admin-enrichment-fetch/index.ts";
const ENHANCE_FN = "supabase/functions/admin-enrichment-enhance/index.ts";
const APPLY_FN = "supabase/functions/admin-enrichment-apply/index.ts";

const read = (p: string) => readFileSync(p, "utf8");

describe("ADMIN-DATA-ENRICHMENT-MICROSERVICE-1", () => {
  it("page, module, and edge functions exist", () => {
    expect(existsSync(PAGE)).toBe(true);
    expect(existsSync(MODULE_INDEX)).toBe(true);
    expect(existsSync(FETCH_FN)).toBe(true);
    expect(existsSync(ENHANCE_FN)).toBe(true);
    expect(existsSync(APPLY_FN)).toBe(true);
  });

  it("a migration file references admin_enrichment_sessions", () => {
    const dir = "supabase/migrations";
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
    const hit = files.some((f) =>
      read(join(dir, f)).includes("admin_enrichment_sessions")
    );
    expect(hit).toBe(true);
  });

  it("page does not import the supabase client directly", () => {
    const src = read(PAGE);
    expect(src).not.toMatch(/@\/integrations\/supabase\/client/);
    expect(src).not.toMatch(/supabase\.functions\.invoke/);
  });

  it("page contains no API key / authorization secrets", () => {
    const src = read(PAGE);
    expect(src).not.toMatch(/API_KEY/);
    expect(src).not.toMatch(/apiKey\s*:/i);
    expect(src).not.toMatch(/Authorization\s*:/);
    expect(src).not.toMatch(/Bearer\s+\$\{/);
  });

  it("page imports from the adminEnrichment module barrel", () => {
    const src = read(PAGE);
    expect(src).toMatch(/@\/modules\/adminEnrichment/);
  });

  it("page renders Website and Google Maps inputs", () => {
    const src = read(PAGE);
    expect(src).toMatch(/Website URL/);
    expect(src).toMatch(/Google Maps URL/);
  });

  it("page never publishes nor inserts businesses directly", () => {
    const src = read(PAGE);
    expect(src).not.toMatch(/status\s*:\s*['"]published['"]/);
    expect(src).not.toMatch(/\.from\(['"]businesses['"]\)/);
    expect(src).not.toMatch(/\.from\(['"]provider_leads['"]\)/);
  });

  it("page surfaces comparison, confidence, and conflict UI", () => {
    const src = read(PAGE);
    expect(src).toMatch(/ConfidenceBadge/);
    expect(src).toMatch(/conflict/i);
    expect(src).toMatch(/Comparison|comparison/);
  });

  it("apply edge function writes to admin_activity_log", () => {
    const src = read(APPLY_FN);
    expect(src).toMatch(/admin_activity_log/);
    expect(src).toMatch(/has_admin_access/);
  });

  it("fetch edge function gates on has_admin_access", () => {
    const src = read(FETCH_FN);
    expect(src).toMatch(/has_admin_access/);
  });
});