import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { hashOtp, timingSafeEqualHex } from '../_shared/otpHash.ts'
import { logSecurityEvent, hashSubject, hashIp } from '../_shared/securityAudit.ts'

const MAX_VERIFY_ATTEMPTS = 5

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceKey)

    let body: { email?: string; otp_code?: string }
    try {
      body = await req.json()
    } catch {
      return respond({ success: false, error: 'invalid_request', message: 'Invalid request body' })
    }

    const email = normalizeEmail(body.email || '')
    const otpCode = String(body.otp_code || '')
    if (!email || !/^\d{6}$/.test(otpCode)) {
      return respond({ success: false, error: 'invalid_otp_format', message: 'OTP must be 6 digits' })
    }

    const subjectHash = await hashSubject(email)
    const ipHash = await hashIp(req)
    const userAgent = req.headers.get('user-agent')
    await logSecurityEvent(adminClient, {
      event_type: 'email_login_otp_verify',
      event_action: 'attempt',
      subject_hash: subjectHash,
      ip_hash: ipHash,
      user_agent: userAgent,
    })

    const { data: allowed } = await adminClient.rpc('check_rate_limit', {
      _identifier: email,
      _type: 'email_login_otp_verify',
      _max_attempts: 10,
      _window_minutes: 15,
      _block_minutes: 30,
    })

    if (allowed === false) {
      return respond({ success: false, error: 'rate_limited', message: 'طلبات كثيرة، حاول لاحقاً' })
    }

    const now = new Date().toISOString()
    const { data: otpRecord } = await adminClient
      .from('email_login_otps')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!otpRecord) {
      const { data: latestOtp } = await adminClient
        .from('email_login_otps')
        .select('verified')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return respond({
        success: false,
        error: latestOtp?.verified ? 'otp_already_used' : 'otp_expired',
        message: latestOtp?.verified ? 'تم استخدام هذا الرمز' : 'انتهت صلاحية الرمز',
      })
    }

    if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
      await adminClient.from('email_login_otps').update({ verified: true }).eq('id', otpRecord.id)
      return respond({ success: false, error: 'too_many_attempts', message: 'تم تجاوز عدد المحاولات' })
    }

    const incomingHash = await hashOtp(otpCode, otpRecord.user_id)
    const codeMatch = timingSafeEqualHex(otpRecord.otp_code_hash || '', incomingHash)
    if (!codeMatch) {
      await adminClient
        .from('email_login_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id)

      await logSecurityEvent(adminClient, {
        event_type: 'email_login_otp_verify',
        event_action: 'failed',
        status: 'warn',
        user_id: otpRecord.user_id,
        subject_hash: subjectHash,
        ip_hash: ipHash,
        reason: 'invalid_code',
        metadata: { attempts: otpRecord.attempts + 1 },
      })
      return respond({
        success: false,
        error: 'invalid_otp',
        message: 'رمز التحقق غير صحيح',
        attempts_remaining: Math.max(0, MAX_VERIFY_ATTEMPTS - 1 - otpRecord.attempts),
      })
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (linkError) {
      console.error('Failed to generate email login link:', linkError)
      return respond({ success: false, error: 'login_link_failed', message: 'تعذر إنشاء جلسة الدخول' })
    }

    const tokenHash = linkData?.properties?.hashed_token
    if (!tokenHash) {
      return respond({ success: false, error: 'missing_token_hash', message: 'تعذر إنشاء جلسة الدخول' })
    }

    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ token_hash: tokenHash, type: 'magiclink' }),
    })

    await adminClient.from('email_login_otps').update({ verified: true }).eq('id', otpRecord.id)
    await adminClient.from('email_login_otps').delete().eq('user_id', otpRecord.user_id).eq('verified', true)

    if (verifyRes.ok) {
      const sessionData = await verifyRes.json()
      await logSecurityEvent(adminClient, {
        event_type: 'email_login_otp_verify',
        event_action: 'success',
        user_id: otpRecord.user_id,
        subject_hash: subjectHash,
        ip_hash: ipHash,
        user_agent: userAgent,
        reason: 'session_issued',
      })
      return respond({
        success: true,
        verified: true,
        email,
        session: {
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        },
      })
    }

    await logSecurityEvent(adminClient, {
      event_type: 'email_login_otp_verify',
      event_action: 'success',
      status: 'warn',
      user_id: otpRecord.user_id,
      subject_hash: subjectHash,
      ip_hash: ipHash,
      user_agent: userAgent,
      reason: 'token_hash_fallback',
    })
    return respond({
      success: true,
      verified: true,
      email,
      token_hash: tokenHash,
      token_type: 'magiclink',
    })
  } catch (err) {
    console.error('verify-email-login-otp error:', err)
    return respond({ success: false, error: 'internal_error', message: 'حدث خطأ أثناء التحقق من الرمز' })
  }
})