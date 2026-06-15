import { useState, useEffect, useCallback } from 'react';
import { OTP_COOLDOWN_SECONDS, OTP_LENGTH } from './constants';
import { track, trackOtpFailed, trackLoginFailed, categorizeReason } from '@/lib/analytics-events';

interface UseOtpFlowOptions {
  onSendOtp: () => Promise<{ success: boolean; demo_otp?: string; error?: string; message?: string }>;
  onVerifyOtp: (code: string) => Promise<void>;
  isRTL: boolean;
}

export interface SendOtpResult {
  ok: boolean;
  error?: string | null;
  /**
   * Suggested fallback channel when OTP delivery fails for technical reasons
   * (otp_create_failed, sms_delivery_failed, edge function offline). The
   * caller (LoginForm) uses this to auto-switch the UI to the email login
   * tab and surface a notification — never set for soft errors like
   * `no_account` or `rate_limited`.
   */
  fallback?: 'email' | null;
  /** Stable failure code from the server (when known), useful for analytics. */
  failureCode?: string | null;
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

  const sendOtp = useCallback(async (): Promise<SendOtpResult> => {
    setLoading(true);
    setError(null);
    try {
      const data = await onSendOtp();
      if (!data?.success) {
        const rawMsg = `${data?.error ?? ''} ${data?.message ?? ''}`;
        const isOtpCreateFailure =
          data?.error === 'otp_create_failed' ||
          /failed to create otp|otp_create_failed/i.test(rawMsg);
        const isSmsDeliveryFailure =
          data?.error === 'sms_delivery_failed' ||
          /sms_delivery_failed|could not send sms/i.test(rawMsg);
        const shouldFallbackToEmail = isOtpCreateFailure || isSmsDeliveryFailure;
        const msg = data?.error === 'no_account'
          ? (isRTL ? 'لم يتم العثور على حساب بهذا الرقم' : 'No account found with this number')
          : isOtpCreateFailure
            ? (isRTL
                ? 'نعتذر، حدث خطأ تقني أثناء إرسال رمز التحقق عبر الرسائل. يمكنك بدلًا من ذلك تسجيل الدخول باستخدام البريد الإلكتروني.'
                : 'Sorry, a technical error occurred while sending the verification code. You can sign in using your email instead.')
            : isSmsDeliveryFailure
              ? (isRTL
                  ? 'نعتذر، تعذّر إرسال الرسالة النصية حاليًا. تم تحويلك تلقائيًا إلى تسجيل الدخول بالبريد الإلكتروني.'
                  : 'Sorry, we could not deliver the SMS right now. We have switched you to email sign-in.')
              : data?.message || (isRTL ? 'تعذر إرسال الرمز' : 'Could not send code');
        try {
          trackOtpFailed({
            method: 'otp',
            flow: 'send',
            source_page: 'auth_otp',
            reason_category: data?.error === 'no_account' ? 'auth_failed' : categorizeReason(data?.error || data?.message),
          });
        } catch { /* analytics never breaks otp */ }
        setError(msg);
        return {
          ok: false,
          error: msg,
          fallback: shouldFallbackToEmail ? 'email' : null,
          failureCode: typeof data?.error === 'string' ? data.error : null,
        };
      }
      setDemoOtp(data.demo_otp ?? null);
      setOtpCode('');
      setOtpStep(true);
      setCooldown(OTP_COOLDOWN_SECONDS);
      track.otpSent({ method: 'otp' });
      return { ok: true };
    } catch (err) {
      try { trackOtpFailed({ method: 'otp', flow: 'send', source_page: 'auth_otp', reason_category: categorizeReason(err) }); } catch { /* noop */ }
      const rawMsg = err instanceof Error ? err.message : String(err);
      // Detect missing-messaging / edge-function-not-deployed style errors so the user gets actionable copy
      // instead of a generic toast (root cause of "no response" reports).
      const looksLikeMessagingMissing =
        /Edge Function|not found|404|503|Failed to send a request|FunctionsFetchError|messaging|twilio/i.test(rawMsg);
      const msg = looksLikeMessagingMissing
        ? (isRTL
            ? 'خدمة الرسائل قيد الإعداد حاليًا. يمكنك استخدام البريد الإلكتروني أو طلب رمز مؤقت من فريق قطاعات.'
            : 'Messaging is currently being configured. You can use email login or request a temporary code from Qitaat team.')
        : (isRTL ? 'حدث خطأ، حاول مرة أخرى' : 'An error occurred, try again');
      setError(msg);
      return {
        ok: false,
        error: msg,
        fallback: looksLikeMessagingMissing ? 'email' : null,
        failureCode: looksLikeMessagingMissing ? 'messaging_unavailable' : 'unknown_error',
      };
    } finally {
      setLoading(false);
    }
  }, [onSendOtp, isRTL]);

  const verifyOtp = useCallback(async () => {
    if (loading) return false;
    if (otpCode.length !== OTP_LENGTH) {
      setError(isRTL ? 'أدخل رمز التحقق المكون من 6 أرقام' : 'Enter 6-digit code');
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      await onVerifyOtp(otpCode);
      track.otpVerified({ method: 'otp' });
      return true;
    } catch (err: unknown) {
      try {
        trackOtpFailed({ method: 'otp', flow: 'verify', source_page: 'auth_otp', reason_category: categorizeReason(err) });
        trackLoginFailed({ method: 'otp', source_page: 'auth_login', reason_category: categorizeReason(err) });
      } catch { /* analytics never breaks otp */ }
      setError(err instanceof Error ? err.message : (isRTL ? 'تعذر التحقق من الرمز' : 'Could not verify the code'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [otpCode, onVerifyOtp, isRTL, loading]);

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
