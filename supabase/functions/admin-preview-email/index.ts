import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Admin-gated single-template preview renderer for the Email Operations Center.
// Does NOT send email. Renders the registered React Email template using
// previewData (or merged caller-provided sample templateData) and returns
// the HTML + resolved subject. Auth is enforced via Supabase JWT + has_admin_access.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
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

  // Admin verification
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

  let body: { templateName?: string; templateData?: Record<string, unknown> } = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const templateName = (body.templateName ?? '').trim()
  if (!templateName) {
    return new Response(JSON.stringify({ error: 'missing_template_name' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const entry = TEMPLATES[templateName]
  if (!entry) {
    return new Response(
      JSON.stringify({
        error: 'template_not_found',
        message: `Template "${templateName}" is not registered (auth templates render server-side via Supabase).`,
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const data = { ...(entry.previewData ?? {}), ...(body.templateData ?? {}) }

  try {
    const html = await renderAsync(React.createElement(entry.component, data))
    const subject =
      typeof entry.subject === 'function' ? entry.subject(data) : entry.subject
    return new Response(
      JSON.stringify({
        templateName,
        displayName: entry.displayName ?? templateName,
        subject,
        html,
        sampleData: data,
        status: 'ready',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('admin-preview-email render failed', { templateName, message })
    return new Response(
      JSON.stringify({ error: 'render_failed', message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})