import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_METRICS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);
const ALLOWED_RATINGS = new Set(["good", "needs-improvement", "poor"]);

interface VitalEvent {
  metric_name: string;
  metric_value: number;
  metric_rating?: string;
  page_path: string;
  user_agent?: string;
  connection_type?: string;
  device_type?: string;
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
      };
    })
    .filter((x): x is VitalEvent => x !== null)
    .slice(0, 50); // hard cap per request
}

Deno.serve(async (req) => {
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