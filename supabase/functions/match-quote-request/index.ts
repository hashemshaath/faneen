/**
 * Q4.2 — Thin wrapper around the `public.match_quote_to_providers` RPC.
 *
 * The RPC now owns candidate discovery, coverage matching (with the
 * transient `city_fallback`), lead insertion + dedupe, provider
 * notifications, admin manual-routing fallback, and quote status
 * transition. This edge fn keeps the external signature/response shape
 * intact for existing callers (submit-quote-request, admin UI):
 *   { success, matched_count, message, ... }
 */
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MatchInput { quote_request_id: string; limit?: number }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  const auth = req.headers.get('Authorization') ?? '';
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
  if (!quoteId || typeof quoteId !== 'string') {
    return jsonResponse({ error: 'quote_request_id required' }, 400);
  }

  // Delegate to the SECURITY DEFINER RPC — single source of truth for
  // matching logic (coverage / city_fallback / manual_routing).
  const { data, error } = await admin.rpc('match_quote_to_providers', {
    p_quote_id: quoteId,
  });
  if (error) {
    console.error('match_quote_to_providers rpc error', error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }

  const result = (data ?? {}) as {
    success?: boolean;
    matched_count?: number;
    match_source?: string;
    candidates_evaluated?: number;
    taxonomy_category_id?: string | null;
    city_id?: string | null;
    district_id?: string | null;
    error?: string;
  };

  if (result.error === 'quote_not_found') {
    return jsonResponse({ success: false, error: 'quote_not_found' }, 404);
  }

  const matchedCount = Number(result.matched_count ?? 0);
  const source = String(result.match_source ?? 'unknown');

  // P2.1 — Best-effort provider fan-out emails ("opportunity-new-match-provider").
  // The matching RPC just inserted quote_request_leads rows. We look them up
  // and dispatch ONE email per (quote, provider). Idempotency key per pair
  // prevents duplicate sends even if the match function is re-invoked.
  if (matchedCount > 0) {
    try {
      const { data: leads } = await admin
        .from('quote_request_leads')
        .select('id, provider_business_id')
        .eq('quote_request_id', quoteId)
        .limit(20);
      const { data: quote } = await admin
        .from('quote_requests')
        .select('ref_id, sector, city')
        .eq('id', quoteId)
        .maybeSingle();
      const providerBusinessIds = Array.from(
        new Set(
          (leads ?? [])
            .map((l: { provider_business_id?: string | null }) => l.provider_business_id ?? null)
            .filter((v): v is string => !!v),
        ),
      ).slice(0, 15); // hard cap
      for (const bizId of providerBusinessIds) {
        try {
          const { data: biz } = await admin
            .from('businesses')
            .select('name_ar, name_en, user_id, email')
            .eq('id', bizId)
            .maybeSingle();
          if (!biz) continue;
          let recipient: string | null = (biz as { email?: string | null }).email ?? null;
          const ownerId = (biz as { user_id?: string | null }).user_id ?? null;
          if (!recipient && ownerId) {
            const { data: prof } = await admin
              .from('profiles')
              .select('email')
              .eq('user_id', ownerId)
              .maybeSingle();
            recipient = (prof as { email?: string | null } | null)?.email ?? null;
          }
          if (!recipient) continue;
          const bizName =
            (biz as { name_ar?: string | null }).name_ar ||
            (biz as { name_en?: string | null }).name_en ||
            undefined;
          await admin.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'opportunity-new-match-provider',
              recipientEmail: recipient,
              idempotencyKey: `opp-match-${quoteId}-${bizId}`,
              templateData: {
                ref: (quote as { ref_id?: string | null } | null)?.ref_id ?? quoteId,
                businessName: bizName,
                sector: (quote as { sector?: string | null } | null)?.sector ?? undefined,
                city: (quote as { city?: string | null } | null)?.city ?? undefined,
                url: `https://qitaat.com/dashboard/opportunities/${quoteId}`,
              },
            },
          });
        } catch (e) {
          console.warn('opportunity-new-match-provider send failed', { biz: bizId, e: String(e) });
        }
      }
    } catch (e) {
      console.warn('provider match email fan-out failed', String(e));
    }
  }

  const message =
    matchedCount > 0
      ? `تم توجيه طلبك إلى ${matchedCount} من المزودين الذين يغطون منطقتك`
      : source === 'manual_routing'
        ? 'استلمنا طلبك — سيتولى فريقنا توجيهه يدوياً والتواصل معك'
        : 'استلمنا طلبك — لا يوجد لدينا حالياً مزود يغطي منطقتك، وسيتولى فريقنا توجيه الطلب يدوياً والتواصل معك';

  return jsonResponse({
    success: matchedCount > 0 || source === 'manual_routing' || source === 'coverage' || source === 'city_fallback',
    matched_count: matchedCount,
    match_source: source,
    candidates_evaluated: Number(result.candidates_evaluated ?? 0),
    taxonomy_matched: !!result.taxonomy_category_id,
    quote_request_id: quoteId,
    message,
  });
});