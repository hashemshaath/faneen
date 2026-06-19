/**
 * Helpers for the AdminProviderLeads page — completeness scoring,
 * duplicate detection, CSV export, status metadata. Pure functions only,
 * no I/O. Keeps the page file small and testable.
 */
import type { ProviderLeadRow, ProviderLeadStatus } from '@/modules/providers';

/** Status visual + label catalogue. */
export const STATUS_ORDER: ProviderLeadStatus[] = [
  'new',
  'under_review',
  'needs_info',
  'approved',
  'rejected',
  'converted_to_business',
];

export const STATUS_TONE: Record<ProviderLeadStatus, string> = {
  new: 'bg-primary/10 text-primary border-primary/30',
  under_review: 'bg-warning/10 text-warning border-warning/30',
  needs_info: 'bg-info/10 text-info border-info/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  converted_to_business: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

export const STATUS_LABEL: Record<ProviderLeadStatus, { ar: string; en: string }> = {
  new: { ar: 'جديد', en: 'New' },
  under_review: { ar: 'قيد المراجعة', en: 'Under review' },
  needs_info: { ar: 'يحتاج معلومات', en: 'Needs info' },
  approved: { ar: 'مقبول', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  converted_to_business: { ar: 'تم التحويل', en: 'Converted' },
};

/** Fields scored for completeness — leads are prospects, so partial is OK. */
const SCORED_FIELDS: Array<keyof ProviderLeadRow> = [
  'name_ar',
  'name_en',
  'contact_name',
  'email',
  'phone',
  'city',
  'main_activity',
  'cr_number',
  'unified_number',
  'vat_number',
  'website',
  'brief',
  'map_link',
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isRealEmail(v: string | null | undefined): boolean {
  if (!v) return false;
  if (!EMAIL_RE.test(v)) return false;
  // Placeholder synthesised by the bulk intake when the operator left the
  // email blank. These rows still count as leads but the email is fake.
  return !/@leads\.qitaat\.local$/i.test(v);
}

function isRealPhone(v: string | null | undefined): boolean {
  if (!v) return false;
  const digits = v.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return false;
  return !/^0+$/.test(digits);
}

export interface CompletenessResult {
  pct: number;            // 0..100
  filled: number;
  total: number;
  missing: string[];      // field keys missing
}

export function computeCompleteness(r: ProviderLeadRow): CompletenessResult {
  const missing: string[] = [];
  let filled = 0;
  for (const k of SCORED_FIELDS) {
    const v = r[k];
    let ok = false;
    if (k === 'email') ok = isRealEmail(v as string | null);
    else if (k === 'phone') ok = isRealPhone(v as string | null);
    else ok = typeof v === 'string' && v.trim().length > 0;
    if (ok) filled += 1;
    else missing.push(String(k));
  }
  const total = SCORED_FIELDS.length;
  return { pct: Math.round((filled / total) * 100), filled, total, missing };
}

/** Tailwind tone classes for the completeness bar/chip. */
export function completenessTone(pct: number): { bar: string; chip: string } {
  if (pct >= 80) return { bar: 'bg-success', chip: 'bg-success/10 text-success border-success/30' };
  if (pct >= 50) return { bar: 'bg-warning', chip: 'bg-warning/10 text-warning border-warning/30' };
  return { bar: 'bg-destructive', chip: 'bg-destructive/10 text-destructive border-destructive/30' };
}

/** Normalise a value for duplicate hashing. */
function normKey(v: string | null | undefined): string {
  return (v ?? '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9@.+]/g, '');
}

function normPhone(v: string | null | undefined): string {
  const d = (v ?? '').replace(/\D/g, '');
  if (!d || /^0+$/.test(d)) return '';
  // Take last 9 digits to absorb country-code variations.
  return d.slice(-9);
}

/** Returns a map of leadId -> array of other lead ids that look like duplicates. */
export function findDuplicateGroups(rows: ProviderLeadRow[]): Map<string, string[]> {
  const buckets = new Map<string, Set<string>>();
  const push = (key: string, id: string) => {
    if (!key) return;
    let s = buckets.get(key);
    if (!s) {
      s = new Set();
      buckets.set(key, s);
    }
    s.add(id);
  };
  for (const r of rows) {
    if (isRealEmail(r.email)) push(`e:${normKey(r.email)}`, r.id);
    const p = normPhone(r.phone);
    if (p) push(`p:${p}`, r.id);
    if (r.cr_number) push(`c:${normKey(r.cr_number)}`, r.id);
    if (r.unified_number) push(`u:${normKey(r.unified_number)}`, r.id);
  }
  const out = new Map<string, string[]>();
  for (const set of buckets.values()) {
    if (set.size < 2) continue;
    const ids = Array.from(set);
    for (const id of ids) {
      const others = ids.filter((x) => x !== id);
      const existing = out.get(id) ?? [];
      out.set(id, Array.from(new Set([...existing, ...others])));
    }
  }
  return out;
}

/** Build a CSV string from rows. UTF-8 BOM friendly. */
export function leadsToCsv(rows: ProviderLeadRow[]): string {
  const cols: Array<{ key: keyof ProviderLeadRow | 'completeness'; label: string }> = [
    { key: 'reference_code', label: 'reference' },
    { key: 'name_ar', label: 'name_ar' },
    { key: 'name_en', label: 'name_en' },
    { key: 'status', label: 'status' },
    { key: 'completeness', label: 'completeness_pct' },
    { key: 'contact_name', label: 'contact' },
    { key: 'email', label: 'email' },
    { key: 'phone', label: 'phone' },
    { key: 'city', label: 'city' },
    { key: 'main_activity', label: 'activity' },
    { key: 'cr_number', label: 'cr' },
    { key: 'unified_number', label: 'unified' },
    { key: 'vat_number', label: 'vat' },
    { key: 'website', label: 'website' },
    { key: 'branches_count', label: 'branches' },
    { key: 'created_at', label: 'created_at' },
  ];
  const esc = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = cols.map((c) => c.label).join(',');
  const body = rows
    .map((r) =>
      cols
        .map((c) =>
          c.key === 'completeness'
            ? esc(computeCompleteness(r).pct)
            : esc(r[c.key as keyof ProviderLeadRow] as unknown),
        )
        .join(','),
    )
    .join('\n');
  return `\ufeff${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Distinct cities for the filter dropdown. */
export function distinctCities(rows: ProviderLeadRow[]): string[] {
  const s = new Set<string>();
  for (const r of rows) {
    if (r.city && r.city.trim()) s.add(r.city.trim());
  }
  return Array.from(s).sort();
}