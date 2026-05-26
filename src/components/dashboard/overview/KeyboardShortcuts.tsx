import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Keyboard, X } from 'lucide-react';

interface Shortcut { keys: string[]; ar: string; en: string; action: () => void }

/**
 * Lightweight in-page shortcut handler. Listens for keys and shows a panel
 * on `?`. Uses `Mod` (Ctrl/Cmd) prefix for navigations to avoid clashing
 * with the user typing in inputs.
 */
export function KeyboardShortcuts({
  isRTL, onCustomize, onRefresh,
}: { isRTL: boolean; onCustomize: () => void; onRefresh: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const shortcuts: Shortcut[] = [
    { keys: ['G', 'C'], ar: 'الذهاب للعقود',     en: 'Go to Contracts',     action: () => navigate('/dashboard/contracts') },
    { keys: ['G', 'M'], ar: 'الذهاب للرسائل',    en: 'Go to Messages',      action: () => navigate('/dashboard/messages') },
    { keys: ['G', 'N'], ar: 'الذهاب للإشعارات',  en: 'Go to Notifications', action: () => navigate('/dashboard/notifications') },
    { keys: ['G', 'S'], ar: 'الإعدادات',          en: 'Settings',            action: () => navigate('/dashboard/settings') },
    { keys: ['E'],      ar: 'وضع التخصيص',        en: 'Toggle Customize',    action: onCustomize },
    { keys: ['R'],      ar: 'تحديث البيانات',     en: 'Refresh Data',        action: onRefresh },
    { keys: ['?'],      ar: 'عرض الاختصارات',     en: 'Show Shortcuts',      action: () => setOpen((v) => !v) },
  ];

  useEffect(() => {
    let prefix: string | null = null;
    let prefixTimer: ReturnType<typeof setTimeout> | null = null;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toUpperCase();

      if (e.key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (key === 'ESCAPE') { setOpen(false); return; }

      if (prefix === 'G') {
        const match = shortcuts.find((s) => s.keys.length === 2 && s.keys[0] === 'G' && s.keys[1] === key);
        if (match) { e.preventDefault(); match.action(); }
        prefix = null;
        if (prefixTimer) clearTimeout(prefixTimer);
        return;
      }

      if (key === 'G') {
        prefix = 'G';
        if (prefixTimer) clearTimeout(prefixTimer);
        prefixTimer = setTimeout(() => { prefix = null; }, 1200);
        return;
      }

      const single = shortcuts.find((s) => s.keys.length === 1 && s.keys[0] === key);
      if (single) { e.preventDefault(); single.action(); }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (prefixTimer) clearTimeout(prefixTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={isRTL ? 'اختصارات لوحة المفاتيح' : 'Keyboard shortcuts'}
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:end-4 sm:bottom-4 sm:max-w-sm z-40 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-accent" aria-hidden="true" />
          <h3 className="text-xs font-bold">{isRTL ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={isRTL ? 'إغلاق' : 'Close'}
          className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {shortcuts.map((s, i) => (
          <li key={i} className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{isRTL ? s.ar : s.en}</span>
            <span className="flex items-center gap-1">
              {s.keys.map((k, ki) => (
                <kbd
                  key={ki}
                  className="tech-content px-1.5 py-0.5 rounded border border-border/60 bg-muted text-[10px] font-mono"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[9px] text-muted-foreground mt-3 pt-2 border-t border-border/40">
        {isRTL ? 'اضغط ؟ لإظهار/إخفاء هذه القائمة' : 'Press ? to toggle this panel'}
      </p>
    </div>
  );
}