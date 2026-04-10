import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
      return respond({
        success: false,
        error: "missing_fields",
        message: "phone, country_code and otp_code required",
      });
    }

    const cleanPhone = String(phone).replace(/^0/, "");
    const fullPhone = `${country_code}${cleanPhone}`;
    const localPhone = `0${cleanPhone}`;
    const otpGraceMs = 30 * 1000;
    const validAfterIso = new Date(Date.now() - otpGraceMs).toISOString();

    let profile: { user_id: string } | null = null;

    for (const ph of [fullPhone, localPhone, cleanPhone, String(phone)]) {
      const { data } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("phone", ph)
        .limit(1)
        .maybeSingle();

      if (data) {
        profile = data;
        break;
      }
    }

    if (!profile) {
      return respond({ success: false, error: "no_account", message: "No account found" });
    }

    let otpRecord: any = null;

    for (const ph of [fullPhone, localPhone, cleanPhone, String(phone)]) {
      const { data } = await adminClient
        .from("phone_otps")
        .select("*")
        .eq("user_id", profile.user_id)
        .eq("phone", ph)
        .eq("verified", false)
        .gt("expires_at", validAfterIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        otpRecord = data;
        break;
      }
    }

    if (!otpRecord) {
      const { data } = await adminClient
        .from("phone_otps")
        .select("*")
        .eq("user_id", profile.user_id)
        .eq("verified", false)
        .gt("expires_at", validAfterIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) otpRecord = data;
    }

    if (!otpRecord) {
      const { data: latestOtp } = await adminClient
        .from("phone_otps")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestOtp?.verified) {
        return respond({
          success: false,
          error: "otp_already_used",
          message: "This OTP has already been used. Request a new code.",
        });
      }

      if (latestOtp && new Date(latestOtp.expires_at).getTime() < Date.now() - otpGraceMs) {
        return respond({
          success: false,
          error: "otp_expired",
          message: "OTP expired. Request a new code.",
        });
      }

      return respond({
        success: false,
        error: "otp_not_found",
        message: "OTP expired or not found",
      });
    }

    if (otpRecord.attempts >= 5) {
      return respond({
        success: false,
        error: "too_many_attempts",
        message: "Too many attempts, request a new OTP",
      });
    }

    if (otpRecord.otp_code !== otp_code) {
      await adminClient
        .from("phone_otps")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      return respond({
        success: false,
        error: "invalid_otp",
        message: "Invalid OTP code",
        attempts_remaining: Math.max(0, 4 - otpRecord.attempts),
      });
    }

    const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(profile.user_id);
    const authEmail = authUserData?.user?.email;

    if (authUserError || !authEmail) {
      console.error("Failed to load auth user:", authUserError);
      return respond({
        success: false,
        error: "no_email_linked",
        message: "User has no email linked",
      });
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });

    if (linkError) {
      console.error("Failed to generate magic link:", linkError);
      return respond({
        success: false,
        error: "login_link_failed",
        message: "Failed to generate login link",
      });
    }

    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) {
      return respond({
        success: false,
        error: "missing_token_hash",
        message: "Failed to create login token",
      });
    }

    const { error: verifyMarkError } = await adminClient
      .from("phone_otps")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    if (verifyMarkError) {
      console.error("Failed to mark OTP as verified:", verifyMarkError);
    }

    return respond({
      success: true,
      verified: true,
      email: authEmail,
      token_hash: tokenHash,
    });
  } catch (err) {
    console.error("verify-login-otp error:", err);
    return respond({ success: false, error: "internal_error", message: String(err) });
  }
});
