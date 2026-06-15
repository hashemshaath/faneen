import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * EMAIL INFRASTRUCTURE GOVERNANCE PHASE 15F-DEPLOY
 * Admin-gated smoke-test runner. Triggers the three live email paths
 * (signup verification, password recovery, transactional welcome)
 * against a single test recipient so the operator can verify Resend
 * delivery end-to-end without writing manual scripts.
 *
 * - Does NOT bypass suppression, RLS, or rate limits.
 * - Does NOT expose tokens, magic links, secrets, or recipient PII in the
 *   response — only message ids + status codes are returned.
 * - Stamps `email_send_log.metadata.smoke_run_id` on each row so the UI
 *   can correlate the queued/sent rows back to this run.
 */

const TEST_TEMPLATE = 'welcome-signup'

function maskEmail(e: string): string {
  const [local, domain] = e.split('@')
  if (!local || !domain) return '***'
  return `${local.slice(0, 1)}***@${domain}`
}

function randomPassword(): string {
  // 24 chars from a URL-safe alphabet; only used to satisfy generateLink — never returned.
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '') + 'A1!'
}

type StepResult = {
  step: 'signup' | 'recovery' | 'transactional'
  ok: boolean
  variant?: string
  idempotency_key?: string
  error?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // ---- Admin auth ----
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'missing_token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { data: isAdmin } = await admin.rpc('has_admin_access', {
    _user_id: userData.user.id,
  })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'not_admin' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ---- Input ----
  let body: { testEmail?: string } = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const testEmail = (body.testEmail ?? '').trim().toLowerCase()
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)
  if (!emailValid) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const runId = crypto.randomUUID()
  const startedAt = new Date().toISOString()
  const results: StepResult[] = []

  // ---- Step 1: Signup verification (auth-email-hook → auth_emails → Resend) ----
  try {
    const { error: signupErr } = await admin.auth.admin.generateLink({
      type: 'signup',
      email: testEmail,
      password: randomPassword(),
    })
    if (signupErr) {
      // User likely exists → fall back to magiclink which exercises the
      // same auth-email-hook → queue → Resend path.
      const { error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: testEmail,
      })
      if (linkErr) {
        results.push({ step: 'signup', ok: false, variant: 'magiclink_fallback', error: linkErr.message })
      } else {
        results.push({ step: 'signup', ok: true, variant: 'magiclink_fallback' })
      }
    } else {
      results.push({ step: 'signup', ok: true, variant: 'signup' })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    results.push({ step: 'signup', ok: false, error: msg })
  }

  // ---- Step 2: Password recovery (auth-email-hook → auth_emails → Resend) ----
  try {
    const { error: recoveryErr } = await admin.auth.resetPasswordForEmail(testEmail)
    if (recoveryErr) {
      results.push({ step: 'recovery', ok: false, error: recoveryErr.message })
    } else {
      results.push({ step: 'recovery', ok: true })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    results.push({ step: 'recovery', ok: false, error: msg })
  }

  // ---- Step 3: Transactional (send-transactional-email → Resend) ----
  const txKey = `smoke-${runId}-${TEST_TEMPLATE}`
  try {
    const { data: txData, error: txErr } = await admin.functions.invoke('send-transactional-email', {
      body: {
        templateName: TEST_TEMPLATE,
        recipientEmail: testEmail,
        idempotencyKey: txKey,
        templateData: { name: 'Smoke Test', smoke_run_id: runId },
      },
    })
    if (txErr) {
      results.push({ step: 'transactional', ok: false, idempotency_key: txKey, error: txErr.message })
    } else {
      const okFlag = (txData as { success?: boolean } | null)?.success !== false
      results.push({ step: 'transactional', ok: okFlag, idempotency_key: txKey })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    results.push({ step: 'transactional', ok: false, idempotency_key: txKey, error: msg })
  }

  // ---- Tag the rows this run produced so the UI can correlate them. ----
  try {
    const recentSinceMinutes = 5
    const sinceIso = new Date(Date.now() - recentSinceMinutes * 60 * 1000).toISOString()
    await admin
      .from('email_send_log')
      .update({
        metadata: {
          smoke_run_id: runId,
          smoke_started_at: startedAt,
        },
      })
      .eq('recipient_email', testEmail)
      .gte('created_at', sinceIso)
      // Only stamp rows that haven't already been tagged by another run.
      .is('metadata->smoke_run_id', null)
  } catch (e) {
    // Tagging is best-effort — never fail the run because of it.
    console.warn('[admin-email-smoke-test] tag update failed', e)
  }

  console.log('[admin-email-smoke-test] run complete', {
    runId,
    recipient: maskEmail(testEmail),
    results: results.map((r) => ({ step: r.step, ok: r.ok, variant: r.variant })),
  })

  return new Response(
    JSON.stringify({
      run_id: runId,
      started_at: startedAt,
      recipient_masked: maskEmail(testEmail),
      results,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
