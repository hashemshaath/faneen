import { useRef } from 'react';
import { ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

export interface ProjectCategoryTab {
  id: string;
  label: string;
  count: number;
}

interface Props {
  tabs: ProjectCategoryTab[];
  value: string;
  onChange: (id: string) => void;
  /** id used for the "All" tab. Defaults to "all". */
  allId?: string;
  /** Show the All chip even when there are no categories. */
  alwaysShowAll?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Horizontal, scrollable category tabs used to group/filter projects by their
 * primary taxonomy category. Reusable across the public projects page, the
 * business profile projects tab, and the provider dashboard.
 *
 * Pure presentation — parent owns selection state. Empty/single-category
 * inputs render nothing so it never clutters small profiles.
 */
export const ProjectCategoryTabs = ({
  tabs, value, onChange, allId = 'all', alwaysShowAll = false, className, size = 'md',
}: Props) => {
  const { isRTL } = useLanguage();
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (tabs.length === 0 && !alwaysShowAll) return null;
  // No grouping value if there is only one bucket — hide entirely.
  if (tabs.length <= 1 && !alwaysShowAll) return null;

  const totalCount = tabs.reduce((acc, t) => acc + t.count, 0);
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const padY = size === 'sm' ? 'py-1' : 'py-1.5';
  const padX = size === 'sm' ? 'px-2.5' : 'px-3';
  const text = size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <div className={cn('relative flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => scrollBy(isRTL ? 200 : -200)}
        className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/40 bg-card text-muted-foreground hover:text-foreground hover:border-accent/40 shrink-0"
        aria-label={isRTL ? 'تمرير للخلف' : 'Scroll back'}
      >
        <PrevIcon className="w-3.5 h-3.5" />
      </button>
      <div
        ref={scrollerRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth"
        role="tablist"
        aria-label={isRTL ? 'تصنيفات المشاريع' : 'Project categories'}
      >
        <button
          type="button"
          role="tab"
          aria-selected={value === allId}
          onClick={() => onChange(allId)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full whitespace-nowrap font-medium transition-all active:scale-95',
            padX, padY, text,
            value === allId
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <FolderOpen className="w-3 h-3" />
          {isRTL ? 'الكل' : 'All'}
          <span className={cn(
            'rounded-full px-1 text-[9px]',
            value === allId ? 'bg-primary-foreground/20' : 'bg-background/60',
          )}>{totalCount}</span>
        </button>
        {tabs.map((t) => {
          const active = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full whitespace-nowrap font-medium transition-all active:scale-95',
                padX, padY, text,
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              title={t.label}
            >
              <span dir="auto" className="max-w-[12rem] truncate">{t.label}</span>
              <span className={cn(
                'rounded-full px-1 text-[9px]',
                active ? 'bg-primary-foreground/20' : 'bg-background/60',
              )}>{t.count}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(isRTL ? -200 : 200)}
        className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/40 bg-card text-muted-foreground hover:text-foreground hover:border-accent/40 shrink-0"
        aria-label={isRTL ? 'تمرير للأمام' : 'Scroll forward'}
      >
        <NextIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ProjectCategoryTabs;