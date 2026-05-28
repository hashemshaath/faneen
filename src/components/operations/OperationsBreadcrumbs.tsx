import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * APP-UX-FUNCTIONAL-POLISH-1 — Shared bilingual breadcrumbs for the
 * Operations surfaces (provider + admin). Pure presentational, no I/O.
 * Renders only static, in-app links that exist in App.tsx.
 */

export interface OperationsCrumb {
  /** Bilingual visible label. */
  labelEn: string;
  labelAr: string;
  /** Absolute in-app path. Omit for the current page (last crumb). */
  to?: string;
}

interface Props {
  /** Ordered list of crumbs. Last item is the current page (no link). */
  crumbs: ReadonlyArray<OperationsCrumb>;
  /** Show a leading home link to /dashboard or /admin. Defaults to true. */
  showHome?: boolean;
  /** Where the home crumb points. Defaults to "/dashboard". */
  homeTo?: '/dashboard' | '/admin';
}

export function OperationsBreadcrumbs({
  crumbs,
  showHome = true,
  homeTo = '/dashboard',
}: Props) {
  const { isRTL } = useLanguage();
  const Sep = isRTL ? ChevronLeft : ChevronRight;
  const homeLabel = isRTL ? 'الرئيسية' : 'Home';

  return (
    <nav
      aria-label={isRTL ? 'مسار التنقّل' : 'Breadcrumb'}
      className="text-[11px] sm:text-xs text-muted-foreground"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <ol className="flex items-center gap-1 flex-wrap min-w-0">
        {showHome && (
          <>
            <li>
              <Link
                to={homeTo}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Home className="w-3 h-3" aria-hidden="true" />
                <span>{homeLabel}</span>
              </Link>
            </li>
            <li aria-hidden="true">
              <Sep className="w-3 h-3 opacity-60" />
            </li>
          </>
        )}
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          const label = isRTL ? c.labelAr : c.labelEn;
          return (
            <li key={`${c.to ?? 'cur'}-${i}`} className="inline-flex items-center gap-1 min-w-0">
              {!isLast && c.to ? (
                <Link
                  to={c.to}
                  className="hover:text-foreground transition-colors truncate max-w-[12rem]"
                  dir="auto"
                >
                  {label}
                </Link>
              ) : (
                <span
                  className="text-foreground font-medium truncate max-w-[16rem]"
                  aria-current={isLast ? 'page' : undefined}
                  dir="auto"
                >
                  {label}
                </span>
              )}
              {!isLast && <Sep className="w-3 h-3 opacity-60" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default OperationsBreadcrumbs;