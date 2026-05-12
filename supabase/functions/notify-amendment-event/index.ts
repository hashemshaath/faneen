// notify-amendment-event
// ────────────────────────────────────────────────────────────────────────────
// Server-side dispatcher for contract amendment lifecycle notifications and
// transactional emails. Called from the client right after each amendment
// mutation (insert / approve / reject / cancel / apply) succeeds.
//
// Privacy contract (C6.5):
//   - Never returns or forwards: internal_note, audit metadata, ip/UA hashes,
//     approver_id, raw UUIDs in email body, storage paths, signed URLs,
//     rejection_reason text, customer phone/email.
//   - Recipients are derived server-side from contracts.client_id /
//     provider_id; the client only supplies amendmentId + event.
//   - Caller must be a party (client/provider/requester) or admin.
//   - Email body uses safe fields only (contract_number, amendment_number,
//     amendment title, type, public_reason, status, action_url).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Event =
  | 'created'
  | 'pending_approval'
  | 'approved'
  | 'applied'
  | 'rejected'
  | 'cancelled'

const VALID: Event[] = ['created', 'pending_approval', 'approved', 'applied', 'rejected', 'cancelled']

const NOTIF_TYPE: Record<Event, string> = {
  created: 'contract_amendment_created',
  pending_approval: 'contract_amendment_pending_approval',
  approved: 'contract_amendment_approved',
  applied: 'contract_amendment_applied',
  rejected: 'contract_amendment_rejected',
  cancelled: 'contract_amendment_cancelled',
}

const TEMPLATE: Record<Event, string> = {
  created: 'contract-amendment-created',
  pending_approval: 'contract-amendment-pending-approval',
  approved: 'contract-amendment-approved',
  applied: 'contract-amendment-applied',
  rejected: 'contract-amendment-rejected',
  cancelled: 'contract-amendment-cancelled',
}

