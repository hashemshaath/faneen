import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LEGACY_SENDER_DOMAINS = ['notify.qitaat.com', 'mail.qitaat.com']

/** Server-side mirror of the UI classifier — keep in sync with src/lib/email-center/email-log-utils.ts */
function classify(errorMessage: string | null): {
  retryable: boolean
  reason: string
} {
  const msg = (errorMessage ?? '').toLowerCase()
  if (msg.includes('no_matching_sender') || msg.includes('no email domain record')) {
    return { retryable: false, reason: 'historical_sender' }
  }
  for (const d of LEGACY_SENDER_DOMAINS) {
    if (msg.includes(d)) return { retryable: false, reason: 'historical_sender' }
  }
  if (msg.includes('suppress')) return { retryable: false, reason: 'suppressed' }
  if (msg.includes('unsubscrib')) return { retryable: false, reason: 'unsubscribed' }
  if (
    msg.includes('unknown email type') ||
    msg.includes('missing template') ||
    msg.includes('not found')
  ) {
    return { retryable: false, reason: 'missing_template' }
  }
  return { retryable: true, reason: 'transient' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Admin auth
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'missing_token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { data: isAdmin } = await supabase.rpc('has_admin_access', {
    _user_id: userData.user.id,
  })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'not_admin' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { logId?: string } = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const logId = (body.logId ?? '').trim()
  if (!logId) {
    return new Response(JSON.stringify({ error: 'missing_log_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: row, error: rowErr } = await supabase
    .from('email_send_log')
    .select('id, message_id, template_name, recipient_email, status, error_message')
    .eq('id', logId)
    .maybeSingle()
  if (rowErr || !row) {
    return new Response(JSON.stringify({ error: 'row_not_found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (row.status !== 'dlq') {
    return new Response(JSON.stringify({ error: 'not_dlq', currentStatus: row.status }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const cls = classify(row.error_message)
  if (!cls.retryable) {
    return new Response(
      JSON.stringify({ error: 'not_retryable', reason: cls.reason }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  if (!row.template_name || !row.recipient_email) {
    return new Response(JSON.stringify({ error: 'incomplete_row' }), {
      status: 422,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const idempotencyKey = `dlq-retry-${row.id}-${Date.now()}`
  const { error: invokeErr } = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: row.template_name,
      recipientEmail: row.recipient_email,
      idempotencyKey,
    },
  })

  if (invokeErr) {
    return new Response(
      JSON.stringify({
        error: 'enqueue_failed',
        message: invokeErr instanceof Error ? invokeErr.message : String(invokeErr),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Audit
  await supabase.from('admin_activity_log').insert({
    user_id: userData.user.id,
    action: 'email_dlq_retry',
    entity_type: 'email_send_log',
    entity_id: row.id,
    details: {
      original_message_id: row.message_id,
      template_name: row.template_name,
      new_idempotency_key: idempotencyKey,
      classification: cls.reason,
    },
  })

  return new Response(
    JSON.stringify({ ok: true, idempotencyKey }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})