// DATA-ENRICHMENT-GOVERNANCE-1 — pure normalization helpers.
// Reuses the existing city normalizer + digit normalizer where possible.
import { normalizeCityName } from "@/lib/cityNormalize";
import { normalizeDigits } from "@/lib/normalize-digits";
import type { EnrichmentField } from "../types";

const TRACKING_PARAMS = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid"];

export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = normalizeDigits(String(input)).replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+966")) return digits;
  if (digits.startsWith("00966")) return "+" + digits.slice(2);
  if (digits.startsWith("966")) return "+" + digits;
  if (digits.startsWith("05") && digits.length === 10) return "+966" + digits.slice(1);
  if (digits.startsWith("5") && digits.length === 9) return "+966" + digits;
  return digits;
}

export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  return String(input).trim().toLowerCase() || null;
}

export function normalizeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const raw = String(input).trim();
    if (!raw) return null;
    const withProto = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
    const u = new URL(withProto);
    TRACKING_PARAMS.forEach((p) => u.searchParams.delete(p));
    u.hash = "";
    let s = u.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s.toLowerCase();
  } catch {
    return String(input).trim() || null;
  }
}

export function normalizeCity(input: string | null | undefined): string | null {
  if (!input) return null;
  return normalizeCityName(String(input)) || null;
}

export function normalizeCrNumber(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = normalizeDigits(String(input)).replace(/\D/g, "");
  return d || null;
}

export function normalizeVatNumber(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = normalizeDigits(String(input)).replace(/\D/g, "");
  return d || null;
}

export function normalizeNationalAddress(input: string | null | undefined): string | null {
  if (!input) return null;
  return String(input).toUpperCase().replace(/\s+/g, "").slice(0, 12) || null;
}

export function normalizeText(input: string | null | undefined): string | null {
  if (!input) return null;
  return String(input).trim().replace(/\s+/g, " ") || null;
}

export function normalizeField(
  field: EnrichmentField,
  value: string | null | undefined,
): string | null {
  switch (field) {
    case "phone":
    case "whatsapp": return normalizePhone(value);
    case "email": return normalizeEmail(value);
    case "website":
    case "social_facebook":
    case "social_instagram":
    case "social_twitter":
    case "social_linkedin":
    case "social_youtube":
    case "social_tiktok": return normalizeUrl(value);
    case "city": return normalizeCity(value);
    case "cr_number": return normalizeCrNumber(value);
    case "vat_number": return normalizeVatNumber(value);
    case "national_address": return normalizeNationalAddress(value);
    default: return normalizeText(value);
  }
}

export function normalizeRecord(
  input: Partial<Record<EnrichmentField, string | null>>,
): Partial<Record<EnrichmentField, string | null>> {
  const out: Partial<Record<EnrichmentField, string | null>> = {};
  (Object.keys(input) as EnrichmentField[]).forEach((k) => {
    out[k] = normalizeField(k, input[k]);
  });
  return out;
}