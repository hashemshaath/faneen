import type { AddressFields, AddressRow } from '../types';

/**
 * Compose a professional, human-readable detailed address line from the
 * structured fields. Empty parts are skipped; building/additional collapse
 * into one segment when both are present.
 *
 * Locale: 'ar' uses Arabic separators and labels, 'en' uses English.
 */
export function buildAddressLine(
  a: Partial<AddressFields> | AddressRow,
  locale: 'ar' | 'en' = 'ar',
): string {
  const isAr = locale === 'ar';
  const district = isAr ? (a.district ?? '') : (a.district_en ?? a.district ?? '');
  const street   = isAr ? (a.street_name ?? '') : (a.street_name_en ?? a.street_name ?? '');
  const region   = isAr ? (a.region ?? '') : (a.region_en ?? a.region ?? '');
  const b = (a.building_number ?? '').toString().trim();
  const x = (a.additional_number ?? '').toString().trim();
  const post = (a.post_code ?? '').toString().trim();

  const seg: string[] = [];
  if (district && district.trim()) {
    seg.push(isAr ? `حي ${district.trim()}` : `${district.trim()} District`);
  }
  if (street && street.trim()) {
    seg.push(isAr ? `شارع ${street.trim()}` : `${street.trim()} St.`);
  }
  if (b || x) {
    const lbl = isAr ? 'مبنى' : 'Bldg';
    seg.push(b && x ? `${lbl} ${b}/${x}` : `${lbl} ${b || x}`);
  }
  const regionTrim = (region ?? '').trim();
  if (regionTrim && post) seg.push(`${regionTrim} ${post}`);
  else if (regionTrim) seg.push(regionTrim);
  else if (post) seg.push(post);

  return seg.join(isAr ? '، ' : ', ');
}

/** Normalize free-text fields: trim and convert empty strings to null. */
export function normalizeAddressPayload<T extends Record<string, unknown>>(p: T): T {
  const out: Record<string, unknown> = { ...p };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === 'string') {
      const t = v.trim();
      out[k] = t.length === 0 ? null : t;
    }
  }
  return out as T;
}