import { createClient } from 'npm:@supabase/supabase-js@2';

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

    // Verify admin
    const { data: isAdmin, error: adminErr } = await admin.rpc('has_admin_access', { _user_id: userId });
    if (adminErr || !isAdmin) return json(403, { success: false, message: 'Forbidden' });

    const body = await req.json().catch(() => ({}));
    const lead_id = typeof body?.lead_id === 'string' ? body.lead_id : null;
    const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : null;
    if (!lead_id) return json(400, { success: false, message: 'lead_id required' });

    const { data: lead, error: leadErr } = await admin
      .from('quote_request_leads')
      .select('id, status, contact_revealed, quote_request_id, provider_user_id')
      .eq('id', lead_id)
      .maybeSingle();
    if (leadErr || !lead) return json(404, { success: false, message: 'Lead not found' });

    if (lead.contact_revealed) {
      return json(200, { success: true, message: 'تم إتاحة بيانات التواصل مسبقًا' });
    }
    if (!['new', 'viewed', 'interested'].includes(lead.status)) {
      return json(400, { success: false, message: 'لا يمكن إتاحة بيانات التواصل لهذه الفرصة' });
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

    // Audit event
    await admin.from('quote_request_lead_events').insert({
      lead_id,
      quote_request_id: lead.quote_request_id,
      event_type: 'contact_revealed',
      actor_user_id: userId,
      metadata: { note },
    });

    // Notify provider (if linked to a user)
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

    return json(200, { success: true, message: 'تمت إتاحة بيانات التواصل للمزود' });
  } catch (e) {
    console.error('admin-reveal-lead-contact error', e);
    return json(500, { success: false, message: 'حدث خطأ غير متوقع' });
  }
});