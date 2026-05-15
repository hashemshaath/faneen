/**
 * Daily aggregation helpers for the Admin Quote Operations dashboard.
 * Pure functions — no customer PII is included in any output.
 */

export interface DailyOpsRow {
  date: string; // YYYY-MM-DD
  quotes_created: number;
  quotes_new: number;
  quotes_under_review: number;
  quotes_matched: number;
  quotes_contacted: number;
  quotes_completed: number;
  quotes_cancelled: number;
  leads_created: number;
  leads_viewed: number;
  leads_interested: number;
  leads_not_interested: number;
  contacts_revealed: number;
  contact_views: number;
  avg_time_to_match_minutes: number | null;
  avg_time_to_first_view_minutes: number | null;
  avg_time_to_first_interest_minutes: number | null;
  avg_time_to_contact_reveal_minutes: number | null;
}

export interface QuoteLite { id: string; status: string; created_at: string; }
export interface LeadLite {
  id: string; quote_request_id: string; status: string;
  viewed_at: string | null; contact_revealed: boolean;
  contact_revealed_at: string | null; contact_view_count: number; created_at: string;
}
export interface QuoteEventLite { quote_request_id: string; event_type: string; created_at: string; }
export interface LeadEventLite { lead_id: string; quote_request_id: string; event_type: string; created_at: string; }

function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function avgMin(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length / 60000);
}

/**
 * Build daily operational series.
 * Decision: time_to_match is bucketed by the day the quote was CREATED
 * (so every quote contributes to a single, stable day). Lead-based metrics
 * are bucketed by the day the lead was created.
 */
