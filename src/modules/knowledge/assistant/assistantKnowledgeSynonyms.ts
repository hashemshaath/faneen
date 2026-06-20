/**
 * Phase-4 — lightweight Arabic/English synonym expansion for the assistant.
 * No AI, no embeddings — a small curated dictionary of equivalent terms so
 * a user's natural wording still hits the registry's canonical keywords.
 */

export const KNOWLEDGE_SYNONYMS: Record<string, string[]> = {
  // Quote / RFQ
  'تسعيرة': ['عرض', 'سعر', 'rfq', 'quote'],
  'عرض سعر': ['تسعيرة', 'rfq', 'quote'],
  'عرض السعر': ['تسعيرة', 'rfq', 'quote'],
  'طلب عرض': ['rfq', 'quote', 'تسعيرة'],
  'rfq': ['عرض', 'سعر', 'تسعيرة', 'quote'],
  'quote': ['عرض', 'سعر', 'تسعيرة', 'rfq'],

  // Provider
  'مزود': ['مقدم', 'provider'],
  'مقدم خدمة': ['مزود', 'provider'],
  'provider': ['مزود', 'مقدم'],

  // Business
  'منشأة': ['شركة', 'عمل', 'business'],
  'شركة': ['منشأة', 'عمل', 'business'],
  'عمل تجاري': ['منشأة', 'شركة', 'business'],
  'business': ['منشأة', 'شركة', 'عمل'],

  // Payments / invoices
  'فاتورة': ['فواتير', 'دفع', 'payment', 'invoice', 'billing'],
  'فواتير': ['فاتورة', 'دفع', 'payment', 'billing'],
  'دفع': ['فاتورة', 'فواتير', 'payment'],
  'الفوترة': ['فاتورة', 'فواتير', 'billing', 'payment'],
  'payment': ['فاتورة', 'دفع', 'فواتير'],

  // Account / login
  'تسجيل الدخول': ['الحساب', 'login', 'password', 'كلمة المرور', 'account'],
  'الحساب': ['تسجيل', 'login', 'account'],
  'كلمة المرور': ['password', 'reset', 'استرجاع', 'الحساب'],
  'login': ['تسجيل', 'الحساب', 'account'],

  // Visibility / publishing
  'ظهور': ['نشر', 'رابط', 'visibility', 'visible', 'public'],
  'نشر': ['ظهور', 'publish', 'visibility'],
  'رابط عام': ['ظهور', 'نشر', 'visibility', 'public'],
  'visibility': ['ظهور', 'نشر'],
};

function normalize(input: string): string {
  return (input ?? '').toLowerCase().trim();
}

/**
 * Returns a new query string with additional canonical tokens appended for
 * any matched synonym keys. Original query is preserved as-is at the start.
 */
export function expandQueryWithSynonyms(query: string): string {
  const q = normalize(query);
  if (!q) return query ?? '';
  const additions = new Set<string>();
  for (const key of Object.keys(KNOWLEDGE_SYNONYMS)) {
    if (q.includes(key.toLowerCase())) {
      for (const v of KNOWLEDGE_SYNONYMS[key]) additions.add(v);
    }
  }
  return additions.size === 0 ? query : `${query} ${Array.from(additions).join(' ')}`;
}