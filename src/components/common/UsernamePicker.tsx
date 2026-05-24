import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/**
 * Professional, real-time username picker.
 *
 * - Local rule validation (length, charset, starts-with-letter, no separators run)
 * - Reserved-word + global uniqueness via `check_username_available` RPC
 * - Debounced (450ms) live availability
 * - Inline suggestions on conflict
 * - Reports `{ value, isValid, isAvailable }` to parent via `onValidChange`
 *
 * Shared by individuals, providers and businesses → one source of truth.
 */

export type UsernameCheckReason =
  | 'empty' | 'too_short' | 'too_long' | 'invalid_format'
  | 'reserved' | 'taken' | 'network';

export interface UsernamePickerProps {
  value: string;
  onChange: (next: string) => void;
  /** Called whenever the validation state settles (debounced). */
  onValidChange?: (state: { value: string; isValid: boolean; isAvailable: boolean }) => void;
  /** Exclude a specific user_id from collision check (edit mode). */
  excludeUserId?: string | null;
  isRTL?: boolean;
  label?: string;
  required?: boolean;
  placeholder?: string;
  /** Hide the `qitaat.com/handle` preview line. */
  hidePreview?: boolean;
  /** Optional className for outer wrapper. */
  className?: string;
  autoFocus?: boolean;
}

/** Sanitize as the user types — keep input strict but forgiving. */
function sanitize(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30);
}

/** Mirror of the SQL `is_valid_username` rules for instant feedback. */
function localValidate(u: string): { ok: boolean; reason?: UsernameCheckReason } {
  if (!u) return { ok: false, reason: 'empty' };
  if (u.length < 3) return { ok: false, reason: 'too_short' };
  if (u.length > 30) return { ok: false, reason: 'too_long' };
  if (!/^[a-z][a-z0-9_-]{2,29}$/.test(u)) return { ok: false, reason: 'invalid_format' };
  if (/(--|__|-_|_-)/.test(u) || /[-_]$/.test(u)) return { ok: false, reason: 'invalid_format' };
  return { ok: true };
}

function suggestionsFor(base: string): string[] {
  if (!base || base.length < 2) return [];
  const clean = sanitize(base).replace(/^[^a-z]+/, '') || 'user';
  const yr = String(new Date().getFullYear()).slice(-2);
  const rnd = Math.floor(100 + Math.random() * 900);
  const out = new Set<string>([
    `${clean}-${yr}`, `${clean}_${rnd}`, `${clean}-pro`, `the-${clean}`, `${clean}${rnd}`,
  ]);
  return Array.from(out).filter((s) => localValidate(s).ok).slice(0, 4);
}

function reasonMessage(reason: UsernameCheckReason | null, isRTL: boolean): string {
  if (!reason) return '';
  const ar: Record<UsernameCheckReason, string> = {
    empty: 'اكتب اسم مستخدم',
    too_short: 'يجب أن يكون 3 أحرف على الأقل',
    too_long: 'الحد الأقصى 30 حرفاً',
    invalid_format: 'يبدأ بحرف، ويحتوي على أحرف إنجليزية وأرقام و - أو _ فقط',
    reserved: 'هذا الاسم محجوز للنظام',
    taken: 'هذا الاسم مستخدم من قبل شخص آخر',
    network: 'تعذّر التحقق الآن، حاول مرة أخرى',
  };
  const en: Record<UsernameCheckReason, string> = {
    empty: 'Type a username',
    too_short: 'At least 3 characters',
    too_long: 'Maximum 30 characters',
    invalid_format: 'Start with a letter — use a-z, 0-9, - or _',
    reserved: 'This name is reserved by the system',
    taken: 'This name is already taken',
    network: 'Could not verify right now, try again',
  };
  return isRTL ? ar[reason] : en[reason];
}

type Status = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';

