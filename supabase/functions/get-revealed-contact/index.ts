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

const DENIED = { success: false, message: 'بيانات التواصل غير متاحة لهذه الفرصة حاليًا' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, DENIED);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json(401, DENIED);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json(401, DENIED);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const lead_id = typeof body?.lead_id === 'string' ? body.lead_id : null;
    if (!lead_id) return json(400, DENIED);

    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: lead, error: leadErr } = await admin
      .from('quote_request_leads')
      .select('id, status, contact_revealed, provider_user_id, provider_id, quote_request_id, contact_view_count')
      .eq('id', lead_id)
      .maybeSingle();
    if (leadErr || !lead) return json(404, DENIED);

    // Authorization: must be the provider user OR a business owner of the provider business
    let authorized = lead.provider_user_id === userId;
    if (!authorized) {
      const { data: ownerCheck } = await admin.rpc('is_business_owner', {
        _user_id: userId,
        _business_id: lead.provider_id,
      });
      authorized = !!ownerCheck;
    }
    if (!authorized) return json(403, DENIED);

    if (!lead.contact_revealed) return json(403, DENIED);
    if (!['interested', 'contacted', 'viewed'].includes(lead.status)) return json(403, DENIED);

    const { data: q, error: qErr } = await admin
      .from('quote_requests')
      .select('id, status, customer_name, customer_phone, customer_email, customer_type, preferred_contact_method')
      .eq('id', lead.quote_request_id)
      .maybeSingle();
    if (qErr || !q) return json(404, DENIED);
    if (q.status === 'cancelled') return json(403, DENIED);

    // Track the view
    const newCount = (lead.contact_view_count ?? 0) + 1;
    await admin
      .from('quote_request_leads')
      .update({
        contact_view_count: newCount,
        contact_viewed_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    await admin.from('quote_request_lead_events').insert({
      lead_id: lead.id,
      quote_request_id: lead.quote_request_id,
      event_type: 'contact_viewed',
      actor_user_id: userId,
      metadata: { view_count: newCount },
    });

    return json(200, {
      success: true,
      contact: {
        customer_name: q.customer_name,
        customer_phone: q.customer_phone,
        customer_email: q.customer_email,
        preferred_contact_method: q.preferred_contact_method,
        customer_type: q.customer_type,
      },
    });
  } catch (e) {
    console.error('get-revealed-contact error', e);
    return json(500, DENIED);
  }
});