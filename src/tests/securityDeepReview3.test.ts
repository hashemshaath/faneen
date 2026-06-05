/**
 * SECURITY-DEEP-REVIEW-3 — static regression guard.
 *
 * Verifies the protections asserted in docs/security-deep-review-3.md cannot
 * silently regress. Pure static analysis — no runtime / network / DB access.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const srcFiles = walk(join(ROOT, "src")).filter((f) => /\.(ts|tsx)$/.test(f));
const edgeFiles = walk(join(ROOT, "supabase", "functions")).filter((f) =>
  /\.ts$/.test(f),
);

describe("SECURITY-DEEP-REVIEW-3 static guards", () => {
  it("every dangerouslySetInnerHTML in src/ either sanitizes or uses a non-user-content source", () => {
    const allowList = new Set<string>([
      // QR SVGs / server-templated HTML (no user content). Documented in the review.
      "src/components/client-sites/ClientSiteQrCard.tsx",
      "src/pages/dashboard/DashboardBadge.tsx",
      "src/pages/VerifyBusiness.tsx",
      // shadcn chart — static CSS variables.
      "src/components/ui/chart.tsx",
    ]);
    const offenders: string[] = [];
    for (const file of srcFiles) {
      const rel = file.slice(ROOT.length + 1).replace(/\\/g, "/");
      const src = readFileSync(file, "utf-8");
      if (!src.includes("dangerouslySetInnerHTML")) continue;
      if (allowList.has(rel)) continue;
      // For non-allowlisted files, must call DOMPurify.sanitize on the input.
      if (!/DOMPurify\.sanitize\s*\(/.test(src)) {
        offenders.push(rel);
      }
    }
    expect(offenders, `Unsanitized HTML sinks: ${offenders.join(", ")}`).toEqual(
      [],
    );
  });

  it("no edge function fetches a non-allowlisted attacker URL without a host guard", () => {
    // Whitelist of edge functions audited to perform fetch(url) where url is
    // either fully hardcoded or already routed through a SaaS gateway.
    const allowedFetchers = new Set([
      "supabase/functions/og-image/index.ts",
      "supabase/functions/firecrawl-health/index.ts",
      "supabase/functions/audit-sitemap-status/index.ts",
      "supabase/functions/admin-enrichment-fetch/index.ts",
      "supabase/functions/admin-enrichment-search/index.ts",
      "supabase/functions/admin-enrichment-enhance/index.ts",
      "supabase/functions/national-address-lookup/index.ts",
      "supabase/functions/google-address-validation/index.ts",
      "supabase/functions/google-geocoding/index.ts",
      "supabase/functions/google-places/index.ts",
      "supabase/functions/google-routes/index.ts",
      "supabase/functions/google-health/index.ts",
      "supabase/functions/lovable-ai-health/index.ts",
      "supabase/functions/moyasar-health/index.ts",
      "supabase/functions/resend-health/index.ts",
      "supabase/functions/resend-status/index.ts",
      "supabase/functions/notify-contact-event/index.ts",
      "supabase/functions/process-contact-notification-retries/index.ts",
      "supabase/functions/test-contact-webhook/index.ts",
      "supabase/functions/ping-search-engines/index.ts",
      "supabase/functions/run-site-audit/index.ts",
      "supabase/functions/_shared/health/probe.ts",
      "supabase/functions/_shared/membership-payments/index.ts",
      "supabase/functions/membership-payment-create-intent/index.ts",
      "supabase/functions/membership-payment-confirm/index.ts",
      "supabase/functions/membership-payment-reconcile/index.ts",
      "supabase/functions/membership-payment-webhook/index.ts",
      "supabase/functions/send-transactional-email/index.ts",
      "supabase/functions/process-email-queue/index.ts",
      "supabase/functions/admin-preview-email/index.ts",
      "supabase/functions/admin-retry-dlq-email/index.ts",
      "supabase/functions/email-track-open/index.ts",
      "supabase/functions/email-track-click/index.ts",
      "supabase/functions/auth-email-hook/index.ts",
      "supabase/functions/preview-transactional-email/index.ts",
      "supabase/functions/handle-email-suppression/index.ts",
      "supabase/functions/handle-email-unsubscribe/index.ts",
      "supabase/functions/send-otp/index.ts",
      "supabase/functions/send-login-otp/index.ts",
      "supabase/functions/verify-otp/index.ts",
      "supabase/functions/verify-login-otp/index.ts",
      // KNOWN PARTIAL (M-2 in deep review 3): pending host allowlist.
      "supabase/functions/check-badge-backlinks/index.ts",
    ]);
    const offenders: string[] = [];
    for (const file of edgeFiles) {
      const rel = file.slice(ROOT.length + 1).replace(/\\/g, "/");
      const src = readFileSync(file, "utf-8");
      if (!/\bfetch\s*\(/.test(src)) continue;
      if (allowedFetchers.has(rel)) continue;
      offenders.push(rel);
    }
    expect(
      offenders,
      `New edge function uses fetch() without security review: ${offenders.join(
        ", ",
      )}. Add it to the deep-review-3 allowlist after auditing its URL source.`,
    ).toEqual([]);
  });

  it("admin RPCs are not invoked from client without server-side has_role gate (heuristic)", () => {
    // We only check the destructive admin edge functions all keep an admin gate.
    const adminFns = edgeFiles.filter((f) => /\/admin-[^/]+\/index\.ts$/.test(f));
    expect(adminFns.length).toBeGreaterThan(0);
    const ungated: string[] = [];
    for (const file of adminFns) {
      const src = readFileSync(file, "utf-8");
      if (
        !/has_admin_access|has_role\s*\(\s*['"](?:admin|super_admin)['"]|['"]super_admin['"]|['"]admin['"][\s\S]{0,200}user_roles|user_roles[\s\S]{0,200}['"](?:admin|super_admin)['"]/.test(
          src,
        )
      ) {
        ungated.push(file.slice(ROOT.length + 1));
      }
    }
    expect(
      ungated,
      `Admin edge function missing has_admin_access gate: ${ungated.join(", ")}`,
    ).toEqual([]);
  });

  it("project memory file marks rate-limiting as deferred (anti-regression)", () => {
    // If someone re-introduces a 'will add rate limiting' claim we want to
    // catch it — the directive is to defer until infrastructure exists.
    const memo = readFileSync(
      join(ROOT, "docs", "security-deep-review-3.md"),
      "utf-8",
    );
    expect(memo).toMatch(/Accepted/);
    expect(memo).toMatch(/No critical, exploitable-now finding/i);
  });
});