import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Generate cryptographically secure 6-digit OTP */
function generateSecureOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

const OTP_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "missing_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { phone?: string; country_code?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: "invalid_request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone, country_code } = body;
    if (!phone || !country_code) {
      return new Response(JSON.stringify({ success: false, error: "Phone and country_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate inputs
    const cleanPhone = String(phone).replace(/\D/g, "").replace(/^0+/, "");
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      return new Response(JSON.stringify({ success: false, error: "invalid_phone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullPhone = `${country_code}${cleanPhone}`;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Rate limit
    const { data: allowed } = await adminClient.rpc("check_rate_limit", {
      _identifier: `${user.id}_otp_request`,
      _type: "onboarding_otp_request",
      _max_attempts: 6,
      _window_minutes: 60,
      _block_minutes: 30,
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ success: false, error: "rate_limited", message: "Too many OTP requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure OTP
    const otp = generateSecureOtp();

    // Delete previous OTPs for this user/phone
    await adminClient.from("phone_otps").delete().eq("user_id", user.id);

    // Insert new OTP
    const { error: insertError } = await adminClient.from("phone_otps").insert({
      user_id: user.id,
      phone: fullPhone,
      otp_code: otp,
      expires_at: new Date(Date.now() + OTP_LIFETIME_MS).toISOString(),
    });

    if (insertError) {
      return new Response(JSON.stringify({ success: false, error: "Failed to create OTP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to send via Twilio
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    let smsSent = false;
    if (LOVABLE_API_KEY && TWILIO_API_KEY && TWILIO_PHONE_NUMBER) {
      try {
        const response = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: fullPhone,
            From: TWILIO_PHONE_NUMBER,
            Body: `رمز التحقق الخاص بك في فنيين: ${otp}\nYour Faneen verification code: ${otp}\n\nينتهي خلال 5 دقائق | Expires in 5 minutes`,
          }),
        });
        smsSent = response.ok;
      } catch { /* Twilio failed, continue */ }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sms_sent: smsSent,
        ...(smsSent ? {} : { demo_otp: otp }),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-otp error:", err);
    return new Response(JSON.stringify({ success: false, error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
