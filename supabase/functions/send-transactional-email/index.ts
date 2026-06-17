import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const SITE_NAME = "qitaat"
// Resend sender domain. Must match a verified domain in Resend.
const FROM_DOMAIN = "qitaat.com"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// Map template name → notification preference category column on
// `notification_preferences`. If no entry, the email is treated as
// transactional/system and only the master `email_enabled` flag applies.
// TODO: Consider a dedicated `account_lifecycle` / `onboarding` category
// for welcome emails (welcome-signup, welcome-business) to separate them
// from marketing preferences. Deferred — would require DB migration on
// `notification_preferences` and `DashboardCommunicationPreferences` UI.
const TEMPLATE_CATEGORY: Record<string, string> = {
  'welcome-signup': 'email_marketing',
  'welcome-business': 'email_marketing',
  'lead-confirmation': 'email_leads',
  'lead-notification': 'email_leads',
  'booking-confirmation': 'email_bookings',
  'maintenance-status-update': 'email_maintenance_updates',
  'contract-signed': 'email_contracts',
  'contract-status-update': 'email_contracts',
  'payment-reminder': 'email_contracts',
  'contract-amendment-created': 'email_contracts',
  'contract-amendment-pending-approval': 'email_contracts',
  'contract-amendment-approved': 'email_contracts',
  'contract-amendment-applied': 'email_contracts',
  'contract-amendment-rejected': 'email_contracts',
  'contract-amendment-cancelled': 'email_contracts',
  'contact-confirmation': 'email_messages',
  'contact-admin-notification': 'email_system',
}

// Mask an email for log output: keep first char and full domain only.
// Example: "ahmed.alotaibi@example.com" → "a***@example.com"
function maskEmail(e: string): string {
  const [local, domain] = e.split('@')
  if (!local || !domain) return '***'
  const first = local.slice(0, 1)
  return `${first}***@${domain}`
}

function buildTrackingUrl(supabaseUrl: string, fn: string, params: Record<string, string>): string {
  const u = new URL(`${supabaseUrl}/functions/v1/${fn}`)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  return u.toString()
}

// Inject an open-tracking pixel and rewrite anchor href values to go through
// the click-tracking redirect. Skips mailto:, tel:, anchor (#), unsubscribe
// links, and already-tracked URLs.
function injectTracking(html: string, supabaseUrl: string, messageId: string): string {
  let out = html
  // Rewrite <a href="..."> targets
  out = out.replace(/<a\s+([^>]*?)href=("|')([^"']+)("|')([^>]*)>/gi, (m, pre, q1, href, _q2, post) => {
    const lower = href.toLowerCase()
    if (
      lower.startsWith('mailto:') ||
      lower.startsWith('tel:') ||
      lower.startsWith('#') ||
      lower.includes('/handle-email-unsubscribe') ||
      lower.includes('/email-track-click') ||
      lower.includes('list-unsubscribe')
    ) {
      return m
    }
    const tracked = buildTrackingUrl(supabaseUrl, 'email-track-click', { m: messageId, u: href })
    return `<a ${pre}href="${tracked}"${post.replace(/^"/, '')}>`
  })

  const pixelUrl = buildTrackingUrl(supabaseUrl, 'email-track-open', { m: messageId })
  const pixelImg = `<img src="${pixelUrl}" width="1" height="1" alt="" border="0" style="display:block;width:1px;height:1px;border:0;outline:none;" />`
  if (out.includes('</body>')) {
    out = out.replace('</body>', `${pixelImg}</body>`)
  } else {
    out = `${out}${pixelImg}`
  }
  return out
}

// Generate a cryptographically random 32-byte hex token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Auth note: this function uses verify_jwt = true in config.toml, so Supabase's
// gateway validates that the caller presents a valid JWT — but the anon JWT is
// publicly embedded in the client bundle. To prevent unauthenticated abuse
// (phishing/spam from our verified sending domain), we additionally require
// either:
//   (a) the caller is authenticated (non-anon user) — for templates triggered
//       from signed-in flows, OR
//   (b) the caller is the service role (server-to-server invocation), OR
//   (c) the request is for one of the public templates listed below AND the
//       anon caller is within the per-IP rate limit.
// Public templates are limited to flows that legitimately fire from
// unauthenticated pages (signup confirmation, contact form, public lead form,
// public booking widget).
const ANON_ALLOWED_TEMPLATES = new Set<string>([
  'welcome-signup',
  'welcome-business',
  'contact-confirmation',
  'contact-admin-notification',
  'lead-confirmation',
  'lead-notification',
  'booking-confirmation',
  'quote-received',
  'admin-new-quote-request',
])
const ANON_RATE_LIMIT_PER_HOUR = 10

function extractClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || ''
  const first = xff.split(',')[0]?.trim()
  if (first) return first
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error('Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Parse request body
  let templateName: string
  let recipientEmail: string
  let idempotencyKey: string
  let messageId: string
  let templateData: Record<string, any> = {}
  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    messageId = crypto.randomUUID()
    idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId
    if (body.templateData && typeof body.templateData === 'object') {
      templateData = body.templateData
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (!templateName) {
    return new Response(
      JSON.stringify({ error: 'templateName is required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // -------- Authorization gate (anti-abuse) --------
  const authHeader = req.headers.get('Authorization') || ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  const isServiceRole = bearer && bearer === supabaseServiceKey
  let callerRole: 'service_role' | 'authenticated' | 'anon' = 'anon'
  if (isServiceRole) {
    callerRole = 'service_role'
  } else if (bearer) {
    try {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      })
      const { data: { user } } = await userClient.auth.getUser()
      if (user && user.aud === 'authenticated' && !user.is_anonymous) {
        callerRole = 'authenticated'
      }
    } catch (_e) {
      // ignore — treat as anon
    }
  }

  if (callerRole === 'anon') {
    if (!ANON_ALLOWED_TEMPLATES.has(templateName)) {
      console.warn('send-transactional-email: anon caller blocked', { templateName })
      return new Response(
        JSON.stringify({ error: 'Authentication required for this template' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    // Rate limit anon callers per IP to prevent template-allowlist abuse.
    try {
      const admin = createClient(supabaseUrl, supabaseServiceKey)
      const ip = extractClientIp(req)
      const { data: allowed } = await admin.rpc('check_rate_limit', {
        _identifier: `send_email:anon:${ip}`,
        _type: 'send_transactional_email_anon',
        _max_attempts: ANON_RATE_LIMIT_PER_HOUR,
        _window_minutes: 60,
        _block_minutes: 60,
      })
      if (allowed === false) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    } catch (e) {
      console.warn('send-transactional-email: rate limit check failed (fail-open)', e)
    }
  }
  // -------------------------------------------------

  // 1. Look up template from registry (early — needed to resolve recipient)
  const template = TEMPLATES[templateName]

  if (!template) {
    console.error('Template not found in registry', { templateName })
    return new Response(
      JSON.stringify({
        error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Resolve effective recipient: template-level `to` takes precedence over
  // the caller-provided recipientEmail. This allows notification templates
  // to always send to a fixed address (e.g., site owner from env var).
  const effectiveRecipient = template.to || recipientEmail

  if (!effectiveRecipient) {
    return new Response(
      JSON.stringify({
        error: 'recipientEmail is required (unless the template defines a fixed recipient)',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 2. Check suppression list (fail-closed: if we can't verify, don't send)
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', effectiveRecipient.toLowerCase())
    .maybeSingle()

  if (suppressionError) {
    console.error('Suppression check failed — refusing to send', {
      error: suppressionError,
      effectiveRecipient,
    })
    return new Response(
      JSON.stringify({ error: 'Failed to verify suppression status' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (suppressed) {
    // Log the suppressed attempt
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })

    console.log('Email suppressed', { recipient: maskEmail(effectiveRecipient), templateName })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 2b. Honor user notification_preferences when we can match the recipient
  // to a profile. Anonymous recipients (e.g. lead form submitters) are
  // unaffected and continue to receive transactional confirmations.
  try {
    const lowerEmail = effectiveRecipient.toLowerCase()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .or(`email.eq.${lowerEmail},login_email.eq.${lowerEmail}`)
      .limit(1)
      .maybeSingle()

    if (profile?.user_id) {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile.user_id)
        .maybeSingle()
      if (prefs) {
        const categoryCol = TEMPLATE_CATEGORY[templateName]
        const masterOff = prefs.email_enabled === false
        const categoryOff = categoryCol ? (prefs as Record<string, unknown>)[categoryCol] === false : false
        if (masterOff || categoryOff) {
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'suppressed',
            error_message: masterOff ? 'user_disabled_email' : `user_disabled_${categoryCol}`,
          })
          return new Response(
            JSON.stringify({ success: false, reason: 'user_preference_opt_out' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }
    }
  } catch (e) {
    console.warn('preference check failed (continuing)', e)
  }

  // 3. Get or create unsubscribe token (one token per email address)
  const normalizedEmail = effectiveRecipient.toLowerCase()
  let unsubscribeToken: string

  // Check for existing token for this email
  const { data: existingToken, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (tokenLookupError) {
    console.error('Token lookup failed', {
      error: tokenLookupError,
      email: normalizedEmail,
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to look up unsubscribe token',
    })
    return new Response(
      JSON.stringify({ error: 'Failed to prepare email' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (existingToken && !existingToken.used_at) {
    // Reuse existing unused token
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    // Create new token — upsert handles concurrent inserts gracefully
    unsubscribeToken = generateToken()
    const { error: tokenError } = await supabase
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true }
      )

    if (tokenError) {
      console.error('Failed to create unsubscribe token', {
        error: tokenError,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to create unsubscribe token',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If another request raced us, our upsert was silently ignored.
    // Re-read to get the actual stored token.
    const { data: storedToken, error: reReadError } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (reReadError || !storedToken) {
      console.error('Failed to read back unsubscribe token after upsert', {
        error: reReadError,
        email: normalizedEmail,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to confirm unsubscribe token storage',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    unsubscribeToken = storedToken.token
  } else {
    // Token exists but is already used — email should have been caught by suppression check above.
    // This is a safety fallback; log and skip sending.
    console.warn('Unsubscribe token already used but email not suppressed', {
      email: normalizedEmail,
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
      error_message:
        'Unsubscribe token used but email missing from suppressed list',
    })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 4. Render React Email template to HTML and plain text
  let html = await renderAsync(
    React.createElement(template.component, templateData)
  )
  // Inject tracking (open pixel + rewritten click links).
  html = injectTracking(html, supabaseUrl, messageId)
  const plainText = await renderAsync(
    React.createElement(template.component, templateData),
    { plainText: true }
  )

  // Resolve subject — supports static string or dynamic function
  let resolvedSubject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  // Email Operations Center test-send: prefix subject once when caller marks
  // the payload as a test send. Production calls never set __test_send so
  // normal emails are unaffected. Idempotent: if the prefix already appears
  // (case/whitespace-insensitive), skip to avoid double-prefixing.
  if (templateData?.__test_send === true) {
    const rawPrefix =
      typeof templateData.__prefix === 'string' && templateData.__prefix.trim().length > 0
        ? templateData.__prefix.trim()
        : '[اختبار قِطاعات]'
    const subjectStr = String(resolvedSubject ?? '')
    if (!subjectStr.trimStart().startsWith(rawPrefix)) {
      resolvedSubject = `${rawPrefix} ${subjectStr}`.trim()
    }
  }

  // 5. Send directly via Resend (synchronous, no internal queue).
  // Requires RESEND_API_KEY and a verified domain in Resend matching FROM_DOMAIN.
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'RESEND_API_KEY missing',
    })
    return new Response(JSON.stringify({ error: 'Email provider not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const unsubscribeUrl = buildTrackingUrl(supabaseUrl, 'handle-email-unsubscribe', {
    token: unsubscribeToken,
  })

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        to: [effectiveRecipient],
        subject: resolvedSubject,
        html,
        text: plainText,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Entity-Ref-ID': messageId,
          'X-Idempotency-Key': idempotencyKey,
        },
        tags: [{ name: 'template', value: templateName.replace(/[^a-zA-Z0-9_-]/g, '_') }],
      }),
    })

    const respText = await resp.text()
    if (!resp.ok) {
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'dlq',
        error_message: `Resend API error: ${resp.status} ${respText}`.slice(0, 1000),
      })
      console.error('Resend send failed', { status: resp.status, body: respText.slice(0, 500), templateName })
      return new Response(
        JSON.stringify({ error: 'Failed to send email', detail: respText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let providerId: string | null = null
    try {
      const parsed = JSON.parse(respText) as { id?: string }
      providerId = parsed?.id ?? null
    } catch { /* ignore */ }

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'sent',
      metadata: { provider: 'resend', provider_id: providerId },
    })

    console.log('Transactional email sent via Resend', {
      templateName,
      recipient: maskEmail(effectiveRecipient),
      providerId,
    })

    return new Response(
      JSON.stringify({ success: true, sent: true, provider: 'resend', provider_id: providerId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error'
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'dlq',
      error_message: `Resend exception: ${msg}`.slice(0, 1000),
    })
    console.error('Resend send exception', err)
    return new Response(JSON.stringify({ error: 'Email send failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
