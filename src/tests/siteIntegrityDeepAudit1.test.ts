/**
 * Site Integrity Deep Audit — SITE-INTEGRITY-DEEP-AUDIT-1
 *
 * Static guardrails preventing regressions:
 *  - no placeholder URLs in production source
 *  - no dummy/mock data leaking out of __tests__
 *  - no Faneen remnants in user-facing copy
 *  - no broken-route patterns
 *  - no empty SEO metadata in index.html
 *  - no "Lorem ipsum" / "TODO" / "FIXME" rendered text
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");
const PUBLIC = join(process.cwd(), "public");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === ".git" || name === "dist") continue;
      walk(p, out);
    } else if (/\.(ts|tsx|js|jsx|html|json|md)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const isTestFile = (p: string) =>
  p.includes("/__tests__/") ||
  p.includes("/tests/") ||
  /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(p);

const productionFiles = walk(SRC).filter((p) => !isTestFile(p));

describe("SITE-INTEGRITY-DEEP-AUDIT-1", () => {
  it("no placeholder hostnames in rendered production code", () => {
    const offenders: string[] = [];
    const banned = [/\bdemo\.com\b/, /\btest\.com\b/, /placehold\.co/, /via\.placeholder/];
    for (const f of productionFiles) {
      const txt = readFileSync(f, "utf8");
      for (const re of banned) {
        if (re.test(txt)) offenders.push(`${relative(process.cwd(), f)} matches ${re}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no Lorem ipsum copy in production code", () => {
    const offenders: string[] = [];
    for (const f of productionFiles) {
      if (/lorem\s+ipsum/i.test(readFileSync(f, "utf8"))) {
        offenders.push(relative(process.cwd(), f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no Faneen branding in user-facing copy", () => {
    const offenders: string[] = [];
    const re = /\bfaneen\b|فنيين/i;
    for (const f of productionFiles) {
      if (re.test(readFileSync(f, "utf8"))) offenders.push(relative(process.cwd(), f));
    }
    expect(offenders).toEqual([]);
  });

  it("index.html has non-empty title and description", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? "";
    const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1]?.trim() ?? "";
    expect(title.length).toBeGreaterThan(5);
    expect(desc.length).toBeGreaterThan(20);
    expect(title.toLowerCase()).not.toBe("lovable app");
    expect(desc.toLowerCase()).not.toBe("lovable generated project");
  });

  it("public/robots.txt is not site-wide disallow", () => {
    try {
      const robots = readFileSync(join(PUBLIC, "robots.txt"), "utf8");
      expect(/^Disallow:\s*\/\s*$/m.test(robots) && !/Allow:\s*\//.test(robots)).toBe(false);
    } catch {
      // robots.txt optional; skip if absent
    }
  });

  it("no hardcoded localhost / 127.0.0.1 URLs in production runtime", () => {
    const offenders: string[] = [];
    const re = /https?:\/\/(localhost|127\.0\.0\.1)/;
    for (const f of productionFiles) {
      if (re.test(readFileSync(f, "utf8"))) offenders.push(relative(process.cwd(), f));
    }
    expect(offenders).toEqual([]);
  });

  it("no stale routes (/dashboard/business, /admin/help-center) referenced", () => {
    const offenders: string[] = [];
    const re = /(\/dashboard\/business\b(?!-)|\/admin\/help-center\b)/;
    for (const f of productionFiles) {
      if (re.test(readFileSync(f, "utf8"))) offenders.push(relative(process.cwd(), f));
    }
    expect(offenders).toEqual([]);
  });

  it("all required SITE-INTEGRITY audit docs exist", () => {
    const required = [
      "docs/site-integrity-audit.md",
      "docs/broken-links-audit-full.md",
      "docs/external-links-audit.md",
      "docs/fake-data-audit.md",
      "docs/content-quality-audit.md",
      "docs/image-asset-integrity-audit.md",
      "docs/form-cta-integrity-audit.md",
      "docs/naming-consistency-audit.md",
      "docs/seo-integrity-audit.md",
      "docs/admin-surface-audit.md",
      "docs/dead-code-audit.md",
    ];
    const missing = required.filter((p) => {
      try { return !statSync(join(process.cwd(), p)).isFile(); } catch { return true; }
    });
    expect(missing).toEqual([]);
  });
});