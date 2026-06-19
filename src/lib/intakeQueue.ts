/**
 * Provider-intake review queue — frontend-only progress persistence.
 *
 * Lives in sessionStorage so the operator never loses their place when
 * refreshing `/admin/data-enrichment`. No database, no RLS changes.
 */
export interface IntakeQueueState {
  kind: 'providers' | 'branches' | 'unknown';
  fileName: string;
  rows: Record<string, string>[];
  index: number;
  reviewed: number[];
  updatedAt: string;
}

const KEY = 'qitaat_intake_queue_v1';
const CHANGE_EVENT = 'qitaat:intake:queue-changed';

export function readIntakeQueue(): IntakeQueueState | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IntakeQueueState;
    if (!Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeIntakeQueue(state: IntakeQueueState | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (state === null) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  } catch {
    /* ignore quota errors */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function intakeRowName(row: Record<string, string> | undefined): string {
  if (!row) return '';
  return (
    row.company_name_ar ||
    row.company_name_en ||
    row.branch_name_ar ||
    row.branch_name_en ||
    ''
  ).trim();
}

export const INTAKE_QUEUE_CHANGE_EVENT = CHANGE_EVENT;
export const INTAKE_AUDIT_EVENT = 'qitaat:intake:audit-row';