export const UsernamePicker: React.FC<UsernamePickerProps> = ({
  value, onChange, onValidChange, excludeUserId = null,
  isRTL = false, label, required, placeholder = 'my-handle',
  hidePreview = false, className, autoFocus,
}) => {
  const [status, setStatus] = useState<Status>('idle');
  const [reason, setReason] = useState<UsernameCheckReason | null>(null);
  const lastChecked = useRef<string>('');
  const aborter = useRef<number | null>(null);

  // Rule checklist memo
  const rules = useMemo(() => ([
    { id: 'len', ok: value.length >= 3 && value.length <= 30,
      ar: '3 إلى 30 حرفاً', en: '3 to 30 characters' },
    { id: 'start', ok: /^[a-z]/.test(value),
      ar: 'يبدأ بحرف إنجليزي', en: 'Starts with a letter' },
    { id: 'chars', ok: !!value && /^[a-z0-9_-]+$/.test(value),
      ar: 'أحرف إنجليزية وأرقام و - أو _', en: 'a-z, 0-9, - or _' },
    { id: 'clean', ok: !!value && !/(--|__|-_|_-)/.test(value) && !/[-_]$/.test(value),
      ar: 'بدون رموز متتالية أو في النهاية', en: 'No double/trailing separators' },
  ]), [value]);

  useEffect(() => {
    if (aborter.current) window.clearTimeout(aborter.current);

    const local = localValidate(value);
    if (!local.ok) {
      setStatus(value ? 'invalid' : 'idle');
      setReason(value ? (local.reason ?? null) : null);
      onValidChange?.({ value, isValid: false, isAvailable: false });
      return;
    }

    setStatus('checking');
    setReason(null);

    aborter.current = window.setTimeout(async () => {
      const candidate = value;
      if (lastChecked.current === candidate) return;
      try {
        const { data, error } = await supabase.rpc('check_username_available', {
          _username: candidate,
          _exclude_user: excludeUserId,
        });
        if (error) throw error;
        lastChecked.current = candidate;
        const payload = (data ?? {}) as { available?: boolean; reason?: UsernameCheckReason };
        if (payload.available) {
          setStatus('available');
          setReason(null);
          onValidChange?.({ value: candidate, isValid: true, isAvailable: true });
        } else {
          setStatus(payload.reason === 'taken' ? 'taken' : 'invalid');
          setReason(payload.reason ?? 'taken');
          onValidChange?.({ value: candidate, isValid: false, isAvailable: false });
        }
      } catch {
        setStatus('invalid');
        setReason('network');
        onValidChange?.({ value: candidate, isValid: false, isAvailable: false });
      }
    }, 450);

    return () => {
      if (aborter.current) window.clearTimeout(aborter.current);
    };
  }, [value, excludeUserId, onValidChange]);

  const suggestions = status === 'taken' ? suggestionsFor(value) : [];

  const StatusIcon = (() => {
    switch (status) {
      case 'checking':  return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-hidden />;
      case 'available': return <Check className="w-4 h-4 text-success" aria-hidden />;
      case 'taken':
      case 'invalid':   return <X className="w-4 h-4 text-destructive" aria-hidden />;
      default:          return null;
    }
  })();

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-xs font-semibold">
          {label}{required && <span className="text-destructive ms-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Globe
          className="absolute top-3.5 text-muted-foreground/60 w-4 h-4 pointer-events-none"
          style={{ [isRTL ? 'right' : 'left']: '14px' } as React.CSSProperties}
          aria-hidden
        />
        <Input
          value={value}
          onChange={(e) => onChange(sanitize(e.target.value))}
          placeholder={placeholder}
          dir="ltr"
          autoFocus={autoFocus}
          maxLength={30}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={status === 'taken' || status === 'invalid'}
          aria-describedby="username-picker-msg"
          className={cn(
            'h-12 rounded-xl tech-content transition-colors',
            status === 'available' && 'border-success/50 focus-visible:ring-success/40',
            (status === 'taken' || status === 'invalid') && 'border-destructive/50 focus-visible:ring-destructive/40',
          )}
          style={{ paddingInlineStart: '42px', paddingInlineEnd: '40px' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{ [isRTL ? 'left' : 'right']: '14px' } as React.CSSProperties}
        >
          {StatusIcon}
        </div>
      </div>

      {/* Live preview + status message */}
      <div id="username-picker-msg" className="min-h-[1.25rem] text-xs flex items-center gap-2 flex-wrap">
        {!hidePreview && value && (
          <span className="tech-content text-muted-foreground">
            qitaat.com/<span className="font-semibold text-foreground">{value}</span>
          </span>
        )}
        {status === 'available' && (
          <Badge variant="outline" className="border-success/40 text-success text-[10px] h-5 px-1.5 gap-1">
            <Check className="w-3 h-3" />
            {isRTL ? 'متاح' : 'Available'}
          </Badge>
        )}
        {(status === 'taken' || status === 'invalid') && reason && (
          <span className="text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {reasonMessage(reason, isRTL)}
          </span>
        )}
      </div>

      {/* Rules checklist — only show while typing or on invalid */}
      {(status === 'invalid' || (value.length > 0 && status !== 'available')) && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          {rules.map((r) => (
            <li key={r.id} className={cn(
              'flex items-center gap-1.5',
              r.ok ? 'text-success' : 'text-muted-foreground',
            )}>
              {r.ok
                ? <Check className="w-3 h-3 shrink-0" aria-hidden />
                : <span className="w-3 h-3 rounded-full border border-current/40 shrink-0" aria-hidden />
              }
              <span>{isRTL ? r.ar : r.en}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Suggestions on conflict */}
      {suggestions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] text-muted-foreground">
            {isRTL ? 'مقترحات:' : 'Try:'}
          </span>
          {suggestions.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => onChange(s)}
              className="tech-content text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UsernamePicker;