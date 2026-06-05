// SERVICE-CONFIGURATION-GOVERNANCE-AUDIT-1 (Phase 2)
// Tiny shared helper for integration health endpoints.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const healthCors: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function healthJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...healthCors, "Content-Type": "application/json" },
  });
}

export async function requireAdminHealth(
  req: Request,
): Promise<{ ok: true } | { ok: false; res: Response }> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const auth = req.headers.get("Authorization") ?? "";
    if (!url || !anon || !auth) return { ok: false, res: healthJson({ error: "unauthorized" }, 401) };
    const c = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await c.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return { ok: false, res: healthJson({ error: "unauthorized" }, 401) };
    const { data, error } = await c.rpc("has_admin_access", { _user_id: uid });
    if (error || data !== true) return { ok: false, res: healthJson({ error: "forbidden" }, 403) };
    return { ok: true };
  } catch {
    return { ok: false, res: healthJson({ error: "unauthorized" }, 401) };
  }
}

export interface ProbeOutcome {
  ok: boolean;
  deferred: boolean;
  latencyMs: number;
  status: number;
  errorCode: string | null;
  missing: string[];
  checkedAt: string;
}

export async function probeHttp(
  missing: string[],
  url: string,
  init: RequestInit,
  validate?: (status: number, text: string) => string | null,
): Promise<ProbeOutcome> {
  const checkedAt = new Date().toISOString();
  if (missing.length > 0) {
    return { ok: false, deferred: true, latencyMs: 0, status: 0, errorCode: "missing_secret", missing, checkedAt };
  }
  const t = Date.now();
  try {
    const res = await fetch(url, init);
    const txt = await res.text().catch(() => "");
    const latency = Date.now() - t;
    const err = validate ? validate(res.status, txt) : (res.ok ? null : `http_${res.status}`);
    return {
      ok: !err, deferred: false, latencyMs: latency, status: res.status,
      errorCode: err, missing: [], checkedAt,
    };
  } catch (e) {
    return {
      ok: false, deferred: false, latencyMs: Date.now() - t, status: 0,
      errorCode: e instanceof Error ? e.name : "exception", missing: [], checkedAt,
    };
  }
}