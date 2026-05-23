import React, { useState } from 'react';
import { createTempCodeSession, verifyTemporaryCodeOtp } from '@/modules/identity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from './FieldError';
import { Loader2, KeyRound, CheckCircle2, ShieldAlert, Clock, Ban } from 'lucide-react';

type UiState = 'idle' | 'verifying' | 'success';

interface Props {
  isRTL: boolean;
}

/**
 * Beta-only temporary login code gate.
 * Verifies a code issued out-of-band by an operator. Does NOT create a session.
 * Hidden unless VITE_ENABLE_BETA_TEMP_CODE === 'true'.
 */
type ErrorKind = 'invalid' | 'expired' | 'used' | 'too_many' | 'rate_limited' | 'invalid_id' | 'no_account' | 'generic';

/**
 * Normalize identifier for verification. Email is lowercased & trimmed.
 * Saudi phone formats (05X…, 5X…, 9665X…, +9665X…) are normalized to E.164 (+9665XXXXXXXX).
 * Anything else is returned trimmed as-is so the RPC can decide.
 */
function normalizeIdentifier(raw: string): string {
  const v = raw.trim();
  if (!v) return '';
  if (v.includes('@')) return v.toLowerCase();
  const digits = v.replace(/[^\d+]/g, '');
  // +9665XXXXXXXX
  if (/^\+9665\d{8}$/.test(digits)) return digits;
  // 9665XXXXXXXX
  if (/^9665\d{8}$/.test(digits)) return `+${digits}`;
  // 05XXXXXXXX
  if (/^05\d{8}$/.test(digits)) return `+966${digits.slice(1)}`;
  // 5XXXXXXXX
  if (/^5\d{8}$/.test(digits)) return `+966${digits}`;
  return digits || v;
}

