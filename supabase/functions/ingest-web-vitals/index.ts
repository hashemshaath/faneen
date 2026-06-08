import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Build CORS headers for this request.
 *
 * `sendBeacon` (used on the client) is a credentialed cross-origin request,
 * which means a wildcard `Access-Control-Allow-Origin: *` triggers a CORS
 * error in modern browsers ("ACAO cannot be wildcard when credentials mode
 * is include"). To stay safe AND functional we echo a SPECIFIC origin from
 * an allow-list and pair it with `Access-Control-Allow-Credentials: true`.
 *
 * Origins not in the allow-list still get a wildcard fallback (which is
 * fine for non-credentialed fetches and harmless for unknown origins).
 */
const ORIGIN_ALLOWLIST = [
  "https://qitaat.com",
  "https://www.qitaat.com",
  "https://qitaat.lovable.app",
];
const ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
];

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed =
    ORIGIN_ALLOWLIST.includes(origin) ||
    ORIGIN_PATTERNS.some((re) => re.test(origin));
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "*",
    "Access-Control-Allow-Credentials": allowed ? "true" : "false",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const ALLOWED_METRICS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB", "IMG"]);
const ALLOWED_RATINGS = new Set(["good", "needs-improvement", "poor"]);

interface VitalEvent {
  metric_name: string;
  metric_value: number;
  metric_rating?: string;
  page_path: string;
  user_agent?: string;
  connection_type?: string;
  device_type?: string;
  route_key?: string;
  image_count?: number;
  lcp_url?: string;
}

function sanitize(events: unknown): VitalEvent[] {
  if (!Array.isArray(events)) return [];
  return events
    .map((raw): VitalEvent | null => {
      if (!raw || typeof raw !== "object") return null;
      const e = raw as Record<string, unknown>;
      const name = String(e.metric_name ?? "");
      const value = Number(e.metric_value);
      const path = String(e.page_path ?? "");
      if (!ALLOWED_METRICS.has(name)) return null;
      if (!Number.isFinite(value) || value < 0 || value > 1_000_000) return null;
      if (!path || path.length > 500) return null;
      const rating =
        typeof e.metric_rating === "string" && ALLOWED_RATINGS.has(e.metric_rating)
          ? e.metric_rating
          : undefined;
      return {
        metric_name: name,
        metric_value: value,
        metric_rating: rating,
        page_path: path.slice(0, 500),
        user_agent: typeof e.user_agent === "string" ? e.user_agent.slice(0, 500) : undefined,
        connection_type:
          typeof e.connection_type === "string" ? e.connection_type.slice(0, 50) : undefined,
        device_type:
          typeof e.device_type === "string" ? e.device_type.slice(0, 50) : undefined,
        route_key:
          typeof e.route_key === "string" ? e.route_key.slice(0, 64) : undefined,
        image_count:
          typeof e.image_count === "number" && Number.isFinite(e.image_count)
            ? Math.max(0, Math.min(10_000, Math.round(e.image_count)))
            : undefined,
        lcp_url:
          typeof e.lcp_url === "string" ? e.lcp_url.slice(0, 500) : undefined,
      };
    })
    .filter((x): x is VitalEvent => x !== null)
    .slice(0, 50); // hard cap per request
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const events = sanitize(
      body && typeof body === "object" && "events" in (body as Record<string, unknown>)
        ? (body as { events: unknown }).events
        : body,
    );

    if (events.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("web_vitals_events").insert(events);
    if (error) {
      console.error("Insert failed:", error);
      return new Response(JSON.stringify({ error: "insert_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ inserted: events.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Handler error:", err);
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});