import React, { useState } from 'react';
import { Bookmark, BookmarkPlus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/i18n/LanguageContext';
import type { SavedView } from '@/hooks/useAdminSavedViews';

interface Props<T extends Record<string, unknown>> {
  views: SavedView<T>[];
  currentFilters: T;
  onApply: (filters: T) => void;
  onSave: (name: string, filters: T) => void;
  onRemove: (id: string) => void;
  activeId?: string | null;
}

/**
 * SavedViewsMenu — compact popover for saving / loading per-page admin
 * filter snapshots. RTL-aware, inline-only (no modal).
 */
export function SavedViewsMenu<T extends Record<string, unknown>>({
  views, currentFilters, onApply, onSave, onRemove, activeId,
}: Props<T>) {
  const { isRTL } = useLanguage();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, currentFilters);
    setName('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 text-xs gap-1.5 rounded-xl"
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isRTL ? 'العروض المحفوظة' : 'Saved views'}</span>
          {views.length > 0 && (
            <Badge variant="secondary" className="ms-1 text-[10px] h-4 px-1.5">
              {views.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 rounded-xl" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {isRTL ? 'حفظ العرض الحالي' : 'Save current view'}
            </p>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isRTL ? 'اسم العرض' : 'View name'}
                dir="auto"
                className="h-9 text-xs rounded-lg"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              />
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!name.trim()}
                className="h-9 px-3 rounded-lg gap-1"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                {isRTL ? 'حفظ' : 'Save'}
              </Button>
            </div>
          </div>

          <div className="border-t border-border/30 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {isRTL ? 'العروض المحفوظة' : 'Saved views'}
            </p>
            {views.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {isRTL ? 'لا توجد عروض محفوظة بعد' : 'No saved views yet'}
              </p>
            ) : (
              <ul className="space-y-1 max-h-64 overflow-y-auto">
                {views.map((v) => {
                  const isActive = v.id === activeId;
                  return (
                    <li
                      key={v.id}
                      className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors ${isActive ? 'bg-muted/40' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => { onApply(v.filters); setOpen(false); }}
                        className="flex-1 text-start flex items-center gap-2 min-w-0"
                      >
                        {isActive ? (
                          <Check className="w-3.5 h-3.5 text-success shrink-0" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs truncate">{v.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(v.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        aria-label={isRTL ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default SavedViewsMenu;