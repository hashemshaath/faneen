import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AccountType = "individual" | "business" | "company";
type AppRole = "super_admin" | "admin" | "moderator" | "user";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: isSuperAdmin } = await admin.rpc("is_super_admin", { _user_id: caller.id });
    if (!isSuperAdmin) return json({ error: "Forbidden — Super Admin only" }, 403);

    const body = await req.json().catch(() => ({})) as {
      email?: string;
      password?: string;
      full_name?: string;
      phone?: string;
      account_type?: AccountType;
      membership_tier?: string;
      role?: AppRole | "none";
      auto_confirm?: boolean;
    };

    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const full_name = (body.full_name ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const account_type: AccountType = body.account_type ?? "individual";
    const membership_tier = body.membership_tier ?? "free";
    const role = body.role ?? "none";
    const auto_confirm = body.auto_confirm !== false;

    // Validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
    if (!full_name) return json({ error: "Full name is required" }, 400);
    if (!["individual", "business", "company"].includes(account_type)) return json({ error: "Invalid account_type" }, 400);

    // Create user via admin API
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: auto_confirm,
      user_metadata: { full_name, phone, account_type },
    });
    if (createErr || !created.user) return json({ error: createErr?.message ?? "Failed to create user" }, 400);

    const newUserId = created.user.id;

    // Update profile with account_type / tier / phone (trigger creates row with defaults)
    await admin
      .from("profiles")
      .update({
        full_name,
        phone: phone || null,
        account_type,
        membership_tier,
        email,
      })
      .eq("user_id", newUserId);

    // Optional: assign role
    if (role && role !== "none" && role !== "user") {
      await admin.from("user_roles").insert({ user_id: newUserId, role });
    }

    // Log
    await admin.from("admin_activity_log").insert({
      user_id: caller.id,
      action: "create_user",
      entity_type: "user",
      entity_id: newUserId,
      details: { email, account_type, role, membership_tier },
    });

    return json({ success: true, user_id: newUserId, email });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
