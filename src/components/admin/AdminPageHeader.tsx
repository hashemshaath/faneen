import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

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
  primary: 'from-primary/20 to-primary/5 text-primary',
  accent: 'from-accent/25 to-accent/5 text-accent-foreground',
  success: 'from-success/20 to-success/5 text-success',
  info: 'from-info/20 to-info/5 text-info',
  warning: 'from-warning/20 to-warning/5 text-warning',
  destructive: 'from-destructive/20 to-destructive/5 text-destructive',
};

/**
 * AdminPageHeader — shared admin page hero shell.
 * Provides a consistent gradient header card with breadcrumbs, title,
 * subtitle, action buttons and an optional KPI/extras slot. RTL-aware.
 */
export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  eyebrow,
  actions,
  kpiSlot,
  tone = 'accent',
}) => {
  useLanguage(); // keep hook stable for RTL-aware children that read context
  return (
    <section
      aria-label={title}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/30 p-4 md:p-6 shadow-[var(--elev-1)]"
    >
      <div className="pointer-events-none absolute -top-24 -end-24 h-56 w-56 rounded-full bg-gradient-to-br from-accent/15 to-transparent blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`shrink-0 h-11 w-11 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br ${TONE_MAP[tone]} flex items-center justify-center shadow-sm ring-1 ring-border/30`}
            >
              <Icon className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1">
                  {eyebrow}
                </p>
              )}
              <h1 className="font-heading font-bold text-xl md:text-2xl leading-tight text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground font-body">
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

export default AdminPageHeader;