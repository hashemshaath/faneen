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
}

export const OtpInput: React.FC<OtpInputProps> = ({
  otpCode, onCodeChange, demoOtp, cooldown, loading,
  onVerify, onResend, onBack, isRTL,
}) => (
  <div className="space-y-4 animate-fade-in">
    <div className="space-y-2">
      <Label>{isRTL ? 'رمز التحقق' : 'Verification Code'}</Label>
      <Input
        value={otpCode}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder="000000"
        dir="ltr"
        className="text-center text-xl tracking-[0.5em] font-mono h-12"
        maxLength={OTP_LENGTH}
      />
    </div>

    {demoOtp && (
      <div className="p-3 rounded-xl bg-accent/10 border border-accent/30">
        <p className="text-xs text-muted-foreground mb-1.5">
          {isRTL ? '⚠️ الكود المؤقت (لحين تفعيل الرسائل النصية):' : '⚠️ Temp code (until SMS activated):'}
        </p>
        <p className="text-center text-2xl font-mono font-bold text-accent tracking-[0.3em]">{demoOtp}</p>
      </div>
    )}

    <Button
      onClick={onVerify}
      disabled={loading || otpCode.length !== OTP_LENGTH}
      className="w-full h-11"
      variant="hero"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
      {isRTL ? 'تحقق وسجّل الدخول' : 'Verify & Sign In'}
    </Button>

    <div className="flex items-center justify-between text-xs">
      <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
        {isRTL ? '← تغيير الرقم' : '← Change number'}
      </button>
      <button
        onClick={onResend}
        disabled={cooldown > 0 || loading}
        className="text-accent hover:underline disabled:opacity-50"
      >
        {cooldown > 0
          ? (isRTL ? `إعادة الإرسال (${cooldown}ث)` : `Resend (${cooldown}s)`)
          : (isRTL ? 'إعادة إرسال الرمز' : 'Resend code')
        }
      </button>
    </div>
  </div>
);
