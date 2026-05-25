// Saudi National Address short-address lookup.
//
// Calls the SPL API (https://splapi.address.gov.sa) with the SPL_API_KEY
// secret to resolve a short national address (e.g. "RRRD2402") into a full
// structured address. Always returns HTTP 200 with `{ ok, ...data | error }`
// so the client can show friendly messages without dealing with status codes.

import 'https://deno.land/x/xhr@0.1.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SplAddress {
  Address?: string;
  AdditionalNumber?: string | number;
  BuildingNumber?: string | number;
  City?: string;
  DistrictName?: string;
  PostCode?: string | number;
  RegionName?: string;
  StreetName?: string;
  // English variants
  CityL2?: string;
  DistrictNameL2?: string;
  RegionNameL2?: string;
  StreetNameL2?: string;
  AddressL2?: string;
}

interface SplResponse {
  Addresses?: SplAddress[];
  totalSearchResults?: number;
}

const json = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('SPL_API_KEY');
    if (!apiKey) {
      return json({
        ok: false,
        code: 'not_configured',
        message_ar: 'خدمة العنوان الوطني غير مُفعّلة بعد. يرجى إضافة مفتاح SPL_API_KEY.',
        message_en: 'National Address service is not configured. Please add the SPL_API_KEY secret.',
      });
    }

    const { shortAddress } = await req.json().catch(() => ({}));
    const code = String(shortAddress ?? '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z]{4}\d{4}$/.test(code)) {
      return json({
        ok: false,
        code: 'invalid_format',
        message_ar: 'العنوان الوطني المختصر يجب أن يكون 4 أحرف ثم 4 أرقام (مثال: RRRD2402).',
        message_en: 'Short address must be 4 letters + 4 digits (e.g. RRRD2402).',
      });
    }

    const params = new URLSearchParams({
      shortaddress: code,
      format: 'json',
      language: 'A',
      encode: 'utf8',
      api_key: apiKey,
    });
    const url = `https://apina.address.gov.sa/NationalAddress/v3.1/Address/address-short-address-api?${params}`;
    const res = await fetch(url, { headers: { 'api_key': apiKey } });
    if (!res.ok) {
      return json({
        ok: false,
        code: 'upstream',
        message_ar: 'تعذّر الاتصال بخدمة العنوان الوطني. حاول لاحقًا.',
        message_en: 'Could not reach the National Address service. Please try again later.',
      });
    }
    const data = (await res.json()) as SplResponse;
    const first = data.Addresses?.[0];
    if (!first) {
      return json({
        ok: false,
        code: 'not_found',
        message_ar: 'لم يتم العثور على العنوان المطابق.',
        message_en: 'No matching address found.',
      });
    }

    return json({
      ok: true,
      address: {
        region_ar: first.RegionName ?? null,
        region_en: first.RegionNameL2 ?? null,
        city_ar: first.City ?? null,
        city_en: first.CityL2 ?? null,
        district_ar: first.DistrictName ?? null,
        district_en: first.DistrictNameL2 ?? null,
        street_ar: first.StreetName ?? null,
        street_en: first.StreetNameL2 ?? null,
        address_ar: first.Address ?? null,
        address_en: first.AddressL2 ?? null,
        building_number: first.BuildingNumber != null ? String(first.BuildingNumber) : null,
        additional_number: first.AdditionalNumber != null ? String(first.AdditionalNumber) : null,
        post_code: first.PostCode != null ? String(first.PostCode) : null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({
      ok: false,
      code: 'exception',
      message_ar: 'حدث خطأ غير متوقع أثناء البحث عن العنوان.',
      message_en: `Unexpected error: ${message}`,
    });
  }
});