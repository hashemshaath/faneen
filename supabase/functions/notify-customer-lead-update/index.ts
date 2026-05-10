// SR-2: Lifecycle email dispatcher for service requests (lead_requests).
//
// Called AFTER a lead_requests status changes (provider Inbox or
// customer cancel). Loads the lead + business via service role, picks
// the right transactional template, and invokes send-transactional-email.
//
// Failure to send a notification MUST NOT block the status change —
// callers always return a 200 OK to the UI regardless of what we return.
// We log only opaque identifiers (lead.id, status) — never name/email/phone.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface Body {
  lead_id?: string
  status?: string
  notify_provider_on_cancel?: boolean
}

const CUSTOMER_TEMPLATES: Record<string, string> = {
  accepted: 'lead-accepted',
  rejected: 'lead-rejected',
  needs_info: 'lead-needs-info',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: Body = await req.json().catch(() => ({}))
    const leadId = typeof body.lead_id === 'string' ? body.lead_id.trim() : ''
    const status = typeof body.status === 'string' ? body.status.trim() : ''
    if (!leadId || !/^[0-9a-f-]{36}$/i.test(leadId) || !status) {
      return new Response(
        JSON.stringify({ ok: false, error: 'invalid_input' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const customerTemplate = CUSTOMER_TEMPLATES[status]
    const isCancelled = status === 'cancelled'
    if (!customerTemplate && !isCancelled) {
      return new Response(
        JSON.stringify({ ok: true, skipped: 'no_template_for_status' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const { data: lead } = await admin
      .from('lead_requests')
      .select('id, ref_id, name, email, status, business_id, user_id')
      .eq('id', leadId)
      .maybeSingle()

    if (!lead) {
      return new Response(
        JSON.stringify({ ok: false, error: 'lead_not_found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: biz } = await admin
      .from('businesses')
      .select('id, name_ar, name_en, user_id, email')
      .eq('id', lead.business_id)
      .maybeSingle()

    const businessName = biz?.name_ar || biz?.name_en || 'المنشأة'

    // ---- Customer-facing email (accepted / rejected / needs_info) ----
    if (customerTemplate && lead.email) {
      const { error } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: customerTemplate,
          recipientEmail: lead.email,
          idempotencyKey: `lead-${status.replace('_', '-')}-${lead.id}`,
          templateData: {
            name: lead.name ?? undefined,
            businessName,
            refId: lead.ref_id ?? undefined,
          },
        },
      })
      if (error) console.warn('notify-customer-lead-update: customer email failed', status)
    }

    // ---- In-app notification for the customer ----
    if (lead.user_id && (status === 'accepted' || status === 'rejected' || status === 'needs_info')) {
      const titles: Record<string, { ar: string; en: string }> = {
        accepted:   { ar: 'تم قبول طلبك', en: 'Your request was accepted' },
        rejected:   { ar: 'تعذر قبول طلبك حاليًا', en: 'Your request was not accepted' },
        needs_info: { ar: 'المنشأة بحاجة معلومات إضافية', en: 'The provider needs more info' },
      }
      const t = titles[status]
      const { error: notifErr } = await admin.from('notifications').insert({
        user_id: lead.user_id,
        notification_type: `lead_${status}`,
        title_ar: t.ar,
        title_en: t.en,
        body_ar: `${businessName} · ${lead.ref_id ?? ''}`.trim(),
        body_en: `${businessName} · ${lead.ref_id ?? ''}`.trim(),
        action_url: '/dashboard/my-requests',
        reference_type: 'lead_request',
        reference_id: lead.id,
      })
      if (notifErr) console.warn('notify-customer-lead-update: notification insert failed', status)
    }

    // ---- Provider notice when customer cancels ----
    if (isCancelled && body.notify_provider_on_cancel !== false && biz) {
      let recipient: string | null = biz.email ?? null
      if (biz.user_id) {
        const { data: ownerUser } = await admin.auth.admin.getUserById(biz.user_id)
        if (ownerUser?.user?.email) recipient = ownerUser.user.email
      }
      if (recipient) {
        const { error } = await admin.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'lead-cancelled-provider-notice',
            recipientEmail: recipient,
            idempotencyKey: `lead-cancelled-${lead.id}`,
            templateData: { businessName, refId: lead.ref_id ?? undefined },
          },
        })
        if (error) console.warn('notify-customer-lead-update: provider cancel email failed')
      }
      // In-app for provider owner
      if (biz.user_id) {
        await admin.from('notifications').insert({
          user_id: biz.user_id,
          notification_type: 'lead_cancelled',
          title_ar: 'تم إلغاء طلب خدمة',
          title_en: 'A service request was cancelled',
          body_ar: `${businessName} · ${lead.ref_id ?? ''}`.trim(),
          body_en: `${businessName} · ${lead.ref_id ?? ''}`.trim(),
          action_url: '/dashboard/leads',
          reference_type: 'lead_request',
          reference_id: lead.id,
        }).then((r) => {
          if (r.error) console.warn('notify-customer-lead-update: provider notification failed')
        })
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'internal_error'
    console.error('notify-customer-lead-update error', msg)
    return new Response(
      JSON.stringify({ ok: false, error: 'internal_error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})