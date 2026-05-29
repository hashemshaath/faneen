/**
 * APP-SHELL-REARCHITECTURE-1 — Reference prefix → route resolver.
 *
 * Pure mapping. No DB calls. Used by the workspace search launcher and
 * command palette so a typed ref like `WO-1000042` opens the right page.
 */

export const REF_PREFIXES = [
  'WO',
  'TASK',
  'CNT',
  'QTE',
  'LED',
  'BKG',
  'TEAM',
  'STF',
  // BUSINESS-FINISHING-1 Phase A — workflow object prefixes.
  'BOQ',
  'BOQI',
  'RFQ',
  'PO',
  'WOQ',
  'CONTRACT',
  'QUOTE',
  'NOTE',
  // CUSTOMER-EXPERIENCE-2 / 3 — customer lifecycle prefixes.
  'APT',
  'CLS',
  'WAR',
  'FDB',
  'CPN',
  'CTL',
  'PDE',
] as const;

export type RefPrefix = typeof REF_PREFIXES[number];

const PREFIX_TO_ROUTE: Record<RefPrefix, (ref: string) => string> = {
  WO:   (ref) => `/dashboard/work-orders?ref=${encodeURIComponent(ref)}`,
  TASK: (ref) => `/dashboard/operations/feed?ref=${encodeURIComponent(ref)}`,
  CNT:  (ref) => `/dashboard/contracts?ref=${encodeURIComponent(ref)}`,
  QTE:  (ref) => `/dashboard/provider/leads?ref=${encodeURIComponent(ref)}`,
  LED:  (ref) => `/dashboard/leads?ref=${encodeURIComponent(ref)}`,
  BKG:  (ref) => `/dashboard/bookings?ref=${encodeURIComponent(ref)}`,
  TEAM: (ref) => `/dashboard/settings/staff?ref=${encodeURIComponent(ref)}`,
  STF:  (ref) => `/dashboard/settings/staff?ref=${encodeURIComponent(ref)}`,
  // Workflow refs route to their owning surface; the page reads `?ref=…`.
  BOQ:      (ref) => `/dashboard/work-orders?ref=${encodeURIComponent(ref)}`,
  BOQI:     (ref) => `/dashboard/work-orders?ref=${encodeURIComponent(ref)}`,
  RFQ:      (ref) => `/dashboard/procurement?ref=${encodeURIComponent(ref)}`,
  PO:       (ref) => `/dashboard/procurement?ref=${encodeURIComponent(ref)}`,
  WOQ:      (ref) => `/dashboard/work-orders?ref=${encodeURIComponent(ref)}`,
  CONTRACT: (ref) => `/dashboard/contracts?ref=${encodeURIComponent(ref)}`,
  QUOTE:    (ref) => `/dashboard/provider/leads?ref=${encodeURIComponent(ref)}`,
  NOTE:     (ref) => `/dashboard/operations/feed?ref=${encodeURIComponent(ref)}`,
  // Customer lifecycle: appointments, closures, warranties, feedback,
  // customer portal links (CPN), and customer tracking links (CTL) all
  // surface on the Work Order detail (Operations Center side panel).
  APT:  (ref) => `/dashboard/work-orders?ref=${encodeURIComponent(ref)}`,
  CLS:  (ref) => `/dashboard/work-orders?ref=${encodeURIComponent(ref)}`,
  WAR:  (ref) => `/dashboard/work-orders?ref=${encodeURIComponent(ref)}`,
  FDB:  (ref) => `/dashboard/operations/feed?ref=${encodeURIComponent(ref)}`,
  CPN:  (ref) => `/dashboard/operations/feed?ref=${encodeURIComponent(ref)}`,
  CTL:  (ref) => `/dashboard/work-orders?ref=${encodeURIComponent(ref)}`,
  PDE:  (ref) => `/dashboard/work-orders?ref=${encodeURIComponent(ref)}`,
};

const REF_PATTERN = /^([A-Z]{2,8})-([0-9A-Z]{3,16})$/i;

export interface ParsedRef {
  prefix: RefPrefix;
  id: string;
  normalized: string;
}

export function parseRef(input: string): ParsedRef | null {
  if (!input) return null;
  const trimmed = input.trim().toUpperCase();
  const m = REF_PATTERN.exec(trimmed);
  if (!m) return null;
  const prefix = m[1] as RefPrefix;
  if (!REF_PREFIXES.includes(prefix)) return null;
  return { prefix, id: m[2], normalized: `${prefix}-${m[2]}` };
}

export function resolveRefRoute(input: string): string | null {
  const parsed = parseRef(input);
  if (!parsed) return null;
  const builder = PREFIX_TO_ROUTE[parsed.prefix];
  return builder ? builder(parsed.normalized) : null;
}

export function listRefPrefixes(): readonly RefPrefix[] {
  return REF_PREFIXES;
}