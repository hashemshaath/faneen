import { supabase } from '@/integrations/supabase/client';
import type { AddressFields } from '../types';

/**
 * Single chokepoint for the Saudi National Address (SPL) edge function.
 * Every page that needs to resolve a short national address (e.g. `RRRD2402`)
 * MUST go through this helper — enforced by `addressesIsolationAudit.test.ts`.
 *
 * Returns either a usable `AddressFields` payload (compatible with
 * `upsertAddress({ fields })`), or a localized error message.
 */
export interface SplLookupResult {
  ok: boolean;
  fields?: AddressFields;
  message_ar?: string;
  message_en?: string;
  raw?: {
    city_ar: string | null;
    city_en: string | null;
  };
}

interface SplResponse {
  ok: boolean;
  message_ar?: string;
  message_en?: string;
  address?: {
    region_ar: string | null; region_en: string | null;
    city_ar: string | null;   city_en: string | null;
    district_ar: string | null; district_en: string | null;
    street_ar: string | null;   street_en: string | null;
    address_ar: string | null;  address_en: string | null;
    building_number: string | null; additional_number: string | null;
    post_code: string | null;
  };
}

export async function resolveFromSpl(shortAddress: string): Promise<SplLookupResult> {
  const code = shortAddress.trim().toUpperCase();
  if (!code) {
    return {
      ok: false,
      message_ar: 'الرجاء إدخال رمز العنوان الوطني.',
      message_en: 'Please enter the short national address.',
    };
  }
  try {
    const { data, error } = await supabase.functions.invoke('national-address-lookup', {
      body: { shortAddress: code },
    });
    if (error) throw error;
    const res = data as SplResponse;
    if (!res?.ok || !res.address) {
      return {
        ok: false,
        message_ar: res?.message_ar ?? 'تعذّر جلب العنوان.',
        message_en: res?.message_en ?? 'Lookup failed.',
      };
    }
    const a = res.address;
    return {
      ok: true,
      raw: { city_ar: a.city_ar, city_en: a.city_en },
      fields: {
        short_address: code,
        region: a.region_ar,
        region_en: a.region_en,
        district: a.district_ar,
        district_en: a.district_en,
        street_name: a.street_ar,
        street_name_en: a.street_en,
        address: a.address_ar,
        address_en: a.address_en,
        building_number: a.building_number,
        additional_number: a.additional_number,
        post_code: a.post_code,
        source: 'spl',
        verified_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message_ar: 'تعذّر الاتصال بخدمة العنوان الوطني.',
      message_en: `National Address service unavailable: ${message}`,
    };
  }
}

/** Status probe used by the AdminApiSettings test button. */
export async function pingSpl(testCode = 'RRRD2402'): Promise<SplLookupResult> {
  return resolveFromSpl(testCode);
}