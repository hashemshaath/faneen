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

    const { phone, country_code, otp_code } = await req.json();
    if (!phone || !country_code || !otp_code) {
      return new Response(
        JSON.stringify({ error: "phone, country_code and otp_code required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = phone.replace(/^0/, "");
    const fullPhone = `${country_code}${cleanPhone}`;

    // Find the user profile by phone
    const { data: profile } = await adminClient
      .from("profiles")
      .select("user_id, email")
      .eq("phone", fullPhone)
      .eq("phone_verified", true)
      .limit(1)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "No account found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await adminClient
      .from("phone_otps")
      .select("*")
      .eq("user_id", profile.user_id)
      .eq("phone", fullPhone)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "OTP expired or not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check attempts (max 5)
    if (otpRecord.attempts >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many attempts, request a new OTP" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment attempts
    await adminClient
      .from("phone_otps")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    // Verify OTP
    if (otpRecord.otp_code !== otp_code) {
      return new Response(
        JSON.stringify({
          error: "Invalid OTP code",
          attempts_remaining: 4 - otpRecord.attempts,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    await adminClient
      .from("phone_otps")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    // Generate a magic link for the user to sign in
    if (!profile.email) {
      return new Response(
        JSON.stringify({ error: "User has no email linked" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({ error: "Failed to generate login link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract token_hash from the generated link properties
    const tokenHash = linkData.properties?.hashed_token;

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        email: profile.email,
        token_hash: tokenHash,
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
