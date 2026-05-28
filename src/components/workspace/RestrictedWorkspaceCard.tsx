/**
 * ORG-RBAC-STRUCTURE-2 — Phase C
 *
 * Full-card empty state shown when a capability gate denies access in
 * `mode="restricted"`. Bilingual. Does NOT render the missing capability key
 * as a raw string to the user — that stays in `data-capability` for tests
 * and admin debugging only.
 */
import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';

export interface RestrictedWorkspaceCardProps {
  capability: string;
  className?: string;
}

export const RestrictedWorkspaceCard: React.FC<RestrictedWorkspaceCardProps> = ({
  capability,
  className,
}) => {
  const bi = useBi();
  return (
    <div
      role="status"
      data-testid="workspace-restricted-card"
      data-capability={capability}
      className={
        'flex flex-col items-center justify-center gap-3 rounded-2xl ' +
        'border border-border/40 bg-muted/20 px-6 py-10 text-center ' +
        (className ?? '')
      }
    >
      <div className="rounded-full bg-muted/40 p-3">
        <ShieldAlert className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">
        {bi('لا تملك صلاحية الوصول لهذا القسم', 'You do not have access to this section')}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm">
        {bi(
          'تواصل مع مالك حساب الأعمال لمنحك الصلاحية المناسبة.',
          'Contact the business owner to grant you the required permission.',
        )}
      </p>
    </div>
  );
};

export default RestrictedWorkspaceCard;