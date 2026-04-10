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

    let body: { phone?: string; country_code?: string };
    try {
      body = await req.json();
    } catch {
      return respond({ success: false, error: "invalid_request", message: "Invalid request body" });
    }

    const { phone, country_code } = body;
    if (!phone || !country_code) {
      return respond({
        success: false,
        error: "missing_fields",
        message: "phone and country_code required",
      });
    }

    const cleanPhone = String(phone).replace(/^0/, "");
    const fullPhone = `${country_code}${cleanPhone}`;
    const localPhone = `0${cleanPhone}`;

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
      return respond({
        success: false,
        error: "no_account",
        message: "No account found with this phone number",
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpLifetimeMs = 10 * 60 * 1000;

    await adminClient.from("phone_otps").delete().eq("user_id", profile.user_id);

    const { error: insertError } = await adminClient.from("phone_otps").insert({
      user_id: profile.user_id,
      phone: fullPhone,
      otp_code: otp,
      expires_at: new Date(Date.now() + otpLifetimeMs).toISOString(),
    });

    if (insertError) {
      console.error("Failed to create OTP:", insertError);
      return respond({ success: false, error: "otp_create_failed", message: "Failed to create OTP" });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    let smsSent = false;

    if (LOVABLE_API_KEY && TWILIO_API_KEY && TWILIO_PHONE_NUMBER) {
      try {
        const gatewayUrl = "https://connector-gateway.lovable.dev/twilio";
        const response = await fetch(`${gatewayUrl}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: fullPhone,
            From: TWILIO_PHONE_NUMBER,
            Body: `رمز الدخول لحسابك في فنيين: ${otp}\nYour Faneen login code: ${otp}`,
          }),
        });

        smsSent = response.ok;
      } catch (twilioError) {
        console.error("Twilio send failed:", twilioError);
      }
    }

    return respond({
      success: true,
      sms_sent: smsSent,
      expires_in_seconds: otpLifetimeMs / 1000,
      ...(smsSent ? {} : { demo_otp: otp }),
    });
  } catch (err) {
    console.error("send-login-otp error:", err);
    return respond({ success: false, error: "internal_error", message: String(err) });
  }
});
