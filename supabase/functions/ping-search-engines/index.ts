/**
 * ping-search-engines
 * يُعلم Google + Bing/IndexNow بتحديث sitemap.xml ويسجل النتيجة في sitemap_submissions
 * يُستدعى يدوياً من لوحة الإدارة أو تلقائياً عبر pg_cron / DB triggers.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCronOrAdmin } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = "https://qitaat.com";
const STATIC_SITEMAP = `${SITE_URL}/sitemap.xml`;
const DYNAMIC_SITEMAP = `https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/sitemap`;
const INDEXNOW_KEY = Deno.env.get("INDEXNOW_KEY") ?? "";

type Provider = "google" | "bing_indexnow" | "yandex_indexnow";
type Status = "success" | "failed" | "skipped";

interface PingResult {
  provider: Provider;
  sitemap_url: string;
  status: Status;
  http_status: number | null;
  message: string;
  duration_ms: number;
}

async function pingGoogle(sitemapUrl: string): Promise<PingResult> {
  // ملاحظة: Google أوقفت endpoint /ping رسمياً في 2023، نسجلها كـ skipped
  // الفهرسة الفعلية تتم عبر Search Console (تلقائي عبر robots.txt/sitemap)
  return {
    provider: "google",
    sitemap_url: sitemapUrl,
    status: "skipped",
    http_status: null,
    message: "Google /ping deprecated 2023. Sitemap discovered via robots.txt automatically.",
    duration_ms: 0,
  };
}

async function pingIndexNow(provider: "bing_indexnow" | "yandex_indexnow", urls: string[]): Promise<PingResult> {
  if (!INDEXNOW_KEY) {
    return {
      provider,
      sitemap_url: STATIC_SITEMAP,
      status: "skipped",
      http_status: null,
      message: "INDEXNOW_KEY not configured",
      duration_ms: 0,
    };
  }
  const host = provider === "bing_indexnow" ? "https://api.indexnow.org/indexnow" : "https://yandex.com/indexnow";
  const start = Date.now();
  try {
    const res = await fetch(host, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "qitaat.com",
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
    const text = await res.text().catch(() => "");
    return {
      provider,
      sitemap_url: STATIC_SITEMAP,
      status: res.ok || res.status === 202 ? "success" : "failed",
      http_status: res.status,
      message: text.slice(0, 500) || `HTTP ${res.status}`,
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      provider,
      sitemap_url: STATIC_SITEMAP,
      status: "failed",
      http_status: null,
      message: e instanceof Error ? e.message : String(e),
      duration_ms: Date.now() - start,
    };
  }
}

async function fetchSitemapUrls(): Promise<string[]> {
  try {
    const res = await fetch(DYNAMIC_SITEMAP);
    if (!res.ok) return [SITE_URL + "/"];
    const xml = await res.text();
    const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    // IndexNow allows up to 10,000 URLs per request
    return matches.slice(0, 10000);
  } catch {
    return [SITE_URL + "/"];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireCronOrAdmin(req, corsHeaders);
  if (unauthorized) return unauthorized;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let triggeredBy: string | null = null;
  let triggerSource = "manual";
  try {
    const body = await req.json().catch(() => ({}));
    triggerSource = body.source ?? "manual";
    const authHeader = req.headers.get("Authorization");
    if (authHeader && triggerSource === "manual") {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      triggeredBy = user?.id ?? null;
    }
  } catch { /* ignore */ }

  const urls = await fetchSitemapUrls();
  const urlCount = urls.length;

  const results = await Promise.all([
    pingGoogle(STATIC_SITEMAP),
    pingIndexNow("bing_indexnow", urls),
    pingIndexNow("yandex_indexnow", urls),
  ]);

  // Persist all results
  const rows = results.map((r) => ({
    provider: r.provider,
    sitemap_url: r.sitemap_url,
    status: r.status,
    http_status: r.http_status,
    message: r.message,
    url_count: urlCount,
    triggered_by: triggeredBy,
    trigger_source: triggerSource,
    duration_ms: r.duration_ms,
  }));

  const { error: insertErr } = await supabase.from("sitemap_submissions").insert(rows);
  if (insertErr) console.error("Failed to log submissions:", insertErr);

  return new Response(
    JSON.stringify({ success: true, url_count: urlCount, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});