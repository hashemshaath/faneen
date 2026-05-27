import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const allFiles = walk(SRC);
const sourceFiles = allFiles.filter(
  (f) => !/[\\/]__tests__[\\/]|\.test\.|\.bench\.|[\\/]test[\\/]setup\.ts$/.test(f),
);

describe("HARDENING-1E: ErrorBoundary", () => {
  it("App.tsx wraps the tree in <ErrorBoundary>", () => {
    const app = readFileSync(join(SRC, "App.tsx"), "utf8");
    expect(app).toMatch(/<ErrorBoundary>[\s\S]*<\/ErrorBoundary>/);
    expect(app).toMatch(/from\s+["']@\/components\/ErrorBoundary["']/);
  });

  it("ErrorBoundary renders only error.message, never error.stack, in the UI", () => {
    const src = readFileSync(join(SRC, "components/ErrorBoundary.tsx"), "utf8");
    // Stack may be captured into diagnostics (logDiag) but never rendered in JSX.
    // Any reference to error.stack/componentStack must be inside the logDiag call.
    const stackRefs = src.match(/error\.stack|componentStack/g) ?? [];
    expect(stackRefs.length).toBeGreaterThan(0);
    const renderStart = src.indexOf("render()");
    const logDiagLine = src.split("\n").find((l) => l.includes("logDiag") && l.includes("stack"));
    expect(logDiagLine, "stack must be logged via logDiag only").toBeTruthy();
    // No stack references after render() begins.
    expect(src.slice(renderStart)).not.toMatch(/error\.stack|componentStack/);
    // Localized, user-friendly fallback exists.
    expect(src).toMatch(/حدث خطأ غير متوقع/);
    expect(src).toMatch(/An unexpected error occurred/);
    // Retry + home actions.
    expect(src).toMatch(/handleReload/);
    expect(src).toMatch(/handleHome/);
  });
});

describe("HARDENING-1E: client logging hygiene", () => {
  const FORBIDDEN: { label: string; pattern: RegExp }[] = [
    { label: "OTP value", pattern: /console\.(log|warn|error|info|debug)\s*\([^)]*\botp\s*[:=]/i },
    { label: "password value", pattern: /console\.(log|warn|error|info|debug)\s*\([^)]*\bpassword\s*[:=]/i },
    { label: "raw bearer token", pattern: /console\.(log|warn|error|info|debug)\s*\([^)]*Bearer\s+\$\{/i },
    { label: "Authorization header echo", pattern: /console\.(log|warn|error|info|debug)\s*\([^)]*['"`]Authorization['"`]/i },
    { label: "provider_intent_id leak", pattern: /console\.(log|warn|error|info|debug)\s*\([^)]*provider_intent_id/i },
    { label: "synthetic phone email", pattern: /console\.(log|warn|error|info|debug)\s*\([^)]*@phone\.qitaat\.local/i },
  ];

  for (const { label, pattern } of FORBIDDEN) {
    it(`no console call logs ${label}`, () => {
      const offenders: string[] = [];
      for (const f of sourceFiles) {
        const src = readFileSync(f, "utf8");
        if (pattern.test(src)) offenders.push(f.replace(process.cwd() + "/", ""));
      }
      expect(offenders, offenders.join("\n")).toEqual([]);
    });
  }

  it("synthetic @phone.qitaat.local addresses are never rendered in JSX text", () => {
    const offenders: string[] = [];
    for (const f of sourceFiles) {
      const src = readFileSync(f, "utf8");
      // Allow construction helpers and comments; flag only literal text in JSX-ish contexts.
      if (/>\s*[^<>{}\n]*@phone\.qitaat\.local/.test(src)) {
        offenders.push(f.replace(process.cwd() + "/", ""));
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
