import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, Share2, Trash2, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { fmtNum } from '@/lib/format';

const KEY = 'qitaat_saved_searches_v1';
const MAX_SAVED = 12;

export interface SavedSearch {
  id: string;
  name: string;
  qs: string;
  createdAt: number;
}

const readSaved = (): SavedSearch[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is SavedSearch =>
        !!x && typeof x === 'object' &&
        typeof (x as SavedSearch).id === 'string' &&
        typeof (x as SavedSearch).name === 'string' &&
        typeof (x as SavedSearch).qs === 'string'
      )
      .slice(0, MAX_SAVED);
  } catch {
    return [];
  }
};

const writeSaved = (items: SavedSearch[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_SAVED))); } catch { /* ignore */ }
};

interface Props {
  /** Current querystring representing the active search (without leading "?"). */
  currentQs: string;
  /** Human label suggested for the current search (e.g. category + city + query). */
  suggestedName: string;
  /** True when there's something worth saving (query or any active filter). */
  hasContext: boolean;
  /** Apply a saved search — parent rewrites URL and state. */
  onApply: (qs: string) => void;
  /** Total result count to surface a quick badge on save. */
  totalResults: number;
}

export const SavedSearchesBar: React.FC<Props> = ({
  currentQs, suggestedName, hasContext, onApply, totalResults,
}) => {
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState<SavedSearch[]>(() => readSaved());
  const [copied, setCopied] = useState(false);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) setItems(readSaved());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const isAlreadySaved = useMemo(
    () => items.some((i) => i.qs === currentQs),
    [items, currentQs],
  );

  const handleSave = useCallback(() => {
    if (!hasContext || isAlreadySaved) return;
    const next: SavedSearch = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: suggestedName.slice(0, 80) || (isRTL ? 'بحث محفوظ' : 'Saved search'),
      qs: currentQs,
      createdAt: Date.now(),
    };
    const updated = [next, ...items].slice(0, MAX_SAVED);
    setItems(updated);
    writeSaved(updated);
    toast({
      title: isRTL ? 'تم حفظ البحث' : 'Search saved',
      description: isRTL
        ? `${next.name} — ${fmtNum(totalResults)} نتيجة`
        : `${next.name} — ${fmtNum(totalResults)} result${totalResults === 1 ? '' : 's'}`,
    });
  }, [hasContext, isAlreadySaved, suggestedName, currentQs, items, isRTL, totalResults, toast]);

  const handleRemove = useCallback((id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    writeSaved(updated);
  }, [items]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/search${currentQs ? `?${currentQs}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: isRTL ? 'نتائج البحث في قِطاعات' : 'Qitaat search results', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast({
        title: isRTL ? 'تم نسخ الرابط' : 'Link copied',
        description: url,
      });
    } catch {
      /* user cancelled or unsupported */
    }
  }, [currentQs, isRTL, toast]);

  if (!hasContext && items.length === 0) return null;

  return (
    <div className="mt-3 mb-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {isRTL ? 'الإجراءات السريعة' : 'Quick actions'}
        </div>

        <div className="flex-1 min-w-0" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasContext || isAlreadySaved}
          onClick={handleSave}
          className="h-8 gap-1.5 rounded-lg text-xs"
          aria-label={isRTL ? 'حفظ البحث الحالي' : 'Save current search'}
        >
          {isAlreadySaved ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" /> : <Bookmark className="w-3.5 h-3.5" />}
          {isAlreadySaved
            ? (isRTL ? 'محفوظ' : 'Saved')
            : (isRTL ? 'حفظ البحث' : 'Save search')}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="h-8 gap-1.5 rounded-lg text-xs"
          aria-label={isRTL ? 'مشاركة رابط البحث' : 'Share search link'}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Share2 className="w-3.5 h-3.5" />}
          {copied ? (isRTL ? 'تم النسخ' : 'Copied') : (isRTL ? 'مشاركة' : 'Share')}
        </Button>
      </div>

      {items.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {isRTL ? `عمليات بحث محفوظة (${fmtNum(items.length)})` : `Saved searches (${fmtNum(items.length)})`}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {items.map((s) => {
              const active = s.qs === currentQs;
              return (
                <div
                  key={s.id}
                  className={`group inline-flex items-stretch rounded-lg border overflow-hidden transition-colors ${
                    active
                      ? 'border-primary/40 bg-primary-light text-primary'
                      : 'border-border/50 bg-background hover:bg-muted'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onApply(s.qs)}
                    className="px-2.5 h-7 text-xs font-medium max-w-[200px] truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title={s.name}
                  >
                    {s.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(s.id)}
                    aria-label={isRTL ? `حذف ${s.name}` : `Remove ${s.name}`}
                    className="px-1.5 h-7 border-s border-border/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};