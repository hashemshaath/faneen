import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { logSecurityEvent, hashSubject, hashIp } from "../_shared/securityAudit.ts";
import { hashOtp } from "../_shared/otpHash.ts";

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

/** Comma-separated full phones (e.g. "+966506315300,+201001234567") that
 *  bypass SMS delivery and use the fixed OTP "000000" for QA/testing. */
function bypassPhones(): Set<string> {
  const raw = Deno.env.get("OTP_BYPASS_PHONES") ?? "";
  return new Set(
    raw.split(",").map((s) => s.trim()).filter(Boolean),
  );
}
const TEST_OTP = "000000";

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
    const subjectHash = await hashSubject(fullPhone);
    const ipHash = await hashIp(req);
    const userAgent = req.headers.get("user-agent");
    await logSecurityEvent(adminClient, {
      event_type: "login_otp_send",
      event_action: "attempt",
      subject_hash: subjectHash,
      ip_hash: ipHash,
      user_agent: userAgent,
    });

    // Rate limit: check via DB function
    const { data: allowed } = await adminClient.rpc("check_rate_limit", {
      _identifier: fullPhone,
      _type: "login_otp_request",
      _max_attempts: MAX_OTP_REQUESTS_PER_HOUR,
      _window_minutes: 60,
      _block_minutes: 30,
    });

    if (allowed === false) {
      await logSecurityEvent(adminClient, {
        event_type: "login_otp_send",
        event_action: "rate_limited",
        status: "warn",
        subject_hash: subjectHash,
        ip_hash: ipHash,
        reason: "rate_limited",
      });
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
      await logSecurityEvent(adminClient, {
        event_type: "login_otp_send",
        event_action: "failed",
        status: "warn",
        subject_hash: subjectHash,
        ip_hash: ipHash,
        reason: "no_account",
      });
      return respond({ success: false, error: "no_account", message: "No account found with this phone number" });
    }

    // Generate secure OTP
    const isBypass = bypassPhones().has(fullPhone);
    const otp = isBypass ? TEST_OTP : generateSecureOtp();

    // Delete previous OTPs for this user
    await adminClient.from("phone_otps").delete().eq("user_id", profile.user_id);

    // Insert new OTP (store SHA-256 hash, never the raw code)
    const otpHash = await hashOtp(otp, profile.user_id);
    const { error: insertError } = await adminClient.from("phone_otps").insert({
      user_id: profile.user_id,
      phone: fullPhone,
      otp_code_hash: otpHash,
      expires_at: new Date(Date.now() + OTP_LIFETIME_MS).toISOString(),
    });

    if (insertError) {
      console.error("Failed to create OTP:", insertError);
      await logSecurityEvent(adminClient, {
        event_type: "login_otp_send",
        event_action: "failed",
        status: "error",
        user_id: profile.user_id,
        subject_hash: subjectHash,
        ip_hash: ipHash,
        reason: "otp_create_failed",
      });
      return respond({ success: false, error: "otp_create_failed", message: "Failed to create OTP" });
    }

    // Bypass SMS for test phones — return success immediately.
    if (isBypass) {
      await logSecurityEvent(adminClient, {
        event_type: "login_otp_send",
        event_action: "success",
        status: "warn",
        user_id: profile.user_id,
        subject_hash: subjectHash,
        ip_hash: ipHash,
        user_agent: userAgent,
        reason: "sms_bypass_test_phone",
      });
      return respond({
        success: true,
        sms_sent: false,
        test_mode: true,
        expires_in_seconds: OTP_LIFETIME_MS / 1000,
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
            Body: `رمز الدخول لحسابك في قِطاعات: ${otp}\nYour Qitaat login code: ${otp}\n\nينتهي خلال 5 دقائق | Expires in 5 minutes`,
          }),
        });
        smsSent = response.ok;
      } catch (e) {
        console.error("Twilio send failed:", e);
      }
    }

    if (!smsSent) {
      console.error("SMS delivery failed for phone", fullPhone);
      await logSecurityEvent(adminClient, {
        event_type: "login_otp_send",
        event_action: "failed",
        status: "error",
        user_id: profile.user_id,
        subject_hash: subjectHash,
        ip_hash: ipHash,
        reason: "sms_delivery_failed",
      });
      return respond({
        success: false,
        error: "sms_delivery_failed",
        message: "Could not send SMS. Please try again later.",
      });
    }

    await logSecurityEvent(adminClient, {
      event_type: "login_otp_send",
      event_action: "success",
      user_id: profile.user_id,
      subject_hash: subjectHash,
      ip_hash: ipHash,
      user_agent: userAgent,
      reason: "sms_sent",
    });
    return respond({
      success: true,
      sms_sent: true,
      expires_in_seconds: OTP_LIFETIME_MS / 1000,
    });
  } catch (err) {
    console.error("send-login-otp error:", err);
    return respond({ success: false, error: "internal_error", message: "An unexpected error occurred" });
  }
});
