/**
 * ORG-RBAC-STRUCTURE-2 — Phase H (subset)
 *
 * Compact bilingual badge showing the active workspace role + scope (entity
 * vs. specific location vs. "all locations"). Intended to sit next to the
 * existing `ActiveBusinessSwitcher` / `ActiveLocationSwitcher` in dashboard
 * headers.
 *
 * Pure presentation — reads `useActiveWorkspace` only. Renders nothing when
 * there is no active entity (avoids leaking blank chips on personal pages).
 */
import React from 'react';
import { Shield } from 'lucide-react';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { useBi } from '@/components/common/Bilingual';

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  owner: { ar: 'مالك', en: 'Owner' },
  entity_admin: { ar: 'مدير المنشأة', en: 'Entity admin' },
  business_manager: { ar: 'مدير أعمال', en: 'Business manager' },
  site_manager: { ar: 'مدير فرع', en: 'Site manager' },
  operations_manager: { ar: 'مدير عمليات', en: 'Operations manager' },
  contracts_manager: { ar: 'مدير عقود', en: 'Contracts manager' },
  finance: { ar: 'المالية', en: 'Finance' },
  sales: { ar: 'المبيعات', en: 'Sales' },
  staff: { ar: 'موظف', en: 'Staff' },
  viewer: { ar: 'مشاهد', en: 'Viewer' },
};

export interface WorkspaceScopeBadgeProps {
  className?: string;
}

export const WorkspaceScopeBadge: React.FC<WorkspaceScopeBadgeProps> = ({ className }) => {
  const bi = useBi();
  const { active_entity_id, active_role, active_location_id, locations } = useActiveWorkspace();

  if (!active_entity_id) return null;

  const role = active_role ?? 'viewer';
  const roleLabel = ROLE_LABELS[role] ?? { ar: role, en: role };

  const scope: string = active_location_id
    ? (locations.find((l) => l.id === active_location_id) ?
        bi('فرع محدد', 'Single location') :
        bi('فرع', 'Location'))
    : locations.length > 0
      ? bi('كل الفروع', 'All locations')
      : bi('المنشأة', 'Entity');

  return (
    <div
      data-testid="workspace-scope-badge"
      data-role={role}
      data-scope={active_location_id ? 'location' : 'entity'}
      title={`${bi(roleLabel.ar, roleLabel.en)} · ${scope}`}
      className={
        'hidden md:inline-flex items-center gap-1.5 h-7 px-2 rounded-full ' +
        'border border-border/40 bg-muted/20 text-[11px] font-semibold text-foreground ' +
        (className ?? '')
      }
    >
      <Shield className="w-3 h-3 text-primary shrink-0" aria-hidden="true" />
      <span>{bi(roleLabel.ar, roleLabel.en)}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{scope}</span>
    </div>
  );
};

export default WorkspaceScopeBadge;