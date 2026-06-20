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

const TONE_ICON: Record<NonNullable<AdminPageHeaderProps['tone']>, string> = {
  primary: 'text-primary',
  accent: 'text-accent',
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

/**
 * AdminPageHeader — shared **compact** page header used across every
 * dashboard (admin / provider / user). Centralized so visual tweaks
 * propagate everywhere via this one file.
 *
 * Design: matches the inline header used by `AdminQuoteRequestDetails`
 * (REQ-XXXXXXX page) — no gradient hero card, just a small icon next
 * to a title plus an optional subtitle, with right-aligned actions.
 * Preserves spacing/margins (`space-y-*` from parent) and the same
 * public API so no caller needs to change.
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
    <header aria-label={title} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2 leading-tight text-foreground">
            <Icon className={`h-5 w-5 shrink-0 ${TONE_ICON[tone]}`} aria-hidden="true" />
            <span className="min-w-0">{title}</span>
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1 font-body">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
      {kpiSlot && <div>{kpiSlot}</div>}
    </header>
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