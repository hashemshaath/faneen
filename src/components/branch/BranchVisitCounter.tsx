import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  count: number;
  compact?: boolean;
}

/** Animated count-up badge for branch view totals. */
export function BranchVisitCounter({ count, compact }: Props) {
  const { isRTL } = useLanguage();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (count <= 0) { setShown(0); return; }
    const target = count;
    const start = performance.now();
    const dur = Math.min(900, 200 + target * 4);
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Eye className="w-3 h-3" />
        <span className="tech-content font-semibold">{shown.toLocaleString('en-US')}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
      <Eye className="w-3.5 h-3.5" />
      <span className="tech-content font-semibold">{shown.toLocaleString('en-US')}</span>
      <span className="text-[11px]">{isRTL ? 'مشاهدة' : 'views'}</span>
    </span>
  );
}

export default BranchVisitCounter;