// Barcode URL helpers (UI-only, no token logic).
// Mirrors the DB normalize_barcode_code() shape: PREFIX-YYYY-NNNNNN
// Safe for both browser and tests — no Supabase imports.

export function normalizeBarcodeCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

const BARCODE_RE = /^[A-Z]{2,4}-\d{4}-\d{4,8}$/;

export function isBarcodeCode(code: string): boolean {
  return BARCODE_RE.test(normalizeBarcodeCode(code));
}

export function buildBarcodeUrl(barcodeCode: string, origin?: string): string {
  const code = normalizeBarcodeCode(barcodeCode);
  const base =
    origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://qitaat.com');
  return `${base.replace(/\/$/, '')}/q/${encodeURIComponent(code)}`;
}

/** Localized human label for an entity type (no PII, no IDs). */
export function getBarcodeEntityLabel(entityType: string | null | undefined, isRTL: boolean): string {
  const t = (entityType || '').toLowerCase();
  const map: Record<string, [string, string]> = {
    client_site: ['موقع العميل', 'Client Site'],
    contract: ['عقد', 'Contract'],
    business: ['منشأة', 'Business'],
    customer: ['عميل', 'Customer'],
    lead: ['طلب عميل', 'Lead'],
    maintenance: ['طلب صيانة', 'Maintenance'],
    work_order: ['أمر عمل', 'Work Order'],
    asset: ['أصل', 'Asset'],
    unknown: ['غير محدد', 'Unknown'],
  };
  const pair = map[t] || map.unknown;
  return isRTL ? pair[0] : pair[1];
}