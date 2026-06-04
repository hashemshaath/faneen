// DATA-ENRICHMENT-GOVERNANCE-1 — shared admin gate for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-source-token",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface AdminContext {
  userId: string;
  client: ReturnType<typeof createClient>;
  service: ReturnType<typeof createClient>;
}

export async function requireAdmin(req: Request): Promise<AdminContext | Response> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return jsonResponse({ error: "unauthorized" }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const client = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);
  const { data: isAdmin } = await client.rpc("has_admin_access", { _user_id: user.id });
  if (isAdmin !== true) return jsonResponse({ error: "forbidden" }, 403);
  return { userId: user.id, client, service };
}

/** Accept either admin Bearer or an internal x-source-token for system ingestion. */
export async function requireAdminOrSourceToken(req: Request): Promise<AdminContext | { system: true; service: ReturnType<typeof createClient>; userId: null } | Response> {
  const token = req.headers.get("x-source-token");
  const expected = Deno.env.get("DATA_ENRICHMENT_SOURCE_TOKEN");
  if (token && expected && token === expected) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    return { system: true, service, userId: null };
  }
  return requireAdmin(req);
}

export async function emitAudit(
  service: ReturnType<typeof createClient>,
  row: {
    record_id?: string | null;
    field?: string | null;
    old_value?: string | null;
    new_value?: string | null;
    source_key?: string | null;
    actor_id?: string | null;
    action: string;
    reason?: string | null;
  },
) {
  try {
    await service.from("data_enrichment_audit").insert(row);
  } catch {
    // best-effort
  }
}