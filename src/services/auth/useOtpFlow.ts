import { useState, useEffect, useCallback } from 'react';
import { OTP_COOLDOWN_SECONDS, OTP_LENGTH } from './constants';

interface UseOtpFlowOptions {
  onSendOtp: () => Promise<{ success: boolean; demo_otp?: string; error?: string; message?: string }>;
  onVerifyOtp: (code: string) => Promise<void>;
  isRTL: boolean;
}

export function useOtpFlow({ onSendOtp, onVerifyOtp, isRTL }: UseOtpFlowOptions) {
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendOtp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await onSendOtp();
      if (!data?.success) {
        const msg = data?.error === 'no_account'
          ? (isRTL ? 'لم يتم العثور على حساب بهذا الرقم' : 'No account found with this number')
          : data?.message || (isRTL ? 'تعذر إرسال الرمز' : 'Could not send code');
        setError(msg);
        return false;
      }
      setDemoOtp(data.demo_otp ?? null);
      setOtpCode('');
      setOtpStep(true);
      setCooldown(OTP_COOLDOWN_SECONDS);
      return true;
    } catch {
      setError(isRTL ? 'حدث خطأ، حاول مرة أخرى' : 'An error occurred, try again');
      return false;
    } finally {
      setLoading(false);
    }
  }, [onSendOtp, isRTL]);

  const verifyOtp = useCallback(async () => {
    if (otpCode.length !== OTP_LENGTH) {
      setError(isRTL ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'Enter 6-digit code');
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      await onVerifyOtp(otpCode);
      return true;
    } catch (err: any) {
      setError(err?.message || (isRTL ? 'تعذر التحقق من الرمز' : 'Could not verify the code'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [otpCode, onVerifyOtp, isRTL]);

  const resetOtp = useCallback(() => {
    setOtpStep(false);
    setOtpCode('');
    setDemoOtp(null);
    setError(null);
  }, []);

  const setCode = useCallback((val: string) => {
    setOtpCode(val.replace(/\D/g, '').slice(0, OTP_LENGTH));
  }, []);

  return {
    otpStep,
    otpCode,
    demoOtp,
    cooldown,
    loading,
    error,
    sendOtp,
    verifyOtp,
    resetOtp,
    setCode,
  };
}