export function buildDailyQuoteOperationsSeries(args: {
  quotes: QuoteLite[];
  quoteEvents: QuoteEventLite[];
  leads: LeadLite[];
  leadEvents: LeadEventLite[];
  maxDays?: number;
}): DailyOpsRow[] {
  const { quotes, quoteEvents, leads, leadEvents, maxDays = 60 } = args;

  const map = new Map<string, DailyOpsRow>();
  const ensure = (key: string): DailyOpsRow => {
    let r = map.get(key);
    if (!r) {
      r = {
        date: key,
        quotes_created: 0, quotes_new: 0, quotes_under_review: 0,
        quotes_matched: 0, quotes_contacted: 0, quotes_completed: 0, quotes_cancelled: 0,
        leads_created: 0, leads_viewed: 0, leads_interested: 0, leads_not_interested: 0,
        contacts_revealed: 0, contact_views: 0,
        avg_time_to_match_minutes: null,
        avg_time_to_first_view_minutes: null,
        avg_time_to_first_interest_minutes: null,
        avg_time_to_contact_reveal_minutes: null,
      };
      map.set(key, r);
    }
    return r;
  };

  const quoteCreatedMs = new Map<string, number>();
  quotes.forEach((q) => {
    quoteCreatedMs.set(q.id, new Date(q.created_at).getTime());
    const k = dayKey(q.created_at);
    const r = ensure(k);
    r.quotes_created += 1;
    if (q.status === 'new') r.quotes_new += 1;
    else if (q.status === 'under_review') r.quotes_under_review += 1;
    else if (q.status === 'matched') r.quotes_matched += 1;
    else if (q.status === 'contacted') r.quotes_contacted += 1;
    else if (q.status === 'completed') r.quotes_completed += 1;
    else if (q.status === 'cancelled') r.quotes_cancelled += 1;
  });

  const leadCreatedMs = new Map<string, number>();
  leads.forEach((l) => {
    leadCreatedMs.set(l.id, new Date(l.created_at).getTime());
    const k = dayKey(l.created_at);
    const r = ensure(k);
    r.leads_created += 1;
    if (l.viewed_at) r.leads_viewed += 1;
    if (l.status === 'interested' || l.status === 'contacted') r.leads_interested += 1;
    if (l.status === 'not_interested') r.leads_not_interested += 1;
    if (l.contact_revealed) r.contacts_revealed += 1;
    r.contact_views += l.contact_view_count ?? 0;
  });

  const firstMatched = new Map<string, number>();
  quoteEvents.forEach((e) => {
    if (e.event_type !== 'quote_matched') return;
    const t = new Date(e.created_at).getTime();
    const cur = firstMatched.get(e.quote_request_id);
    if (cur === undefined || t < cur) firstMatched.set(e.quote_request_id, t);
  });

  const firstView = new Map<string, number>();
  const firstInterest = new Map<string, number>();
  const firstReveal = new Map<string, number>();
  leadEvents.forEach((e) => {
    const t = new Date(e.created_at).getTime();
    const setF = (m: Map<string, number>) => {
      const cur = m.get(e.lead_id);
      if (cur === undefined || t < cur) m.set(e.lead_id, t);
    };
    if (e.event_type === 'lead_viewed') setF(firstView);
    else if (e.event_type === 'provider_interested') setF(firstInterest);
    else if (e.event_type === 'contact_revealed') setF(firstReveal);
  });

  const ttMatchByDay = new Map<string, number[]>();
  firstMatched.forEach((t, qId) => {
    const c = quoteCreatedMs.get(qId);
    if (!c) return;
    const k = dayKey(new Date(c).toISOString());
    const arr = ttMatchByDay.get(k) ?? [];
    arr.push(t - c); ttMatchByDay.set(k, arr);
  });
  const ttViewByDay = new Map<string, number[]>();
  firstView.forEach((t, lid) => {
    const c = leadCreatedMs.get(lid); if (!c) return;
    const k = dayKey(new Date(c).toISOString());
    const arr = ttViewByDay.get(k) ?? []; arr.push(t - c); ttViewByDay.set(k, arr);
  });
  const ttInterestByDay = new Map<string, number[]>();
  firstInterest.forEach((t, lid) => {
    const c = leadCreatedMs.get(lid); if (!c) return;
    const k = dayKey(new Date(c).toISOString());
    const arr = ttInterestByDay.get(k) ?? []; arr.push(t - c); ttInterestByDay.set(k, arr);
  });
  const ttRevealByDay = new Map<string, number[]>();
  firstReveal.forEach((t, lid) => {
    const i = firstInterest.get(lid); if (!i || t <= i) return;
    const c = leadCreatedMs.get(lid); if (!c) return;
    const k = dayKey(new Date(c).toISOString());
    const arr = ttRevealByDay.get(k) ?? []; arr.push(t - i); ttRevealByDay.set(k, arr);
  });

  ttMatchByDay.forEach((arr, k) => { ensure(k).avg_time_to_match_minutes = avgMin(arr); });
  ttViewByDay.forEach((arr, k) => { ensure(k).avg_time_to_first_view_minutes = avgMin(arr); });
  ttInterestByDay.forEach((arr, k) => { ensure(k).avg_time_to_first_interest_minutes = avgMin(arr); });
  ttRevealByDay.forEach((arr, k) => { ensure(k).avg_time_to_contact_reveal_minutes = avgMin(arr); });

  const rows = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length > maxDays) return rows.slice(rows.length - maxDays);
  return rows;
}

// ============= CSV helpers =============

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const head = headers.join(',');
  const body = rows.map((r) => headers.map((h) => csvCell(r[h])).join(',')).join('\n');
  return `\uFEFF${head}\n${body}\n`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const DAILY_OPS_CSV_HEADERS: Array<keyof DailyOpsRow> = [
  'date',
  'quotes_created', 'quotes_new', 'quotes_under_review',
  'quotes_matched', 'quotes_contacted', 'quotes_completed', 'quotes_cancelled',
  'leads_created', 'leads_viewed', 'leads_interested', 'leads_not_interested',
  'contacts_revealed', 'contact_views',
  'avg_time_to_match_minutes', 'avg_time_to_first_view_minutes',
  'avg_time_to_first_interest_minutes', 'avg_time_to_contact_reveal_minutes',
];
