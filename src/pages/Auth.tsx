import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { usePageMeta } from '@/hooks/usePageMeta';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { IdentitySignInForm } from '@/components/auth/IdentitySignInForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { RegistrationSuccessView } from '@/components/auth/RegistrationSuccessView';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * Unified auth view. The IdentitySignInForm is the single sign-in entry point.
 * Legacy `?mode=login` / `?mode=signin` links are normalized to the identity
 * flow so the old password-only LoginForm is never rendered.
 */
type ViewMode = 'identity' | 'register' | 'forgot-password' | 'email-sent';

const normalizeMode = (raw: string | null): ViewMode => {
  switch (raw) {
    case 'register':
    case 'signup':
      return 'register';
    case 'forgot-password':
    case 'forgot':
    case 'reset':
      return 'forgot-password';
    case 'identity':
    case 'login':
    case 'signin':
    case 'sign-in':
    case null:
    case undefined:
    default:
      return 'identity';
  }
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const { user, profile, loading } = useAuth();
  const { redirectByRole } = useRoleRedirect();
  const { isRTL } = useLanguage();

  const initialMode = useMemo(() => normalizeMode(searchParams.get('mode')), [searchParams]);
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [sentEmail, setSentEmail] = useState('');
  const redirectedRef = useRef(false);

  usePageMeta({
    title: mode === 'register' ? 'إنشاء حساب | قِطاعات' : 'تسجيل الدخول | قِطاعات',
    description: 'سجل دخولك أو أنشئ حساباً جديداً في منصة قِطاعات لدليل أعمال الألمنيوم والحديد',
  });

  // Role-based redirect for authenticated users
  useEffect(() => {
    if (loading) return;
    if (user && !redirectedRef.current) {
      redirectedRef.current = true;
      // CT4C.4 — honor pending invite token captured before auth
      try {
        const pending = sessionStorage.getItem('qitaat_pending_invite_token');
        if (pending) {
          sessionStorage.removeItem('qitaat_pending_invite_token');
          window.location.replace(`/invite/${encodeURIComponent(pending)}`);
          return;
        }
      } catch { /* ignore storage errors */ }
      // Show welcome toast on fresh sign-in / sign-up (Google OAuth, email signup
      // with auto-confirm, or email-link verification landing back here).
      try {
        const fromGoogle = searchParams.get('welcome') === '1';
        const flagged = sessionStorage.getItem('qitaat_show_welcome') === '1';
        if (fromGoogle || flagged) {
          sessionStorage.removeItem('qitaat_show_welcome');
          const name = (profile?.full_name_ar || profile?.full_name_en || profile?.full_name || '').trim();
          const msg = isRTL
            ? (name ? `أهلاً بك ${name} في قِطاعات` : 'أهلاً بك في قِطاعات')
            : (name ? `Welcome, ${name}!` : 'Welcome to Qitaat!');
          toast.success(msg, {
            description: isRTL ? 'تم تسجيل دخولك بنجاح' : 'You are now signed in',
          });
        }
      } catch { /* storage may be unavailable */ }
      redirectByRole();
    }
  }, [user, profile, loading, redirectByRole, searchParams, isRTL]);

  const handleEmailSent = (email: string) => {
    setSentEmail(email);
    setMode('email-sent');
  };

  if (loading) return null;
  if (user) return null;

  return (
    <ErrorBoundary>
      <AuthLayout>
        {mode === 'identity' && (
          <IdentitySignInForm
            onForgotPassword={() => setMode('forgot-password')}
            onAdvancedRegister={() => setMode('register')}
          />
        )}
        {mode === 'register' && (
          <RegisterForm
            onSwitchToLogin={() => setMode('identity')}
            onEmailSent={handleEmailSent}
            onForgotPassword={() => setMode('forgot-password')}
          />
        )}
        {mode === 'forgot-password' && (
          <ForgotPasswordForm onBack={() => setMode('identity')} />
        )}
        {mode === 'email-sent' && (
          <RegistrationSuccessView email={sentEmail} onBackToLogin={() => setMode('identity')} />
        )}
      </AuthLayout>
    </ErrorBoundary>
  );
};

export default Auth;
