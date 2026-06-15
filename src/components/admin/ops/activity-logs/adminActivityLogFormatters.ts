import { format, isToday, isYesterday } from 'date-fns';
import {
  asDetailsRecord,
  isChangePair,
  type AdminActivityLogRow,
} from '@/pages/admin/adminActivityLog.types';
import { actionConfig, entityLabels, pick, tx } from './adminActivityLogDict';

export function getDateGroup(iso: string, isRTL: boolean): string {
  const d = new Date(iso);
  if (isToday(d)) return isRTL ? 'اليوم' : 'Today';
  if (isYesterday(d)) return isRTL ? 'أمس' : 'Yesterday';
  return format(d, 'yyyy-MM-dd');
}

export function buildSummary(
  log: AdminActivityLogRow,
  getProfileName: (userId: string) => string,
  isRTL: boolean,
): string {
  const who = getProfileName(log.user_id);
  const action = pick(actionConfig[log.action], isRTL, log.action);
  const entity = log.entity_type ? pick(entityLabels[log.entity_type], isRTL, log.entity_type) : '';
  return entity ? `${who} • ${action} • ${entity}` : `${who} • ${action}`;
}

export interface DetailItem {
  label: string;
  value?: string;
  oldVal?: string;
  newVal?: string;
}

export function buildDetailItems(
  details: unknown,
  _action: string,
  isRTL: boolean,
): DetailItem[] {
  void _action;
  void isRTL;
  const rec = asDetailsRecord(details);
  if (!rec) return [];
  const out: DetailItem[] = [];
  const changes = asDetailsRecord(rec.changes);
  if (changes) {
    for (const [k, v] of Object.entries(changes)) {
      if (isChangePair(v)) {
        out.push({ label: k, oldVal: String(v.old ?? ''), newVal: String(v.new ?? '') });
      }
    }
  }
  for (const [k, v] of Object.entries(rec)) {
    if (k === 'changes') continue;
    if (v == null) continue;
    if (typeof v === 'object') continue;
    out.push({ label: k, value: String(v) });
  }
  return out;
}

export { tx };