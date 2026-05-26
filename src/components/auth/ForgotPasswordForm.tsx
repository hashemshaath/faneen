import React, { useState } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { authService } from '@/services/auth';
import { createPasswordResetLog } from '@/modules/identity';
import { useLoginLockout } from '@/hooks/useLoginLockout';
import { translateAuthError, isRateLimitError, isNetworkError } from '@/services/auth/errorMessages';
import { getAuthErrorHelpLinks } from '@/services/auth/errorMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft, ArrowRight, CheckCircle, RefreshCw, Inbox, AlertTriangle, LogIn, Pencil, ShieldCheck, ShieldAlert, Clock, History } from 'lucide-react';
import { HelpCircle, Timer } from 'lucide-react';
import { FieldError as FieldErrorDisplay } from './FieldError';
import { AuthErrorHelpLinks } from './AuthErrorHelpLinks';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { CopyButton } from '@/components/ui/copy-button';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

interface ActivityEvent {
  id: string;
  type: 'sent' | 'resend' | 'email_changed' | 'auto_retry';
  timestamp: Date;
  detail?: string;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorRaw, setSubmitErrorRaw] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState('');
  const [autoRetrying, setAutoRetrying] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [showPrivacyExplainer, setShowPrivacyExplainer] = useState(false);
  const [deliveryCountdown, setDeliveryCountdown] = useState(0);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const { errors, validateEmailField, clearError } = useFieldValidation(isRTL);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockout = useLoginLockout();

  // Cleanup interval on unmount
  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const addActivity = useCallback((type: ActivityEvent['type'], detail?: string) => {
    setActivityLog(prev => [{
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      type,
      timestamp: new Date(),
      detail,
    }, ...prev].slice(0, 20));
  }, []);

  const startCooldown = useCallback((seconds: number) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(seconds);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { if (cooldownRef.current) clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const generateRequestId = () => `RST-${Date.now().toString(36).toUpperCase()}`;

  const logResetRequest = async (status: string, requestId: string) => {
    try {
      await createPasswordResetLog({
        email: email.trim().toLowerCase(),
        status,
        request_id: requestId,
        user_agent: navigator.userAgent?.substring(0, 200) || null,
      });
    } catch {
      // silent — logging should never block the user
    }
  };

  const handleSubmit = async () => {
    if (!email || !validateEmailField(email)) {
      return;
    }
    setLoading(true);
    setSubmitError(null);
    setSubmitErrorRaw('');
    const reqId = generateRequestId();
    try {
      await authService.resetPassword(email);
      await logResetRequest('requested', reqId);
      setSent(true);
      addActivity('sent', email);
      toast.success(isRTL ? 'تم إرسال رابط إعادة التعيين' : 'Reset link sent');
      startCooldown(60);
      startDeliveryCountdown();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      await logResetRequest('failed', reqId);

      if (isRateLimitError(msg)) {
        lockout.recordFailure();
        setSubmitError(translateAuthError(msg, isRTL));
        setSubmitErrorRaw(msg);
      } else if (isNetworkError(msg)) {
        lockout.recordFailure();
        setSubmitError(translateAuthError(msg, isRTL));
        setSubmitErrorRaw(msg);
        // Auto-retry after network error
        scheduleAutoRetry();
      } else {
        // Always show sent state for security (don't reveal if email exists or not)
        await logResetRequest('requested', reqId);
        setSent(true);
        addActivity('sent', email);
        toast.success(isRTL
          ? 'إذا كان الحساب موجوداً، سيتم إرسال رابط إعادة التعيين'
          : 'If an account exists, a reset link will be sent');
        startCooldown(60);
        startDeliveryCountdown();
      }
    } finally {
      setLoading(false);
    }
  };

  const scheduleAutoRetry = useCallback(() => {
    setAutoRetrying(true);
    const timer = setTimeout(async () => {
      const retryReqId = generateRequestId();
      try {
        await authService.resetPassword(email);
        await logResetRequest('auto_retry_success', retryReqId);
        setSubmitError(null);
        setSubmitErrorRaw('');
        setSent(true);
        addActivity('auto_retry', email);
        toast.success(isRTL ? 'تم إعادة الإرسال تلقائياً بنجاح ✓' : 'Auto-retry succeeded ✓');
        startCooldown(60);
      } catch {
        toast.error(isRTL ? 'فشلت المحاولة التلقائية، أعد المحاولة يدوياً' : 'Auto-retry failed, please try manually');
        await logResetRequest('auto_retry_failed', retryReqId);
      } finally {
        setAutoRetrying(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, isRTL]);

  const deliveryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDeliveryCountdown = useCallback(() => {
    if (deliveryRef.current) clearInterval(deliveryRef.current);
    const seconds = 5 * 60; // 5 minutes
    setDeliveryCountdown(seconds);
    deliveryRef.current = setInterval(() => {
      setDeliveryCountdown(prev => {
        if (prev <= 1) { if (deliveryRef.current) clearInterval(deliveryRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (deliveryRef.current) clearInterval(deliveryRef.current); };
  }, []);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setResendSuccess(false);
    const reqId = generateRequestId();
    try {
      await authService.resetPassword(email);
      await logResetRequest('resend', reqId);
      setResendCount(prev => prev + 1);
      setResendSuccess(true);
      addActivity('resend', email);
      toast.success(isRTL ? 'تم إعادة إرسال الرابط بنجاح ✓' : 'Link resent successfully ✓');
      // Increase cooldown with each resend (60s, 90s, 120s)
      const nextCooldown = Math.min(60 + resendCount * 30, 180);
      startCooldown(nextCooldown);
      startDeliveryCountdown();
      // Hide success banner after 5s
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      await logResetRequest('resend_failed', reqId);
      if (isRateLimitError(msg) || isNetworkError(msg)) {
        toast.error(translateAuthError(msg, isRTL));
      } else {
        toast.error(isRTL ? 'فشل إعادة الإرسال، حاول مجدداً' : 'Failed to resend, please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = (newEmail: string) => {
    setEmail(newEmail);
    setEditingEmail(false);
    setResendCooldown(0);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendSuccess(false);
    setResendCount(0);
    addActivity('email_changed', newEmail);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActivityLabel = (ev: ActivityEvent) => {
    switch (ev.type) {
      case 'sent':
        return isRTL ? 'تم إرسال رابط الاستعادة' : 'Reset link sent';
      case 'resend':
        return isRTL ? 'تم إعادة إرسال الرابط' : 'Link resent';
      case 'email_changed':
        return isRTL ? 'تم تعديل البريد الإلكتروني' : 'Email updated';
      case 'auto_retry':
        return isRTL ? 'إعادة إرسال تلقائية (بعد خطأ الشبكة)' : 'Auto-retry after network error';
      default:
        return '';
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-foreground">
            {isRTL ? 'تحقق من بريدك الإلكتروني' : 'Check Your Email'}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isRTL
              ? <>أرسلنا رابط إعادة تعيين كلمة المرور إلى:<br /><span className="inline-flex items-center gap-1"><strong className="text-foreground" dir="ltr">{email}</strong><CopyButton value={email} label="البريد الإلكتروني" size="xs" /></span></>
              : <>We sent a password reset link to:<br /><span className="inline-flex items-center gap-1"><strong className="text-foreground">{email}</strong><CopyButton value={email} label="Email" size="xs" /></span></>
            }
          </p>

          {/* Inline email edit */}
          {!editingEmail ? (
            <button
              onClick={() => { setEditedEmail(email); setEditingEmail(true); }}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline mx-auto"
            >
              <Pencil className="w-3 h-3" />
              {isRTL ? 'تعديل البريد الإلكتروني' : 'Change email'}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 max-w-xs mx-auto w-full">
                <Input
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  dir="ltr"
                  className="h-9 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editedEmail.trim() && editedEmail !== email) {
                      handleEmailUpdate(editedEmail.trim());
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="hero"
                  className="h-9 px-3 shrink-0"
                  disabled={!editedEmail.trim() || editedEmail.trim() === email}
                  onClick={() => handleEmailUpdate(editedEmail.trim())}
                >
                  {isRTL ? 'تحديث' : 'Update'}
                </Button>
                <button
                  onClick={() => setEditingEmail(false)}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
              {/* Privacy notice on email change */}
              <div className="flex items-start gap-1.5 max-w-xs mx-auto">
                <ShieldCheck className="w-3 h-3 text-accent mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground text-start leading-relaxed">
                  {isRTL
                    ? 'لن يُكشف لك ما إذا كان الحساب موجوداً. الرسالة تُرسل دائماً بطريقة آمنة.'
                    : 'We won\'t reveal whether an account exists. The email is always sent securely.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Next steps timeline */}
        <div className="rounded-xl border border-border bg-muted/20 p-5 text-start space-y-0">
          <p className="text-xs font-semibold text-foreground mb-3">
            {isRTL ? 'الخطوات التالية:' : 'What to do next:'}
          </p>
          {[
            {
              icon: Inbox,
              color: 'text-accent',
              titleAr: 'افتح صندوق الوارد',
              titleEn: 'Open your inbox',
              descAr: 'ابحث عن رسالة بعنوان "إعادة تعيين كلمة المرور". قد تستغرق 1-3 دقائق.',
              descEn: 'Look for an email titled "Reset your password". It may take 1-3 minutes.',
            },
            {
              icon: AlertTriangle,
              color: 'text-warning',
              titleAr: 'تحقق من البريد المهمل',
              titleEn: 'Check Spam / Junk',
              descAr: 'إذا لم تجد الرسالة، تحقق من مجلد الرسائل غير المرغوب فيها (Spam).',
              descEn: "If you don't see it, check your Spam or Junk folder.",
            },
            {
              icon: Mail,
              color: 'text-accent',
              titleAr: 'اضغط على رابط إعادة التعيين',
              titleEn: 'Click the reset link',
              descAr: 'اضغط على الرابط في الرسالة لإنشاء كلمة مرور جديدة. الرابط صالح لمدة ساعة واحدة.',
              descEn: 'Click the link in the email to create a new password. The link is valid for 1 hour.',
            },
          ].map((step, i) => {
            const StepIcon = step.icon;
            return (
              <div key={i} className="flex items-start gap-3 relative">
                {/* Connector line */}
                {i < 2 && (
                  <div className="absolute top-6 w-px h-[calc(100%-4px)] bg-border" style={{ insetInlineStart: '11px' }} />
                )}
                <div className={`w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shrink-0 z-10`}>
                  <StepIcon className={`w-3 h-3 ${step.color}`} />
                </div>
                <div className="pb-4">
                  <p className="text-xs font-semibold text-foreground">{isRTL ? step.titleAr : step.titleEn}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{isRTL ? step.descAr : step.descEn}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy note */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2.5 transition-all">
          <ShieldCheck className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isRTL
                ? 'لحماية خصوصيتك، نعرض هذه الرسالة سواء كان البريد مسجلاً أم لا. الرسالة تُرسل دائماً بطريقة آمنة.'
                : 'For your privacy, this message appears whether the email is registered or not. The email is always sent securely.'}
            </p>
            <button
              onClick={() => setShowPrivacyExplainer(prev => !prev)}
              className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-medium"
            >
              <HelpCircle className="w-3 h-3" />
              {isRTL ? 'لماذا نعرض رسالة عامة؟' : 'Why do we show a generic message?'}
            </button>
            {showPrivacyExplainer && (
              <div className="text-[11px] text-muted-foreground leading-relaxed bg-muted/40 rounded-lg p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                {isRTL
                  ? 'نعرض نفس الرسالة لجميع المستخدمين — سواء كان البريد مسجلاً أم لا — لمنع أي شخص من معرفة ما إذا كان بريد معين مرتبطاً بحساب. هذا إجراء أمني معياري يُعرف بـ "عدم الكشف عن وجود الحساب" لحماية خصوصية المستخدمين.'
                  : 'We show the same message to everyone — whether or not the email is registered — to prevent anyone from discovering if a particular email has an account. This is a standard security practice known as "account enumeration prevention" to protect user privacy.'}
              </div>
            )}
          </div>
        </div>

        {/* Expected delivery countdown */}
        {deliveryCountdown > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
            <Timer className="w-4 h-4 text-accent shrink-0" />
            <p className="text-xs text-foreground font-medium">
              {isRTL
                ? `الوقت المتوقع لاستلام الرسالة: ${Math.floor(deliveryCountdown / 60)}:${(deliveryCountdown % 60).toString().padStart(2, '0')}`
                : `Expected delivery: ${Math.floor(deliveryCountdown / 60)}:${(deliveryCountdown % 60).toString().padStart(2, '0')}`}
            </p>
          </div>
        )}
        {deliveryCountdown === 0 && activityLog.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-warning dark:border-warning bg-warning dark:bg-warning/20 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-warning dark:text-warning shrink-0" />
            <p className="text-xs text-warning dark:text-warning font-medium">
              {isRTL
                ? 'انتهى الوقت المتوقع. إذا لم تصلك الرسالة، أعد الإرسال أو تحقق من البريد المهمل.'
                : "Expected time has passed. If you haven't received it, resend or check your spam folder."}
            </p>
          </div>
        )}

        {/* Resend success confirmation */}
        {resendSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-success dark:border-success bg-success dark:bg-success/20 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle className="w-4 h-4 text-success dark:text-success shrink-0" />
            <p className="text-xs text-success dark:text-success font-medium">
              {isRTL
                ? `تم إعادة إرسال الرابط بنجاح (المرة ${resendCount}). تحقق من بريدك.`
                : `Link resent successfully (attempt ${resendCount}). Check your email.`}
            </p>
          </div>
        )}

        {/* Resend button with cooldown and reason */}
        <div className="text-center space-y-1.5">
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || loading}
          className="w-full text-center text-sm text-accent hover:underline font-medium disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 py-2 transition-colors"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {resendCooldown > 0
            ? (isRTL ? `إعادة الإرسال بعد ${resendCooldown} ثانية` : `Resend in ${resendCooldown}s`)
            : (isRTL ? 'أعد الإرسال' : 'Resend')
          }
        </button>
        {resendCooldown > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {isRTL
              ? 'لحماية حسابك، يرجى الانتظار قبل إعادة المحاولة'
              : 'For your security, please wait before retrying'}
          </p>
        )}
        {resendCount >= 3 && resendCooldown === 0 && (
          <p className="text-[11px] text-warning dark:text-warning flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {isRTL
              ? 'إذا لم تصلك الرسالة، تواصل مع الدعم الفني'
              : "If you still haven't received it, contact support"}
          </p>
        )}
        </div>

        {/* Activity log */}
        {activityLog.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold text-muted-foreground">
                {isRTL ? 'سجل النشاط' : 'Activity Log'}
              </p>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {activityLog.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 text-[11px]">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground font-mono tabular-nums">{formatTime(ev.timestamp)}</span>
                  <span className="text-foreground">{getActivityLabel(ev)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={onBack} variant="outline" className="w-full h-10 gap-2">
          <LogIn className="w-4 h-4" />
          {isRTL ? 'العودة لتسجيل الدخول' : 'Back to Login'}
        </Button>

        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1">
          <BackArrow className="w-4 h-4" />
          {t('auth.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-heading font-bold text-2xl text-foreground">{t('auth.reset_password')}</h2>
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين' : 'Enter your email and we will send a reset link'}
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('auth.email')}</Label>
          <div className="relative">
            <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ insetInlineStart: '12px' }} />
            <Input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
              onBlur={() => email && validateEmailField(email)}
              dir="ltr"
              style={{ paddingInlineStart: '40px' }}
              className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoComplete="email"
            />
          </div>
          <FieldErrorDisplay message={errors.email} />
        </div>
        {/* Lockout warning */}
        {lockout.isLocked && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 animate-in fade-in duration-300">
            <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-xs text-destructive font-semibold">
                {isRTL
                  ? `تم قفل الطلبات مؤقتاً. أعد المحاولة بعد ${lockout.remainingSeconds} ثانية.`
                  : `Requests temporarily locked. Try again in ${lockout.remainingSeconds}s.`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isRTL ? 'هذا الإجراء لحماية حسابك من الاستخدام غير المصرح.' : 'This protects your account from unauthorized use.'}
              </p>
            </div>
          </div>
        )}

        {/* Auto-retry indicator */}
        {autoRetrying && (
          <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 animate-in fade-in duration-300">
            <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
            <p className="text-xs text-accent font-medium">
              {isRTL ? 'جاري المحاولة تلقائياً...' : 'Auto-retrying...'}
            </p>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={loading || !!errors.email || lockout.isLocked || autoRetrying} className="w-full h-11" variant="hero">
          {loading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
          {loading ? t('common.loading') : t('auth.reset_password')}
        </Button>

        {/* Inline error with guidance */}
        {submitError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1.5">
              <p className="text-xs text-destructive font-medium">{submitError}</p>
              <ul className="text-[11px] text-muted-foreground list-disc ps-4 space-y-0.5">
                <li>{isRTL ? 'تحقق من كتابة البريد الإلكتروني بشكل صحيح' : 'Double-check your email spelling'}</li>
                <li>{isRTL ? 'جرّب البريد الآخر إذا كنت تستخدم أكثر من بريد' : 'Try another email if you have multiple'}</li>
                <li>{isRTL ? 'إذا استمرت المشكلة، تواصل مع الدعم الفني' : 'Contact support if the issue persists'}</li>
              </ul>
              {submitErrorRaw && (
                <AuthErrorHelpLinks
                  links={getAuthErrorHelpLinks(submitErrorRaw, isRTL)}
                  onAction={(action) => {
                    if (action === 'contact') window.location.href = '/contact';
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <BackArrow className="w-4 h-4" />
        {t('auth.back')}
      </button>
    </div>
  );
};