function maskUuid(s: string | null | undefined): string {
  if (!s) return '?'
  return s.slice(0, 8)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization') || ''

    // 1) Authenticate caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'auth_required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const callerId = userData.user.id

    // 2) Validate input
    const body = await req.json().catch(() => null)
    const amendmentId: string | undefined = body?.amendmentId
    const event: Event | undefined = body?.event
    if (!amendmentId || !event || !VALID.includes(event)) {
      return new Response(JSON.stringify({ error: 'invalid_input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3) Service-role client for safe reads + notification inserts
    const admin = createClient(supabaseUrl, serviceKey)

    const { data: amendment, error: amErr } = await admin
      .from('contract_amendments')
      .select('id, contract_id, requested_by, amendment_type, title_ar, title_en, public_reason, amendment_number, status, client_approved_at, provider_approved_at, applied_at, cancelled_at, created_at')
      .eq('id', amendmentId)
      .maybeSingle()
    if (amErr || !amendment) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: contract, error: cErr } = await admin
      .from('contracts')
      .select('id, contract_number, client_id, provider_id')
      .eq('id', amendment.contract_id)
      .maybeSingle()
    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: 'contract_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4) Authorize caller — must be a party or admin
    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: callerId, _role: 'admin',
    })
    const isParty = callerId === contract.client_id || callerId === contract.provider_id
    if (!isParty && !isAdmin) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5) Compute recipients per event (party user_ids)
    const counterparty = (uid: string | null) =>
      uid === contract.client_id ? contract.provider_id : uid === contract.provider_id ? contract.client_id : null

    let recipientUserIds: Array<{ userId: string; role: 'client' | 'provider' }> = []
    const clientEntry = { userId: contract.client_id as string, role: 'client' as const }
    const providerEntry = { userId: contract.provider_id as string, role: 'provider' as const }

    switch (event) {
      case 'created':
      case 'pending_approval': {
        // Notify the counterparty whose approval is needed.
        const cp = counterparty(amendment.requested_by)
        if (cp) recipientUserIds = [cp === contract.client_id ? clientEntry : providerEntry]
        break
      }
      case 'approved': {
        // Notify the OTHER party (not the one who just approved = caller).
        const other = counterparty(callerId)
        if (other) recipientUserIds = [other === contract.client_id ? clientEntry : providerEntry]
        break
      }
      case 'applied':
      case 'cancelled':
        recipientUserIds = [clientEntry, providerEntry]
        break
      case 'rejected': {
        // Requester
        recipientUserIds = [{ userId: amendment.requested_by, role: amendment.requested_by === contract.client_id ? 'client' : 'provider' }]
        break
      }
    }

    // 6) Resolve recipient profile (name + email) safely
    const userIds = Array.from(new Set(recipientUserIds.map((r) => r.userId).filter(Boolean)))
    const { data: profiles } = await admin
      .from('profiles')
      .select('user_id, full_name, email, preferred_language')
      .in('user_id', userIds)
    const profileByUid = new Map<string, { full_name: string | null; email: string | null; lang: string | null }>()
    for (const p of profiles || []) {
      profileByUid.set(p.user_id, { full_name: p.full_name, email: p.email, lang: p.preferred_language })
    }

    // 7) Build safe payload (no UUIDs in email body, no internal_note)
    const contractRefId = contract.contract_number
    const contractUrl = `https://qitaat.com/contracts/${contract.id}`
    const titleAr = amendment.title_ar || 'ملحق العقد'
    const titleEn = amendment.title_en || amendment.title_ar || 'Contract amendment'
    const bothApproved =
      !!amendment.client_approved_at && !!amendment.provider_approved_at

    const notifTitleAr: Record<Event, string> = {
      created: `طلب ملحق جديد على العقد ${contractRefId}`,
      pending_approval: `موافقتك مطلوبة على ملحق العقد ${contractRefId}`,
      approved: `تمت الموافقة على ملحق العقد ${contractRefId}`,
      applied: `تم تطبيق ملحق على العقد ${contractRefId}`,
      rejected: `تم رفض طلب ملحق على العقد ${contractRefId}`,
      cancelled: `تم إلغاء طلب ملحق على العقد ${contractRefId}`,
    }
    const notifTitleEn: Record<Event, string> = {
      created: `New amendment on contract ${contractRefId}`,
      pending_approval: `Your approval is needed on ${contractRefId}`,
      approved: `Amendment approved on ${contractRefId}`,
      applied: `Amendment applied on ${contractRefId}`,
      rejected: `Amendment rejected on ${contractRefId}`,
      cancelled: `Amendment cancelled on ${contractRefId}`,
    }
    const notifBodyAr = amendment.amendment_number
      ? `الملحق رقم ${amendment.amendment_number} — ${titleAr}`
      : titleAr
    const notifBodyEn = amendment.amendment_number
      ? `Amendment #${amendment.amendment_number} — ${titleEn}`
      : titleEn

    const sentNotif: string[] = []
    const sentEmail: string[] = []

    for (const r of recipientUserIds) {
      if (!r.userId) continue

      // 7a) In-app notification — uses SECURITY DEFINER RPC to bypass admin-only RLS
      const { error: nErr } = await admin.rpc('create_notification', {
        _user_id: r.userId,
        _title_ar: notifTitleAr[event],
        _title_en: notifTitleEn[event],
        _body_ar: notifBodyAr,
        _body_en: notifBodyEn,
        _type: NOTIF_TYPE[event],
        _ref_id: contract.id,
        _ref_type: 'contract_amendment',
        _action_url: `/contracts/${contract.id}`,
      })
      if (!nErr) sentNotif.push(maskUuid(r.userId))

      // 7b) Transactional email — only if we have an email on file
      const prof = profileByUid.get(r.userId)
      if (!prof?.email) continue

      const idemSuffix =
        event === 'pending_approval' || event === 'approved' ? `-${r.role}` : ''
      const idempotencyKey = `amendment-${event.replace('_', '-')}-${amendment.id}${idemSuffix}`

      const templateData = {
        recipientName: prof.full_name || undefined,
        contractRefId,
        amendmentNumber: amendment.amendment_number ?? undefined,
        amendmentTitle: prof.lang === 'en' ? titleEn : titleAr,
        amendmentType: amendment.amendment_type,
        publicReason: amendment.public_reason || undefined,
        contractUrl,
        approverRole:
          event === 'approved'
            ? (callerId === contract.client_id ? 'client' : 'provider')
            : undefined,
        bothApproved: event === 'approved' ? bothApproved : undefined,
      }

      const { error: eErr } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: TEMPLATE[event],
          recipientEmail: prof.email,
          idempotencyKey,
          templateData,
        },
      })
      if (!eErr) sentEmail.push(maskUuid(r.userId))
    }

    return new Response(
      JSON.stringify({
        ok: true,
        event,
        notifications: sentNotif.length,
        emails: sentEmail.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown_error'
    return new Response(JSON.stringify({ error: 'internal', detail: msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})