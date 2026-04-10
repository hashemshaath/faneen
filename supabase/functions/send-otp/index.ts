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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
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
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone, country_code } = await req.json();
    if (!phone || !country_code) {
      return new Response(
        JSON.stringify({ error: "Phone and country_code required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fullPhone = `${country_code}${phone}`;

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP in database
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Delete previous OTPs for this user/phone
    await adminClient
      .from("phone_otps")
      .delete()
      .eq("user_id", user.id)
      .eq("phone", fullPhone);

    // Insert new OTP
    const { error: insertError } = await adminClient
      .from("phone_otps")
      .insert({
        user_id: user.id,
        phone: fullPhone,
        otp_code: otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to create OTP" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
            Body: `رمز التحقق الخاص بك في فنيين: ${otp}\nYour Faneen verification code: ${otp}`,
          }),
        });

        if (response.ok) {
          smsSent = true;
        }
      } catch {
        // Twilio failed, continue without SMS
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sms_sent: smsSent,
        // In dev/demo mode, return OTP if Twilio is not configured
        ...(smsSent ? {} : { demo_otp: otp }),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
