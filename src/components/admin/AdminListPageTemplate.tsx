import React from 'react';
import { AdminPageHeader } from './AdminPageHeader';
import { cn } from '@/lib/utils';

/**
 * ADMIN-REDESIGN PHASE 5 — Canonical list page template.
 *
 * Composes the standard admin list page chrome as named slots so every
 * admin "browse + manage" surface follows the same vertical rhythm:
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │  AdminPageHeader (title + subtitle + actions)    │
 *   ├──────────────────────────────────────────────────┤
 *   │  KPI strip (kpiSlot)                             │
 *   ├──────────────────────────────────────────────────┤
 *   │  Filters / tabs / search (filtersSlot)           │
 *   ├──────────────────────────────────────────────────┤
 *   │  Main content (children)                         │
 *   ├──────────────────────────────────────────────────┤
 *   │  Bulk action bar — sticky bottom (bulkBarSlot)   │
 *   ├──────────────────────────────────────────────────┤
 *   │  Pagination / footer (paginationSlot)            │
 *   └──────────────────────────────────────────────────┘
 *
 * Slots are intentionally untyped (ReactNode) so each page composes its
 * own KPI cards / filters / table / drawer without the template
 * dictating implementation details.
 *
 * Direction-aware via logical CSS (no isRTL prop needed).
 */
export interface AdminListPageTemplateProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon: React.ElementType;
  tone?: 'primary' | 'accent' | 'success' | 'info' | 'warning' | 'destructive';
  actions?: React.ReactNode;
  kpiSlot?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  bulkBarSlot?: React.ReactNode;
  paginationSlot?: React.ReactNode;
  /** Optional max width override (e.g., `max-w-7xl`). Defaults to none. */
  className?: string;
  children: React.ReactNode;
}

const AdminListPageTemplateImpl: React.FC<AdminListPageTemplateProps> = ({
  title,
  subtitle,
  eyebrow,
  icon,
  tone = 'accent',
  actions,
  kpiSlot,
  filtersSlot,
  bulkBarSlot,
  paginationSlot,
  className,
  children,
}) => {
  return (
    <div className={cn('container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5', className)}>
      <AdminPageHeader
        title={title}
        subtitle={subtitle}
        eyebrow={eyebrow}
        icon={icon}
        tone={tone}
        actions={actions}
      />

      {kpiSlot && <section aria-label="Key metrics">{kpiSlot}</section>}

      {filtersSlot && (
        <section
          aria-label="Filters"
          className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-3 sm:p-4"
        >
          {filtersSlot}
        </section>
      )}

      <section aria-label="Results" className="min-h-[200px]">
        {children}
      </section>

      {paginationSlot && (
        <section aria-label="Pagination" className="flex justify-center pt-2">
          {paginationSlot}
        </section>
      )}

      {bulkBarSlot && (
        <div
          role="region"
          aria-label="Bulk actions"
          className={cn(
            'sticky bottom-3 z-30 mx-auto w-full max-w-3xl',
            'rounded-2xl border border-border/70 bg-card/95 backdrop-blur',
            'shadow-lg shadow-foreground/10 p-2 sm:p-3',
          )}
        >
          {bulkBarSlot}
        </div>
      )}
    </div>
  );
};

export const AdminListPageTemplate = React.memo(AdminListPageTemplateImpl);
AdminListPageTemplate.displayName = 'AdminListPageTemplate';

export default AdminListPageTemplate;