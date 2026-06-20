import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BookmarkPlus, X, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useBi } from '@/components/common/Bilingual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useSavedSearches,
  buildSavedSearchHref,
  SAVED_SEARCHES_MAX,
} from '@/services/search/useSavedSearches';
import type { SearchFilterValues } from '@/services/search/useSearch';

interface Props {
  query: string;
  filters: SearchFilterValues;
  currentCount: number;
  hasActiveFilters: boolean;
}

export const SavedSearchesV3: React.FC<Props> = ({ query, filters, currentCount, hasActiveFilters }) => {
  const bi = useBi();
  const { items, save, remove, markSeen } = useSavedSearches();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const canSave = (query.trim().length > 0 || hasActiveFilters) && items.length < SAVED_SEARCHES_MAX;

  const handleSave = () => {
    const entry = save({ name: name || query.trim() || bi('بحث محفوظ', 'Saved search'), query, filters, currentCount });
    if (!entry) {
      toast.error(bi('وصلت الحد الأقصى للحفظ', 'Reached saved searches limit'));
      return;
    }
    toast.success(bi('تم حفظ البحث', 'Search saved'));
    setName('');
    setOpen(false);
  };

  return (
    <div className="mt-5 pt-5 border-t border-border/40">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-heading font-bold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
          {bi('عمليات بحث محفوظة', 'Saved searches')}
        </h3>
        {items.length > 0 && (
          <span className="text-[10px] tech-content text-muted-foreground">
            {items.length}/{SAVED_SEARCHES_MAX}
          </span>
        )}
      </div>

      {open ? (
        <div className="flex gap-1.5 mb-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
            placeholder={bi('سمِّ هذا البحث…', 'Name this search…')}
            dir="auto"
            className="h-9 text-xs"
            autoFocus
          />
          <Button type="button" size="sm" onClick={handleSave} className="h-9 px-3 shrink-0">
            {bi('حفظ', 'Save')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => { setOpen(false); setName(''); }}
            className="h-9 px-2 shrink-0"
            aria-label={bi('إلغاء', 'Cancel')}
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={!canSave}
          className="w-full h-9 gap-1.5 text-xs mb-2"
          title={!canSave ? bi('أضف بحثًا أو فلترًا أولاً', 'Add a query or filter first') : ''}
        >
          <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
          {bi('احفظ البحث الحالي', 'Save current search')}
        </Button>
      )}

      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {bi(
            'احفظ بحثك ليصلك تنبيه عند ظهور مزودين جدد يطابقون فلاترك.',
            'Save a search to get a badge when new matching providers appear.',
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((it) => {
            const delta = Math.max(0, currentCount - it.lastSeenCount);
            const isActive = query === it.query
              && filters.categoryId === it.filters.categoryId
              && filters.cityId === it.filters.cityId
              && filters.regionId === it.filters.regionId
              && filters.serviceCategoryId === it.filters.serviceCategoryId
              && filters.minRating === it.filters.minRating
              && filters.verifiedOnly === it.filters.verifiedOnly;
            const showDelta = isActive && delta > 0;
            return (
              <li key={it.id} className="group flex items-center gap-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                <Link
                  to={buildSavedSearchHref(it)}
                  onClick={() => { if (isActive) markSeen(it.id, currentCount); }}
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs font-body text-foreground truncate"
                  dir="auto"
                  title={it.name}
                >
                  {it.name}
                </Link>
                {showDelta && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] tech-content font-bold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-full"
                    title={bi('نتائج جديدة منذ آخر مشاهدة', 'New results since last view')}
                  >
                    <Bell className="w-3 h-3" aria-hidden="true" />
                    +{delta}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  aria-label={bi('حذف', 'Delete')}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SavedSearchesV3;