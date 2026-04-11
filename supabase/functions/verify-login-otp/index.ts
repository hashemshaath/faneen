import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function phoneVariants(phone: string, countryCode: string): string[] {
  const clean = String(phone).replace(/\D/g, "").replace(/^0+/, "");
  return [`${countryCode}${clean}`, `0${clean}`, clean, String(phone)];
}

const MAX_VERIFY_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    let body: { phone?: string; country_code?: string; otp_code?: string };
    try {
      body = await req.json();
    } catch {
      return respond({ success: false, error: "invalid_request", message: "Invalid request body" });
    }

    const { phone, country_code, otp_code } = body;
    if (!phone || !country_code || !otp_code) {
      return respond({ success: false, error: "missing_fields", message: "phone, country_code and otp_code required" });
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp_code)) {
      return respond({ success: false, error: "invalid_otp_format", message: "OTP must be 6 digits" });
    }

    // Rate limit verification attempts
    const cleanPhone = String(phone).replace(/\D/g, "").replace(/^0+/, "");
    const fullPhone = `${country_code}${cleanPhone}`;

    const { data: allowed } = await adminClient.rpc("check_rate_limit", {
      _identifier: fullPhone,
      _type: "login_otp_verify",
      _max_attempts: 10,
      _window_minutes: 15,
      _block_minutes: 30,
    });

    if (allowed === false) {
      return respond({
        success: false,
        error: "rate_limited",
        message: "Too many verification attempts. Please try again later.",
      });
    }

    // 1. Find profile
    let profile: { user_id: string; email: string | null } | null = null;
    for (const ph of phoneVariants(phone, country_code)) {
      const { data } = await adminClient
        .from("profiles")
        .select("user_id, email")
        .eq("phone", ph)
        .limit(1)
        .maybeSingle();
      if (data) { profile = data; break; }
    }

    if (!profile) {
      return respond({ success: false, error: "no_account", message: "No account found" });
    }

    // 2. Find valid OTP
    const now = new Date().toISOString();
    let otpRecord = null;

    // Try exact phone matches first, then any OTP for this user
    for (const ph of [...phoneVariants(phone, country_code)]) {
      const { data } = await adminClient
        .from("phone_otps")
        .select("*")
        .eq("user_id", profile.user_id)
        .eq("phone", ph)
        .eq("verified", false)
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) { otpRecord = data; break; }
    }

    // Fallback: any OTP for this user
    if (!otpRecord) {
      const { data } = await adminClient
        .from("phone_otps")
        .select("*")
        .eq("user_id", profile.user_id)
        .eq("verified", false)
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      otpRecord = data;
    }

    if (!otpRecord) {
      // Check why: expired or already used?
      const { data: latestOtp } = await adminClient
        .from("phone_otps")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestOtp?.verified) {
        return respond({ success: false, error: "otp_already_used", message: "This OTP has already been used. Request a new code." });
      }
      return respond({ success: false, error: "otp_expired", message: "OTP expired. Request a new code." });
    }

    // 3. Check attempts FIRST (before comparing code)
    if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
      // Invalidate OTP after max attempts
      await adminClient.from("phone_otps").update({ verified: true }).eq("id", otpRecord.id);
      return respond({ success: false, error: "too_many_attempts", message: "Too many attempts. Request a new OTP." });
    }

    // 4. Timing-safe OTP comparison
    const codeMatch = timingSafeEqual(otpRecord.otp_code, otp_code);

    if (!codeMatch) {
      // Increment attempts ONLY on failure
      await adminClient
        .from("phone_otps")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      const remaining = MAX_VERIFY_ATTEMPTS - 1 - otpRecord.attempts;
      return respond({
        success: false,
        error: "invalid_otp",
        message: "Invalid OTP code",
        attempts_remaining: Math.max(0, remaining),
      });
    }

    // 5. Resolve email for session generation
    let authEmail: string | null = null;
    try {
      const { data } = await adminClient.auth.admin.getUserById(profile.user_id);
      authEmail = data?.user?.email || null;
    } catch { /* fallback below */ }

    if (!authEmail) authEmail = profile.email;

    if (!authEmail) {
      const { data: prof } = await adminClient
        .from("profiles")
        .select("email")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      authEmail = prof?.email || null;
    }

    if (!authEmail) {
      return respond({ success: false, error: "no_email_linked", message: "No email linked to this account. Please contact support." });
    }

    // 6. Generate recovery link and verify server-side for session
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: authEmail,
    });

    if (linkError) {
      console.error("Failed to generate link:", linkError);
      return respond({ success: false, error: "login_link_failed", message: "Failed to generate login link" });
    }

    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) {
      return respond({ success: false, error: "missing_token_hash", message: "Failed to create login token" });
    }

    // Verify server-side for immediate session
    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ token_hash: tokenHash, type: "recovery" }),
    });

    // Mark OTP as verified
    await adminClient.from("phone_otps").update({ verified: true }).eq("id", otpRecord.id);

    // Clean up all OTPs for this user
    await adminClient.from("phone_otps").delete().eq("user_id", profile.user_id).eq("verified", true);

    if (verifyRes.ok) {
      const sessionData = await verifyRes.json();
      return respond({
        success: true,
        verified: true,
        email: authEmail,
        session: {
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        },
      });
    }

    // Fallback: return token_hash for client-side verification
    console.warn("Server-side verify failed, falling back to token_hash");
    return respond({
      success: true,
      verified: true,
      email: authEmail,
      token_hash: tokenHash,
      token_type: "recovery",
    });
  } catch (err) {
    console.error("verify-login-otp error:", err);
    return respond({ success: false, error: "internal_error", message: "An unexpected error occurred" });
  }
});

/** Timing-safe string comparison to prevent timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
