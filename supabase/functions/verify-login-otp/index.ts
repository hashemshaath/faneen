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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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
    const localPhone = `0${cleanPhone}`;

    // Find the user profile by phone (try multiple formats)
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
        JSON.stringify({ error: "No account found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find valid OTP - try multiple phone formats
    let otpRecord: any = null;
    for (const ph of [fullPhone, localPhone, cleanPhone, phone]) {
      const { data } = await adminClient
        .from("phone_otps")
        .select("*")
        .eq("user_id", profile.user_id)
        .eq("phone", ph)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        otpRecord = data;
        break;
      }
    }

    // If not found with format matching, try without phone filter
    if (!otpRecord) {
      const { data } = await adminClient
        .from("phone_otps")
        .select("*")
        .eq("user_id", profile.user_id)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) otpRecord = data;
    }

    if (!otpRecord) {
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

    if (!profile.email) {
      return new Response(
        JSON.stringify({ error: "User has no email linked" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a temporary random password, set it, sign in, then restore
    const tempPassword = crypto.randomUUID() + "!Aa1";

    // Set temporary password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      profile.user_id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error("Failed to set temp password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to prepare login" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sign in with the temp password using a separate anon client
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: profile.email,
      password: tempPassword,
    });

    if (signInError || !signInData.session) {
      console.error("Sign in failed:", signInError);
      return new Response(
        JSON.stringify({ error: "Failed to sign in" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        session: signInData.session,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-login-otp error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
