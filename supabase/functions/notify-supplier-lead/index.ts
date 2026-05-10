// Sends a "new lead" email to the supplier (business owner) after a
// lead_request row is created on the BusinessProfile contact flow.
// Failure here MUST NOT block lead capture — the caller already inserted
// the row before invoking this function.
// TODO: Add backend rate limiting for supplier lead submissions using a
// dedicated throttle table or RPC.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface Body {
  lead_id?: string
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

    // Pull lead + business + owner profile email in one round-trip.
    const { data: lead, error: leadErr } = await admin
      .from('lead_requests')
      .select(
        'id, name, email, phone, message, budget_range, contact_preference, business_id',
      )
      .eq('id', leadId)
      .maybeSingle()

    if (leadErr || !lead) {
      return new Response(
        JSON.stringify({ ok: false, error: 'lead_not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: biz } = await admin
      .from('businesses')
      .select('id, name_ar, name_en, user_id, email')
      .eq('id', lead.business_id)
      .maybeSingle()

    if (!biz) {
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
      return new Response(
        JSON.stringify({ ok: false, error: 'email_send_failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
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