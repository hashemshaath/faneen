import React from 'react';
import { Check, Pencil, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * ADMIN-REDESIGN PHASE 6 — Click-to-edit inline field.
 *
 * Renders a read-only value with a pencil affordance; on activation,
 * swaps to an input with save/cancel controls. Used in tables and
 * compact admin cards in place of opening a separate edit drawer.
 *
 * - Enter saves, Escape cancels.
 * - `onSave` may be async; the control shows a spinner while resolving
 *   and stays in edit mode if it throws.
 * - Honors the project's no-popup constraint — fully inline.
 */
export interface InlineEditFieldProps {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  placeholder?: string;
  /** Optional validator. Return a non-empty string to block save with a message. */
  validate?: (value: string) => string | null;
  /** ARIA label for the input. Strongly recommended. */
  ariaLabel: string;
  /** Read-only label rendered when not editing. Defaults to the value. */
  renderRead?: (value: string) => React.ReactNode;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export const InlineEditField: React.FC<InlineEditFieldProps> = ({
  value, onSave, placeholder, validate, ariaLabel, renderRead, className, inputClassName, disabled,
}) => {
  const { isRTL } = useLanguage();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) {
      setDraft(value);
      setError(null);
      // Focus on next paint
      const id = requestAnimationFrame(() => inputRef.current?.select());
      return () => cancelAnimationFrame(id);
    }
  }, [editing, value]);

  const cancel = () => {
    setEditing(false);
    setDraft(value);
    setError(null);
  };

  const commit = async () => {
    if (validate) {
      const msg = validate(draft);
      if (msg) { setError(msg); return; }
    }
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRTL ? 'تعذّر الحفظ' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(true)}
        aria-label={isRTL ? `تعديل ${ariaLabel}` : `Edit ${ariaLabel}`}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5',
          'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
      >
        <span className="min-w-0 truncate">{renderRead ? renderRead(value) : (value || <span className="text-muted-foreground italic">{placeholder ?? '—'}</span>)}</span>
        <Pencil className="w-3 h-3 text-muted-foreground/60 group-hover:text-accent shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Input
        ref={inputRef}
        value={draft}
        dir="auto"
        onChange={(e) => { setDraft(e.target.value); if (error) setError(null); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void commit(); }
          else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${ariaLabel}-err` : undefined}
        className={cn('h-8 text-sm', inputClassName)}
        disabled={saving}
      />
      <button
        type="button"
        onClick={() => void commit()}
        disabled={saving}
        aria-label={isRTL ? 'حفظ' : 'Save'}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-success/10 text-success hover:bg-success/20 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={saving}
        aria-label={isRTL ? 'إلغاء' : 'Cancel'}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {error && (
        <span id={`${ariaLabel}-err`} role="alert" className="text-xs text-destructive ms-1">
          {error}
        </span>
      )}
    </div>
  );
};

export default InlineEditField;