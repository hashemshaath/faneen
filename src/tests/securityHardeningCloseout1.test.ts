import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const edgeFn = readFileSync(
  join(repoRoot, "supabase/functions/check-badge-backlinks/index.ts"),
  "utf8",
);

function latestMigrationFor(needle: string): string {
  const dir = join(repoRoot, "supabase/migrations");
  const files = readdirSync(dir).filter((f: string) => f.endsWith(".sql")).sort();
  for (const f of [...files].reverse()) {
    const txt = readFileSync(join(dir, f), "utf8");
    if (txt.includes(needle)) return txt;
  }
  return "";
}

describe("SECURITY-HARDENING-CLOSEOUT-1", () => {
  describe("M-1: wo_files_insert_manager status guard", () => {
    it("latest policy excludes completed/cancelled work orders", () => {
      const sql = latestMigrationFor('"wo_files_insert_manager"');
      expect(sql).toContain("wo_files_insert_manager");
      expect(sql).toMatch(/status\s+NOT\s+IN\s*\(\s*'completed'\s*,\s*'cancelled'\s*\)/i);
    });
  });

  describe("M-2: check-badge-backlinks SSRF defenses", () => {
    it("uses manual redirect handling (not redirect: follow)", () => {
      expect(edgeFn).toContain('redirect: "manual"');
      expect(edgeFn).not.toContain('redirect: "follow"');
    });
    it("validates each outbound URL via validateOutboundUrl", () => {
      expect(edgeFn).toContain("validateOutboundUrl");
    });
    it("blocks localhost", () => {
      expect(edgeFn).toMatch(/h === "localhost"/);
    });
    it("blocks private IPv4 ranges (10/8, 127/8, 169.254/16, 172.16/12, 192.168/16)", () => {
      expect(edgeFn).toContain("isPrivateIPv4");
      expect(edgeFn).toMatch(/a === 10/);
      expect(edgeFn).toMatch(/a === 127/);
      expect(edgeFn).toMatch(/a === 169 && b === 254/);
      expect(edgeFn).toMatch(/a === 172 && b >= 16 && b <= 31/);
      expect(edgeFn).toMatch(/a === 192 && b === 168/);
    });
    it("enforces a redirect hop limit", () => {
      expect(edgeFn).toContain("MAX_REDIRECTS");
      expect(edgeFn).toContain("too_many_redirects");
    });
    it("rejects non-http(s) schemes and credentialed URLs", () => {
      expect(edgeFn).toMatch(/protocol !== "http:" && u\.protocol !== "https:"/);
      expect(edgeFn).toMatch(/u\.username \|\| u\.password/);
    });
  });
});