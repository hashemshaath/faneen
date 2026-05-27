import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const ADMIN = join(SRC, "pages/admin/AdminBusinesses.tsx");
const PROVIDER = join(SRC, "pages/dashboard/DashboardBusinessEdit.tsx");
const PANEL = join(SRC, "components/business/BusinessOperationsPanel.tsx");
const NOTES = join(SRC, "components/business/BusinessInternalNotesCard.tsx");
const TIMELINE = join(SRC, "components/business/BusinessActivityTimelineCard.tsx");

describe("BUSINESS-CORE-2: admin UI integration", () => {
  const admin = readFileSync(ADMIN, "utf8");

  it("imports BusinessOperationsPanel", () => {
    expect(admin).toMatch(
      /import\s*\{\s*BusinessOperationsPanel\s*\}\s*from\s*["']@\/components\/business\/BusinessOperationsPanel["']/,
    );
  });

  it("adds an 'ops' tab and renders the panel only when a business is open", () => {
    expect(admin).toMatch(/TabsTrigger\s+value="ops"/);
    expect(admin).toMatch(/TabsContent\s+value="ops"/);
    expect(admin).toMatch(/<BusinessOperationsPanel\s+businessId=\{editingBiz\.id\}/);
  });

  it("never queries notes/timeline inside the list rows", () => {
    // BusinessOperationsPanel is gated by editingBiz — verify no notes/timeline
    // hook usage at module scope outside the detail tab.
    expect(admin).not.toMatch(/listBusinessInternalNotes/);
    expect(admin).not.toMatch(/listBusinessActivityTimeline/);
  });
});

describe("BUSINESS-CORE-2: provider UI integration", () => {
  const provider = readFileSync(PROVIDER, "utf8");

  it("imports BusinessInternalNotesCard in the provider business edit page", () => {
    expect(provider).toMatch(
      /import\s*\{\s*BusinessInternalNotesCard\s*\}\s*from\s*["']@\/components\/business\/BusinessInternalNotesCard["']/,
    );
  });

  it("renders the notes card with the provider's form.id (RLS-gated)", () => {
    expect(provider).toMatch(/<BusinessInternalNotesCard\s+businessId=\{form\.id\}/);
  });

  it("does not import the activity timeline (admin-leaning surface only in BUSINESS-CORE-2)", () => {
    expect(provider).not.toMatch(/BusinessActivityTimelineCard/);
  });
});

describe("BUSINESS-CORE-2: behavior contracts", () => {
  const notes = readFileSync(NOTES, "utf8");
  const timeline = readFileSync(TIMELINE, "utf8");
  const panel = readFileSync(PANEL, "utf8");

  it("internal notes card uses wrappers (not direct supabase.from)", () => {
    expect(notes).not.toMatch(/supabase\.from\s*\(/);
    expect(notes).toMatch(/insertBusinessInternalNote/);
    expect(notes).toMatch(/updateBusinessInternalNote/);
    expect(notes).toMatch(/softDeleteBusinessInternalNote/);
    expect(notes).toMatch(/listBusinessInternalNotes/);
  });

  it("activity timeline card uses listBusinessActivityTimeline wrapper", () => {
    expect(timeline).not.toMatch(/supabase\.from\s*\(/);
    expect(timeline).toMatch(/listBusinessActivityTimeline/);
  });

  it("timeline never JSON.stringify-dumps metadata", () => {
    expect(timeline).not.toMatch(/JSON\.stringify\s*\(\s*\w*[Mm]etadata/);
  });

  it("notes/timeline cards expose loading + empty + error states", () => {
    for (const src of [notes, timeline]) {
      expect(src).toMatch(/[Ll]oading/);
      expect(src).toMatch(/[Ee]mpty|No notes|No activity|لا توجد/);
      expect(src).toMatch(/setError|error\s*=/);
    }
  });

  it("notes card renders NOTE ref id when present", () => {
    expect(notes).toMatch(/n\.ref_id/);
  });

  it("operations panel renders both notes + timeline subcards", () => {
    expect(panel).toMatch(/BusinessInternalNotesCard/);
    expect(panel).toMatch(/BusinessActivityTimelineCard/);
  });
});

describe("BUSINESS-CORE-2: isolation + security", () => {
  const all = walk(SRC);
  const offenders = all.filter((f) => {
    if (/[\\/]modules[\\/]businesses[\\/]notes[\\/]/.test(f)) return false;
    if (/[\\/]__tests__[\\/]|\.test\.|\.bench\./.test(f)) return false;
    if (/integrations[\\/]supabase[\\/]types\.ts$/.test(f)) return false;
    const src = readFileSync(f, "utf8");
    return /\.from\(\s*["']business_internal_notes["']\s*\)/.test(src);
  });

  it("only the notes module touches business_internal_notes directly", () => {
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("BUSINESS-CORE-2 components do not touch payments / auth / contracts", () => {
    for (const f of [NOTES, TIMELINE, PANEL]) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(
        /@\/modules\/(memberships|installments|contracts)|signOut|signInWith/,
      );
    }
  });

  it("provider page does not pass an admin-visibility override to the notes card", () => {
    const provider = readFileSync(PROVIDER, "utf8");
    // The card only ever inserts visibility='internal'; verify the page
    // never tries to force admin-only notes.
    expect(provider).not.toMatch(/visibility\s*=\s*["']admin["']/);
  });

  it("notes card does not render bare user UUIDs as the primary label", () => {
    // author_user_id should not appear as a top-level text node in JSX.
    expect(notes).not.toMatch(/\{\s*n\.author_user_id\s*\}/);
  });
});
