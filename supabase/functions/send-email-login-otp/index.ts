import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { hashOtp } from '../_shared/otpHash.ts'
import { logSecurityEvent, hashSubject, hashIp } from '../_shared/securityAudit.ts'

const OTP_LIFETIME_MS = 5 * 60 * 1000
const MAX_OTP_REQUESTS_PER_HOUR = 6
const FROM_DOMAIN = 'qitaat.com'
const SITE_NAME = 'قِطاعات'

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

function generateSecureOtp(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(100000 + (array[0] % 900000))
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  return `${local.slice(0, 1)}***@${domain}`
}

function renderOtpEmail(code: string): { html: string; text: string } {
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f8fafc;font-family:Arial,'Tahoma',sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;padding:32px 18px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="height:6px;background:#0f766e;"></div>
        <div style="padding:28px 24px;text-align:right;">
          <p style="margin:0 0 10px;color:#0f766e;font-size:13px;font-weight:700;">رمز تحقق · Verification code</p>
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.35;color:#0f172a;">رمز الدخول إلى قِطاعات</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:#475569;">استخدم الرمز التالي لإكمال تسجيل الدخول. الرمز صالح لمدة 5 دقائق.</p>
          <div dir="ltr" style="margin:18px 0 24px;padding:18px;border-radius:14px;background:#f1f5f9;border:1px solid #cbd5e1;text-align:center;font-family:'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:10px;color:#0f172a;">${code}</div>
          <p style="margin:0 0 18px;font-size:13px;line-height:1.7;color:#64748b;">إذا لم تطلب هذا الرمز، يمكنك تجاهل الرسالة بأمان.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;" />
          <div dir="ltr" style="text-align:left;">
            <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">Your Qitaat sign-in code</h2>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#475569;">Use this code to finish signing in. It expires in 5 minutes.</p>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">If you did not request this code, you can safely ignore this email.</p>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`
  const text = `رمز الدخول إلى قِطاعات: ${code}\nينتهي خلال 5 دقائق.\n\nYour Qitaat sign-in code: ${code}\nExpires in 5 minutes.`
  return { html, text }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const adminClient = createClient(supabaseUrl, serviceKey)

    let body: { email?: string }
    try {
      body = await req.json()
    } catch {
      return respond({ success: false, error: 'invalid_request', message: 'Invalid request body' })
    }

    const email = normalizeEmail(body.email || '')
    if (!email || !isValidEmail(email)) {
      return respond({ success: false, error: 'invalid_email', message: 'البريد الإلكتروني غير صحيح' })
    }

    const subjectHash = await hashSubject(email)
    const ipHash = await hashIp(req)
    const userAgent = req.headers.get('user-agent')
    await logSecurityEvent(adminClient, {
      event_type: 'email_login_otp_send',
      event_action: 'attempt',
      subject_hash: subjectHash,
      ip_hash: ipHash,
      user_agent: userAgent,
    })

    const { data: allowed } = await adminClient.rpc('check_rate_limit', {
      _identifier: email,
      _type: 'email_login_otp_request',
      _max_attempts: MAX_OTP_REQUESTS_PER_HOUR,
      _window_minutes: 60,
      _block_minutes: 30,
    })

    if (allowed === false) {
      await logSecurityEvent(adminClient, {
        event_type: 'email_login_otp_send',
        event_action: 'rate_limited',
        status: 'warn',
        subject_hash: subjectHash,
        ip_hash: ipHash,
        reason: 'rate_limited',
      })
      return respond({ success: false, error: 'rate_limited', message: 'طلبات كثيرة، حاول لاحقاً' })
    }

    let userId: string | null = null
    const { data: profile } = await adminClient
      .from('profiles')
      .select('user_id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()

    userId = profile?.user_id ?? null

    if (!userId) {
      const { data: authUserId, error: resolveError } = await adminClient.rpc('resolve_auth_user_id_by_email', {
        _email: email,
      })
      if (resolveError) {
        console.error('Failed to resolve auth user by email:', resolveError)
      }
      userId = authUserId ?? null
    }

    if (!userId) {
      await logSecurityEvent(adminClient, {
        event_type: 'email_login_otp_send',
        event_action: 'failed',
        status: 'warn',
        subject_hash: subjectHash,
        ip_hash: ipHash,
        reason: 'no_account',
      })
      return respond({ success: false, error: 'no_account', message: 'لم يتم العثور على حساب بهذا البريد' })
    }

    if (!resendKey) {
      console.error('Email OTP provider is not configured')
      return respond({ success: false, error: 'email_provider_missing', message: 'تعذر إرسال الرمز حالياً' })
    }

    const otp = generateSecureOtp()
    const otpHash = await hashOtp(otp, userId)

    await adminClient.from('email_login_otps').delete().eq('user_id', userId)

    const { error: insertError } = await adminClient.from('email_login_otps').insert({
      user_id: userId,
      email,
      otp_code_hash: otpHash,
      expires_at: new Date(Date.now() + OTP_LIFETIME_MS).toISOString(),
    })

    if (insertError) {
      console.error('Failed to create email OTP:', insertError)
      return respond({ success: false, error: 'otp_create_failed', message: 'تعذر إنشاء الرمز' })
    }

    const { html, text } = renderOtpEmail(otp)
    const messageId = crypto.randomUUID()
    await adminClient.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'email-login-otp',
      recipient_email: email,
      status: 'pending',
    })

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        to: [email],
        subject: 'رمز الدخول إلى قِطاعات · Your Qitaat sign-in code',
        html,
        text,
        headers: {
          'X-Entity-Ref-ID': messageId,
          'X-Idempotency-Key': `email-login-otp-${userId}-${Date.now()}`,
        },
        tags: [{ name: 'template', value: 'email_login_otp' }],
      }),
    })

    const respText = await resp.text()
    if (!resp.ok) {
      await adminClient.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'email-login-otp',
        recipient_email: email,
        status: 'dlq',
        error_message: `Email OTP send failed: ${resp.status} ${respText}`.slice(0, 1000),
      })
      await logSecurityEvent(adminClient, {
        event_type: 'email_login_otp_send',
        event_action: 'failed',
        status: 'error',
        user_id: userId,
        subject_hash: subjectHash,
        ip_hash: ipHash,
        reason: 'email_delivery_failed',
      })
      return respond({ success: false, error: 'email_delivery_failed', message: 'تعذر إرسال الرمز إلى البريد' })
    }

    let providerId: string | null = null
    try {
      providerId = (JSON.parse(respText) as { id?: string })?.id ?? null
    } catch { /* ignore */ }

    await adminClient.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'email-login-otp',
      recipient_email: email,
      status: 'sent',
      metadata: { provider: 'resend', provider_id: providerId },
    })
    await logSecurityEvent(adminClient, {
      event_type: 'email_login_otp_send',
      event_action: 'success',
      user_id: userId,
      subject_hash: subjectHash,
      ip_hash: ipHash,
      user_agent: userAgent,
      reason: 'email_sent',
    })

    console.log('Email login OTP sent', { recipient: maskEmail(email), providerId })
    return respond({ success: true, email_sent: true, expires_in_seconds: OTP_LIFETIME_MS / 1000 })
  } catch (err) {
    console.error('send-email-login-otp error:', err)
    return respond({ success: false, error: 'internal_error', message: 'حدث خطأ أثناء إرسال الرمز' })
  }
})