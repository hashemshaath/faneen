import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const MIG_DIR = join(ROOT, "supabase", "migrations");

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|sql)$/.test(entry)) out.push(full);
  }
  return out;
}

const allSrc = walk(SRC);
const migration = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(MIG_DIR, f), "utf8"))
  .find((sql) => /CREATE TABLE[^;]*business_internal_notes/i.test(sql));

describe("BUSINESS-CORE-1: migration", () => {
  it("creates business_internal_notes with required columns", () => {
    expect(migration, "business_internal_notes migration must exist").toBeTruthy();
    const sql = migration as string;
    for (const col of [
      "ref_id",
      "business_id",
      "author_user_id",
      "body",
      "visibility",
      "pinned",
      "deleted_at",
    ]) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it("enables RLS and registers expected policies", () => {
    const sql = migration as string;
    expect(sql).toMatch(/ALTER TABLE public\.business_internal_notes ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/Admins read all internal notes/);
    expect(sql).toMatch(/Owners and managers read internal notes/);
    expect(sql).toMatch(/Staff read internal-visibility notes/);
    expect(sql).toMatch(/Owners and managers insert internal notes/);
    expect(sql).toMatch(/Authors update own internal notes/);
    expect(sql).toMatch(/Admins delete internal notes/);
  });

  it("never grants anything to anon for internal notes", () => {
    const sql = migration as string;
    expect(sql).not.toMatch(/GRANT[^;]*business_internal_notes[^;]*TO[^;]*anon/i);
  });

  it("grants authenticated CRUD + service_role on the table", () => {
    const sql = migration as string;
    expect(sql).toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON public\.business_internal_notes TO authenticated/i,
    );
    expect(sql).toMatch(/GRANT ALL ON public\.business_internal_notes TO service_role/i);
  });

  it("uses generate_ref_id with NOTE prefix and the new sequence", () => {
    const sql = migration as string;
    expect(sql).toMatch(/generate_ref_id\(\s*'NOTE'\s*,\s*'business_internal_notes_seq'\s*\)/);
    expect(sql).toMatch(/CREATE SEQUENCE IF NOT EXISTS public\.business_internal_notes_seq START 1000/);
  });
});

describe("BUSINESS-CORE-1: services", () => {
  const moduleFiles = [
    "src/modules/businesses/notes/index.ts",
    "src/modules/businesses/notes/services/listBusinessInternalNotes.ts",
    "src/modules/businesses/notes/services/insertBusinessInternalNote.ts",
    "src/modules/businesses/notes/services/updateBusinessInternalNote.ts",
    "src/modules/businesses/notes/services/listBusinessActivityTimeline.ts",
  ];

  it("ships every required wrapper", () => {
    for (const f of moduleFiles) {
      expect(existsSync(join(ROOT, f)), `${f} should exist`).toBe(true);
    }
  });

  it("activity timeline reuses business_audit_log (no new event table)", () => {
    const src = readFileSync(
      join(ROOT, "src/modules/businesses/notes/services/listBusinessActivityTimeline.ts"),
      "utf8",
    );
    expect(src).toMatch(/from\(["']business_audit_log["']\)/);
  });

  it("insert wrapper rejects empty/oversize body before hitting the DB", () => {
    const src = readFileSync(
      join(ROOT, "src/modules/businesses/notes/services/insertBusinessInternalNote.ts"),
      "utf8",
    );
    expect(src).toMatch(/body_required/);
    expect(src).toMatch(/body_too_long/);
  });

  it("update wrapper whitelists fields (no business_id/author rewrites)", () => {
    const src = readFileSync(
      join(ROOT, "src/modules/businesses/notes/services/updateBusinessInternalNote.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/business_id\s*:/);
    expect(src).not.toMatch(/author_user_id\s*:/);
    expect(src).toMatch(/safe\.body/);
    expect(src).toMatch(/safe\.pinned/);
    expect(src).toMatch(/safe\.deleted_at/);
  });
});

describe("BUSINESS-CORE-1: isolation", () => {
  const offenders = allSrc.filter((f) => {
    if (/[\\/]modules[\\/]businesses[\\/]notes[\\/]/.test(f)) return false;
    if (/[\\/]__tests__[\\/]|\.test\.|\.bench\./.test(f)) return false;
    if (/integrations[\\/]supabase[\\/]types\.ts$/.test(f)) return false;
    const src = readFileSync(f, "utf8");
    return /\.from\(\s*["']business_internal_notes["']\s*\)/.test(src);
  });

  it("only the notes module touches business_internal_notes directly", () => {
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("UI card uses the module wrappers (no raw supabase.from)", () => {
    const ui = readFileSync(
      join(ROOT, "src/components/business/BusinessInternalNotesCard.tsx"),
      "utf8",
    );
    expect(ui).not.toMatch(/supabase\.from\s*\(/);
    expect(ui).toMatch(/from\s+["']@\/modules\/businesses\/notes["']/);
  });

  it("notes slice does not touch payments / auth / contracts files", () => {
    const sliceFiles = [
      ...walk(join(SRC, "modules", "businesses", "notes")),
      join(SRC, "components", "business", "BusinessInternalNotesCard.tsx"),
    ];
    for (const f of sliceFiles) {
      const src = readFileSync(f, "utf8");
      expect(src, `${f} should not import payment/auth/contract modules`).not.toMatch(
        /@\/modules\/(memberships|installments|contracts)|@\/modules\/auth|@\/contexts\/AuthContext.*signOut/,
      );
    }
  });
});
