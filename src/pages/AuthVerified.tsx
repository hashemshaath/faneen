import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';

/**
 * AUTH-14B · `/auth/verified`
 * Friendly landing after Supabase confirms the user's email.
 * No callback logic is performed here — Supabase's hash session is already
 * established by the time we render. We only show a confirmation surface
 * with role-aware CTAs.
 */
const AuthVerified: React.FC = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  useNoIndex();

  // Supabase reports failures with `error` / `error_description` in the URL
  // hash or query string. We treat any of these as a failed verification.
  const failed = useMemo(() => {
    if (params.get('error') || params.get('error_description')) return true;
    if (typeof window !== 'undefined' && window.location.hash.includes('error=')) return true;
    return false;
  }, [params]);

  usePageMeta({
    title: failed
      ? (isRTL ? 'رابط تفعيل غير صالح | قِطاعات' : 'Invalid verification link | Qitaat')
      : (isRTL ? 'تم تفعيل بريدك | قِطاعات' : 'Email verified | Qitaat'),
    description: isRTL
      ? 'صفحة تفعيل البريد الإلكتروني في منصة قِطاعات'
      : 'Email verification confirmation for Qitaat.',
  });

  // If a user lands here without any session and no failure flag, nudge them
  // back to the sign-in screen after a short delay so the page is never a
  // dead-end.
  useEffect(() => {
    if (failed) return;
    if (user) return;
    const t = window.setTimeout(() => navigate('/auth', { replace: true }), 8000);
    return () => window.clearTimeout(t);
  }, [failed, user, navigate]);

  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <AuthLayout>
      <div className="space-y-6 text-center" data-testid="auth-verified-surface">
        {failed ? (
          <>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" aria-hidden />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">
                {isRTL ? 'رابط التفعيل غير صالح أو انتهت مدته' : 'This verification link is invalid or expired'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? 'يمكنك تسجيل الدخول وسنرسل لك رابطًا جديدًا عند الحاجة.'
                  : 'You can sign in and we will send a new link if needed.'}
              </p>
            </div>
            <Button asChild className="w-full h-11">
              <Link to="/auth">{isRTL ? 'العودة لتسجيل الدخول' : 'Back to sign in'}</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" aria-hidden />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">
                {isRTL ? 'تم تفعيل بريدك بنجاح' : 'Your email has been verified'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? 'يمكنك الآن الدخول إلى لوحة التحكم وإكمال بيانات حسابك.'
                  : 'You can now sign in and complete your account setup.'}
              </p>
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full h-11 gap-1.5">
                <Link to={user ? '/dashboard' : '/auth'}>
                  {isRTL ? 'الذهاب إلى لوحة التحكم' : 'Go to dashboard'}
                  <Arrow className="w-4 h-4" aria-hidden />
                </Link>
              </Button>
              {!user && (
                <Button asChild variant="outline" className="w-full h-11">
                  <Link to="/auth">{isRTL ? 'تسجيل الدخول' : 'Sign in'}</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default AuthVerified;