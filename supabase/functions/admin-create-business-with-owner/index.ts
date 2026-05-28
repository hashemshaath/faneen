/**
 * admin-create-business-with-owner
 *
 * Single transactional entry point for admins to create a Business and bind an
 * owner (manager / responsible person) in one call. Three owner modes are
 * supported:
 *
 *  - `existing`  : link to an existing auth.users record by user_id (or ref_id)
 *  - `new`       : create a brand-new auth user with email + password
 *  - `invite`    : create the auth user with a random password and send a
 *                  password-recovery link so the owner sets their own password
 *
 * Hard guards:
 *  - Caller must be admin or super_admin
 *  - Owner cannot be a super_admin (DB trigger also enforces this)
 *  - Email & username uniqueness checked before mutating anything
 *  - Every successful create is logged in admin_activity_log
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OwnerMode = "existing" | "new" | "invite";

interface BusinessPayload {
  username: string;
  name_ar: string;
  name_en?: string | null;
  phone?: string | null;
  email?: string | null;
  category_id?: string | null;
  city_id?: string | null;
  region?: string | null;
  region_en?: string | null;
  national_id?: string | null;
  unified_number?: string | null;
  vat_number?: string | null;
  district?: string | null;
  district_en?: string | null;
  street_name?: string | null;
  street_name_en?: string | null;
  building_number?: string | null;
  additional_number?: string | null;
  address?: string | null;
  address_en?: string | null;
  membership_tier?: string;
}

interface OwnerPayload {
  mode: OwnerMode;
  user_id?: string | null;       // for `existing` mode (preferred)
  ref_id?: string | null;        // for `existing` mode (alternative)
  email?: string;                // for `new` / `invite`
  password?: string;             // for `new`
  full_name?: string;
  full_name_ar?: string;
  full_name_en?: string;
  phone?: string;
  position?: string;             // account_manager_position
  auto_confirm?: boolean;
}

interface RequestBody {
  owner: OwnerPayload;
  business: BusinessPayload;
  redirect_to?: string;          // post-invite landing page
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeUsername(u: string): string {
  return (u || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 30);
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function randomPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, "") + "Aa1!";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const [{ data: isSuperAdmin }, { data: isAdmin }] = await Promise.all([
      admin.rpc("is_super_admin", { _user_id: caller.id }),
      admin.rpc("has_role", { _user_id: caller.id, _role: "admin" }),
    ]);
    if (!isSuperAdmin && !isAdmin) return json({ error: "forbidden_admin_only" }, 403);

    const body = (await req.json().catch(() => null)) as RequestBody | null;
    if (!body || !body.owner || !body.business) {
      return json({ error: "invalid_body" }, 400);
    }

    const business = body.business;
    const owner = body.owner;

    // ── Validate business fields
    const username = sanitizeUsername(business.username || "");
    if (!username || username.length < 3) {
      return json({ error: "invalid_username" }, 400);
    }
    const nameAr = (business.name_ar || "").trim();
    if (!nameAr) return json({ error: "name_ar_required" }, 400);

    // Username uniqueness (case-insensitive across businesses)
    const { data: usernameTaken } = await admin
      .from("businesses")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (usernameTaken) {
      return json({ error: "username_taken" }, 409);
    }

    // ── Resolve owner
    let ownerUserId: string | null = null;
    let ownerEmailResolved: string | null = null;
    let ownerCreatedNow = false;
    let recoveryLink: string | null = null;

    if (owner.mode === "existing") {
      if (owner.user_id) {
        ownerUserId = owner.user_id;
      } else if (owner.ref_id) {
        const { data: prof } = await admin
          .from("profiles")
          .select("user_id, email")
          .eq("ref_id", owner.ref_id.trim().toUpperCase())
          .maybeSingle();
        if (!prof) return json({ error: "owner_not_found" }, 404);
        ownerUserId = prof.user_id;
        ownerEmailResolved = prof.email ?? null;
      } else {
        return json({ error: "owner_id_or_ref_required" }, 400);
      }
    } else if (owner.mode === "new" || owner.mode === "invite") {
      const email = (owner.email ?? "").trim().toLowerCase();
      if (!email || !isEmail(email)) return json({ error: "invalid_owner_email" }, 400);

      // Email uniqueness in profiles (case-insensitive)
      const { data: emailTaken } = await admin
        .from("profiles")
        .select("user_id")
        .ilike("email", email)
        .maybeSingle();
      if (emailTaken) return json({ error: "owner_email_taken" }, 409);

      const password = owner.mode === "new"
        ? (owner.password ?? "")
        : randomPassword();
      if (owner.mode === "new" && password.length < 8) {
        return json({ error: "password_too_short" }, 400);
      }

      const fullName = (owner.full_name
        ?? owner.full_name_ar
        ?? owner.full_name_en
        ?? nameAr).trim();

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: owner.auto_confirm !== false,
        user_metadata: {
          full_name: fullName,
          phone: owner.phone ?? null,
          account_type: "business",
        },
      });
      if (createErr || !created?.user) {
        return json({ error: createErr?.message ?? "auth_create_failed" }, 400);
      }
      ownerUserId = created.user.id;
      ownerEmailResolved = email;
      ownerCreatedNow = true;

      // Sync profile (trigger creates the row; we update editable fields)
      await admin
        .from("profiles")
        .update({
          full_name: fullName,
          full_name_ar: (owner.full_name_ar ?? "").trim() || null,
          full_name_en: (owner.full_name_en ?? "").trim() || null,
          phone: owner.phone ?? null,
          account_type: "business",
          email,
        })
        .eq("user_id", ownerUserId);

      if (owner.mode === "invite") {
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: body.redirect_to ? { redirectTo: body.redirect_to } : undefined,
        });
        recoveryLink = linkData?.properties?.action_link ?? null;
      }
    } else {
      return json({ error: "invalid_owner_mode" }, 400);
    }

    if (!ownerUserId) return json({ error: "owner_resolution_failed" }, 500);

    // Defence-in-depth: never bind a business to a super_admin
    const { data: ownerIsSuper } = await admin.rpc("has_role", {
      _user_id: ownerUserId,
      _role: "super_admin",
    });
    if (ownerIsSuper) {
      return json({ error: "owner_cannot_be_super_admin" }, 422);
    }

    // ── Insert business
    const insertPayload: Record<string, unknown> = {
      user_id: ownerUserId,
      username,
      name_ar: nameAr,
      name_en: business.name_en ?? null,
      phone: business.phone ?? null,
      email: business.email ?? ownerEmailResolved ?? null,
      category_id: business.category_id ?? null,
      city_id: business.city_id ?? null,
      region: business.region ?? null,
      region_en: business.region_en ?? null,
      national_id: business.national_id ?? null,
      unified_number: business.unified_number ?? null,
      vat_number: business.vat_number ?? null,
      district: business.district ?? null,
      district_en: business.district_en ?? null,
      street_name: business.street_name ?? null,
      street_name_en: business.street_name_en ?? null,
      building_number: business.building_number ?? null,
      additional_number: business.additional_number ?? null,
      address: business.address ?? null,
      address_en: business.address_en ?? null,
      account_manager_name: owner.full_name ?? owner.full_name_ar ?? owner.full_name_en ?? null,
      account_manager_phone: owner.phone ?? null,
      account_manager_email: ownerEmailResolved,
      account_manager_position: owner.position ?? null,
      membership_tier: business.membership_tier ?? "free",
      approval_status: "approved",
      is_active: true,
    };

    const { data: bizRow, error: bizErr } = await admin
      .from("businesses")
      .insert(insertPayload)
      .select("id, ref_id, username, name_ar, name_en")
      .single();

    if (bizErr || !bizRow) {
      // Roll back the newly-created auth user so we don't leak orphan accounts
      if (ownerCreatedNow && ownerUserId) {
        await admin.auth.admin.deleteUser(ownerUserId).catch(() => undefined);
      }
      return json({ error: bizErr?.message ?? "business_insert_failed" }, 400);
    }

    // ── Audit
    await admin.from("admin_activity_log").insert({
      user_id: caller.id,
      action: "create_business_with_owner",
      entity_type: "business",
      entity_id: bizRow.id,
      details: {
        business_ref_id: bizRow.ref_id,
        business_username: bizRow.username,
        owner_user_id: ownerUserId,
        owner_email: ownerEmailResolved,
        owner_mode: owner.mode,
        owner_created_now: ownerCreatedNow,
      },
    });

    return json({
      success: true,
      business: bizRow,
      owner: {
        user_id: ownerUserId,
        email: ownerEmailResolved,
        created_now: ownerCreatedNow,
        recovery_link: recoveryLink,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});