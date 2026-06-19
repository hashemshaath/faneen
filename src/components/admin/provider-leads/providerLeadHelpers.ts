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

/* ============================================================
 *  Professional CRM extensions — pure helpers (no I/O)
 * ============================================================ */

/**
 * Lead score 0..100 — weighted blend of completeness, source signals,
 * recency, and verification artifacts. Higher = better candidate.
 */
export function computeLeadScore(r: ProviderLeadRow): number {
  const c = computeCompleteness(r);
  let score = c.pct * 0.55; // completeness is the dominant signal
  if (r.cr_number) score += 8;
  if (r.unified_number) score += 6;
  if (r.vat_number) score += 4;
  if (r.cr_file_path) score += 6;
  if (r.website) score += 4;
  if (r.map_link) score += 3;
  if ((r.branches_count ?? 0) > 1) score += 4;
  if (r.specialties?.length) score += Math.min(4, r.specialties.length);
  if (r.brands?.length) score += Math.min(4, r.brands.length);
  // Recency boost: newer leads slightly preferred when triaging.
  const ageDays = Math.max(0, (Date.now() - new Date(r.created_at).getTime()) / 86400000);
  if (ageDays < 7) score += 2;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function leadScoreTone(score: number): { chip: string; label: { ar: string; en: string } } {
  if (score >= 75) return { chip: 'bg-success/10 text-success border-success/30', label: { ar: 'ممتاز', en: 'Strong' } };
  if (score >= 50) return { chip: 'bg-primary/10 text-primary border-primary/30', label: { ar: 'جيد', en: 'Good' } };
  if (score >= 30) return { chip: 'bg-warning/10 text-warning border-warning/30', label: { ar: 'متوسط', en: 'Fair' } };
  return { chip: 'bg-destructive/10 text-destructive border-destructive/30', label: { ar: 'ضعيف', en: 'Weak' } };
}

/** SLA — days since lead was created and a tone for visual urgency. */
export interface SlaStatus {
  ageDays: number;
  overdue: boolean;
  tone: 'success' | 'warning' | 'destructive' | 'muted';
  label: { ar: string; en: string };
}

export function computeSlaStatus(r: ProviderLeadRow, slaDays = 7): SlaStatus {
  const terminal = r.status === 'approved' || r.status === 'rejected' || r.status === 'converted_to_business';
  const ageDays = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
  if (terminal) {
    return { ageDays, overdue: false, tone: 'muted', label: { ar: `${ageDays} يوم`, en: `${ageDays}d` } };
  }
  if (ageDays >= slaDays) {
    return { ageDays, overdue: true, tone: 'destructive', label: { ar: `متأخر ${ageDays} يوم`, en: `${ageDays}d overdue` } };
  }
  if (ageDays >= Math.ceil(slaDays * 0.6)) {
    return { ageDays, overdue: false, tone: 'warning', label: { ar: `${ageDays} يوم`, en: `${ageDays}d` } };
  }
  return { ageDays, overdue: false, tone: 'success', label: { ar: `${ageDays} يوم`, en: `${ageDays}d` } };
}

/** Rule-based AI-style suggestions for next best action on a lead. */
export interface LeadSuggestion {
  id: string;
  ar: string;
  en: string;
  tone: 'info' | 'warning' | 'success' | 'destructive';
}

export function getAiSuggestions(r: ProviderLeadRow, dupCount = 0): LeadSuggestion[] {
  const out: LeadSuggestion[] = [];
  const c = computeCompleteness(r);
  if (dupCount > 0) {
    out.push({ id: 'dup', ar: `كشف ${dupCount} نسخة محتملة — يُنصح بالمراجعة والدمج قبل الاعتماد.`, en: `${dupCount} possible duplicate(s) — review and merge before approval.`, tone: 'warning' });
  }
  if (!r.cr_number && !r.unified_number) {
    out.push({ id: 'cr', ar: 'لا يوجد رقم سجل تجاري ولا رقم موحّد — اطلب التوثيق قبل الاعتماد.', en: 'Missing CR and unified number — request verification before approval.', tone: 'destructive' });
  } else if (!r.cr_file_path) {
    out.push({ id: 'crf', ar: 'لم يُرفق ملف السجل التجاري — أرسل طلب رفع.', en: 'CR file not attached — request upload.', tone: 'info' });
  }
  if (c.pct < 50) {
    out.push({ id: 'low', ar: 'اكتمال البيانات منخفض — استخدم إثراء Google لرفع الجودة قبل الاعتماد.', en: 'Low completeness — run Google enrichment before approval.', tone: 'info' });
  } else if (c.pct >= 80 && r.status === 'new') {
    out.push({ id: 'fast', ar: 'بيانات شبه مكتملة — مرشح قوي للاعتماد المباشر.', en: 'Almost complete — strong candidate for fast-track approval.', tone: 'success' });
  }
  const sla = computeSlaStatus(r);
  if (sla.overdue) {
    out.push({ id: 'sla', ar: `تجاوز SLA منذ ${sla.ageDays} يوم — أعطه أولوية اليوم.`, en: `SLA breached ${sla.ageDays}d — prioritise today.`, tone: 'destructive' });
  }
  return out;
}

/* ---------- Sidecar metadata stored inside admin_notes ----------
 * We avoid migrations by embedding a small JSON sidecar on the first
 * line of admin_notes prefixed with `<<META>>` so the field stays
 * readable. Free-form notes follow after a blank line.
 */
const META_PREFIX = '<<META>>';

export interface LeadMeta {
  ownerId?: string;
  ownerName?: string;
  slaDays?: number;
  pinned?: boolean;
  internalNotes?: Array<{ at: string; by?: string; text: string }>;
}

export function parseLeadMeta(adminNotes: string | null | undefined): {
  meta: LeadMeta;
  body: string;
} {
  const raw = adminNotes ?? '';
  if (!raw.startsWith(META_PREFIX)) return { meta: {}, body: raw };
  const nl = raw.indexOf('\n');
  const headerLine = nl === -1 ? raw : raw.slice(0, nl);
  const body = nl === -1 ? '' : raw.slice(nl + 1).replace(/^\s*\n/, '');
  try {
    const json = headerLine.slice(META_PREFIX.length);
    const parsed = JSON.parse(json) as LeadMeta;
    return { meta: parsed ?? {}, body };
  } catch {
    return { meta: {}, body: raw };
  }
}

export function serializeLeadMeta(meta: LeadMeta, body: string): string {
  const hasMeta = Object.keys(meta).some((k) => {
    const v = (meta as Record<string, unknown>)[k];
    return v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0);
  });
  if (!hasMeta) return body;
  return `${META_PREFIX}${JSON.stringify(meta)}\n${body ?? ''}`;
}

