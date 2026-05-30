// contracts-expiry-notifier
// ────────────────────────────────────────────────────────────────────────────
// Daily scheduled job. Finds active contracts whose end_date is exactly
// 30 / 14 / 7 / 1 day(s) away and creates in-app notifications for both
// parties (client + provider). Logged in contract_expiry_alerts_log to
// guarantee idempotency (UNIQUE(contract_id, days_before)).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const THRESHOLDS = [30, 14, 7, 1] as const

interface ContractRow {
  id: string
  contract_number: string
  title_ar: string | null
  title_en: string | null
  end_date: string
  client_id: string | null
  provider_id: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const summary: Array<{ days: number; checked: number; notified: number }> = []

    for (const days of THRESHOLDS) {
      const target = new Date()
      target.setUTCHours(0, 0, 0, 0)
      target.setUTCDate(target.getUTCDate() + days)
      const targetIso = target.toISOString().slice(0, 10)

      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('id, contract_number, title_ar, title_en, end_date, client_id, provider_id')
        .eq('status', 'active')
        .eq('end_date', targetIso)
        .returns<ContractRow[]>()

      if (error) {
        console.error(`[expiry] fetch days=${days}`, error.message)
        continue
      }

      let notified = 0
      for (const c of contracts ?? []) {
        // Skip if already alerted at this threshold
        const { data: existing } = await supabase
          .from('contract_expiry_alerts_log')
          .select('id')
          .eq('contract_id', c.id)
          .eq('days_before', days)
          .maybeSingle()
        if (existing) continue

        const recipients = [c.client_id, c.provider_id].filter(
          (v): v is string => typeof v === 'string' && v.length > 0,
        )

        const notifications = recipients.map((userId) => ({
          user_id: userId,
          type: 'contract_expiring_soon',
          title_ar: `العقد ${c.contract_number} ينتهي خلال ${days} يوم`,
          title_en: `Contract ${c.contract_number} expires in ${days} day(s)`,
          body_ar: c.title_ar ?? `سينتهي عقدك ${c.contract_number} قريباً`,
          body_en: c.title_en ?? `Your contract ${c.contract_number} will expire soon`,
          data: {
            contract_id: c.id,
            contract_number: c.contract_number,
            days_before: days,
            end_date: c.end_date,
            action_url: `/dashboard/contracts/${c.id}`,
          },
        }))

        if (notifications.length > 0) {
          const { error: insErr } = await supabase.from('notifications').insert(notifications)
          if (insErr) {
            console.error(`[expiry] insert notif`, insErr.message)
            continue
          }
        }

        await supabase.from('contract_expiry_alerts_log').insert({
          contract_id: c.id,
          days_before: days,
          recipients,
        })
        notified += 1
      }

      summary.push({ days, checked: contracts?.length ?? 0, notified })
    }

    return new Response(
      JSON.stringify({ ok: true, summary, ranAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('[expiry] fatal', msg)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})