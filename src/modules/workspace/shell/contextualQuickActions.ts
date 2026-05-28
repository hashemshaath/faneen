/**
 * APP-SHELL-REARCHITECTURE-2 — Contextual quick-action generator.
 *
 * Pure derivation. Given the current workspace context (module + ref),
 * returns an ordered list of grouped operational actions. No DB, no fetch,
 * no auth checks here — caller filters by permission/audience.
 */
import type { WorkspaceModule } from '@/hooks/useWorkspaceContext';
import type { QuickActionAudience } from './quickActions';

export interface ContextualAction {
  id: string;
  label: { ar: string; en: string };
  to: string;
  icon: string;
  group: 'primary' | 'related' | 'tools';
  audiences?: QuickActionAudience[];
  requiresPermission?: string;
}

export interface ContextualActionInput {
  module: WorkspaceModule;
  ref: string | null;
}

export function buildContextualActions(input: ContextualActionInput): ContextualAction[] {
  const { module, ref } = input;
  const refQs = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const out: ContextualAction[] = [];

  switch (module) {
    case 'work-orders': {
      out.push(
        { id: 'wo-open-feed', label: { ar: 'فتح التدفق', en: 'Open Feed' }, to: `/dashboard/operations/feed${refQs}`, icon: 'Activity', group: 'primary' },
        { id: 'wo-add-note',  label: { ar: 'إضافة ملاحظة', en: 'Add Note' }, to: `/dashboard/work-orders${refQs}`, icon: 'StickyNote', group: 'tools' },
        { id: 'wo-assign-staff', label: { ar: 'تعيين موظف', en: 'Assign Staff' }, to: `/dashboard/settings/staff${refQs}`, icon: 'UserPlus', group: 'tools', requiresPermission: 'staff.view' },
        { id: 'wo-contracts', label: { ar: 'العقود ذات الصلة', en: 'Related Contracts' }, to: '/dashboard/contracts', icon: 'FileText', group: 'related' },
      );
      break;
    }
    case 'contracts': {
      out.push(
        { id: 'cnt-open',      label: { ar: 'فتح العقد', en: 'Open Contract' }, to: `/dashboard/contracts${refQs}`, icon: 'FileText', group: 'primary' },
        { id: 'cnt-work-orders', label: { ar: 'أوامر العمل', en: 'Work Orders' }, to: '/dashboard/work-orders', icon: 'ClipboardList', group: 'related' },
      );
      break;
    }
    case 'leads': {
      out.push(
        { id: 'led-open',      label: { ar: 'فتح العميل المحتمل', en: 'Open Lead' }, to: `/dashboard/leads${refQs}`, icon: 'Inbox', group: 'primary' },
        { id: 'led-to-contract', label: { ar: 'تحويل إلى عقد', en: 'Convert to Contract' }, to: '/dashboard/contracts', icon: 'ArrowRight', group: 'related' },
      );
      break;
    }
    case 'operations': {
      out.push(
        { id: 'ops-feed', label: { ar: 'تدفق العمليات', en: 'Operations Feed' }, to: '/dashboard/operations/feed', icon: 'Activity', group: 'primary' },
        { id: 'ops-work-orders', label: { ar: 'أوامر العمل', en: 'Work Orders' }, to: '/dashboard/work-orders', icon: 'ClipboardList', group: 'related' },
      );
      break;
    }
    case 'admin': {
      out.push(
        { id: 'admin-triage', label: { ar: 'فرز المراجع', en: 'Triage References' }, to: '/admin/ref/triage', icon: 'Database', group: 'primary', audiences: ['admin'] },
        { id: 'admin-note',   label: { ar: 'إضافة ملاحظة إدارية', en: 'Add Admin Note' }, to: '/admin', icon: 'StickyNote', group: 'tools', audiences: ['admin'] },
        { id: 'admin-feed',   label: { ar: 'سجل العمليات', en: 'Operations Feed' }, to: '/dashboard/operations/feed', icon: 'Activity', group: 'related', audiences: ['admin'] },
      );
      break;
    }
    case 'staff': {
      out.push(
        { id: 'staff-open', label: { ar: 'مركز الموظفين', en: 'Staff Center' }, to: '/dashboard/settings/staff', icon: 'Users', group: 'primary', requiresPermission: 'staff.view' },
      );
      break;
    }
    default:
      break;
  }

  return out;
}

export interface FilterCtx {
  audience: QuickActionAudience;
  hasPermission: (p: string) => boolean;
}

export function filterContextualActions(
  actions: ContextualAction[],
  ctx: FilterCtx,
): ContextualAction[] {
  return actions.filter((a) => {
    if (a.audiences && a.audiences.length > 0 && !a.audiences.includes(ctx.audience)) return false;
    if (a.requiresPermission && !ctx.hasPermission(a.requiresPermission)) return false;
    return true;
  });
}

export function groupContextualActions(
  actions: ContextualAction[],
): Record<ContextualAction['group'], ContextualAction[]> {
  return {
    primary: actions.filter((a) => a.group === 'primary'),
    related: actions.filter((a) => a.group === 'related'),
    tools:   actions.filter((a) => a.group === 'tools'),
  };
}