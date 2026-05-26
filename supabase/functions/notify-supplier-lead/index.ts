// Sends a "new lead" email to the supplier (business owner) after a
// lead_request row is created on the BusinessProfile contact flow.
// Failure here MUST NOT block lead capture — the caller already inserted
// the row before invoking this function.
// Backend rate limiting (EM-01): uses public.check_rate_limit RPC with a
// SHA-256 hashed identifier built from (ip + business_id) and
// (email + business_id). No raw IP / email / phone / name / message is
// stored — only opaque hashes. Limit: 3 requests per identifier per hour.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { logSecurityEvent, hashSubject, hashIp } from "../_shared/securityAudit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface Body {
  lead_id?: string
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: Body = await req.json().catch(() => ({}))
    const leadId = typeof body.lead_id === 'string' ? body.lead_id.trim() : ''
    if (!leadId || !/^[0-9a-f-]{36}$/i.test(leadId)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'invalid_lead_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })
    const ipHash = await hashIp(req);
    const userAgent = req.headers.get("user-agent");
    await logSecurityEvent(admin, {
      event_type: "supplier_lead_notify",
      event_action: "attempt",
      ip_hash: ipHash,
      user_agent: userAgent,
      request_id: leadId,
    });

    // Pull lead + business + owner profile email in one round-trip.
    const { data: lead, error: leadErr } = await admin
      .from('lead_requests')
      .select(
        'id, ref_id, name, email, phone, message, budget_range, contact_preference, business_id, created_at',
      )
      .eq('id', leadId)
      .maybeSingle()

    if (leadErr || !lead) {
      await logSecurityEvent(admin, {
        event_type: "supplier_lead_notify",
        event_action: "failed",
        status: "warn",
        ip_hash: ipHash,
        request_id: leadId,
        reason: "lead_not_found",
      });
      return new Response(
        JSON.stringify({ ok: false, error: 'lead_not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Replay guard: this function is only invoked immediately after the
    // client inserts the lead. Reject anything older than 5 minutes so an
    // attacker who learns a lead UUID cannot re-trigger emails later.
    const createdAt = lead.created_at ? new Date(lead.created_at).getTime() : 0
    if (!createdAt || Date.now() - createdAt > 5 * 60 * 1000) {
      console.warn('notify-supplier-lead: stale lead rejected')
      await logSecurityEvent(admin, {
        event_type: "supplier_lead_notify",
        event_action: "failed",
        status: "warn",
        ip_hash: ipHash,
        request_id: leadId,
        reason: "stale_lead",
      });
      return new Response(
        JSON.stringify({ ok: false, error: 'stale_lead' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---------- Rate limiting (EM-01) ----------
    // Salt prevents cross-project rainbow-table style enumeration; falls back
    // to the project URL so it is always non-empty.
    const salt =
      Deno.env.get('RATE_LIMIT_SALT') || supabaseUrl || 'qitaat-default-salt'
    const ip = extractClientIp(req)
    const rateIpHash = await sha256Hex(`${ip}|${salt}`)
    const ipIdent = `lead:ip:${rateIpHash}:${lead.business_id}`
    const { data: ipAllowed } = await admin.rpc('check_rate_limit', {
      _identifier: ipIdent,
      _type: 'supplier_lead',
      _max_attempts: 3,
      _window_minutes: 60,
      _block_minutes: 60,
    })
    let allowed = ipAllowed !== false

    if (allowed && typeof lead.email === 'string' && lead.email.trim()) {
      const emailHash = await sha256Hex(
        `${lead.email.trim().toLowerCase()}|${salt}`,
      )
      const emailIdent = `lead:email:${emailHash}:${lead.business_id}`
      const { data: emailAllowed } = await admin.rpc('check_rate_limit', {
        _identifier: emailIdent,
        _type: 'supplier_lead',
        _max_attempts: 3,
        _window_minutes: 60,
        _block_minutes: 60,
      })
      if (emailAllowed === false) allowed = false
    }

    if (!allowed) {
      // Do NOT log identifier values — only emit a generic counter.
      console.warn('notify-supplier-lead: rate limit hit')
      await logSecurityEvent(admin, {
        event_type: "supplier_lead_notify",
        event_action: "rate_limited",
        status: "warn",
        ip_hash: ipHash,
        request_id: leadId,
        reason: "rate_limited",
        metadata: { business_id: lead.business_id },
      });
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'rate_limited',
          message:
            'تم استلام عدة طلبات خلال وقت قصير. يرجى المحاولة لاحقًا.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    // -------------------------------------------

    const { data: biz } = await admin
      .from('businesses')
      .select('id, name_ar, name_en, user_id, email')
      .eq('id', lead.business_id)
      .maybeSingle()

    if (!biz) {
      await logSecurityEvent(admin, {
        event_type: "supplier_lead_notify",
        event_action: "failed",
        status: "warn",
        ip_hash: ipHash,
        request_id: leadId,
        reason: "business_not_found",
      });
      return new Response(
        JSON.stringify({ ok: false, error: 'business_not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Resolve recipient email: prefer the owner's auth email, fall back to
    // the business contact email column.
    let recipientEmail: string | null = biz.email ?? null
    if (biz.user_id) {
      const { data: ownerUser } = await admin.auth.admin.getUserById(biz.user_id)
      if (ownerUser?.user?.email) recipientEmail = ownerUser.user.email
    }

    if (!recipientEmail) {
      await logSecurityEvent(admin, {
        event_type: "supplier_lead_notify",
        event_action: "failed",
        status: "warn",
        user_id: biz.user_id ?? null,
        ip_hash: ipHash,
        request_id: leadId,
        reason: "no_recipient",
        metadata: { business_id: lead.business_id },
      });
      return new Response(
        JSON.stringify({ ok: false, error: 'no_recipient' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const businessName = biz.name_ar || biz.name_en || 'منشأتك'

    const { error: invokeErr } = await admin.functions.invoke(
      'send-transactional-email',
      {
        body: {
          templateName: 'lead-notification',
          recipientEmail,
          idempotencyKey: `supplier-lead-${lead.id}`,
          templateData: {
            businessName,
            customerName: lead.name,
            customerEmail: lead.email,
            customerPhone: lead.phone ?? undefined,
            budgetRange: lead.budget_range ?? undefined,
            contactPreference: lead.contact_preference ?? undefined,
            message: lead.message,
            leadId: lead.id,
          },
        },
      },
    )

    if (invokeErr) {
      console.warn('notify-supplier-lead: email send failed', invokeErr.message)
      await logSecurityEvent(admin, {
        event_type: "supplier_lead_notify",
        event_action: "failed",
        status: "error",
        user_id: biz.user_id ?? null,
        subject_hash: await hashSubject(recipientEmail),
        ip_hash: ipHash,
        request_id: leadId,
        reason: "email_send_failed",
        metadata: { business_id: lead.business_id },
      });
      return new Response(
        JSON.stringify({ ok: false, error: 'email_send_failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    await logSecurityEvent(admin, {
      event_type: "supplier_lead_notify",
      event_action: "success",
      user_id: biz.user_id ?? null,
      subject_hash: await hashSubject(recipientEmail),
      ip_hash: ipHash,
      user_agent: userAgent,
      request_id: leadId,
      reason: "notification_sent",
      metadata: { business_id: lead.business_id },
    });

    // SR-2: Send customer confirmation (fail-soft — never block on errors).
    if (lead.email) {
      try {
        await admin.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'lead-confirmation',
            recipientEmail: lead.email,
            idempotencyKey: `lead-confirmation-${lead.id}`,
            templateData: {
              name: lead.name ?? undefined,
              businessName,
              refId: lead.ref_id ?? undefined,
            },
          },
        })
      } catch (e) {
        const m = e instanceof Error ? e.message : 'unknown'
        console.warn('notify-supplier-lead: customer confirmation failed', m)
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('notify-supplier-lead error', err)
    return new Response(
      JSON.stringify({ ok: false, error: 'internal_error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})