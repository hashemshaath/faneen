// CT4C.3 — notify-client-invitation
// Server-side dispatcher for client invitation emails.
// Validates that the caller owns the invitation (or is admin), loads the
// invitation row server-side, builds an accept URL from the raw token, and
// invokes send-transactional-email with a strictly-limited payload.
//
// Raw token is NEVER persisted or returned in the response — it is only
// embedded inside the accept URL placed in the outgoing email body.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://qitaat.com'

interface Body {
  invite_id?: string
  token?: string
  kind?: 'created' | 'reminder'
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'auth_required' })

  // Caller identity (uses anon key + bearer JWT to read auth.uid()).
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userRes, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userRes?.user) return json(401, { error: 'auth_required' })
  const uid = userRes.user.id

  let body: Body
  try { body = await req.json() } catch { return json(400, { error: 'invalid_body' }) }

  const inviteId = body.invite_id?.trim()
  const token = body.token?.trim()
  const kind: 'created' | 'reminder' = body.kind === 'reminder' ? 'reminder' : 'created'

  if (!inviteId || !token || token.length < 32) {
    return json(400, { error: 'invalid_input' })
  }

  // Service-role client for trusted reads + invoking sibling functions.
  const admin = createClient(supabaseUrl, serviceKey)

  // Authorisation: caller must own the invite or be admin/super_admin.
  const { data: roles } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', uid)
  const isAdmin = (roles ?? []).some((r) => r.role === 'admin' || r.role === 'super_admin')

  const { data: inv, error: invErr } = await admin
    .from('client_invitations')
    .select('id, ref_id, invited_by, business_id, email_lower, recipient_name, expires_at, reminder_count, status')
    .eq('id', inviteId)
    .maybeSingle()
  if (invErr) return json(500, { error: 'load_failed' })
  if (!inv) return json(404, { error: 'not_found' })
  if (!isAdmin && inv.invited_by !== uid) return json(403, { error: 'forbidden' })
  if (inv.status !== 'pending') return json(409, { error: 'invalid_status' })

  // Resolve business + provider display names (best-effort; no PII forwarded).
  let businessName: string | null = null
  if (inv.business_id) {
    const { data: biz } = await admin
      .from('businesses')
      .select('name_ar, name_en')
      .eq('id', inv.business_id)
      .maybeSingle()
    businessName = biz?.name_ar || biz?.name_en || null
  }
  let providerName: string | null = null
  {
    const { data: prof } = await admin
      .from('profiles')
      .select('full_name')
      .eq('user_id', inv.invited_by)
      .maybeSingle()
    providerName = prof?.full_name || null
  }

  const acceptUrl = `${SITE_URL}/invite/${encodeURIComponent(token)}`
  const expiryDate = inv.expires_at
    ? new Date(inv.expires_at).toISOString().slice(0, 10)
    : undefined

  const templateName = kind === 'reminder' ? 'client-invite-reminder' : 'client-contract-invite'
  const idempotencyKey = kind === 'reminder'
    ? `client-invite-reminder-${inv.id}-${inv.reminder_count}`
    : `client-invite-created-${inv.id}`

  const templateData: Record<string, unknown> = {
    recipientName: inv.recipient_name ?? undefined,
    businessName: businessName ?? undefined,
    providerName: providerName ?? undefined,
    inviteRef: inv.ref_id,
    expiryDate,
    acceptUrl,
  }

  const { data: sendRes, error: sendErr } = await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName,
      recipientEmail: inv.email_lower,
      idempotencyKey,
      templateData,
    },
  })
  if (sendErr) {
    console.error('send-transactional-email error', sendErr)
    return json(502, { error: 'dispatch_failed' })
  }

  return json(200, {
    sent: true,
    invite_id: inv.id,
    ref_id: inv.ref_id,
    template: templateName,
    dispatch: sendRes ?? null,
  })
})