/**
 * APP-SHELL-REARCHITECTURE-1 — Workspace header.
 *
 * Slim, presentation-only header strip shown inside DashboardLayout. Renders:
 *  - active entity name + role badge
 *  - breadcrumbs
 *  - optional quick-actions slot (right side)
 *  - compact mode on mobile (icon-only)
 *
 * Reads workspace context via existing hooks. No DB calls.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useIsMobile } from '@/hooks/use-mobile';

export interface WorkspaceHeaderProps {
  rightSlot?: React.ReactNode;
  className?: string;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ rightSlot, className }) => {
  const { isRTL } = useLanguage();
  const { isAdmin, isSuperAdmin } = useAuth();
  const ws = useActiveWorkspace();
  const crumbs = useBreadcrumbs();
  const isMobile = useIsMobile();

  const entity = ws.entities.find((e) => e.entity_id === ws.active_entity_id) ?? null;
  const entityName = entity ? (isRTL ? entity.name_ar || entity.name_en : entity.name_en || entity.name_ar) : null;
  const role = ws.active_role;

  const roleLabel = isSuperAdmin
    ? (isRTL ? 'مدير المنصة' : 'Super Admin')
    : isAdmin
      ? (isRTL ? 'مشرف' : 'Admin')
      : role === 'owner'
        ? (isRTL ? 'مالك' : 'Owner')
        : role
          ? (isRTL ? role : role)
          : null;

  return (
    <div
      data-testid="workspace-header"
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 border-b border-border/20 bg-card/60 backdrop-blur-sm ${className ?? ''}`}
      style={{ paddingInlineStart: 'max(env(safe-area-inset-left), 0.75rem)', paddingInlineEnd: 'max(env(safe-area-inset-right), 0.75rem)' }}
    >
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
        {entityName && (
          <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[180px]">
            {entityName}
          </span>
        )}
        {roleLabel && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium shrink-0">
            {roleLabel}
          </span>
        )}
        {!isMobile && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-xs text-muted-foreground min-w-0 overflow-hidden">
            {crumbs.map((c, i) => (
              <React.Fragment key={c.path}>
                {i > 0 && <ChevronRight className={`w-3 h-3 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />}
                <Link to={c.path} className="truncate hover:text-foreground transition-colors">
                  {c.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>
      {rightSlot && <div className="flex items-center gap-1.5 shrink-0">{rightSlot}</div>}
    </div>
  );
};

export default WorkspaceHeader;