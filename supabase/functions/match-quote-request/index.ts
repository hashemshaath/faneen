import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { normalizeCityName, citiesMatch } from './cityNormalize.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

// Phase 4 — legacy sector → canonical primary-activity taxonomy slug.
// KEEP IN SYNC with src/modules/taxonomy/legacy-mapping.ts.
// Targets are the 13 canonical primaries from Taxonomy Restructure P1.
const LEGACY_SECTOR_TO_TAXONOMY_SLUG: Record<string, string> = {
  // Aluminum
  aluminum: 'aluminum-works',
  alumnium: 'aluminum-works',
  aluminum_glass: 'aluminum-works',
  'aluminum-glass': 'aluminum-works',
  'aluminum-glass-facades': 'aluminum-works',
  // Glass
  glass: 'glass-securit-works',
  'glass-securit': 'glass-securit-works',
  // Facades
  storefronts: 'facades-cladding',
  facades: 'facades-cladding',
  cladding: 'facades-cladding',
  // Steel
  steel: 'steel-metal-works',
  iron: 'steel-metal-works',
  'iron-steel': 'steel-metal-works',
  // Stainless
  stainless: 'stainless-steel-works',
  'stainless-steel': 'stainless-steel-works',
  stainless_steel: 'stainless-steel-works',
  'stainless-steel-fabrication': 'stainless-steel-works',
  // Wood / kitchens
  wood: 'wood-carpentry',
  cabinets: 'wood-carpentry',
  kitchens: 'kitchens-works',
  // Contracting / fabrication / construction
  fabrication: 'contracting-finishing',
  'fabrication-installation': 'contracting-finishing',
  finishing: 'contracting-finishing',
  'project-fitout': 'contracting-finishing',
  construction: 'contracting-finishing',
  // Elevators / maintenance
  elevators: 'elevators-maintenance',
  maintenance: 'elevators-maintenance',
  // Energy
  energy: 'energy-sustainability',
  solar: 'energy-sustainability',
  // Technology
  technology: 'technology-networks',
  'technology-systems': 'technology-networks',
  // Security
  security: 'security-control-systems',
  surveillance: 'security-control-systems',
  // Equipment
  equipment: 'equipment-rental',
  'heavy-equipment-rental': 'equipment-rental',
  lifting: 'equipment-rental',
  scaffolding: 'equipment-rental',
  // Materials (kept on legacy target — out of Home scope)
  materials: 'building-materials-supply',
};

