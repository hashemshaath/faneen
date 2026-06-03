import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronOrAdmin } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SITE = "https://qitaat.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://hckpxwhjycmdflaneihd.supabase.co";
const FUNC = `${SUPABASE_URL}/functions/v1/sitemap`;
const TYPES = ["static", "businesses", "blog", "categories", "cities", "profiles", "projects"] as const;

// Paths we expect Google to be able to crawl
const ALLOW_TARGETS = [
  "/", "/search", "/categories/aluminum", "/projects", "/projects/abc",
  "/blog", "/blog/post-slug", "/offers", "/profile-systems",
  "/profile-systems/sample", "/membership", "/about", "/contact",
];
// Paths we expect to be blocked
const DISALLOW_TARGETS = [
  "/admin/users", "/dashboard/overview", "/auth", "/reset-password",
  "/onboarding", "/forbidden", "/unsubscribe", "/profile/settings",
];

interface EndpointResult {
  label: string;
  url: string;
  status: number;
  ok: boolean;
  contentType: string;
  isXml: boolean;
  isSpaFallback: boolean;
  urlCount: number;
  lastmod: string | null;
  error?: string;
}

interface RobotsRuleCheck {
  path: string;
  expected: "allow" | "disallow";
  actual: "allow" | "disallow";
  matched: string | null;
  ok: boolean;
}

