/**
 * HelpLauncher — professional contextual help FAB.
 *
 * Renders a circular floating action button with a soft glow, first-visit
 * hint pill, hover tooltip, and a polished anchored panel containing
 * SmartHelpPanel. Behaviour:
 * - Click toggles the panel.
 * - ESC or outside-click closes the panel.
 * - RTL-aware positioning via logical `end-*` utilities.
 * - Hint pill auto-dismisses after first interaction (localStorage flag).
 *
 * Mounted globally via HelpLauncherFloating; the wrapper provides the
 * fixed-corner placement, this component owns presentation + interaction.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Sparkles, X, BookOpen, MessageSquareWarning, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import SmartHelpPanel from './SmartHelpPanel';

interface HelpLauncherProps {
  pageKey: string;
}

const HINT_FLAG = 'qitaat_help_hint_seen_v1';

export const HelpLauncher: React.FC<HelpLauncherProps> = ({ pageKey }) => {
  const { isRTL } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // First-visit hint pill — shown once per browser, auto-dismissed after 6s.
  React.useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (window.localStorage.getItem(HINT_FLAG)) return;
      const t = window.setTimeout(() => setShowHint(true), 800);
      const d = window.setTimeout(() => {
        setShowHint(false);
        window.localStorage.setItem(HINT_FLAG, '1');
      }, 7000);
      return () => {
        window.clearTimeout(t);
        window.clearTimeout(d);
      };
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const dismissHint = React.useCallback(() => {
    setShowHint(false);
    try {
      window.localStorage.setItem(HINT_FLAG, '1');
    } catch {
      /* ignore */
    }
  }, []);

  // ESC + outside click close.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const toggle = () => {
    dismissHint();
    setOpen((v) => !v);
  };

  const labelHelp = isRTL ? 'المساعدة' : 'Help';
  const labelHint = isRTL ? 'هل تحتاج مساعدة؟' : 'Need a hand?';
  const labelClose = isRTL ? 'إغلاق' : 'Close';
  const labelTitle = isRTL ? 'مساعد قطاعات الذكي' : 'Qitaat Smart Help';
  const labelSubtitle = isRTL ? 'اسأل أو تصفّح المقالات' : 'Ask or browse articles';

  return (
    <div ref={rootRef} className="relative inline-block">
      {/* Hint pill (first visit) */}
      {showHint && !open && (
        <div
          className={cn(
            'absolute bottom-full mb-3 end-0 whitespace-nowrap',
            'rounded-full bg-foreground text-background text-xs font-medium',
            'px-3 py-1.5 shadow-lg flex items-center gap-2',
            'animate-in fade-in slide-in-from-bottom-2 duration-300',
          )}
          role="status"
          dir="auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          <span>{labelHint}</span>
          <button
            type="button"
            onClick={dismissHint}
            aria-label={labelClose}
            className="ms-1 opacity-70 hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Anchored panel */}
      {open && (
        <div
          className={cn(
            'absolute bottom-full mb-3 end-0 z-50',
            'animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200',
          )}
        >
          <div className="w-80 max-w-[92vw] rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden">
            {/* Polished header */}
            <div className="relative px-3 py-2.5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" dir="auto">{labelTitle}</div>
                  <div className="text-[11px] text-muted-foreground truncate" dir="auto">{labelSubtitle}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={labelClose}
                  className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick action chips */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Link
                  to="/help"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-background/70 border border-border hover:bg-muted transition-colors"
                >
                  <BookOpen className="w-3 h-3" />
                  {isRTL ? 'تصفّح' : 'Browse'}
                </Link>
                <Link
                  to="/help/report-issue"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-background/70 border border-border hover:bg-muted transition-colors"
                >
                  <MessageSquareWarning className="w-3 h-3" />
                  {isRTL ? 'إبلاغ' : 'Report'}
                </Link>
                <Link
                  to="/help/feature-request"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-background/70 border border-border hover:bg-muted transition-colors"
                >
                  <Lightbulb className="w-3 h-3" />
                  {isRTL ? 'اقتراح' : 'Suggest'}
                </Link>
              </div>
            </div>

            {/* Smart panel body — its own border/shadow disabled by wrapping */}
            <div className="bg-popover">
              <SmartHelpPanel pageKey={pageKey} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={toggle}
        aria-label={labelHelp}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'group relative h-14 w-14 rounded-full',
          'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
          'shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40',
          'ring-1 ring-primary/40 hover:ring-primary/60',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'grid place-items-center',
        )}
      >
        {/* soft pulse ring while idle */}
        {!open && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-0 group-hover:opacity-30"
          />
        )}
        {open ? <X className="w-5 h-5" /> : <HelpCircle className="w-6 h-6" />}
        {/* AI badge */}
        {!open && (
          <span
            aria-hidden
            className="absolute -top-1 -end-1 h-5 min-w-[20px] px-1 rounded-full bg-foreground text-background text-[9px] font-bold grid place-items-center shadow"
          >
            AI
          </span>
        )}
      </button>
    </div>
  );
};

export default HelpLauncher;