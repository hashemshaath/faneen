import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE = "https://qitaat.com";

/** Pages we consider important enough to PageSpeed + per-page SEO check. */
const KEY_PAGES = ["/", "/search", "/categories", "/blog", "/about"];

/* ─────────── PageSpeed (free, no key) ─────────── */

interface PerfResult {
  url: string;
  strategy: "mobile" | "desktop";
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
  lcp_ms: number | null;
  cls: number | null;
  tbt_ms: number | null;
  fcp_ms: number | null;
  ttfb_ms: number | null;
  speed_index_ms: number | null;
  raw_summary: Record<string, unknown>;
  error: string | null;
}

async function runPageSpeed(
  url: string,
  strategy: "mobile" | "desktop",
): Promise<PerfResult> {
  const base: PerfResult = {
    url,
    strategy,
    performance_score: null,
    accessibility_score: null,
    best_practices_score: null,
    seo_score: null,
    lcp_ms: null,
    cls: null,
    tbt_ms: null,
    fcp_ms: null,
    ttfb_ms: null,
    speed_index_ms: null,
    raw_summary: {},
    error: null,
  };
  try {
    const apiKey = Deno.env.get("PAGESPEED_API_KEY");
    const params = new URLSearchParams({
      url,
      strategy,
      category: "performance",
    });
    // Add other categories
    ["accessibility", "best-practices", "seo"].forEach((c) =>
      params.append("category", c),
    );
    if (apiKey) params.set("key", apiKey);

    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;
    // Retry with exponential backoff on 429/5xx (helps when no API key).
    let res: Response | null = null;
    let lastStatus = 0;
    const maxAttempts = apiKey ? 2 : 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      res = await fetch(apiUrl);
      lastStatus = res.status;
      if (res.ok) break;
      if (res.status !== 429 && res.status < 500) break;
      // backoff: 2s, 5s, 10s, 20s
      const waitMs = Math.min(20000, 2000 * Math.pow(2, attempt));
      await new Promise((r) => setTimeout(r, waitMs));
    }
    if (!res || !res.ok) {
      base.error = `pagespeed_http_${lastStatus}`;
      return base;
    }
    const data = await res.json();
    const lr = data.lighthouseResult;
    if (!lr) {
      base.error = "no_lighthouse_result";
      return base;
    }
    const cat = lr.categories ?? {};
    const audits = lr.audits ?? {};
    const num = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    base.performance_score = cat.performance ? Math.round(cat.performance.score * 100) : null;
    base.accessibility_score = cat.accessibility ? Math.round(cat.accessibility.score * 100) : null;
    base.best_practices_score = cat["best-practices"]
      ? Math.round(cat["best-practices"].score * 100)
      : null;
    base.seo_score = cat.seo ? Math.round(cat.seo.score * 100) : null;
    base.lcp_ms = num(audits["largest-contentful-paint"]?.numericValue);
    base.cls = num(audits["cumulative-layout-shift"]?.numericValue);
    base.tbt_ms = num(audits["total-blocking-time"]?.numericValue);
    base.fcp_ms = num(audits["first-contentful-paint"]?.numericValue);
    base.ttfb_ms = num(audits["server-response-time"]?.numericValue);
    base.speed_index_ms = num(audits["speed-index"]?.numericValue);
    base.raw_summary = {
      fetch_time: lr.fetchTime,
      final_url: lr.finalUrl,
      lighthouse_version: lr.lighthouseVersion,
    };
    return base;
  } catch (err) {
    base.error = err instanceof Error ? err.message.slice(0, 200) : "unknown";
    return base;
  }
}

/* ─────────── SEO checks ─────────── */

interface PageCheck {
  url: string;
  status: number | null;
  has_title: boolean;
  title_length: number;
  has_description: boolean;
  description_length: number;
  has_h1: boolean;
  h1_count: number;
  has_canonical: boolean;
  has_og_image: boolean;
  passed: boolean;
  error: string | null;
}

function pickAttr(html: string, tagPattern: RegExp, attr: string): string | null {
  const m = tagPattern.exec(html);
  if (!m) return null;
  const tag = m[0];
  const attrRe = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i");
  const a = attrRe.exec(tag);
  return a ? a[1] : null;
}

