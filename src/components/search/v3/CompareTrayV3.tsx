import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { useCompareSelection, COMPARE_MAX } from '@/services/search/useCompareSelection';

interface Props {
  /**
   * Lookup map so the tray can render mini chips with the provider name
   * and (optionally) logo. Only ids present in the current results need
   * to resolve; missing ids fall back to a generic chip.
   */
  lookup?: Map<string, { name_ar: string; name_en?: string | null; logo_url?: string | null }>;
}

export const CompareTrayV3: React.FC<Props> = ({ lookup }) => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const { ids, remove, clear } = useCompareSelection();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  if (ids.length === 0) return null;

  const href = `/compare?ids=${ids.join(',')}`;

  return (
    <div
      role="region"
      aria-label={bi('شريط المقارنة', 'Compare tray')}
      className="fixed inset-x-0 bottom-3 z-40 pointer-events-none flex justify-center px-3"
    >
      <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-[var(--elev-3)] p-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <Scale className="w-4 h-4 text-accent" aria-hidden="true" />
          <span className="text-xs font-heading font-bold text-foreground">
            {bi('للمقارنة', 'Compare')}{' '}
            <span className="tech-content text-muted-foreground font-normal">
              ({ids.length}/{COMPARE_MAX})
            </span>
          </span>
        </div>

        <ul className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {ids.map((id) => {
            const b = lookup?.get(id);
            const name = b ? bi(b.name_ar, b.name_en || b.name_ar) : id.slice(0, 6);
            return (
              <li
                key={id}
                className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-muted/60 border border-border/40 max-w-[160px]"
              >
                {b?.logo_url ? (
                  <img src={b.logo_url} alt="" className="w-5 h-5 rounded-full object-cover bg-muted shrink-0" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                    {(name || '?').trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-[11px] font-body text-foreground truncate" dir="auto">{name}</span>
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label={bi('إزالة', 'Remove')}
                  className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-destructive/15 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2 shrink-0 ms-auto">
          <button
            type="button"
            onClick={clear}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {bi('مسح', 'Clear')}
          </button>
          <Button asChild size="sm" disabled={ids.length < 2} className="gap-1.5">
            <Link to={href} aria-disabled={ids.length < 2} tabIndex={ids.length < 2 ? -1 : 0}>
              <span>{bi('قارن الآن', 'Compare now')}</span>
              <ArrowIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareTrayV3;