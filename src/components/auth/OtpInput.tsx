import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
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
}

export const OtpInput: React.FC<OtpInputProps> = ({
  otpCode, onCodeChange, demoOtp, cooldown, loading,
  onVerify, onResend, onBack, isRTL, error,
}) => (
  <div className="space-y-4 animate-fade-in">
    <div className="space-y-1.5">
      <h2 className="font-heading font-semibold text-base sm:text-lg text-foreground">
        {isRTL ? 'رمز التحقق' : 'Verification Code'}
      </h2>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {isRTL ? 'أدخل الرمز المكوّن من 6 أرقام الذي أرسلناه إليك.' : 'Enter the 6-digit code we sent you.'}
      </p>
    </div>
    <div className="space-y-2">
      <Label className="text-xs font-semibold">{isRTL ? 'رمز التحقق' : 'Verification Code'}</Label>
      <Input
        value={otpCode}
        onChange={(e) => onCodeChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !loading && otpCode.length === 6) onVerify(); }}
        placeholder="000000"
        dir="ltr"
        className={`text-center text-xl tracking-[0.5em] font-mono h-11 sm:h-12 rounded-xl ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
        maxLength={OTP_LENGTH}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-invalid={!!error}
        aria-describedby="otp-status"
      />
      <p id="otp-status" role="status" aria-live="polite" className="text-[11px] min-h-[1rem] text-destructive leading-snug">
        {error || ''}
      </p>
    </div>

    {demoOtp && (
      <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/30">
        <p className="text-[11px] text-muted-foreground mb-1">
          {isRTL ? '⚠️ الكود المؤقت (لحين تفعيل الرسائل النصية):' : '⚠️ Temp code (until SMS activated):'}
        </p>
        <p className="text-center text-xl sm:text-2xl font-mono font-bold text-accent tracking-[0.3em]">{demoOtp}</p>
      </div>
    )}

    <Button
      onClick={onVerify}
      disabled={loading || otpCode.length !== OTP_LENGTH}
      className="w-full h-11 sm:h-12 rounded-xl text-sm font-semibold"
      variant="hero"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
      {isRTL ? 'تحقق وسجّل الدخول' : 'Verify & Sign In'}
    </Button>

    <div className="flex items-center justify-between gap-2 text-xs">
      <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors font-medium">
        {isRTL ? '← تغيير الرقم' : '← Change number'}
      </button>
      <button
        onClick={onResend}
        disabled={cooldown > 0 || loading}
        className="text-accent hover:underline disabled:opacity-50 font-medium"
      >
        {cooldown > 0
          ? (isRTL ? `إعادة الإرسال (${cooldown}ث)` : `Resend (${cooldown}s)`)
          : (isRTL ? 'إعادة إرسال الرمز' : 'Resend code')
        }
      </button>
    </div>
  </div>
);
