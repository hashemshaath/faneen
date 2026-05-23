import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildRevealIdempotencyKey,
  debitProviderLeadCredit,
  getProviderCreditBalance,
  insertCreditLedgerTransaction,
} from '../_shared/credits/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// ---- Commercial config (mirrors src/lib/providerCommercialConfig.ts) ----
const COMMERCIAL = {
  requireCreditForContactReveal: false,
  freeRevealDuringLaunch: true,
  defaultLeadRevealCost: 1,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { success: false, message: 'Method not allowed' });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { success: false, message: 'Unauthorized' });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json(401, { success: false, message: 'Unauthorized' });
    const userId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: isAdmin, error: adminErr } = await admin.rpc('has_admin_access', { _user_id: userId });
    if (adminErr || !isAdmin) return json(403, { success: false, message: 'Forbidden' });

    const body = await req.json().catch(() => ({}));
    const lead_id = typeof body?.lead_id === 'string' ? body.lead_id : null;
    const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : null;
    const overrideCreditCheck = body?.override_credit_check === true;
    if (!lead_id) return json(400, { success: false, message: 'lead_id required' });

    const { data: lead, error: leadErr } = await admin
      .from('quote_request_leads')
      .select('id, status, contact_revealed, quote_request_id, provider_user_id, provider_id')
      .eq('id', lead_id)
      .maybeSingle();
    if (leadErr || !lead) return json(404, { success: false, message: 'Lead not found' });

    if (lead.contact_revealed) {
      return json(200, { success: true, message: 'تم إتاحة بيانات التواصل مسبقًا' });
    }
    if (!['new', 'viewed', 'interested'].includes(lead.status)) {
      return json(400, { success: false, message: 'لا يمكن إتاحة بيانات التواصل لهذه الفرصة' });
    }

    // ---- Commercial mode + optional credit consumption ----
    const needCredit = COMMERCIAL.requireCreditForContactReveal && !overrideCreditCheck;
    const cost = COMMERCIAL.defaultLeadRevealCost;

    // EDGE-3: route balance read through shared helper.
    let { data: sub } = await getProviderCreditBalance(admin, lead.provider_id);

    if (needCredit) {
      // EDGE-3: atomic debit + ledger insert via SECURITY DEFINER RPC with idempotency.
      const idempotencyKey = buildRevealIdempotencyKey({ leadId: lead_id, userId });
      const { data: debitData, error: debitErr } = await debitProviderLeadCredit(admin, {
        businessId: lead.provider_id,
        cost,
        reason: 'contact_reveal_consumption',
        quoteRequestLeadId: lead_id,
        createdBy: userId,
        idempotencyKey,
      });
      if (debitErr || !debitData) {
        console.error('debit rpc error', debitErr);
        return json(500, { success: false, message: 'تعذر خصم الرصيد' });
      }
      const d = debitData as {
        ok: boolean;
        code?: string;
        balance?: number;
        balance_after?: number;
        idempotent?: boolean;
      };
      if (d.ok === false) {
        if (d.code === 'insufficient' || d.code === 'subscription_not_found') {
          return json(402, { success: false, message: 'رصيد المزود غير كافٍ لإتاحة بيانات التواصل' });
        }
        return json(500, { success: false, message: 'تعذر خصم الرصيد' });
      }
      const newBal = d.balance_after ?? ((sub?.lead_credits_balance ?? 0) - cost);
      if (sub) {
        sub = { ...sub, lead_credits_balance: newBal };
      }
    }

    const newStatus = lead.status === 'interested' ? 'contacted' : lead.status;

    const { error: updateErr } = await admin
      .from('quote_request_leads')
      .update({
        contact_revealed: true,
        contact_revealed_at: new Date().toISOString(),
        contact_revealed_by: userId,
        contact_reveal_note: note,
        status: newStatus,
      })
      .eq('id', lead_id);
    if (updateErr) {
      console.error('reveal update error', updateErr);
      return json(500, { success: false, message: 'تعذر إتاحة بيانات التواصل' });
    }

    // Commercial-mode metadata for the reveal event (no PII)
    const commercialMode = needCredit
      ? 'paid'
      : (overrideCreditCheck ? 'admin_override' : (COMMERCIAL.freeRevealDuringLaunch ? 'free_launch' : 'free'));
    const creditCost = needCredit ? cost : 0;

    await admin.from('quote_request_lead_events').insert({
      lead_id,
      quote_request_id: lead.quote_request_id,
      event_type: 'contact_revealed',
      actor_user_id: userId,
      metadata: { note, commercial_mode: commercialMode, credit_cost: creditCost },
    });

    // Zero-amount log so launch reveals are still auditable.
    // EDGE-3: routed through shared insertCreditLedgerTransaction helper.
    if (!needCredit && sub) {
      const reason = overrideCreditCheck
        ? 'admin_override_reveal'
        : (COMMERCIAL.freeRevealDuringLaunch ? 'launch_free_reveal' : 'free_reveal');
      await insertCreditLedgerTransaction(admin, {
        business_id: sub.business_id,
        provider_user_id: sub.provider_user_id,
        quote_request_lead_id: lead_id,
        type: 'consume',
        amount: 0,
        balance_after: sub.lead_credits_balance ?? 0,
        reason,
        created_by: userId,
      });
    }

    if (lead.provider_user_id) {
      await admin.from('notifications').insert({
        user_id: lead.provider_user_id,
        notification_type: 'quote_contact_revealed',
        title_ar: 'بيانات التواصل متاحة',
        title_en: 'Contact details are available',
        body_ar: 'تمت إتاحة بيانات التواصل لفرصة عرض السعر التي أبديت اهتمامك بها.',
        body_en: 'Contact details are now available for a quote opportunity you showed interest in.',
        reference_id: lead.id,
        reference_type: 'quote_request_lead',
        action_url: `/dashboard/provider/leads/${lead.id}`,
      });
    }

    return json(200, { success: true, message: 'تمت إتاحة بيانات التواصل للمزود', commercial_mode: commercialMode });
  } catch (e) {
    console.error('admin-reveal-lead-contact error', e);
    return json(500, { success: false, message: 'حدث خطأ غير متوقع' });
  }
});
