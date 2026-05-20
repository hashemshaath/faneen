import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
type ErrorKind = 'invalid' | 'expired' | 'used' | 'too_many' | 'rate_limited' | 'invalid_id' | 'generic';

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
    generic:       { ar: 'تعذر التحقق من الرمز حالياً. حاول مرة أخرى.',                    en: 'Could not verify the code right now. Please try again.' },
  };

  const setKnownError = (kind: ErrorKind) => {
    setErrorKind(kind);
    setErrorText(isRTL ? messages[kind].ar : messages[kind].en);
  };

  // Map sentinel errors. INVALID_OR_EXPIRED is intentionally generic from the DB,
  // but we can refine the user-facing copy based on context (attempts used).
  const mapAndSetError = (msg: string) => {
    if (msg.includes('TOO_MANY_ATTEMPTS')) { setKnownError(attemptsUsed >= 3 ? 'too_many' : 'rate_limited'); return; }
    if (msg.includes('INVALID_IDENTIFIER')) { setKnownError('invalid_id'); return; }
    if (msg.includes('INVALID_OR_EXPIRED'))  { setKnownError('invalid'); return; }
    setKnownError('generic');
  };

  const handleVerify = async () => {
    setErrorKind(null);
    setErrorText('');
    if (!identifier.trim()) {
      setKnownError('invalid_id');
      return;
    }
    if (code.trim().length < 4) {
      setErrorKind('invalid');
      setErrorText(isRTL ? 'أدخل الرمز كاملاً (6 أرقام).' : 'Enter the full code (6 digits).');
      return;
    }
    setUiState('verifying');
    try {
      const { data, error: rpcError } = await supabase.rpc('verify_temporary_login_code', {
        _identifier: identifier.trim(),
        _code: code.trim(),
      });
      if (rpcError) throw rpcError;
      const ok = (data as { verified?: boolean } | null)?.verified === true;
      if (!ok) {
        setAttemptsUsed((n) => n + 1);
        setKnownError('invalid');
        setUiState('idle');
        return;
      }
      try { localStorage.setItem('qitaat_beta_verified', String(Date.now())); } catch { /* storage blocked */ }
      setUiState('success');
    } catch (err: unknown) {
      setAttemptsUsed((n) => n + 1);
      const msg = err instanceof Error ? err.message : String(err);
      mapAndSetError(msg);
      setUiState('idle');
    }
  };

  if (uiState === 'success') {
    return (
      <div className="space-y-4 animate-fade-in text-center py-6">
        <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
        <h3 className="font-heading font-bold text-lg">
          {isRTL ? 'تم التحقق من الرمز' : 'Code verified'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isRTL
            ? 'سيتولى فريق قطاعات استكمال تسجيل دخولك. شكراً لمشاركتك في النسخة التجريبية.'
            : 'The Qitaat team will complete your sign-in. Thanks for joining the beta.'}
        </p>
      </div>
    );
  }

  const loading = uiState === 'verifying';

  const ErrorIcon =
    errorKind === 'expired' ? Clock :
    errorKind === 'used' ? Ban :
    errorKind === 'too_many' || errorKind === 'rate_limited' ? ShieldAlert :
    null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
        {isRTL
          ? 'هذه طريقة دخول مؤقتة لمستخدمي النسخة التجريبية إلى حين اكتمال إعدادات الرسائل.'
          : 'Temporary beta access until messaging setup is complete.'}
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
        disabled={loading}
        variant="hero"
        className="w-full h-12 rounded-xl text-sm font-semibold"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <KeyRound className="w-4 h-4 me-2" />}
        {loading
          ? (isRTL ? 'جارٍ التحقق…' : 'Verifying…')
          : (isRTL ? 'تحقق من الرمز' : 'Verify code')}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        {isRTL ? 'اطلب الرمز من فريق قطاعات.' : 'Request a code from the Qitaat team.'}
      </p>
    </div>
  );
};