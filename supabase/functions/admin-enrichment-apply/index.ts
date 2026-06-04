// ADMIN-DATA-ENRICHMENT-MICROSERVICE-1 — apply step.
// Persists an admin-approved enrichment draft. Two modes:
//   mode = "lead"         -> creates a new provider_leads row (status 'new', source 'admin_enrichment')
//   mode = "business"     -> updates description_ar/en, phone, website, city,
//                            district, street fields on an existing business
//                            row that the admin selected. Never publishes,
//                            never changes status, never creates a business
//                            from scratch.
// Always writes an admin_activity_log entry and updates the session row.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ApprovedFields {
  name_ar?: string;
  name_en?: string;
  activity?: string;
  description_ar?: string;
  description_en?: string;
  phone?: string;
  website?: string;
  city?: string;
  district?: string;
  street?: string;
  national_address?: string;
  latitude?: string;
  longitude?: string;
  working_hours?: string;
  logo_url?: string;
  social_links?: string;
}

interface ApplyBody {
  session_id: string;
  mode: "lead" | "business";
  business_id?: string;
  approved: ApprovedFields;
}

function clean(v: unknown, max = 2000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("has_admin_access", {
      _user_id: user.id,
    });
    if (isAdmin !== true) return json({ error: "forbidden" }, 403);

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({})) as ApplyBody;
    if (!body?.session_id || !body?.mode || !body?.approved) {
      return json({ error: "invalid_input" }, 400);
    }

    const approved = body.approved;
    let applied_entity_type: string | null = null;
    let applied_entity_id: string | null = null;

    if (body.mode === "business") {
      const bid = clean(body.business_id, 64);
      if (!bid) return json({ error: "missing_business_id" }, 400);

      const patch: Record<string, string | null> = {};
      const setIf = (key: string, v: string | null) => {
        if (v !== null) patch[key] = v;
      };
      setIf("description_ar", clean(approved.description_ar));
      setIf("description_en", clean(approved.description_en));
      setIf("phone", clean(approved.phone, 40));
      setIf("website", clean(approved.website, 500));
      setIf("city", clean(approved.city, 120));
      setIf("district", clean(approved.district, 120));
      setIf("street", clean(approved.street, 240));

      if (Object.keys(patch).length === 0) {
        return json({ error: "nothing_to_apply" }, 400);
      }

      // deno-lint-ignore no-explicit-any
      const { error: upErr } = await admin.from("businesses").update(patch as any).eq("id", bid);
      if (upErr) return json({ error: "update_failed" }, 200);

      applied_entity_type = "business";
      applied_entity_id = bid;
    } else {
      // Create provider lead — never marks it as approved or converts to business.
      const payload: Record<string, unknown> = {
        name_ar: clean(approved.name_ar, 160) ?? "غير محدد",
        name_en: clean(approved.name_en, 160),
        contact_name: clean(approved.name_ar, 160) ?? "—",
        email: `lead-${Date.now()}@enrichment.local`,
        phone: clean(approved.phone, 40) ?? "+966500000000",
        preferred_channel: "phone",
        website: clean(approved.website, 500),
        main_activity: clean(approved.activity, 200),
        brief: clean(approved.description_ar, 1000) ?? clean(approved.description_en, 1000),
        national_address: clean(approved.national_address, 240),
        city: clean(approved.city, 120),
        status: "new",
        admin_notes: "Created via /admin/data-enrichment",
      };
      const { data: lead, error: leadErr } = await admin
        .from("provider_leads")
        // deno-lint-ignore no-explicit-any
        .insert(payload as any)
        .select("id")
        .single();
      if (leadErr || !lead) return json({ error: "lead_create_failed" }, 200);
      applied_entity_type = "provider_lead";
      applied_entity_id = lead.id;
    }

    // Update session
    // deno-lint-ignore no-explicit-any
    await admin.from("admin_enrichment_sessions").update({
      status: "applied",
      applied_entity_type,
      applied_entity_id,
      merged: { approved },
    } as any).eq("id", body.session_id);

    // Audit log
    // deno-lint-ignore no-explicit-any
    await admin.from("admin_activity_log").insert({
      user_id: user.id,
      action: "admin.data_enrichment.applied",
      entity_type: applied_entity_type,
      entity_id: applied_entity_id,
      details: {
        session_id: body.session_id,
        mode: body.mode,
        fields: Object.keys(approved ?? {}),
      },
    } as any);

    return json({
      ok: true,
      applied_entity_type,
      applied_entity_id,
    });
  } catch {
    return json({ error: "internal_error" }, 200);
  }
});