// analyze-contract-document
// Accepts a contract file (PDF / DOCX / image / TXT) as base64 and uses the
// Lovable AI Gateway (Gemini 2.5 Flash multimodal) to extract structured
// contract data so the user can convert any paper/PDF contract into a digital
// draft on /dashboard/contracts.
//
// Always returns HTTP 200 with `{ ok, data | error, raw? }` per project policy.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface AnalyzeRequest {
  file_base64?: string;
  mime_type?: string;
  filename?: string;
  locale?: 'ar' | 'en';
  /** Optional raw text fallback (e.g. .txt files we already decoded client-side). */
  raw_text?: string;
}

// MIME types that Gemini can ingest directly through the OpenAI-compatible
// `image_url` data-URL channel (PDFs + common image formats).
const INLINE_MEDIA_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

// Hard cap on uploaded payload size (≈10 MB base64) to keep the edge function
// snappy and avoid blowing past gateway limits.
const MAX_BASE64_BYTES = 14_000_000;

const SYSTEM_PROMPT = `You are a senior contracts analyst for the Saudi/Gulf construction & industrial sector (aluminum, glass, wood, steel).
You receive a contract document (PDF, scanned image, Word doc, or plain text) — possibly in Arabic, English, or mixed.
Your job: extract a clean, structured JSON representation of the contract so it can be turned into a digital contract record.

RULES:
- Output STRICT JSON only — no markdown, no commentary, no code fences.
- Preserve original Arabic text verbatim in *_ar fields. Provide English translations in *_en fields when possible (translate, do not transliterate). Leave a field as empty string "" if not present.
- Currency codes must be ISO (SAR, AED, USD, EUR). Default to SAR if a Saudi contract has no explicit currency.
- Dates must be ISO YYYY-MM-DD. Convert Hijri to Gregorian when both are present; otherwise leave empty.
- Numbers must be plain numbers (no separators, no currency symbols). VAT rate is a percentage number (e.g. 15).
- vat_inclusive: true if the price explicitly includes VAT ("شامل الضريبة" / "including VAT"); false if exclusive; default false if unclear.
- clauses: an ordered array of the contract's clauses/sections — preserve the original wording (Arabic if Arabic), one entry per clause.
- line_items: any tabulated work items / BOQ rows (description, quantity, unit, unit_price, total).
- measurements: technical measurements found in the contract (windows/doors/façade dimensions in mm), if any.
- confidence: your overall confidence 0..1.

Return EXACTLY this JSON shape:
{
  "title_ar": "", "title_en": "",
  "description_ar": "", "description_en": "",
  "provider": { "name": "", "cr_number": "", "vat_number": "", "address": "", "phone": "", "email": "" },
  "client":   { "name": "", "cr_number": "", "vat_number": "", "address": "", "phone": "", "email": "" },
  "total_amount": 0, "currency_code": "SAR",
  "vat_inclusive": false, "vat_rate": 15,
  "start_date": "", "end_date": "",
  "supervisor": { "name": "", "phone": "", "email": "" },
  "terms_ar": "", "terms_en": "",
  "clauses": [ { "title": "", "body": "" } ],
  "line_items": [ { "description": "", "quantity": 0, "unit": "", "unit_price": 0, "total": 0 } ],
  "measurements": [ { "label": "", "width_mm": 0, "height_mm": 0, "quantity": 0, "notes": "" } ],
  "confidence": 0.0,
  "summary_ar": "", "summary_en": ""
}`;

function cleanJsonString(s: string): string {
  let out = s.trim();
  if (out.startsWith('```')) {
    out = out.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  // Strip BOM / stray leading chars before the first { or [
  const firstBrace = out.search(/[\[{]/);
  if (firstBrace > 0) out = out.slice(firstBrace);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return json({ ok: false, error: 'LOVABLE_API_KEY not configured' });
    }

    let body: AnalyzeRequest;
    try {
      body = (await req.json()) as AnalyzeRequest;
    } catch {
      return json({ ok: false, error: 'invalid_json_body' });
    }

    const { file_base64, mime_type, filename, locale, raw_text } = body;
    const lang = locale === 'en' ? 'en' : 'ar';

    // Build the user message — either inline file (PDF/image) or plain text.
    let userContent: unknown;
    if (raw_text && raw_text.trim().length > 0) {
      userContent = [
        {
          type: 'text',
          text:
            (lang === 'ar'
              ? `حلل العقد التالي واستخرج البيانات وفق المخطط المطلوب. اسم الملف: ${filename ?? 'contract.txt'}\n\n--- بداية النص ---\n`
              : `Analyze the following contract and extract data per the required schema. Filename: ${filename ?? 'contract.txt'}\n\n--- begin text ---\n`) +
            raw_text.slice(0, 200_000) +
            (lang === 'ar' ? '\n--- نهاية النص ---' : '\n--- end text ---'),
        },
      ];
    } else if (file_base64 && mime_type) {
      if (file_base64.length > MAX_BASE64_BYTES) {
        return json({ ok: false, error: 'file_too_large', max_mb: 10 });
      }
      if (!INLINE_MEDIA_TYPES.has(mime_type)) {
        // DOCX & other office formats — Gemini can't read them inline. Ask
        // the client to convert to PDF or paste raw_text instead.
        return json({
          ok: false,
          error: 'unsupported_inline_mime',
          mime_type,
          hint:
            lang === 'ar'
              ? 'صيغة الملف غير مدعومة مباشرة. حوّل المستند إلى PDF أو الصق النص الخام.'
              : 'Unsupported inline format. Convert the document to PDF or paste the raw text.',
        });
      }
      const dataUrl = `data:${mime_type};base64,${file_base64}`;
      userContent = [
        {
          type: 'text',
          text:
            lang === 'ar'
              ? `حلل هذا العقد المرفق واستخرج البيانات وفق المخطط المطلوب. اسم الملف: ${filename ?? 'contract'}`
              : `Analyze the attached contract and extract data per the required schema. Filename: ${filename ?? 'contract'}`,
        },
        { type: 'image_url', image_url: { url: dataUrl } },
      ];
    } else {
      return json({ ok: false, error: 'missing_input' });
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return json({ ok: false, error: 'rate_limited' });
      if (aiRes.status === 402) return json({ ok: false, error: 'credits_exhausted' });
      console.error('analyze-contract-document gateway error', aiRes.status, txt.slice(0, 500));
      return json({ ok: false, error: 'ai_gateway_error', status: aiRes.status });
    }

    const payload = await aiRes.json();
    const content: string = payload?.choices?.[0]?.message?.content ?? '';
    if (!content) return json({ ok: false, error: 'empty_ai_response' });

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(cleanJsonString(content));
    } catch (e) {
      console.error('analyze-contract-document JSON parse failed', e, content.slice(0, 300));
      return json({ ok: false, error: 'parse_failed', raw: content.slice(0, 4000) });
    }

    return json({ ok: true, data: parsed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('analyze-contract-document fatal', msg);
    return json({ ok: false, error: 'unexpected', detail: msg });
  }
});