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

/** Try multiple phone formats to find a profile */
async function findProfile(
  adminClient: ReturnType<typeof createClient>,
  phone: string,
  countryCode: string
) {
  const clean = String(phone).replace(/^0/, "");
  const candidates = [
    `${countryCode}${clean}`,
    `0${clean}`,
    clean,
    String(phone),
  ];

  for (const ph of candidates) {
    const { data } = await adminClient
      .from("profiles")
      .select("user_id, email")
      .eq("phone", ph)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

/** Find a valid, unexpired OTP for the given user */
async function findOtp(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  phone: string,
  countryCode: string,
  graceIso: string
) {
  const clean = String(phone).replace(/^0/, "");
  const candidates = [
    `${countryCode}${clean}`,
    `0${clean}`,
    clean,
    String(phone),
  ];

  // Try each phone format first
  for (const ph of candidates) {
    const { data } = await adminClient
      .from("phone_otps")
      .select("*")
      .eq("user_id", userId)
      .eq("phone", ph)
      .eq("verified", false)
      .gt("expires_at", graceIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  // Fallback: any OTP for this user
  const { data } = await adminClient
    .from("phone_otps")
    .select("*")
    .eq("user_id", userId)
    .eq("verified", false)
    .gt("expires_at", graceIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/** Get email for the user – try auth.users first, then profile */
async function resolveEmail(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  profileEmail: string | null
): Promise<string | null> {
  try {
    const { data, error } = await adminClient.auth.admin.getUserById(userId);
    if (!error && data?.user?.email) return data.user.email;
  } catch (e) {
    console.warn("getUserById failed, falling back to profile email:", e);
  }

  // Fallback to profile email
  if (profileEmail) return profileEmail;

  // Last resort: fetch profile email from DB
  const { data: prof } = await adminClient
    .from("profiles")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();

  return prof?.email || null;
}

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

    // 1. Find profile
    const profile = await findProfile(adminClient, phone, country_code);
    if (!profile) {
      return respond({ success: false, error: "no_account", message: "No account found" });
    }

    // 2. Find OTP
    const otpGraceMs = 30 * 1000;
    const graceIso = new Date(Date.now() - otpGraceMs).toISOString();
    const otpRecord = await findOtp(adminClient, profile.user_id, phone, country_code, graceIso);

    if (!otpRecord) {
      // Check if latest OTP was already used or expired
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

    // 3. Check attempts
    if (otpRecord.attempts >= 5) {
      return respond({
        success: false,
        error: "too_many_attempts",
        message: "Too many attempts, request a new OTP",
      });
    }

    // 4. Verify code
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

    // 5. Resolve email (auth.users → profile fallback)
    const authEmail = await resolveEmail(adminClient, profile.user_id, profile.email);

    if (!authEmail) {
      return respond({
        success: false,
        error: "no_email_linked",
        message: "No email linked to this account. Please contact support.",
      });
    }

    // 6. Generate magic link
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

    // 7. Mark OTP as verified
    await adminClient
      .from("phone_otps")
      .update({ verified: true })
      .eq("id", otpRecord.id);

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
