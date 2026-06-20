import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve("supabase/migrations");
const ADMIN_PAGE = resolve("src/pages/admin/AdminNotificationsConfig.tsx");

function findMigrationContaining(needle: string): string {
  for (const f of readdirSync(MIGRATIONS_DIR)) {
    if (!f.endsWith(".sql")) continue;
    const src = readFileSync(resolve(MIGRATIONS_DIR, f), "utf8");
    if (src.includes(needle)) return src;
  }
  throw new Error(`No migration contains: ${needle}`);
}

describe("Opportunities Phase 17B — notification_event_templates security", () => {
  const sql = findMigrationContaining("notification_event_templates");

  it("table created with RLS enabled", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.notification_event_templates/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });

  it("policies are admin-only (no anon, no service_role bypass)", () => {
    expect(sql).toMatch(/Admins read notification templates[\s\S]*has_role\(auth\.uid\(\), 'admin'\)/);
    expect(sql).toMatch(/Admins manage notification templates[\s\S]*has_role\(auth\.uid\(\), 'admin'\)/);
    expect(sql).not.toMatch(/TO\s+anon/i);
    expect(sql).not.toMatch(/GRANT[^;]*\bTO\s+anon\b[^;]*notification_event_templates/i);
  });

  it("grants restrict access to authenticated + service_role", () => {
    expect(sql).toMatch(/GRANT[^;]*ON public\.notification_event_templates TO authenticated/);
    expect(sql).toMatch(/GRANT ALL ON public\.notification_event_templates TO service_role/);
  });

  it("admin page has no service_role usage and no hardcoded admin IDs/secrets", () => {
    const src = readFileSync(ADMIN_PAGE, "utf8");
    expect(src).not.toMatch(/service_role/i);
    expect(src).not.toMatch(/SERVICE_ROLE/);
    expect(src).not.toMatch(/sk_live_|sk_test_|AIza[0-9A-Za-z_-]{20,}|EAAG[A-Za-z0-9]+/); // API key shapes
    // No literal UUID admin IDs
    expect(src).not.toMatch(/['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/);
    expect(src).not.toMatch(/\bas any\b/);
    expect(src).not.toMatch(/:\s*any\b/);
    expect(src).not.toMatch(/@ts-ignore|@ts-expect-error/);
  });

  it("seeds 22 lifecycle templates with required fields", () => {
    // Each seed row has 8 columns; count VALUES rows in the INSERT block.
    const insertBlock = sql.split("INSERT INTO public.notification_event_templates")[1] ?? "";
    const rowMatches = insertBlock.match(/\n\s*\('/g) ?? [];
    expect(rowMatches.length).toBe(22);
    // Required columns are present in the column list.
    expect(insertBlock).toMatch(/event_type, recipient_role, channel, enabled, title_ar, title_en, body_ar, body_en/);
  });

  it("template seed has no unresolved placeholders", () => {
    const insertBlock = sql.split("INSERT INTO public.notification_event_templates")[1] ?? "";
    expect(insertBlock).not.toMatch(/\{\{\s*\w+\s*\}\}/);
    expect(insertBlock).not.toMatch(/TODO|FIXME|XXX/i);
  });
});