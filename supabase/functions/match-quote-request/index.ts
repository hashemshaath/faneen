import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Map quote sectors -> business sector keywords. Loose match: any overlap counts.
const SECTOR_ALIASES: Record<string, string[]> = {
  aluminum: ['aluminum', 'aluminum_glass'],
  glass: ['glass', 'aluminum_glass'],
  iron: ['iron', 'steel'],
  stainless: ['stainless', 'stainless_steel'],
  wood: ['wood'],
  fabrication: ['fabrication', 'iron', 'steel', 'aluminum'],
  storefronts: ['aluminum_glass', 'aluminum', 'glass'],
  'project-fitout': ['fabrication', 'aluminum_glass', 'wood'],
  other: [],
};

interface MatchInput { quote_request_id: string; limit?: number }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Auth: must be admin (use anon client with caller's JWT to check)
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return jsonResponse({ error: 'unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  const userId = userRes?.user?.id;
  if (!userId) return jsonResponse({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: isAdmin } = await admin.rpc('has_admin_access', { _user_id: userId });
  if (!isAdmin) return jsonResponse({ error: 'forbidden' }, 403);

  let body: MatchInput;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'invalid_json' }, 400); }
  const quoteId = body?.quote_request_id;
  const limit = Math.min(Math.max(body?.limit ?? 10, 1), 50);
  if (!quoteId || typeof quoteId !== 'string') return jsonResponse({ error: 'quote_request_id required' }, 400);

  // Fetch quote
  const { data: quote, error: qErr } = await admin
    .from('quote_requests').select('*').eq('id', quoteId).maybeSingle();
  if (qErr || !quote) return jsonResponse({ success: false, error: 'quote_not_found' }, 404);

  // Resolve city id by Arabic name (best effort)
  let cityId: string | null = null;
  if (quote.city) {
    const { data: city } = await admin
      .from('cities').select('id').or(`name_ar.eq.${quote.city},name_en.ilike.${quote.city}`).maybeSingle();
    cityId = city?.id ?? null;
  }

  // Candidate providers: active + approved
  const { data: providers, error: pErr } = await admin
    .from('businesses')
    .select('id,user_id,name_ar,city_id,district,sectors,is_active,is_verified,approval_status,onboarding_completion,phone,mobile,description_ar,logo_url')
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .limit(500);
  if (pErr) return jsonResponse({ success: false, error: pErr.message }, 500);

  const aliases = SECTOR_ALIASES[quote.sector] ?? [quote.sector];

  type Scored = { id: string; user_id: string | null; score: number; reasons: string[] };
  const scored: Scored[] = [];
  for (const p of (providers ?? [])) {
    const reasons: string[] = [];
    let score = 0;

    const sectorList: string[] = Array.isArray(p.sectors) ? p.sectors : [];
    const sectorMatch = sectorList.some((s) => aliases.includes(s)) || sectorList.includes(quote.sector);
    if (sectorMatch) { score += 50; reasons.push('نفس القطاع'); }

    if (cityId && p.city_id === cityId) { score += 25; reasons.push('نفس المدينة'); }

    if (quote.district && p.district && String(p.district).trim() === String(quote.district).trim()) {
      score += 5; reasons.push('نفس الحي');
    }

    if (p.is_active) { score += 10; reasons.push('مزود نشط'); }

    const profileComplete = !!p.name_ar && !!p.city_id && sectorList.length > 0 && (!!p.phone || !!p.mobile) && (!!p.description_ar || !!p.logo_url);
    if (profileComplete) { score += 10; reasons.push('بيانات المزود مكتملة'); }
    if ((p.onboarding_completion ?? 0) >= 80) { score += 5; reasons.push('ملف منشأة شبه مكتمل'); }

    if (p.is_verified) { score += 10; reasons.push('مزود موثّق'); }

    // TODO: portfolio/last_active_at scoring not available — skip for now.

    // Only consider if at least sector OR city match
    if (sectorMatch || (cityId && p.city_id === cityId)) {
      scored.push({ id: p.id, user_id: p.user_id, score, reasons });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  if (top.length === 0) {
    return jsonResponse({ success: false, matched_count: 0, message: 'لم يتم العثور على مزودين مناسبين حاليًا' });
  }

  // Insert leads (skip duplicates via unique constraint with onConflict)
  const rows = top.map((s) => ({
    quote_request_id: quoteId,
    provider_id: s.id,
    provider_user_id: s.user_id,
    match_score: s.score,
    match_reasons: s.reasons,
    status: 'new',
  }));

  const { data: inserted, error: insErr } = await admin
    .from('quote_request_leads')
    .upsert(rows, { onConflict: 'quote_request_id,provider_id', ignoreDuplicates: true })
    .select('id, provider_id, provider_user_id');
  if (insErr) return jsonResponse({ success: false, error: insErr.message }, 500);

  const newLeads = inserted ?? [];

  // Update quote status to matched (and append to status_history)
  if (quote.status === 'new' || quote.status === 'under_review') {
    const md = (quote.metadata ?? {}) as Record<string, unknown>;
    const history = Array.isArray(md.status_history) ? md.status_history : [];
    await admin.from('quote_requests').update({
      status: 'matched',
      metadata: {
        ...md,
        status_history: [
          ...history,
          { status: 'matched', changed_at: new Date().toISOString(), changed_by: userId, source: 'match-quote-request' },
        ],
      },
    }).eq('id', quoteId);
  }

  // Notify providers with a user account
  const sectorAr = (() => {
    const map: Record<string, string> = { aluminum:'ألمنيوم', iron:'حديد', wood:'خشب', glass:'زجاج', stainless:'ستانلس', fabrication:'تصنيع وتركيب', storefronts:'واجهات', 'project-fitout':'تجهيزات مشاريع', other:'أخرى' };
    return map[quote.sector] ?? quote.sector;
  })();

  const notifs = newLeads
    .filter((l) => l.provider_user_id)
    .map((l) => ({
      user_id: l.provider_user_id,
      notification_type: 'quote_lead_assigned',
      title_ar: 'فرصة عرض سعر جديدة',
      title_en: 'New quote opportunity',
      body_ar: `لديك طلب جديد في قطاع ${sectorAr} بمدينة ${quote.city}.`,
      body_en: `You have a new request in ${quote.sector} (${quote.city}).`,
      reference_id: l.id,
      reference_type: 'quote_request_lead',
      action_url: `/dashboard/provider/leads/${l.id}`,
    }));
  if (notifs.length > 0) {
    await admin.from('notifications').insert(notifs);
  }

  return jsonResponse({
    success: true,
    matched_count: newLeads.length,
    quote_request_id: quoteId,
    message: `تم توجيه الطلب إلى ${newLeads.length} مزودين`,
  });
});