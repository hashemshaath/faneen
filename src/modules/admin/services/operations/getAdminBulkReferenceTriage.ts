import {
  getAdminReferenceSummary,
  type AdminReferenceInspectorBundle,
} from './getAdminReferenceSummary';
import { listAdminOperationalNotes } from '../notes/listAdminOperationalNotes';
import type { AdminNoteSeverity } from '../notes/sanitizeAdminNote';
import { parseAdminBulkRefs, ADMIN_BULK_REF_MAX } from './parseAdminBulkRefs';

/**
 * BUSINESS-ADMIN-5 — Admin Bulk Reference Triage aggregator.
 *
 * Read-only. Composes existing admin-safe wrappers:
 *   - getAdminReferenceSummary (per ref)
 *   - listAdminOperationalNotes (per ref, open-only count)
 *
 * Never exposes tokens, secrets, provider_intent_id, raw UUIDs as primary
 * display, or synthetic phone emails — the underlying wrappers already
 * sanitize. Caller is responsible for `requireAdmin` (RLS is authoritative).
 */

export type AdminBulkTriageStatus = 'found' | 'not_found' | 'unsupported' | 'error';

export interface AdminBulkTriageRow {
  ref_id: string;
  status: AdminBulkTriageStatus;
  bundle: AdminReferenceInspectorBundle | null;
  openNotes: number;
  criticalNotes: number;
  topSeverity: AdminNoteSeverity | null;
  errorMessage: string | null;
}

export interface AdminBulkTriageResult {
  rows: AdminBulkTriageRow[];
  invalid: string[];
  duplicates: number;
  truncated: number;
}

const CONCURRENCY = 4;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const runners: Promise<void>[] = [];
  const n = Math.max(1, Math.min(limit, items.length || 1));
  for (let i = 0; i < n; i += 1) {
    runners.push((async () => {
      while (cursor < items.length) {
        const idx = cursor;
        cursor += 1;
        out[idx] = await worker(items[idx], idx);
      }
    })());
  }
  await Promise.all(runners);
  return out;
}

function topSeverityOf(severities: AdminNoteSeverity[]): AdminNoteSeverity | null {
  if (severities.includes('critical')) return 'critical';
  if (severities.includes('warning')) return 'warning';
  if (severities.includes('info')) return 'info';
  return null;
}

export async function getAdminBulkReferenceTriage(input: {
  rawInput: string;
  max?: number;
}): Promise<{ data: AdminBulkTriageResult | null; error: unknown }> {
  const parsed = parseAdminBulkRefs(input.rawInput ?? '', {
    max: input.max ?? ADMIN_BULK_REF_MAX,
  });

  const rows = await mapWithConcurrency(parsed.valid, CONCURRENCY, async (refId) => {
    try {
      const [summaryRes, notesRes] = await Promise.all([
        getAdminReferenceSummary({ refId }),
        listAdminOperationalNotes({ refId, status: 'open', limit: 100 }),
      ]);
      const bundle = summaryRes.data;
      const notes = notesRes.data ?? [];
      const severities = notes.map((n) => n.severity);
      const status: AdminBulkTriageStatus = summaryRes.error
        ? 'error'
        : !bundle
          ? 'error'
          : bundle.found
            ? 'found'
            : 'not_found';
      const row: AdminBulkTriageRow = {
        ref_id: refId,
        status,
        bundle,
        openNotes: notes.length,
        criticalNotes: severities.filter((s) => s === 'critical').length,
        topSeverity: topSeverityOf(severities),
        errorMessage: summaryRes.error
          ? (summaryRes.error instanceof Error ? summaryRes.error.message : 'error')
          : null,
      };
      return row;
    } catch (err) {
      const row: AdminBulkTriageRow = {
        ref_id: refId,
        status: 'error',
        bundle: null,
        openNotes: 0,
        criticalNotes: 0,
        topSeverity: null,
        errorMessage: err instanceof Error ? err.message : 'error',
      };
      return row;
    }
  });

  return {
    data: {
      rows,
      invalid: parsed.invalid,
      duplicates: parsed.duplicates,
      truncated: parsed.truncated,
    },
    error: null,
  };
}