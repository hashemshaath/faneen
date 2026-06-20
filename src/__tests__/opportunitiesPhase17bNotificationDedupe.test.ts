import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

function findMigrationContaining(needle: string): string {
  const dir = resolve("supabase/migrations");
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".sql")) continue;
    const src = readFileSync(resolve(dir, f), "utf8");
    if (src.includes(needle)) return src;
  }
  throw new Error(`No migration contains: ${needle}`);
}

describe("Opportunities Phase 17B — notifications_skip_duplicate trigger", () => {
  const sql = findMigrationContaining("notifications_skip_duplicate");

  it("trigger function exists and is BEFORE INSERT", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.notifications_skip_duplicate/);
    expect(sql).toMatch(/BEFORE INSERT ON public\.notifications/);
    expect(sql).toMatch(/FOR EACH ROW EXECUTE FUNCTION public\.notifications_skip_duplicate/);
  });

  it("uses 60-second window and scopes by user/type/reference", () => {
    expect(sql).toMatch(/interval '60 seconds'/);
    expect(sql).toMatch(/n\.user_id = NEW\.user_id/);
    expect(sql).toMatch(/n\.notification_type = NEW\.notification_type/);
    expect(sql).toMatch(/n\.reference_id = NEW\.reference_id/);
    expect(sql).toMatch(/n\.reference_type IS NOT DISTINCT FROM NEW\.reference_type/);
  });

  it("returns NULL only when reference_id is set (does not block standalone notifications)", () => {
    expect(sql).toMatch(/NEW\.reference_id IS NOT NULL/);
    expect(sql).toMatch(/RETURN NULL;/);
    // Default fallthrough returns NEW (no loop, no UPDATE inside trigger)
    expect(sql).toMatch(/RETURN NEW;/);
    expect(sql).not.toMatch(/INSERT INTO public\.notifications/);
    expect(sql).not.toMatch(/UPDATE public\.notifications/);
  });

  it("search_path is locked to public to prevent search_path attacks", () => {
    expect(sql).toMatch(/SET search_path = public/);
  });
});