interface MatchInput { quote_request_id: string; limit?: number }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  const auth = req.headers.get('Authorization') ?? '';
  // System trigger via service-role allowed (for auto-match by status change)
  let isSystemCall = false;
  let userId: string | null = null;
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    if (token === SERVICE_KEY) {
      isSystemCall = true;
    } else {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: auth } },
      });
      const { data: userRes } = await userClient.auth.getUser();
      userId = userRes?.user?.id ?? null;
    }
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  if (!isSystemCall) {
    if (!userId) return jsonResponse({ error: 'unauthorized' }, 401);
    const { data: isAdmin } = await admin.rpc('has_admin_access', { _user_id: userId });
    if (!isAdmin) return jsonResponse({ error: 'forbidden' }, 403);
  }

  let body: MatchInput;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'invalid_json' }, 400); }
  const quoteId = body?.quote_request_id;
  const limit = Math.min(Math.max(body?.limit ?? 10, 1), 50);
  if (!quoteId || typeof quoteId !== 'string') return jsonResponse({ error: 'quote_request_id required' }, 400);

  const { data: quote, error: qErr } = await admin
    .from('quote_requests').select('*').eq('id', quoteId).maybeSingle();
  if (qErr || !quote) return jsonResponse({ success: false, error: 'quote_not_found' }, 404);

  const quoteCityNorm = normalizeCityName(quote.city);

  // Resolve city id by Arabic/English name (best effort)
  let cityId: string | null = null;
  if (quote.city) {
    const { data: cityRows } = await admin
      .from('cities').select('id, name_ar, name_en');
    const match = (cityRows ?? []).find((c: { name_ar: string | null; name_en: string | null }) =>
      citiesMatch(c.name_ar, quote.city) || citiesMatch(c.name_en, quote.city));
    cityId = match?.id ?? null;
  }

  // Candidates
  const { data: providers, error: pErr } = await admin
    .from('businesses')
    .select('id,user_id,name_ar,city_id,district,sectors,is_active,is_verified,approval_status,onboarding_completion,phone,mobile,description_ar,logo_url,last_active_at')
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .limit(500);
  if (pErr) return jsonResponse({ success: false, error: pErr.message }, 500);

  // Service areas for those providers
  const providerIds = (providers ?? []).map((p) => p.id);
  const areasByBiz = new Map<string, { city: string; district: string | null; is_primary: boolean }[]>();
  if (providerIds.length) {
    const { data: areas } = await admin
      .from('business_service_areas')
      .select('business_id, city, district, is_primary')
      .in('business_id', providerIds);
    for (const a of (areas ?? [])) {
      const list = areasByBiz.get(a.business_id) ?? [];
      list.push({ city: a.city, district: a.district, is_primary: a.is_primary });
      areasByBiz.set(a.business_id, list);
    }
  }

  // Resolve provider business city name for normalize compare
  const cityIdsNeeded = Array.from(new Set((providers ?? []).map((p) => p.city_id).filter(Boolean) as string[]));
  const cityNameById = new Map<string, string>();
  if (cityIdsNeeded.length) {
    const { data: cityRows } = await admin
      .from('cities').select('id, name_ar, name_en').in('id', cityIdsNeeded);
    for (const c of (cityRows ?? [])) {
      cityNameById.set(c.id, c.name_ar ?? c.name_en ?? '');
    }
  }

  const aliases = SECTOR_ALIASES[quote.sector] ?? [quote.sector];

  // Phase 4 — resolve quote sector to a taxonomy category (best-effort).
  // Failures are non-fatal: legacy scoring continues as before.
  let taxonomyCategoryId: string | null = null;
  let taxonomyCategorySlug: string | null = null;
  let taxonomyChildIds = new Set<string>();
  let taxonomyLinksByBiz = new Map<string, { category_id: string; role: string }[]>();
  try {
    const normalizedSector = String(quote.sector ?? '').trim().toLowerCase();
    const targetSlug = LEGACY_SECTOR_TO_TAXONOMY_SLUG[normalizedSector] ?? normalizedSector;
    if (targetSlug) {
      const { data: catRow } = await admin
        .from('taxonomy_categories')
        .select('id, slug')
        .eq('slug', targetSlug)
        .eq('is_active', true)
        .eq('is_public', true)
        .eq('is_archived', false)
        .maybeSingle();
      if (catRow) {
        taxonomyCategoryId = catRow.id as string;
        taxonomyCategorySlug = catRow.slug as string;
        const { data: childRows } = await admin
          .from('taxonomy_categories')
          .select('id')
          .eq('parent_id', taxonomyCategoryId)
          .eq('is_active', true)
          .eq('is_archived', false);
        for (const r of childRows ?? []) taxonomyChildIds.add(r.id as string);
      }
    }
    if (providerIds.length && taxonomyCategoryId) {
      const idsToCheck = [taxonomyCategoryId, ...Array.from(taxonomyChildIds)];
      const { data: links } = await admin
        .from('business_taxonomy_categories')
        .select('business_id, category_id, role')
        .in('business_id', providerIds)
        .in('category_id', idsToCheck);
      for (const l of links ?? []) {
        const list = taxonomyLinksByBiz.get(l.business_id as string) ?? [];
        list.push({ category_id: l.category_id as string, role: l.role as string });
        taxonomyLinksByBiz.set(l.business_id as string, list);
      }
    }
  } catch (_e) {
    // Swallow — taxonomy scoring is purely additive.
  }

  type Scored = { id: string; user_id: string | null; score: number; reasons: string[] };
  const scored: Scored[] = [];

  for (const p of (providers ?? [])) {
    const reasons: string[] = [];
    let score = 0;

    // Sector (required) — passes if either legacy or taxonomy matches.
    const sectorList: string[] = Array.isArray(p.sectors) ? p.sectors : [];
    const legacySectorMatch =
      sectorList.some((s) => aliases.includes(s)) || sectorList.includes(quote.sector);
    const txLinks = taxonomyLinksByBiz.get(p.id) ?? [];
    const txPrimaryMatch = txLinks.some((l) =>
      l.role === 'primary_activity' && l.category_id === taxonomyCategoryId);
    const txSecondaryMatch = txLinks.some((l) =>
      l.role === 'secondary_activity' &&
      (l.category_id === taxonomyCategoryId || taxonomyChildIds.has(l.category_id)));
    const taxonomyMatch = txPrimaryMatch || txSecondaryMatch;
    if (!legacySectorMatch && !taxonomyMatch) continue; // hard filter
    if (txPrimaryMatch) { score += 60; reasons.push('نفس النشاط الرئيسي'); }
    if (txSecondaryMatch) { score += 70; reasons.push('نفس التخصص'); }
    if (legacySectorMatch) { score += 50; reasons.push('تطابق من التصنيف القديم'); }

    // Service areas city match
    const areas = areasByBiz.get(p.id) ?? [];
    const areaCityMatch = areas.some((a) => citiesMatch(a.city, quote.city));
    if (areaCityMatch) { score += 30; reasons.push('ضمن مناطق الخدمة'); }

    // Business city match
    const bizCityName = p.city_id ? (cityNameById.get(p.city_id) ?? '') : '';
    const bizCityMatch = !!bizCityName && citiesMatch(bizCityName, quote.city);
    if (bizCityMatch && !areaCityMatch) { score += 20; reasons.push('نفس المدينة'); }
    else if (bizCityMatch && areaCityMatch) { score += 5; }

    // District match (areas first, then business district)
    if (quote.district) {
      const qd = String(quote.district).trim();
      const areaDistrict = areas.some((a) => a.district && a.district.trim() === qd && citiesMatch(a.city, quote.city));
      const bizDistrict = !!p.district && String(p.district).trim() === qd && bizCityMatch;
      if (areaDistrict || bizDistrict) { score += 10; reasons.push('نفس الحي'); }
    }

    // Activity
    const dActive = daysSince(p.last_active_at as string | null);
    if (dActive !== null && dActive <= 7) { score += 15; reasons.push('مزود نشط مؤخرًا'); }
    else if (dActive !== null && dActive <= 30) { score += 8; }

    // Profile completeness
    const oc = p.onboarding_completion ?? 0;
    const profileComplete = !!p.name_ar && !!p.city_id && sectorList.length > 0 && (!!p.phone || !!p.mobile) && (!!p.description_ar || !!p.logo_url);
    if (profileComplete || oc >= 80) { score += 10; reasons.push('بيانات المنشأة مكتملة'); }
    else if (oc >= 50) { score += 5; }

    // Verified
    if (p.is_verified) { score += 10; reasons.push('منشأة موثقة'); }

    // Contact info
    if (p.phone || p.mobile) { score += 5; reasons.push('لديه بيانات تواصل واضحة'); }

    // Has description / logo (richer profile)
    if (p.description_ar || p.logo_url) { score += 5; }

    // Must have at least sector AND (city or service area)
    if (!areaCityMatch && !bizCityMatch) continue;

    scored.push({ id: p.id, user_id: p.user_id, score, reasons });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  if (top.length === 0) {
    await admin.from('quote_request_events').insert({
      quote_request_id: quoteId,
      event_type: 'quote_matching_failed',
      actor_user_id: userId,
      metadata: {
        reason: 'no_matching_providers',
        candidates_evaluated: scored.length,
        sector: quote.sector,
        city: quote.city,
      },
    });
    return jsonResponse({
      success: false, matched_count: 0,
      message: 'لم يتم العثور على مزودين مناسبين حاليًا',
      quote_city_normalized: quoteCityNorm,
    });
  }

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
    .select('id, provider_id, provider_user_id, match_score, match_reasons');
  if (insErr) return jsonResponse({ success: false, error: insErr.message }, 500);

  const newLeads = inserted ?? [];

  // Audit: lead_created for each NEW lead (upsert with ignoreDuplicates returns only inserted rows)
  if (newLeads.length > 0) {
    const leadEvents = newLeads.map((l) => ({
      lead_id: l.id,
      quote_request_id: quoteId,
      event_type: 'lead_created',
      actor_user_id: userId,
      metadata: {
        match_score: l.match_score,
        match_reasons: l.match_reasons,
        provider_id: l.provider_id,
        provider_user_id: l.provider_user_id,
        created_by: isSystemCall ? 'system' : 'matching',
      },
    }));
    await admin.from('quote_request_lead_events').insert(leadEvents);
  }

  // Update quote status to matched
  if (quote.status === 'new' || quote.status === 'under_review') {
    const md = (quote.metadata ?? {}) as Record<string, unknown>;
    const history = Array.isArray(md.status_history) ? md.status_history : [];
    await admin.from('quote_requests').update({
      status: 'matched',
      metadata: {
        ...md,
        status_history: [
          ...history,
          { status: 'matched', changed_at: new Date().toISOString(), changed_by: userId, source: isSystemCall ? 'auto-match' : 'match-quote-request' },
        ],
      },
    }).eq('id', quoteId);
  }

  // Notify providers
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

  // Compute summary stats for admin UI
  const topScore = top[0]?.score ?? 0;
  const avgScore = top.length ? Math.round(top.reduce((a, b) => a + b.score, 0) / top.length) : 0;
  const reasonCounts: Record<string, number> = {};
  for (const s of top) for (const r of s.reasons) reasonCounts[r] = (reasonCounts[r] ?? 0) + 1;

  // Audit quote-level event
  await admin.from('quote_request_events').insert({
    quote_request_id: quoteId,
    event_type: 'quote_matched',
    actor_user_id: userId,
    metadata: {
      matched_count: newLeads.length,
      top_score: topScore,
      avg_score: avgScore,
      reason_counts: reasonCounts,
      candidates_evaluated: scored.length,
    },
  });

  return jsonResponse({
    success: true,
    matched_count: newLeads.length,
    candidates_evaluated: scored.length,
    top_score: topScore,
    avg_score: avgScore,
    reason_counts: reasonCounts,
    quote_request_id: quoteId,
    taxonomy_matched: taxonomyCategoryId !== null,
    matched_category_slug: taxonomyCategorySlug,
    message: `تم توجيه الطلب إلى ${newLeads.length} مزودين`,
  });
});
