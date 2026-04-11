import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_VERIFY_ATTEMPTS = 5;

/** Timing-safe string comparison */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { phone?: string; country_code?: string; otp_code?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone, country_code, otp_code } = body;
    if (!phone || !country_code || !otp_code) {
      return new Response(
        JSON.stringify({ success: false, error: "phone, country_code and otp_code required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp_code)) {
      return new Response(
        JSON.stringify({ success: false, error: "OTP must be 6 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = String(phone).replace(/\D/g, "").replace(/^0+/, "");
    const fullPhone = `${country_code}${cleanPhone}`;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Rate limit
    const { data: allowed } = await adminClient.rpc("check_rate_limit", {
      _identifier: `${user.id}_otp_verify`,
      _type: "onboarding_otp_verify",
      _max_attempts: 10,
      _window_minutes: 15,
      _block_minutes: 30,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ success: false, error: "Too many attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find valid OTP - try multiple phone formats
    let otpRecord = null;
    const candidates = [fullPhone, `0${cleanPhone}`, cleanPhone, String(phone)];
    
    for (const ph of candidates) {
      const { data } = await adminClient
        .from("phone_otps")
        .select("*")
        .eq("user_id", user.id)
        .eq("phone", ph)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) { otpRecord = data; break; }
    }

    // Fallback: any unverified OTP for this user
    if (!otpRecord) {
      const { data } = await adminClient
        .from("phone_otps")
        .select("*")
        .eq("user_id", user.id)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      otpRecord = data;
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ success: false, error: "OTP expired or not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
      await adminClient.from("phone_otps").update({ verified: true }).eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ success: false, error: "Too many attempts, request a new OTP" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Timing-safe verify
    if (!timingSafeEqual(otpRecord.otp_code, otp_code)) {
      await adminClient
        .from("phone_otps")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid OTP code",
          attempts_remaining: Math.max(0, MAX_VERIFY_ATTEMPTS - 1 - otpRecord.attempts),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    await adminClient.from("phone_otps").update({ verified: true }).eq("id", otpRecord.id);

    // Update user profile
    await adminClient
      .from("profiles")
      .update({
        phone: fullPhone,
        country_code: country_code,
        phone_verified: true,
      })
      .eq("user_id", user.id);

    // Clean up verified OTPs
    await adminClient.from("phone_otps").delete().eq("user_id", user.id).eq("verified", true);

    return new Response(JSON.stringify({ success: true, verified: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-otp error:", err);
    return new Response(JSON.stringify({ success: false, error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
