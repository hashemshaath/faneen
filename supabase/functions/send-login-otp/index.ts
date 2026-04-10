import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { phone, country_code } = await req.json();
    if (!phone || !country_code) {
      return new Response(
        JSON.stringify({ error: "phone and country_code required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = phone.replace(/^0/, "");
    const fullPhone = `${country_code}${cleanPhone}`;
    // Also try with leading zero for local format
    const localPhone = `0${cleanPhone}`;

    // Find user by phone (try multiple formats)
    let profile: { user_id: string; email: string } | null = null;

    for (const ph of [fullPhone, localPhone, cleanPhone, phone]) {
      const { data } = await adminClient
        .from("profiles")
        .select("user_id, email")
        .eq("phone", ph)
        .limit(1)
        .single();
      if (data) {
        profile = data;
        break;
      }
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "no_account", message: "No account found with this phone number" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Delete previous OTPs for this user/phone
    await adminClient
      .from("phone_otps")
      .delete()
      .eq("user_id", profile.user_id)
      .eq("phone", fullPhone);

    // Insert new OTP (expires in 5 min)
    const { error: insertError } = await adminClient
      .from("phone_otps")
      .insert({
        user_id: profile.user_id,
        phone: fullPhone,
        otp_code: otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to create OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to send via Twilio if configured
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    let smsSent = false;

    if (LOVABLE_API_KEY && TWILIO_API_KEY && TWILIO_PHONE_NUMBER) {
      try {
        const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
        const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
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
        if (response.ok) smsSent = true;
      } catch {
        // Twilio failed, continue
      }
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
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
