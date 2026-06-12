import React from 'react';
import { ChevronDown, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ADMIN-REDESIGN PHASE 6 — Collapsible form section.
 *
 * A self-contained accordion-style section for long forms. Renders:
 *   - Title + optional subtitle
 *   - Completion ring (filled / unfilled / error)
 *   - Body that mounts only when open (cheap on long forms)
 *
 * Controlled or uncontrolled. RTL-aware via logical CSS.
 */
export interface FormSectionProps {
  title: string;
  subtitle?: string;
  /** 0..1 — drives the completion ring fill. */
  completion?: number;
  /** Marks the section as failed validation (red ring). */
  hasError?: boolean;
  defaultOpen?: boolean;
  /** Controlled open state. When set, `onOpenChange` should be too. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional right-side actions (e.g., "Add row") */
  headerActions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title, subtitle, completion, hasError, defaultOpen = true,
  open: controlledOpen, onOpenChange, headerActions, className, children,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const pct = Math.max(0, Math.min(1, completion ?? 0));
  const complete = pct >= 1 && !hasError;

  return (
    <section
      className={cn(
        'rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden',
        hasError ? 'border-destructive/50' : 'border-border/60',
        className,
      )}
    >
      <header className="flex items-center gap-3 px-4 sm:px-5 py-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex items-center gap-3 flex-1 min-w-0 text-start"
        >
          <span
            className={cn(
              'shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-semibold',
              hasError
                ? 'bg-destructive/10 text-destructive'
                : complete
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground',
            )}
            aria-hidden="true"
          >
            {hasError
              ? <AlertCircle className="w-3.5 h-3.5" />
              : complete
                ? <Check className="w-3.5 h-3.5" />
                : <span className="tech-content">{Math.round(pct * 100)}%</span>}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-tight text-foreground truncate">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
          </div>
          <ChevronDown
            className={cn(
              'shrink-0 w-4 h-4 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
        {headerActions && <div className="shrink-0 flex items-center gap-1.5">{headerActions}</div>}
      </header>
      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border/40">
          {children}
        </div>
      )}
    </section>
  );
};

export default FormSection;