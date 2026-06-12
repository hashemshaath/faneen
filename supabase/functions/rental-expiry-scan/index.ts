// RENTAL-MICROSERVICE-2 — daily expiry scan + alert dispatcher.
// ---------------------------------------------------------------------------
// 1. Calls rental_orders_roll_status() RPC (idempotent transitions).
// 2. Emits in-app notifications for newly-transitioned orders that haven't
//    been alerted at the same threshold yet (deduped via rental_order_events).
// 3. Logs run summary; returns 200 OK with JSON always.
// ---------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireCronOrAdmin } from '../_shared/cronAuth.ts';
import {
  dispatchEdgeNotifications,
  type EdgeNotificationPayload,
} from '../_shared/notifications.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface OrderRow {
  id: string;
  ref_id: string;
  provider_business_id: string;
  customer_user_id: string | null;
  end_date: string;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const unauthorized = await requireCronOrAdmin(req, corsHeaders);
  if (unauthorized) return unauthorized;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) Roll statuses (idempotent).
    const { data: rollResult, error: rollErr } = await supabase.rpc(
      'rental_orders_roll_status',
    );
    if (rollErr) console.error('[rental-expiry-scan] roll error', rollErr.message);

    // 2) Notify newly-transitioned orders that haven't been alerted yet.
    //    Dedupe via rental_order_events (event_type='alert:<status>').
    const todayIso = new Date().toISOString().slice(0, 10);
    const { data: targets } = await supabase
      .from('rental_orders')
      .select('id, ref_id, provider_business_id, customer_user_id, end_date, status')
      .in('status', ['expiring_soon', 'expired'])
      .returns<OrderRow[]>();

    let notified = 0;
    for (const o of targets ?? []) {
      const eventType = `alert:${o.status}`;
      // Idempotency: only alert once per status per order.
      const { data: existing } = await supabase
        .from('rental_order_events')
        .select('id')
        .eq('rental_order_id', o.id)
        .eq('event_type', eventType)
        .limit(1)
        .maybeSingle();
      if (existing) continue;

      const recipients = [o.customer_user_id].filter(
        (v): v is string => typeof v === 'string' && v.length > 0,
      );
      const daysDelta = Math.floor(
        (new Date(o.end_date).getTime() - new Date(todayIso).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const titleAr =
        o.status === 'expired'
          ? `طلب التأجير ${o.ref_id} انتهى`
          : `طلب التأجير ${o.ref_id} يقترب من الانتهاء`;
      const titleEn =
        o.status === 'expired'
          ? `Rental ${o.ref_id} expired`
          : `Rental ${o.ref_id} expiring soon`;

      const notifications: EdgeNotificationPayload[] = recipients.map((uid) => ({
        user_id: uid,
        notification_type:
          o.status === 'expired' ? 'rental_expired' : 'rental_expiring_soon',
        title_ar: titleAr,
        title_en: titleEn,
        body_ar: `تاريخ الانتهاء: ${o.end_date}`,
        body_en: `End date: ${o.end_date}`,
        action_url: `/dashboard/rentals?order=${o.ref_id}`,
        reference_type: 'rental_order',
        reference_id: o.ref_id,
      }));

      const { error: nErr } = await dispatchEdgeNotifications(supabase, notifications);
      if (nErr) {
        console.error('[rental-expiry-scan] notif insert', nErr.message);
        continue;
      }

      await supabase.from('rental_order_events').insert({
        rental_order_id: o.id,
        event_type: eventType,
        payload: { days_delta: daysDelta, end_date: o.end_date, status: o.status },
      });
      notified += recipients.length;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        roll: rollResult ?? null,
        notified,
        scanned: targets?.length ?? 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[rental-expiry-scan] fatal', msg);
    // Always return 200 OK JSON per Qitaat edge convention.
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});