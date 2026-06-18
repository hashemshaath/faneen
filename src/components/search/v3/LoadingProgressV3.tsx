import { useBi } from '@/components/common/Bilingual';

interface Props {
  /** Ordered list of readiness steps. Bar fills as each step turns true. */
  steps: { label: string; ready: boolean }[];
  /** Hide once everything is ready. */
  hideWhenComplete?: boolean;
}

/**
 * Slim progress bar reflecting how many sections of the search page are
 * ready. Lives above filters/results so the user has a tangible sense
 * that loading is advancing during the progressive skeleton phase.
 */
export const LoadingProgressV3 = ({ steps, hideWhenComplete = true }: Props) => {
  const bi = useBi();
  const total = steps.length || 1;
  const done = steps.filter((s) => s.ready).length;
  const pct = Math.round((done / total) * 100);
  if (hideWhenComplete && done === total) return null;

  const pending = steps.filter((s) => !s.ready).map((s) => s.label);
  const label = pending.length
    ? bi(`جارٍ تحميل: ${pending.join('، ')}`, `Loading: ${pending.join(', ')}`)
    : bi('اكتمل التحميل', 'Loaded');

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className="mb-3"
    >
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{label}</span>
        <span className="tech-content tabular-nums">{pct}%</span>
      </div>
    </div>
  );
};

export default LoadingProgressV3;