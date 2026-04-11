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

/** Generate cryptographically secure 6-digit OTP */
function generateSecureOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

/** Normalize phone to multiple candidate formats for lookup */
function phoneVariants(phone: string, countryCode: string): string[] {
  const clean = String(phone).replace(/\D/g, "").replace(/^0+/, "");
  return [
    `${countryCode}${clean}`,
    `0${clean}`,
    clean,
    String(phone),
  ];
}

const OTP_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_REQUESTS_PER_HOUR = 6;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    let body: { phone?: string; country_code?: string };
    try {
      body = await req.json();
    } catch {
      return respond({ success: false, error: "invalid_request", message: "Invalid request body" });
    }

    const { phone, country_code } = body;
    if (!phone || !country_code) {
      return respond({ success: false, error: "missing_fields", message: "phone and country_code required" });
    }

    // Validate inputs
    const cleanPhone = String(phone).replace(/\D/g, "").replace(/^0+/, "");
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      return respond({ success: false, error: "invalid_phone", message: "Invalid phone number format" });
    }
    if (!/^\+\d{1,4}$/.test(country_code)) {
      return respond({ success: false, error: "invalid_country_code", message: "Invalid country code" });
    }

    const fullPhone = `${country_code}${cleanPhone}`;

    // Rate limit: check via DB function
    const { data: allowed } = await adminClient.rpc("check_rate_limit", {
      _identifier: fullPhone,
      _type: "login_otp_request",
      _max_attempts: MAX_OTP_REQUESTS_PER_HOUR,
      _window_minutes: 60,
      _block_minutes: 30,
    });

    if (allowed === false) {
      return respond({
        success: false,
        error: "rate_limited",
        message: "Too many OTP requests. Please try again later.",
      });
    }

    // Find profile by phone
    let profile: { user_id: string } | null = null;
    for (const ph of phoneVariants(phone, country_code)) {
      const { data } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("phone", ph)
        .limit(1)
        .maybeSingle();
      if (data) { profile = data; break; }
    }

    if (!profile) {
      return respond({ success: false, error: "no_account", message: "No account found with this phone number" });
    }

    // Generate secure OTP
    const otp = generateSecureOtp();

    // Delete previous OTPs for this user
    await adminClient.from("phone_otps").delete().eq("user_id", profile.user_id);

    // Insert new OTP
    const { error: insertError } = await adminClient.from("phone_otps").insert({
      user_id: profile.user_id,
      phone: fullPhone,
      otp_code: otp,
      expires_at: new Date(Date.now() + OTP_LIFETIME_MS).toISOString(),
    });

    if (insertError) {
      console.error("Failed to create OTP:", insertError);
      return respond({ success: false, error: "otp_create_failed", message: "Failed to create OTP" });
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
            Body: `رمز الدخول لحسابك في فنيين: ${otp}\nYour Faneen login code: ${otp}\n\nينتهي خلال 5 دقائق | Expires in 5 minutes`,
          }),
        });
        smsSent = response.ok;
      } catch (e) {
        console.error("Twilio send failed:", e);
      }
    }

    return respond({
      success: true,
      sms_sent: smsSent,
      expires_in_seconds: OTP_LIFETIME_MS / 1000,
      ...(smsSent ? {} : { demo_otp: otp }),
    });
  } catch (err) {
    console.error("send-login-otp error:", err);
    return respond({ success: false, error: "internal_error", message: "An unexpected error occurred" });
  }
});
