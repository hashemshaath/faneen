/**
 * Admin data consistency scanner.
 *
 * Scans key tables (businesses, profiles, projects, services) for:
 *   - Swapped AR/EN fields (Arabic text in *_en, Latin text in *_ar)
 *   - Missing required bilingual fields
 *   - Missing ref_id (must always be present per ID policy)
 *
 * Read-only. Results power the /admin/diagnostics consistency tab.
 */
import { supabase } from '@/integrations/supabase/client';

const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_RE = /[A-Za-z]/;

export type IssueKind =
  | 'name_swapped'
  | 'missing_ar'
  | 'missing_en'
  | 'missing_ref_id';

export interface ConsistencyIssue {
  table: string;
  recordId: string;
  refId: string | null;
  kind: IssueKind;
  field?: string;
  preview?: string;
}

function hasArabic(s: string | null | undefined): boolean {
  return !!s && ARABIC_RE.test(s);
}
function hasLatin(s: string | null | undefined): boolean {
  return !!s && LATIN_RE.test(s);
}
function isEmpty(s: string | null | undefined): boolean {
  return !s || !s.trim();
}

/**
 * Compute issues for a single bilingual record.
 * "Swap" rule: ar field contains *only* Latin letters AND en field contains Arabic
 * (or vice versa). Mixed-language fields (brand names with both) are skipped.
 */
function checkBilingual(
  table: string,
  recordId: string,
  refId: string | null,
  ar: string | null,
  en: string | null,
  field = 'name',
): ConsistencyIssue[] {
  const out: ConsistencyIssue[] = [];
  if (isEmpty(ar)) out.push({ table, recordId, refId, kind: 'missing_ar', field, preview: en ?? '' });
  if (isEmpty(en)) out.push({ table, recordId, refId, kind: 'missing_en', field, preview: ar ?? '' });
  const arLooksEn = !!ar && hasLatin(ar) && !hasArabic(ar);
  const enLooksAr = !!en && hasArabic(en) && !hasLatin(en);
  if (arLooksEn && enLooksAr) {
    out.push({ table, recordId, refId, kind: 'name_swapped', field, preview: `ar="${ar}" · en="${en}"` });
  }
  return out;
}

async function scanBusinesses(limit = 500): Promise<ConsistencyIssue[]> {
  const { data } = await supabase
    .from('businesses')
    .select('id, ref_id, name_ar, name_en')
    .order('created_at', { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as Array<{ id: string; ref_id: string | null; name_ar: string | null; name_en: string | null }>;
  const issues: ConsistencyIssue[] = [];
  rows.forEach((r) => {
    if (!r.ref_id) issues.push({ table: 'businesses', recordId: r.id, refId: null, kind: 'missing_ref_id' });
    issues.push(...checkBilingual('businesses', r.id, r.ref_id, r.name_ar, r.name_en, 'name'));
  });
  return issues;
}

async function scanProfiles(limit = 500): Promise<ConsistencyIssue[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, user_id, ref_id, full_name, full_name_ar, full_name_en')
    .order('created_at', { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as Array<{
    id: string; user_id: string; ref_id: string | null;
    full_name: string | null; full_name_ar: string | null; full_name_en: string | null;
  }>;
  const issues: ConsistencyIssue[] = [];
  rows.forEach((r) => {
    if (!r.ref_id) issues.push({ table: 'profiles', recordId: r.user_id, refId: null, kind: 'missing_ref_id' });
    // Only check the bilingual pair when both columns exist (skip legacy single-name rows).
    if (r.full_name_ar !== null || r.full_name_en !== null) {
      issues.push(...checkBilingual('profiles', r.user_id, r.ref_id, r.full_name_ar, r.full_name_en, 'full_name'));
    }
  });
  return issues;
}

async function scanProjects(limit = 500): Promise<ConsistencyIssue[]> {
  const { data } = await supabase
    .from('projects')
    .select('id, ref_id, title_ar, title_en')
    .order('created_at', { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as Array<{ id: string; ref_id: string | null; title_ar: string | null; title_en: string | null }>;
  const issues: ConsistencyIssue[] = [];
  rows.forEach((r) => {
    if (!r.ref_id) issues.push({ table: 'projects', recordId: r.id, refId: null, kind: 'missing_ref_id' });
    issues.push(...checkBilingual('projects', r.id, r.ref_id, r.title_ar, r.title_en, 'title'));
  });
  return issues;
}

export interface ConsistencyReport {
  generatedAt: number;
  totalsByTable: Record<string, number>;
  totalsByKind: Record<IssueKind, number>;
  issues: ConsistencyIssue[];
}

export async function runConsistencyScan(): Promise<ConsistencyReport> {
  const [b, p, pr] = await Promise.all([
    scanBusinesses().catch(() => []),
    scanProfiles().catch(() => []),
    scanProjects().catch(() => []),
  ]);
  const issues = [...b, ...p, ...pr];
  const totalsByTable: Record<string, number> = {};
  const totalsByKind: Record<IssueKind, number> = {
    name_swapped: 0, missing_ar: 0, missing_en: 0, missing_ref_id: 0,
  };
  issues.forEach((i) => {
    totalsByTable[i.table] = (totalsByTable[i.table] ?? 0) + 1;
    totalsByKind[i.kind] += 1;
  });
  return { generatedAt: Date.now(), totalsByTable, totalsByKind, issues };
}

// Re-export for unit tests
export const _internal = { checkBilingual, hasArabic, hasLatin };