async function checkPage(url: string): Promise<PageCheck> {
  const result: PageCheck = {
    url,
    status: null,
    has_title: false,
    title_length: 0,
    has_description: false,
    description_length: 0,
    has_h1: false,
    h1_count: 0,
    has_canonical: false,
    has_og_image: false,
    passed: false,
    error: null,
  };
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "QitaatSEOAudit/1.0" },
      redirect: "follow",
    });
    result.status = res.status;
    const html = await res.text();
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (titleMatch) {
      const t = titleMatch[1].trim();
      result.has_title = t.length > 0;
      result.title_length = t.length;
    }
    const descContent = pickAttr(
      html,
      /<meta[^>]+name\s*=\s*["']description["'][^>]*>/i,
      "content",
    );
    if (descContent) {
      result.has_description = descContent.trim().length > 0;
      result.description_length = descContent.trim().length;
    }
    const h1s = html.match(/<h1\b[^>]*>/gi);
    result.h1_count = h1s ? h1s.length : 0;
    result.has_h1 = result.h1_count > 0;
    result.has_canonical = /<link[^>]+rel\s*=\s*["']canonical["']/i.test(html);
    result.has_og_image = /<meta[^>]+property\s*=\s*["']og:image["']/i.test(html);
    result.passed =
      res.ok &&
      result.has_title &&
      result.title_length >= 10 &&
      result.title_length <= 70 &&
      result.has_description &&
      result.description_length >= 50 &&
      result.description_length <= 200 &&
      result.has_h1 &&
      result.h1_count === 1 &&
      result.has_canonical &&
      result.has_og_image;
    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message.slice(0, 200) : "unknown";
    return result;
  }
}

async function checkRobots() {
  try {
    const res = await fetch(`${SITE}/robots.txt`);
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      has_sitemap: /sitemap:\s*https?:/i.test(text),
    };
  } catch {
    return { ok: false, status: 0, has_sitemap: false };
  }
}

async function checkSitemap() {
  try {
    const res = await fetch(`${SITE}/sitemap.xml`);
    const text = await res.text();
    const matches = text.match(/<loc>/gi);
    return {
      ok: res.ok,
      status: res.status,
      url_count: matches ? matches.length : 0,
    };
  } catch {
    return { ok: false, status: 0, url_count: 0 };
  }
}

/* ─────────── Auth helpers ─────────── */

async function requireAdmin(req: Request, supabase: ReturnType<typeof createClient>) {
  // Allow service-role calls (cron) by header secret OR admin user.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (cronSecret && provided && provided === cronSecret) {
    return { ok: true as const, userId: null as string | null };
  }
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false as const, reason: "missing_token" };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { ok: false as const, reason: "invalid_token" };
  const { data: isAdmin } = await supabase.rpc("has_admin_access", {
    _user_id: data.user.id,
  });
  if (!isAdmin) return { ok: false as const, reason: "not_admin" };
  return { ok: true as const, userId: data.user.id };
}

/* ─────────── Handler ─────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const auth = await requireAdmin(req, supabase);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.reason }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. SEO static + per-page checks (parallel)
    const [robots, sitemap, ...pageResults] = await Promise.all([
      checkRobots(),
      checkSitemap(),
      ...KEY_PAGES.map((p) => checkPage(`${SITE}${p}`)),
    ]);

    const seoInsert = await supabase
      .from("seo_audit_runs")
      .insert({
        robots_ok: robots.ok,
        robots_status: robots.status,
        robots_has_sitemap: robots.has_sitemap,
        sitemap_ok: sitemap.ok,
        sitemap_status: sitemap.status,
        sitemap_url_count: sitemap.url_count,
        pages_checked: pageResults.length,
        pages_passed: pageResults.filter((p) => p.passed).length,
        page_results: pageResults,
        triggered_by: auth.userId,
      })
      .select("id")
      .single();

    // 2. PageSpeed (sequential — Google rate-limits, and this can be slow)
    const perfRows: Array<{ url: string; performance_score: number | null }> = [];
    for (const path of KEY_PAGES) {
      const url = `${SITE}${path}`;
      const perf = await runPageSpeed(url, "mobile");
      const ins = await supabase.from("perf_audit_runs").insert({
        url: perf.url,
        strategy: perf.strategy,
        performance_score: perf.performance_score,
        accessibility_score: perf.accessibility_score,
        best_practices_score: perf.best_practices_score,
        seo_score: perf.seo_score,
        lcp_ms: perf.lcp_ms,
        cls: perf.cls,
        tbt_ms: perf.tbt_ms,
        fcp_ms: perf.fcp_ms,
        ttfb_ms: perf.ttfb_ms,
        speed_index_ms: perf.speed_index_ms,
        raw_summary: perf.raw_summary,
        triggered_by: auth.userId,
        error: perf.error,
      });
      if (ins.error) console.error("perf insert error:", ins.error);
      perfRows.push({ url: perf.url, performance_score: perf.performance_score });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        seo_run_id: seoInsert.data?.id ?? null,
        seo: { robots, sitemap, pages_checked: pageResults.length },
        perf: perfRows,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Audit error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});