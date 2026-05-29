import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const scriptPath = resolve(process.cwd(), "scripts/seo-post-deploy-verify.mjs");

describe("SEO post-deploy verify script", () => {
  it("script file exists", () => {
    expect(existsSync(scriptPath)).toBe(true);
  });

  const src = existsSync(scriptPath) ? readFileSync(scriptPath, "utf8") : "";

  it("checks the required public routes", () => {
    for (const path of ["/", "/search", "/help"]) {
      expect(src).toContain(`path: "${path}"`);
    }
  });

  it("flags token/private routes as noindex required", () => {
    const tokenLine = src.split("\n").find((l) => l.includes('path: "/q/'));
    const clientLine = src.split("\n").find((l) => l.includes('path: "/client/'));
    expect(tokenLine).toBeTruthy();
    expect(clientLine).toBeTruthy();
    expect(tokenLine).toMatch(/noindex:\s*true/);
    expect(clientLine).toMatch(/noindex:\s*true/);
  });

  it("rejects UUIDs in canonical URLs", () => {
    expect(src).toContain("no_uuid_in_canonical");
    expect(src).toMatch(/UUID_RE\s*=/);
  });

  it("verifies sitemap excludes private/token routes", () => {
    expect(src).toContain("excludes:");
    expect(src).toContain("no_uuid_in_sitemap");
  });

  it("documents that GSC is a manual OAuth step", () => {
    expect(src).toMatch(/Google Search Console.*MANUAL/i);
  });

  it("registered as npm script seo:post-deploy", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    expect(pkg.scripts["seo:post-deploy"]).toBe("node scripts/seo-post-deploy-verify.mjs");
  });
});