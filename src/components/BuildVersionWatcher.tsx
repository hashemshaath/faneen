import React, { useEffect, useState } from 'react';
import { extractScriptSrcs, currentScriptSrcs } from '@/lib/buildVersion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * Periodically polls /index.html and compares the entry script names with
 * the ones loaded in this document. If they diverge, the user is on a
 * stale published bundle and we surface a non-blocking banner with reload.
 * Skipped in dev (BUILD_ID === 'dev').
 */
export const BuildVersionWatcher: React.FC = () => {
  const { isRTL } = useLanguage();
  const [stale, setStale] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let cancelled = false;
    const baseline = currentScriptSrcs();
    if (baseline.length === 0) return;

    const check = async () => {
      try {
        const res = await fetch(`/index.html?_v=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const html = await res.text();
        const remote = extractScriptSrcs(html);
        if (cancelled || remote.length === 0) return;
        // Mark stale only if NONE of our entry scripts is still served by the new index.html.
        const overlap = baseline.some((s) => remote.includes(s));
        if (!overlap) setStale(true);
      } catch {
        /* offline; ignore */
      }
    };

    const t = window.setInterval(check, 5 * 60 * 1000);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    // First check after 30s to avoid blocking initial paint
    const first = window.setTimeout(check, 30_000);
    return () => { cancelled = true; window.clearInterval(t); window.clearTimeout(first); window.removeEventListener('focus', onFocus); };
  }, []);

  if (!stale || dismissed) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:end-4 z-[60] max-w-md mx-auto sm:mx-0
                    rounded-2xl border border-warning/40 bg-card/95 backdrop-blur shadow-lg p-3 flex items-center gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <div className="w-9 h-9 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
        <RefreshCw className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{isRTL ? 'إصدار جديد متاح' : 'A new version is available'}</p>
        <p className="text-[11px] text-muted-foreground">{isRTL ? 'تم تحديث الموقع. أعد التحميل لتفادي أخطاء 404 أو شاشات قديمة.' : 'Reload to pick up the latest assets and avoid stale 404s.'}</p>
      </div>
      <Button size="sm" className="h-8 rounded-lg" onClick={() => window.location.reload()}>
        {isRTL ? 'تحديث' : 'Reload'}
      </Button>
      <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground" aria-label="dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default BuildVersionWatcher;