// opportunity-expiry-scan (Phase E)
// ---------------------------------------------------------------------------
// Daily-ish scheduled scan. Marks RFQs whose owner-set validity has passed as
// `status = 'expired'`, logs a `quote.expired` event, notifies the client
// (in-app + email), and never touches awarded / completed / cancelled requests.
// Mirrors the pattern in `rental-expiry-scan` / `contracts-expiry-notifier`
// (cron-authenticated, always 200 OK JSON, idempotent).
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

interface QrRow {
  id: string;
  ref_id: string | null;
  user_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  valid_until: string | null;
  status: string;
  awarded_bid_id: string | null;
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
    const nowIso = new Date().toISOString();

    // Candidates: passed valid_until, not awarded, still in an open lifecycle stage.
    const { data: candidates, error: fetchErr } = await supabase
      .from('quote_requests')
      .select('id, ref_id, user_id, customer_email, customer_name, valid_until, status, awarded_bid_id')
      .lt('valid_until', nowIso)
      .is('awarded_bid_id', null)
      .in('status', ['new', 'under_review', 'matched', 'contacted'])
      .returns<QrRow[]>();

    if (fetchErr) throw fetchErr;

    let expired = 0;
    let notified = 0;
    for (const qr of candidates ?? []) {
      // Update status to expired (guarded to avoid clobbering concurrent transitions).
      const { data: upd, error: updErr } = await supabase
        .from('quote_requests')
        .update({ status: 'expired' })
        .eq('id', qr.id)
        .in('status', ['new', 'under_review', 'matched', 'contacted'])
        .is('awarded_bid_id', null)
        .select('id')
        .maybeSingle();
      if (updErr || !upd) continue;
      expired++;

      await supabase.from('quote_request_events').insert({
        quote_request_id: qr.id,
        event_type: 'quote.expired',
        metadata: { valid_until: qr.valid_until, source: 'opportunity-expiry-scan' },
      });

      if (qr.user_id) {
        const notif: EdgeNotificationPayload = {
          user_id: qr.user_id,
          notification_type: 'opportunity_expired',
          title_ar: 'انتهت صلاحية طلب عرض السعر',
          title_en: 'Your RFQ has expired',
          body_ar: qr.ref_id ? `الطلب ${qr.ref_id} انتهت مدة صلاحيته.` : 'انتهت مدة صلاحية طلبك.',
          body_en: qr.ref_id ? `Request ${qr.ref_id} passed its validity date.` : 'Your request passed its validity date.',
          action_url: `/dashboard/my-requests/${qr.id}`,
          reference_type: 'quote_request',
          reference_id: qr.id,
        };
        const { error: nErr } = await dispatchEdgeNotifications(supabase, [notif]);
        if (!nErr) notified++;
      }

      // Best-effort client email (uses existing opportunity-expired-client template).
      const clientEmail = qr.customer_email?.trim() || null;
      if (clientEmail) {
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'opportunity-expired-client',
              recipientEmail: clientEmail,
              idempotencyKey: `opp-expired-${qr.id}`,
              templateData: {
                ref: qr.ref_id ?? qr.id,
                customerName: qr.customer_name ?? undefined,
                url: `https://qitaat.com/dashboard/my-requests/${qr.id}`,
              },
            },
          });
        } catch (e) {
          console.warn('[opportunity-expiry-scan] email invoke failed', (e as Error).message);
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: candidates?.length ?? 0, expired, notified }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[opportunity-expiry-scan] fatal', msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});