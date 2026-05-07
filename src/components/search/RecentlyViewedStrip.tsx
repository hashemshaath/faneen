import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useRecentlyViewedBusinesses } from '@/hooks/useRecentlyViewedBusinesses';
import { Clock, X } from 'lucide-react';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';

interface Props {
  businesses?: Array<Record<string, any>>;
}

/**
 * Horizontal strip of the user's most recently opened providers.
 * Renders nothing if there's no history. saqf-inspired UX touch.
 */
export const RecentlyViewedStrip = ({ businesses }: Props) => {
  const { language, isRTL } = useLanguage();
  const { ids, clear } = useRecentlyViewedBusinesses();

  if (!businesses || ids.length === 0) return null;

  const map = new Map(businesses.map((b) => [b.id, b]));
  const items = ids.map((id) => map.get(id)).filter(Boolean).slice(0, 10);
  if (items.length === 0) return null;

  return (
    <div className="mb-4 sm:mb-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-1.5 text-xs sm:text-sm font-heading font-bold text-foreground">
          <Clock className="w-3.5 h-3.5 text-accent" />
          {isRTL ? 'شاهدتها مؤخراً' : 'Recently viewed'}
          <span className="text-[10px] text-muted-foreground font-normal">({items.length})</span>
        </h2>
        <button
          onClick={clear}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
          title={isRTL ? 'مسح السجل' : 'Clear history'}
        >
          <X className="w-3 h-3" />
          {isRTL ? 'مسح' : 'Clear'}
        </button>
      </div>

      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {items.map((b: any) => {
          const name = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
          const initial = name?.charAt(0) || 'ق';
          return (
            <Link
              key={b.id}
              to={`/${b.username}`}
              className="group shrink-0 w-32 sm:w-36 rounded-xl border border-border/30 dark:border-border/15 bg-card dark:bg-card/80 hover:border-accent/30 hover:shadow-md transition-all p-2 flex items-center gap-2"
              title={name}
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent/15 to-muted/30 flex items-center justify-center overflow-hidden shrink-0 border border-border/20">
                {b.logo_url ? (
                  <img src={b.logo_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-sm font-heading font-bold text-accent/60">{initial}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[11px] sm:text-xs font-heading font-bold text-foreground truncate group-hover:text-accent transition-colors">
                    {name}
                  </span>
                  {b.is_verified && <VerifiedBadge size="xs" iconOnly />}
                </div>
                {b.rating_avg > 0 && (
                  <span className="text-[10px] text-muted-foreground tech-content">
                    ★ {Number(b.rating_avg).toFixed(1)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