export function appendInternalNote(adminNotes: string | null | undefined, text: string, by?: string): string {
  const { meta, body } = parseLeadMeta(adminNotes);
  const notes = meta.internalNotes ?? [];
  notes.push({ at: new Date().toISOString(), by, text });
  return serializeLeadMeta({ ...meta, internalNotes: notes }, body);
}

export function setLeadOwner(adminNotes: string | null | undefined, ownerId?: string, ownerName?: string): string {
  const { meta, body } = parseLeadMeta(adminNotes);
  return serializeLeadMeta({ ...meta, ownerId, ownerName }, body);
}

/** Activity timeline derived from row data + internal notes. */
export interface TimelineEvent {
  at: string;
  kind: 'created' | 'status' | 'note' | 'enriched';
  ar: string;
  en: string;
  by?: string;
}

export function buildActivityTimeline(r: ProviderLeadRow): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  events.push({ at: r.created_at, kind: 'created', ar: 'تم استلام الطلب', en: 'Lead received' });
  const { meta } = parseLeadMeta(r.admin_notes);
  for (const n of meta.internalNotes ?? []) {
    events.push({ at: n.at, kind: 'note', ar: n.text, en: n.text, by: n.by });
  }
  if (r.status !== 'new') {
    events.push({ at: r.updated_at ?? r.created_at, kind: 'status', ar: `تحديث الحالة إلى ${STATUS_LABEL[r.status].ar}`, en: `Status → ${STATUS_LABEL[r.status].en}` });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

/** Mini time-series for KPI sparklines — counts of leads created per day, last N days. */
export function lastNDaysSeries(rows: ProviderLeadRow[], days = 14, predicate?: (r: ProviderLeadRow) => boolean): number[] {
  const out = new Array(days).fill(0);
  const now = Date.now();
  const dayMs = 86400000;
  const startKey = Math.floor((now - (days - 1) * dayMs) / dayMs);
  for (const r of rows) {
    if (predicate && !predicate(r)) continue;
    const k = Math.floor(new Date(r.created_at).getTime() / dayMs);
    const idx = k - startKey;
    if (idx >= 0 && idx < days) out[idx] += 1;
  }
  return out;
}