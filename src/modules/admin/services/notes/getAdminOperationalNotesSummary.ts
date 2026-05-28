import { listAdminOperationalNotes } from './listAdminOperationalNotes';

export interface AdminOperationalNotesSummary {
  open: number;
  critical: number;
  staleOpen: number; // open AND older than 7 days
}

/**
 * BUSINESS-ADMIN-2 — Lightweight escalation summary derived from the
 * notes wrapper. No direct table access.
 */
export async function getAdminOperationalNotesSummary(): Promise<{
  data: AdminOperationalNotesSummary | null;
  error: unknown;
}> {
  const res = await listAdminOperationalNotes({ status: 'open', limit: 500 });
  if (res.error) return { data: null, error: res.error };
  const rows = res.data ?? [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const open = rows.length;
  const critical = rows.filter((r) => r.severity === 'critical').length;
  const staleOpen = rows.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return Number.isFinite(t) && t < sevenDaysAgo;
  }).length;
  return { data: { open, critical, staleOpen }, error: null };
}