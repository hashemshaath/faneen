import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from './FieldError';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';

interface Props {
  isRTL: boolean;
}

/**
 * Beta-only temporary login code gate.
 * Verifies a code issued out-of-band by an operator. Does NOT create a session.
 * Hidden unless VITE_ENABLE_BETA_TEMP_CODE === 'true'.
 */
export const TemporaryCodeForm: React.FC<Props> = ({ isRTL }) => {
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  const mapError = (msg: string): string => {
    if (msg.includes('TOO_MANY_ATTEMPTS')) {
      return isRTL ? 'تم تجاوز عدد المحاولات. حاول لاحقاً.' : 'Too many attempts. Try again later.';
    }
    if (msg.includes('INVALID_IDENTIFIER')) {
      return isRTL ? 'الرجاء إدخال البريد أو رقم الجوال بشكل صحيح.' : 'Please enter a valid email or phone.';
    }
    // INVALID_OR_EXPIRED → generic on purpose
    return isRTL ? 'الرمز غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired code.';
  };

  const handleVerify = async () => {
    setError('');
    if (!identifier.trim() || code.trim().length < 4) {
      setError(isRTL ? 'أدخل المعرف والرمز.' : 'Enter identifier and code.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('verify_temporary_login_code', {
        _identifier: identifier.trim(),
        _code: code.trim(),
      });
      if (rpcError) throw rpcError;
      const ok = (data as { verified?: boolean } | null)?.verified === true;
      if (!ok) {
        setError(isRTL ? 'الرمز غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired code.');
        return;
      }
      try {
        localStorage.setItem('qitaat_beta_verified', String(Date.now()));
      } catch { /* storage may be blocked */ }
      setVerified(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(mapError(msg));
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
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
          onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
          placeholder={isRTL ? 'example@email.com أو 5XXXXXXXX' : 'example@email.com or 5XXXXXXXX'}
          dir="ltr"
          className="h-12 rounded-xl"
          autoComplete="username"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">
          {isRTL ? 'الرمز المؤقت' : 'Temporary code'}
        </Label>
        <Input
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\s/g, '')); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleVerify(); }}
          placeholder="000000"
          dir="ltr"
          inputMode="numeric"
          maxLength={8}
          autoComplete="one-time-code"
          className="h-12 rounded-xl text-center text-xl tracking-[0.5em] font-mono"
        />
        <FieldError message={error} />
      </div>

      <Button
        onClick={handleVerify}
        disabled={loading}
        variant="hero"
        className="w-full h-12 rounded-xl text-sm font-semibold"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <KeyRound className="w-4 h-4 me-2" />}
        {isRTL ? 'تحقق من الرمز' : 'Verify code'}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        {isRTL ? 'اطلب الرمز من فريق قطاعات.' : 'Request a code from the Qitaat team.'}
      </p>
    </div>
  );
};