async function checkUrl(label: string, url: string): Promise<EndpointResult> {
  try {
    const res = await fetch(url, { cache: "no-store", redirect: "follow" });
    const contentType = res.headers.get("content-type") ?? "";
    const text = await res.text();
    const isXml = /xml/i.test(contentType) && text.trimStart().startsWith("<?xml");
    const isSpaFallback = !isXml && (/<!doctype html>/i.test(text) || /<html/i.test(text));
    const urlMatches = text.match(/<url>/g) ?? text.match(/<sitemap>/g) ?? [];
    const lastmodMatch = text.match(/<lastmod>([^<]+)<\/lastmod>/);
    const isRobots = url.endsWith("/robots.txt");
    const ok = res.ok && (isRobots ? !isSpaFallback : isXml && !isSpaFallback);
    return {
      label, url, status: res.status, ok,
      contentType, isXml, isSpaFallback,
      urlCount: urlMatches.length,
      lastmod: lastmodMatch?.[1] ?? null,
    };
  } catch (e) {
    return {
      label, url, status: 0, ok: false, contentType: "",
      isXml: false, isSpaFallback: false, urlCount: 0, lastmod: null,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// Minimal robots.txt parser for User-agent: * group
function parseRobotsForStar(robotsTxt: string): { allow: string[]; disallow: string[] } {
  const lines = robotsTxt.split(/\r?\n/);
  let inStar = false;
  let inOtherUa = false;
  const allow: string[] = [];
  const disallow: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const [keyRaw, ...rest] = line.split(":");
    const key = keyRaw.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (value === "*") { inStar = true; inOtherUa = false; }
      else { inOtherUa = true; inStar = false; }
    } else if (inStar && !inOtherUa) {
      if (key === "allow") allow.push(value);
      else if (key === "disallow" && value) disallow.push(value);
    }
  }
  return { allow, disallow };
}

function matchRule(path: string, pattern: string): boolean {
  // Anchor pattern at start; support trailing $ and basic prefix match
  let p = pattern;
  const endsWithDollar = p.endsWith("$");
  if (endsWithDollar) p = p.slice(0, -1);
  if (endsWithDollar) return path === p;
  return path.startsWith(p);
}

function evalRobots(path: string, rules: { allow: string[]; disallow: string[] }): { actual: "allow" | "disallow"; matched: string | null } {
  // Longest matching rule wins (Google's behavior)
  let best: { len: number; type: "allow" | "disallow"; pattern: string } | null = null;
  for (const a of rules.allow) {
    if (matchRule(path, a) && (!best || a.length > best.len)) best = { len: a.length, type: "allow", pattern: a };
  }
  for (const d of rules.disallow) {
    if (matchRule(path, d) && (!best || d.length > best.len)) best = { len: d.length, type: "disallow", pattern: d };
  }
  if (!best) return { actual: "allow", matched: null };
  return { actual: best.type, matched: best.pattern };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireCronOrAdmin(req, corsHeaders);
  if (unauthorized) return unauthorized;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let triggeredBy = "cron";
  let dryRun = false;
  try {
    const body = await req.json();
    if (body?.triggeredBy) triggeredBy = String(body.triggeredBy);
    if (body?.dryRun) dryRun = Boolean(body.dryRun);
  } catch { /* no body */ }

  // 1) Run endpoint checks
  const targets = [
    { label: "robots.txt (domain)", url: `${SITE}/robots.txt` },
    { label: "sitemap.xml (domain)", url: `${SITE}/sitemap.xml` },
    { label: "Sitemap index (Edge)", url: FUNC },
    ...TYPES.map((t) => ({ label: t, url: `${FUNC}?type=${t}` })),
  ];
  const results: EndpointResult[] = await Promise.all(
    targets.map((t) => checkUrl(t.label, t.url))
  );

  // 2) Robots rules check (use whichever robots fetch succeeded)
  const robotsResult = results.find((r) => r.url.endsWith("/robots.txt"));
  const robotsCheck: RobotsRuleCheck[] = [];
  if (robotsResult && !robotsResult.error && robotsResult.status === 200) {
    const txt = await fetch(robotsResult.url, { cache: "no-store" }).then((r) => r.text()).catch(() => "");
    const rules = parseRobotsForStar(txt);
    for (const path of ALLOW_TARGETS) {
      const ev = evalRobots(path, rules);
      robotsCheck.push({ path, expected: "allow", actual: ev.actual, matched: ev.matched, ok: ev.actual === "allow" });
    }
    for (const path of DISALLOW_TARGETS) {
      const ev = evalRobots(path, rules);
      robotsCheck.push({ path, expected: "disallow", actual: ev.actual, matched: ev.matched, ok: ev.actual === "disallow" });
    }
  }

  // 3) Aggregates
  const sitemapEndpoints = results.filter((r) => r.url.includes("?type="));
  const totalUrls = sitemapEndpoints.reduce((s, r) => s + r.urlCount, 0);
  const okCount = results.filter((r) => r.ok).length;
  const errorCount = results.length - okCount;
  const hasSpaFallback = results.some((r) => r.isSpaFallback);
  const robotsFailures = robotsCheck.filter((r) => !r.ok).length;
  const hasFailures = errorCount > 0 || robotsFailures > 0;

  // 4) Diff vs previous
  const { data: prev } = await supabase
    .from("sitemap_audit_runs")
    .select("id, created_at, results, total_urls, ok_count, error_count, has_spa_fallback")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let diff: Record<string, unknown> = { firstRun: !prev };
  if (prev) {
    const prevResults = (prev.results as EndpointResult[]) ?? [];
    const prevByUrl = new Map(prevResults.map((r) => [r.url, r]));
    const flips: Array<{ url: string; from: boolean; to: boolean }> = [];
    const urlCountDeltas: Array<{ url: string; from: number; to: number; delta: number }> = [];
    for (const r of results) {
      const p = prevByUrl.get(r.url);
      if (!p) continue;
      if (p.ok !== r.ok) flips.push({ url: r.url, from: p.ok, to: r.ok });
      if (p.urlCount !== r.urlCount) urlCountDeltas.push({ url: r.url, from: p.urlCount, to: r.urlCount, delta: r.urlCount - p.urlCount });
    }
    diff = {
      firstRun: false,
      previousRunAt: prev.created_at,
      totalUrlsDelta: totalUrls - (prev.total_urls ?? 0),
      okCountDelta: okCount - (prev.ok_count ?? 0),
      errorCountDelta: errorCount - (prev.error_count ?? 0),
      statusFlips: flips,
      urlCountDeltas,
    };
  }

  // 5) Email alert (dedup: only if previous run was healthy or >24h since last alert)
  let alertSent = false;
  if (hasFailures || hasSpaFallback) {
    const { data: lastAlert } = await supabase
      .from("sitemap_audit_runs")
      .select("created_at, alert_sent")
      .eq("alert_sent", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const ageMs = lastAlert ? Date.now() - new Date(lastAlert.created_at).getTime() : Infinity;
    if (!lastAlert || ageMs > 24 * 60 * 60 * 1000) {
      const failedItems = results.filter((r) => !r.ok).map((r) => `• ${r.label} → ${r.status} ${r.isSpaFallback ? "(SPA fallback!)" : (r.error ?? "")}`).join("\n");
      const robotsIssues = robotsCheck.filter((r) => !r.ok).map((r) => `• ${r.path} → expected ${r.expected}, got ${r.actual}`).join("\n");
      const message = [
        `تنبيه فحص خرائط الموقع — ${new Date().toISOString()}`,
        "",
        hasSpaFallback ? "⚠️ تم اكتشاف SPA HTML fallback في أحد المسارات!" : "",
        failedItems ? `\nنقاط نهاية فاشلة:\n${failedItems}` : "",
        robotsIssues ? `\nمشاكل robots.txt:\n${robotsIssues}` : "",
        "",
        `راجع لوحة الإدارة: ${SITE}/admin/sitemap-status`,
      ].filter(Boolean).join("\n");

      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "contact-admin-notification",
            templateData: {
              name: "SEO Monitor",
              email: "noreply@qitaat.com",
              subject: hasSpaFallback ? "🚨 SPA fallback detected on sitemap/robots" : "⚠️ Sitemap audit failure",
              message,
            },
          },
        });
        alertSent = true;
      } catch (e) {
        console.error("Failed to send sitemap alert email", e);
      }
    }
  }

  // 6) Persist run (skip when dryRun for dashboard fallbacks)
  let inserted: { id: string; created_at: string } | null = null;
  if (!dryRun) {
    const { data: ins, error: insertError } = await supabase
      .from("sitemap_audit_runs")
      .insert({
      triggered_by: triggeredBy,
      total_endpoints: results.length,
      ok_count: okCount,
      error_count: errorCount,
      total_urls: totalUrls,
      has_spa_fallback: hasSpaFallback,
      has_failures: hasFailures,
      results,
      robots_check: robotsCheck,
      diff_from_previous: diff,
      alert_sent: alertSent,
      })
      .select("id, created_at")
      .single();
    if (insertError) console.error("sitemap_audit_runs insert error:", insertError);
    inserted = ins ?? null;
  }

  return new Response(JSON.stringify({
    ok: true,
    runId: inserted?.id,
    createdAt: inserted?.created_at,
    results,
    robotsCheck,
    summary: { totalEndpoints: results.length, okCount, errorCount, totalUrls, hasSpaFallback, hasFailures, robotsFailures, alertSent },
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
