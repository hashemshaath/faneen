import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Phone } from 'lucide-react';
import { OTP_LENGTH } from '@/services/auth/constants';

interface OtpInputProps {
  otpCode: string;
  onCodeChange: (val: string) => void;
  demoOtp: string | null;
  cooldown: number;
  loading: boolean;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
  isRTL: boolean;
  error?: string | null;
  /** Destination to display (e.g. phone number or email). */
  target?: string;
  /** Delivery channel — controls icon and helper text. */
  channel?: 'email' | 'phone';
}

export const OtpInput: React.FC<OtpInputProps> = ({
  otpCode, onCodeChange, demoOtp, cooldown, loading,
  onVerify, onResend, onBack, isRTL, error, target, channel = 'phone',
}) => {
  const Icon = channel === 'email' ? Mail : Phone;
  const placeholder = '0'.repeat(OTP_LENGTH);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-center pt-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/15">
          <Icon className="w-7 h-7 text-primary" strokeWidth={1.75} />
        </div>
      </div>

      <div className="space-y-1.5 text-center">
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'تم إرسال رمز التحقق إلى' : 'Verification code sent to'}
        </p>
        {target && (
          <p dir="ltr" className="font-semibold text-foreground text-base tracking-tight break-all">
            {target}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground block text-start">
          {isRTL ? 'أدخل رمز التحقق' : 'Enter verification code'}
        </label>
        <Input
          value={otpCode}
          onChange={(e) => onCodeChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !loading && otpCode.length === OTP_LENGTH) onVerify(); }}
          placeholder={placeholder}
          dir="ltr"
          className={`text-center text-2xl tracking-[0.65em] font-mono h-14 rounded-xl placeholder:text-muted-foreground/40 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          maxLength={OTP_LENGTH}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-invalid={!!error}
          aria-describedby="otp-status"
          autoFocus
        />
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          {isRTL
            ? `أدخل الرمز المكوّن من ${OTP_LENGTH} أرقام المرسل إلى ${channel === 'email' ? 'بريدك الإلكتروني' : 'جوالك'}`
            : `Enter the ${OTP_LENGTH}-digit code sent to your ${channel === 'email' ? 'email' : 'phone'}`}
        </p>
        <p id="otp-status" role="status" aria-live="polite" className="text-[11px] min-h-[1rem] text-destructive leading-snug text-center">
          {error || ''}
        </p>
      </div>

      {channel === 'email' && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 text-center leading-relaxed px-2">
          {isRTL
            ? 'إذا لم تستلم البريد الإلكتروني، تأكد من إضافة نطاق qitaat.com إلى القائمة البيضاء.'
            : 'If you did not receive the email, make sure to whitelist the qitaat.com domain.'}
        </p>
      )}

      {demoOtp && (
        <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/30">
          <p className="text-[11px] text-muted-foreground mb-1 text-center">
            {isRTL ? '⚠️ الكود المؤقت (لحين تفعيل الرسائل النصية):' : '⚠️ Temp code (until SMS activated):'}
          </p>
          <p className="text-center text-xl sm:text-2xl font-mono font-bold text-accent tracking-[0.3em]">{demoOtp}</p>
        </div>
      )}

      <Button
        onClick={onVerify}
        disabled={loading || otpCode.length !== OTP_LENGTH}
        className="w-full h-12 rounded-xl text-sm font-semibold"
        variant="hero"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
        {isRTL ? 'تحقق وتسجيل الدخول' : 'Verify & Sign In'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        {cooldown > 0 ? (
          isRTL ? `إعادة الإرسال خلال ${cooldown}ث` : `Resend in ${cooldown}s`
        ) : (
          <button
            onClick={onResend}
            disabled={loading}
            className="text-primary hover:underline disabled:opacity-50 font-medium"
          >
            {isRTL ? 'إعادة إرسال الرمز' : 'Resend code'}
          </button>
        )}
      </p>

      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className="w-full h-12 rounded-xl text-sm font-semibold"
      >
        {isRTL ? 'رجوع' : 'Back'}
      </Button>
    </div>
  );
};
