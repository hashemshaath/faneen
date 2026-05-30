import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SAUDI_PHONE = /^(?:\+?966|0)?5\d{8}$/;

// Auto-trigger matching the moment a quote is submitted.
// Keep `false` while admin review is the default operating mode.
const AUTO_MATCH_ON_SUBMISSION = false;

const ALLOWED_SECTORS = new Set([
  'aluminum','iron','wood','glass','stainless','fabrication','storefronts','project-fitout','other',
]);
const ALLOWED_CONTACT = new Set(['whatsapp','call','email']);
const ALLOWED_CUSTOMER_TYPE = new Set(['individual','contractor','engineering_office','company','government','other']);
const ALLOWED_SERVICE_LOC = new Set(['project_site','provider_location','not_sure']);
const ALLOWED_TIMELINE = new Set(['week','two-weeks','month','flexible','ask-provider']);
const ALLOWED_BRAND_MODE = new Set(['exact','preferred','flexible']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Body {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string | null;
  customer_type?: string;
  preferred_contact_method?: string;
  sector?: string;
  city?: string;
  district?: string | null;
  service_location_type?: string;
  project_description?: string;
  approx_dimensions?: string | null;
  quantity?: string | null;
  execution_timeline?: string;
  has_budget?: boolean;
  budget_amount?: number | null;
  budget_note?: string | null;
  metadata?: Record<string, unknown>;
  preferred_brand_ids?: string[] | null;
  brand_preference_mode?: string | null;
  brand_notes?: string | null;
}

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ success: false, message: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  let body: Body;
  try { body = await req.json(); } catch { return err('Invalid JSON'); }

  // Validation
  const name = (body.customer_name ?? '').trim();
  const phone = (body.customer_phone ?? '').trim();
  const sector = (body.sector ?? '').trim();
  const city = (body.city ?? '').trim();
  const desc = (body.project_description ?? '').trim();
  const customerType = (body.customer_type ?? '').trim();
  const contactMethod = (body.preferred_contact_method ?? '').trim();
  const serviceLoc = (body.service_location_type ?? '').trim();
  const timeline = (body.execution_timeline ?? '').trim();

  if (name.length < 2 || name.length > 120) return err('اسم العميل غير صالح');
  if (!SAUDI_PHONE.test(phone)) return err('رقم الجوال غير صحيح');
  if (!ALLOWED_SECTORS.has(sector)) return err('القطاع غير صالح');
  if (city.length < 2 || city.length > 80) return err('المدينة غير صالحة');
  if (desc.length < 10 || desc.length > 4000) return err('وصف المشروع غير صالح');
  if (!ALLOWED_CUSTOMER_TYPE.has(customerType)) return err('نوع العميل غير صالح');
  if (!ALLOWED_CONTACT.has(contactMethod)) return err('طريقة التواصل غير صالحة');
  if (!ALLOWED_SERVICE_LOC.has(serviceLoc)) return err('مكان الخدمة غير صالح');
  if (!ALLOWED_TIMELINE.has(timeline)) return err('الموعد غير صالح');

  const email = body.customer_email?.toString().trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('البريد الإلكتروني غير صالح');

  // Brand preference (all optional; DB trigger enforces approved-brand validity)
  let preferredBrandIds: string[] | null = null;
  if (Array.isArray(body.preferred_brand_ids) && body.preferred_brand_ids.length) {
    const cleaned = body.preferred_brand_ids
      .map((x) => String(x ?? '').trim())
      .filter((x) => UUID_RE.test(x));
    if (cleaned.length > 20) return err('عدد العلامات التجارية المفضّلة كبير جدًا');
    preferredBrandIds = cleaned.length ? cleaned : null;
  }
  const brandMode =
    body.brand_preference_mode == null || body.brand_preference_mode === ''
      ? null
      : String(body.brand_preference_mode);
  if (brandMode && !ALLOWED_BRAND_MODE.has(brandMode)) return err('وضع تفضيل العلامة غير صالح');
  const brandNotes =
    typeof body.brand_notes === 'string' && body.brand_notes.trim()
      ? body.brand_notes.trim().slice(0, 2000)
      : null;

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Identify user from JWT (if any)
  let userId: string | null = null;
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data } = await userClient.auth.getUser();
    userId = data.user?.id ?? null;
  }

  const admin = createClient(url, serviceKey);

  const insertPayload = {
    user_id: userId,
    customer_name: name,
    customer_phone: phone,
    customer_email: email,
    customer_type: customerType,
    preferred_contact_method: contactMethod,
    sector,
    city,
    district: body.district?.toString().trim() || null,
    service_location_type: serviceLoc,
    project_description: desc,
    approx_dimensions: body.approx_dimensions?.toString().trim() || null,
    quantity: body.quantity?.toString().trim() || null,
    execution_timeline: timeline,
    has_budget: !!body.has_budget,
    budget_amount: body.has_budget && typeof body.budget_amount === 'number' ? body.budget_amount : null,
    budget_note: body.budget_note?.toString().trim() || null,
    status: 'new',
    source: 'website_quote_form',
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    preferred_brand_ids: preferredBrandIds,
    brand_preference_mode: brandMode,
    brand_notes: brandNotes,
  };

  const { data: inserted, error } = await admin
    .from('quote_requests')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('quote_requests insert error', error);
    return err('تعذر حفظ الطلب حاليًا. حاول مرة أخرى.', 500);
  }

  // Audit: quote_created
  try {
    await admin.from('quote_request_events').insert({
      quote_request_id: inserted.id,
      event_type: 'quote_created',
      actor_user_id: userId,
      metadata: {
        sector,
        city,
        customer_type: customerType,
        source: 'website_quote_form',
        anonymous: !userId,
        brand_count: preferredBrandIds?.length ?? 0,
        brand_preference_mode: brandMode,
      },
    });
  } catch (e) {
    console.warn('quote_created event insert failed (non-fatal)', e);
  }

  // Optionally trigger automatic matching right after submission.
  if (AUTO_MATCH_ON_SUBMISSION) {
    try {
      await admin.functions.invoke('match-quote-request', {
        body: { quote_request_id: inserted.id, limit: 10 },
      });
    } catch (e) {
      console.warn('auto-match invoke failed (non-fatal)', e);
    }
  }

  // Best-effort notifications
  try {
    if (userId) {
      await admin.from('notifications').insert({
        user_id: userId,
        notification_type: 'quote_request_submitted',
        title_ar: 'تم استلام طلب عرض السعر',
        title_en: 'Quote request received',
        body_ar: 'وصلنا طلبك وسنساعدك على تنظيمه حسب القطاع والمدينة.',
        body_en: 'We received your request and will route it by sector and city.',
        reference_id: inserted.id,
        reference_type: 'quote_request',
        action_url: `/dashboard/my-requests`,
      });
    }
    // Notify admins
    const { data: admins } = await admin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    if (admins && admins.length) {
      const rows = admins.map((a: { user_id: string }) => ({
        user_id: a.user_id,
        notification_type: 'quote_request_new_admin',
        title_ar: 'طلب عرض سعر جديد',
        title_en: 'New quote request',
        body_ar: `تم إرسال طلب جديد في قطاع ${sector} بمدينة ${city}.`,
        body_en: `New quote request in sector ${sector} (${city}).`,
        reference_id: inserted.id,
        reference_type: 'quote_request',
        action_url: `/admin/quote-requests`,
      }));
      await admin.from('notifications').insert(rows);
    }
  } catch (e) {
    console.error('notification insert failed (non-fatal)', e);
  }

  return new Response(
    JSON.stringify({
      success: true,
      quote_request_id: inserted.id,
      message: 'تم استلام طلبك بنجاح',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});