import React from 'react';

export interface AdminPageHeaderCrumb {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  /** Title shown as h1 — already localized */
  title: string;
  /** Optional one-line subtitle/description, already localized */
  subtitle?: string;
  /** Icon shown in the gradient badge to the left of the title */
  icon: React.ElementType;
  /** Optional eyebrow text (small uppercase label above the title) */
  eyebrow?: string;
  /**
   * @deprecated Breadcrumbs are rendered globally by `WorkspaceHeader`
   * via `useBreadcrumbs()`. The prop is kept for backwards-compat but
   * is intentionally ignored to prevent duplicate trails on admin pages.
   */
  breadcrumbs?: AdminPageHeaderCrumb[];
  /** Right-aligned action buttons */
  actions?: React.ReactNode;
  /** Optional inline KPI strip rendered inside the header card */
  kpiSlot?: React.ReactNode;
  /** Optional accent tone for the icon badge */
  tone?: 'primary' | 'accent' | 'success' | 'info' | 'warning' | 'destructive';
}

const TONE_MAP: Record<NonNullable<AdminPageHeaderProps['tone']>, string> = {
  primary: 'from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20',
  accent: 'from-accent to-accent/80 text-accent-foreground shadow-lg shadow-accent/20',
  success: 'from-success to-success/80 text-success-foreground shadow-lg shadow-success/20',
  info: 'from-info to-info/80 text-info-foreground shadow-lg shadow-info/20',
  warning: 'from-warning to-warning/80 text-warning-foreground shadow-lg shadow-warning/20',
  destructive: 'from-destructive to-destructive/80 text-destructive-foreground shadow-lg shadow-destructive/20',
};

/**
 * AdminPageHeader — shared admin page hero shell.
 * Provides a consistent gradient header card with breadcrumbs, title,
 * subtitle, action buttons and an optional KPI/extras slot. RTL-aware.
 */
const AdminPageHeaderImpl: React.FC<AdminPageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  eyebrow,
  actions,
  kpiSlot,
  tone = 'accent',
}) => {
  return (
    <section
      aria-label={title}
      className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 md:p-5 shadow-sm"
    >
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`shrink-0 h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br ${TONE_MAP[tone]} flex items-center justify-center`}
            >
              <Icon className="h-6 w-6 md:h-7 md:w-7" />
            </div>
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1">
                  {eyebrow}
                </p>
              )}
              <h1 className="font-heading font-bold text-lg md:text-2xl leading-tight text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-xs md:text-sm text-muted-foreground font-body">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>
          )}
        </div>
        {kpiSlot && <div className="mt-1">{kpiSlot}</div>}
      </div>
    </section>
  );
};

/**
 * `AdminPageHeader` is referentially-stable when its props don't change.
 * Wrapped in `React.memo` so it doesn't re-render on every parent update
 * (TabbedShell, tab switches, route param changes). Direction comes from
 * logical CSS, so the header no longer needs to subscribe to the
 * LanguageContext — that subscription previously forced a re-render
 * across every language toggle for *all* admin/dashboard pages.
 */
export const AdminPageHeader = React.memo(AdminPageHeaderImpl);
AdminPageHeader.displayName = 'AdminPageHeader';

export default AdminPageHeader;