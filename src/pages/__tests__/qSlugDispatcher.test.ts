/**
 * APP-STABILITY-CLEANUP-SECURITY-1
 *
 * Source-level guard tests for the public /q/:code dispatcher.
 * We assert routing contract + security/perf invariants without
 * rendering — the goal is to catch route shadowing, direct table /
 * storage access, eager heavy imports, and PII leaks in the public
 * surface added by the dispatcher.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf-8");

describe("APP-STABILITY-CLEANUP-SECURITY-1 — /q/:code dispatcher", () => {
  const app = read("src/App.tsx");
  const dispatcher = read("src/pages/QSlugDispatcher.tsx");

  it("App.tsx exposes exactly one public /q/* route", () => {
    const matches = app.match(/path="\/q\/[^"]+"/g) ?? [];
    expect(matches).toEqual(['path="/q/:code"']);
  });

  it("/q/:code is wired to QSlugDispatcher and is not protected", () => {
    expect(app).toMatch(
      /<Route\s+path="\/q\/:code"\s+element=\{<QSlugDispatcher\s*\/>\}\s*\/>/,
    );
    // No <ProtectedRoute> wrapping — public flow.
    expect(app).not.toMatch(
      /<ProtectedRoute[^>]*>\s*<QSlugDispatcher/,
    );
  });

  it("legacy overlapping routes are gone", () => {
    expect(app).not.toMatch(/path="\/q\/:refId"/);
    expect(app).not.toMatch(/path="\/q\/:barcode_code"/);
  });

  it("dispatches to QuotationViewer when ?t=<token> is present, else PublicBarcodeResolve", () => {
    expect(dispatcher).toMatch(/useSearchParams/);
    expect(dispatcher).toMatch(/params\.get\(['"]t['"]\)/);
    expect(dispatcher).toMatch(
      /hasToken\s*\?\s*<QuotationViewer\s*\/>\s*:\s*<PublicBarcodeResolve\s*\/>/,
    );
  });

  it("dispatcher and target pages are lazy-loaded (no eager dashboard/admin bundles)", () => {
    // Dispatcher itself uses lazyRetry (project standard) for the two targets.
    expect(dispatcher).toMatch(/lazyRetry\(\(\)\s*=>\s*import\(['"]\.\/QuotationViewer['"]\)\)/);
    expect(dispatcher).toMatch(/lazyRetry\(\(\)\s*=>\s*import\(['"]\.\/PublicBarcodeResolve['"]\)\)/);
    expect(dispatcher).toMatch(/from ['"]@\/lib\/lazyRetry['"]/);
    // App.tsx loads the dispatcher itself lazily.
    expect(app).toMatch(/QSlugDispatcher\s*=\s*lazyRetry\(\(\)\s*=>\s*import\(['"]\.\/pages\/QSlugDispatcher['"]\)\)/);
    // No accidental admin/dashboard imports inside the public dispatcher.
    expect(dispatcher).not.toMatch(/from ['"]@\/pages\/admin\//);
    expect(dispatcher).not.toMatch(/from ['"]@\/pages\/dashboard\//);
    expect(dispatcher).not.toMatch(/from ['"]@\/components\/admin\//);
    expect(dispatcher).not.toMatch(/from ['"]@\/components\/dashboard\//);
  });

  it("dispatcher does not touch supabase, storage, logs, or PII", () => {
    expect(dispatcher).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
    expect(dispatcher).not.toMatch(/supabase\./);
    expect(dispatcher).not.toMatch(/\.storage\./);
    expect(dispatcher).not.toMatch(/console\.(log|warn|error|info)\(/);
    // No raw param or token rendering — dispatcher only routes.
    expect(dispatcher).not.toMatch(/\{token\}/);
    expect(dispatcher).not.toMatch(/\{code\}/);
  });

  it("targets accept the unified `code` param while keeping legacy fallbacks", () => {
    const qv = read("src/pages/QuotationViewer.tsx");
    const pb = read("src/pages/PublicBarcodeResolve.tsx");
    expect(qv).toMatch(/useParams<\{\s*code\?:\s*string;\s*refId\?:\s*string\s*\}>/);
    expect(pb).toMatch(/useParams<\{\s*code\?:\s*string;\s*barcode_code\?:\s*string\s*\}>/);
    // Both still call useNoIndex on the public surface.
    expect(qv).toMatch(/useNoIndex\(\)/);
    expect(pb).toMatch(/useNoIndex\(\)/);
  });

  it("robots edge function and static robots both Disallow /q/", () => {
    const staticRobots = read("public/robots.txt");
    const edgeRobots = read("supabase/functions/robots/index.ts");
    expect(staticRobots).toMatch(/Disallow:\s*\/q\//);
    expect(edgeRobots).toMatch(/Disallow:\s*\/q\//);
  });

  it("jsonld snapshot index has no stale entries pointing to missing files", () => {
    const idx = JSON.parse(read("scripts/jsonld-snapshots/index.json")) as Record<string, unknown>;
    for (const filePath of Object.keys(idx)) {
      // throws if missing — fast-fail with the offending key
      expect(() => readFileSync(resolve(ROOT, filePath), "utf-8"), filePath).not.toThrow();
    }
  });
});