function isLikelyValidIdentifier(raw: string): boolean {
  const v = raw.trim();
  if (!v) return false;
  if (v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const n = normalizeIdentifier(v);
  return /^\+9665\d{8}$/.test(n) || /^\+?\d{7,15}$/.test(n);
}

export const TemporaryCodeForm: React.FC<Props> = ({ isRTL }) => {
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [uiState, setUiState] = useState<UiState>('idle');
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [errorText, setErrorText] = useState('');
  const [attemptsUsed, setAttemptsUsed] = useState(0);

  const messages: Record<ErrorKind, { ar: string; en: string }> = {
    invalid:       { ar: 'الرمز الذي أدخلته غير صحيح. تأكد من الأرقام وحاول مرة أخرى.', en: 'The code you entered is incorrect. Check the digits and try again.' },
    expired:       { ar: 'انتهت صلاحية الرمز. اطلب رمزاً جديداً من فريق قطاعات.',          en: 'Code expired. Request a new code from the Qitaat team.' },
    used:          { ar: 'تم استخدام هذا الرمز مسبقاً. اطلب رمزاً جديداً.',                en: 'This code was already used. Request a new one.' },
    too_many:      { ar: 'تجاوزت الحد الأقصى للمحاولات. اطلب رمزاً جديداً.',               en: 'Maximum attempts reached. Request a new code.' },
    rate_limited:  { ar: 'محاولات كثيرة خلال فترة قصيرة. انتظر دقائق ثم أعد المحاولة.',    en: 'Too many requests in a short time. Wait a few minutes and retry.' },
    invalid_id:    { ar: 'يرجى إدخال بريد إلكتروني أو رقم جوال صحيح.',                     en: 'Please enter a valid email or phone number.' },
    no_account:    { ar: 'لا يوجد حساب مرتبط بهذا المعرّف. تواصل مع فريق قطاعات.',          en: 'No account is linked to this identifier. Contact the Qitaat team.' },
    generic:       { ar: 'تعذر التحقق من الرمز حالياً. حاول مرة أخرى.',                    en: 'Could not verify the code right now. Please try again.' },
  };

  const setKnownError = (kind: ErrorKind) => {
    setErrorKind(kind);
    setErrorText(isRTL ? messages[kind].ar : messages[kind].en);
  };

  const mapEdgeError = (err: string | undefined) => {
    switch (err) {
      case 'rate_limited': setKnownError(attemptsUsed >= 3 ? 'too_many' : 'rate_limited'); break;
      case 'invalid_id':   setKnownError('invalid_id'); break;
      case 'invalid':      setKnownError('invalid'); break;
      case 'no_account':   setKnownError('no_account'); break;
      default:             setKnownError('generic');
    }
  };

  const handleVerify = async () => {
    setErrorKind(null);
    setErrorText('');
    if (!identifier.trim() || !isLikelyValidIdentifier(identifier)) {
      setKnownError('invalid_id');
      return;
    }
    if (!code.trim()) {
      setErrorKind('invalid');
      setErrorText(
        isRTL
          ? 'أدخل الرمز المؤقت الذي حصلت عليه من فريق قطاعات.'
          : 'Enter the temporary code provided by the Qitaat team.',
      );
      return;
    }
    if (code.trim().length < 6) {
      setErrorKind('invalid');
      setErrorText(isRTL ? 'أدخل الرمز كاملاً (6 أرقام).' : 'Enter the full code (6 digits).');
      return;
    }
    setUiState('verifying');
    try {
      const normalized = normalizeIdentifier(identifier);

      // 1) Verify code + obtain a magic-link token_hash from the edge function.
      const { data, error: fnErr } = await createTempCodeSession({
        identifier: normalized,
        code: code.trim(),
      });
      if (fnErr) throw fnErr;
      const resp = data as { ok?: boolean; error?: string; email?: string; token_hash?: string } | null;
      if (!resp?.ok || !resp.email || !resp.token_hash) {
        setAttemptsUsed((n) => n + 1);
        mapEdgeError(resp?.error);
        setUiState('idle');
        return;
      }

      // 2) Exchange the token_hash for a real Supabase session.
      const { error: otpErr } = await verifyTemporaryCodeOtp({
        token_hash: resp.token_hash,
        type: 'magiclink',
      });
      if (otpErr) {
        if (import.meta.env.DEV) console.warn('[temp-code] verifyOtp error:', otpErr);
        setKnownError('generic');
        setUiState('idle');
        return;
      }

      try { localStorage.setItem('qitaat_beta_verified', String(Date.now())); } catch { /* storage blocked */ }
      setUiState('success');
      // The Auth page's useRoleRedirect picks up the new session and routes
      // the user to the correct dashboard. No manual navigation needed.
    } catch (err: unknown) {
      setAttemptsUsed((n) => n + 1);
      if (import.meta.env.DEV) console.warn('[temp-code] verify error:', err);
      setKnownError('generic');
      setUiState('idle');
    }
  };

  if (uiState === 'success') {
    return (
      <div className="space-y-4 animate-fade-in text-center py-6">
        <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
        <h3 className="font-heading font-bold text-lg">
          {isRTL ? 'تم تسجيل الدخول' : 'Signed in'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isRTL
            ? 'جارٍ تحويلك إلى لوحة التحكم…'
            : 'Redirecting you to your dashboard…'}
        </p>
        <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  const loading = uiState === 'verifying';
  const canSubmit = !loading && !!identifier.trim() && code.trim().length >= 6;

  const ErrorIcon =
    errorKind === 'expired' ? Clock :
    errorKind === 'used' ? Ban :
    errorKind === 'too_many' || errorKind === 'rate_limited' ? ShieldAlert :
    null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
        {isRTL
          ? 'دخول تجريبي مؤقت. لا يُولَّد الرمز تلقائياً — اطلبه من فريق قطاعات ثم أدخله هنا للتحقق.'
          : 'Temporary beta access. The code is not auto-generated — request it from the Qitaat team, then enter it here to verify.'}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">
          {isRTL ? 'البريد الإلكتروني أو رقم الجوال' : 'Email or phone'}
        </Label>
        <Input
          value={identifier}
          onChange={(e) => { setIdentifier(e.target.value); setErrorKind(null); setErrorText(''); }}
          placeholder={isRTL ? 'example@email.com أو 5XXXXXXXX' : 'example@email.com or 5XXXXXXXX'}
          dir="ltr"
          className={`h-12 rounded-xl ${errorKind === 'invalid_id' ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          autoComplete="username"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">
          {isRTL ? 'الرمز المؤقت' : 'Temporary code'}
        </Label>
        <Input
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\s/g, '')); setErrorKind(null); setErrorText(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleVerify(); }}
          placeholder="000000"
          dir="ltr"
          inputMode="numeric"
          maxLength={8}
          autoComplete="one-time-code"
          className={`h-12 rounded-xl text-center text-xl tracking-[0.5em] font-mono ${errorKind && errorKind !== 'invalid_id' ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          disabled={loading}
          aria-invalid={!!errorKind && errorKind !== 'invalid_id'}
        />
        {errorText && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive animate-in fade-in"
          >
            {ErrorIcon ? <ErrorIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : null}
            <span className="leading-relaxed">{errorText}</span>
          </div>
        )}
        {!errorText && <FieldError message="" />}
      </div>

      <Button
        onClick={handleVerify}
        disabled={!canSubmit}
        variant="hero"
        className="w-full h-12 rounded-xl text-sm font-semibold"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <KeyRound className="w-4 h-4 me-2" />}
        {loading
          ? (isRTL ? 'جارٍ التحقق…' : 'Verifying…')
          : (isRTL ? 'تحقق من الرمز' : 'Verify code')}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        {isRTL
          ? 'لم تستلم رمزاً؟ تواصل مع فريق قطاعات للحصول عليه — لا يُرسَل تلقائياً.'
          : "Don't have a code? Contact the Qitaat team to receive one — it is not sent automatically."}
      </p>
    </div>
  );
};