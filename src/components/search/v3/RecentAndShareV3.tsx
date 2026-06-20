import { useEffect, useState, useCallback } from 'react';
import { Clock, Share2, Check, X, History } from 'lucide-react';
import { useBi } from '@/components/common/Bilingual';
import { useToast } from '@/hooks/use-toast';
import {
  getSearchHistory,
  removeFromSearchHistory,
  clearSearchHistory,
} from '@/services/search';

interface Props {
  onPickQuery: (q: string) => void;
  /** Bump this when a new search is committed so the panel refreshes. */
  historyVersion?: number;
}

/**
 * Sidebar block: shareable filter URL + last 5 searches.
 * No backend, no popups — pure client-side affordance over existing
 * `qitaat_search_history` localStorage + Web Share / Clipboard APIs.
 */
export const RecentAndShareV3 = ({ onPickQuery, historyVersion = 0 }: Props) => {
  const bi = useBi();
  const { toast } = useToast();
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHistory(getSearchHistory().slice(0, 5));
  }, [historyVersion]);

  const refresh = () => setHistory(getSearchHistory().slice(0, 5));

  const shareUrl = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const title = document.title;
    const nav = window.navigator as Navigator & {
      share?: (data: { title?: string; url: string }) => Promise<void>;
    };
    try {
      if (nav.share) {
        await nav.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast({
        title: bi('تم نسخ الرابط', 'Link copied'),
        description: bi('شارك نتائج البحث مع زملائك', 'Share these search results with your team'),
      });
    } catch {
      toast({
        title: bi('تعذّر النسخ', 'Could not copy'),
        description: bi('انسخ الرابط من شريط العنوان', 'Copy the link from the address bar'),
        variant: 'destructive',
      });
    }
  }, [bi, toast]);

  return (
    <div className="mt-4 space-y-3">
      <button
        type="button"
        onClick={shareUrl}
        className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-card text-sm font-body font-medium hover:border-accent/50 hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors"
        aria-label={bi('مشاركة رابط البحث', 'Share search link')}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>{bi('تم النسخ', 'Copied')}</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" aria-hidden="true" />
            <span>{bi('مشاركة الرابط', 'Share link')}</span>
          </>
        )}
      </button>

      {history.length > 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-foreground">
              <History className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              {bi('بحوث أخيرة', 'Recent searches')}
            </h3>
            <button
              type="button"
              onClick={() => { clearSearchHistory(); refresh(); }}
              className="text-[11px] font-body text-muted-foreground hover:text-destructive"
            >
              {bi('مسح', 'Clear')}
            </button>
          </div>
          <ul className="space-y-1">
            {history.map((term) => (
              <li key={term} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPickQuery(term)}
                  className="flex-1 min-w-0 inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent/10 hover:text-accent text-start transition-colors"
                  dir="auto"
                >
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden="true" />
                  <span className="truncate">{term}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { removeFromSearchHistory(term); refresh(); }}
                  className="w-6 h-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={bi(`إزالة ${term}`, `Remove ${term}`)}
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default RecentAndShareV3;